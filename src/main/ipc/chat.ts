import { type ChildProcess, spawn } from 'node:child_process'
import { execFileSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { ipcMain } from 'electron'
import { getMainWindow } from '../window'

const processes = new Map<string, ChildProcess>()
let cachedClaudePath: string | null = null

/** Resolve the claude binary path through the user's login shell. */
function resolveClaudePath(): string {
  const shell = process.env.SHELL || '/bin/zsh'
  try {
    const result = execFileSync(shell, ['-lc', 'command -v claude'], {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, CLAUDECODE: undefined },
    })
    const p = result.trim()
    if (p) return p
  } catch {
    // fall through
  }
  throw new Error('Claude CLI not found. Install from https://claude.ai/download')
}

function getClaudePath(): string {
  if (cachedClaudePath) return cachedClaudePath
  cachedClaudePath = resolveClaudePath()
  return cachedClaudePath
}

ipcMain.handle('check_claude_cli', (): boolean => {
  try {
    getClaudePath()
    return true
  } catch {
    return false
  }
})

ipcMain.handle(
  'start_claude_chat',
  (
    _event,
    args: {
      chatId: string
      message: string
      projectPath: string
      sessionId: string
      isResume: boolean
    },
  ): void => {
    const claudePath = getClaudePath()
    const { chatId, message, projectPath, sessionId, isResume } = args

    const cliArgs = [
      '-p',
      '--verbose',
      '--output-format', 'stream-json',
      '--include-partial-messages',
    ]

    if (isResume) {
      cliArgs.push('--resume', sessionId)
    } else {
      cliArgs.push('--session-id', sessionId)
    }

    cliArgs.push('--', message)

    const env = { ...process.env } as Record<string, string>
    delete env.CLAUDECODE

    const child = spawn(claudePath, cliArgs, {
      cwd: projectPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    processes.set(chatId, child)

    // Collect stderr in background
    const stderrChunks: string[] = []
    if (child.stderr) {
      const rl = createInterface({ input: child.stderr })
      rl.on('line', (line) => {
        if (line) stderrChunks.push(line)
      })
    }

    // Stream stdout line-by-line
    if (child.stdout) {
      const rl = createInterface({ input: child.stdout })
      rl.on('line', (line) => {
        if (!line) return
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          win.webContents.send('claude:chat:data', {
            chat_id: chatId,
            data: line,
          })
        }
      })
    }

    child.on('close', () => {
      processes.delete(chatId)
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('claude:chat:done', {
          chat_id: chatId,
          error: stderrChunks.length > 0 ? stderrChunks.join('\n') : null,
        })
      }
    })

    child.on('error', (err) => {
      processes.delete(chatId)
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('claude:chat:done', {
          chat_id: chatId,
          error: err.message,
        })
      }
    })
  },
)

ipcMain.handle('abort_claude_chat', (_event, args: { chatId: string }): void => {
  const child = processes.get(args.chatId)
  if (child) {
    child.kill()
    processes.delete(args.chatId)
  }
})

ipcMain.handle('cleanup_claude_chat', (_event, args: { chatId: string }): void => {
  processes.delete(args.chatId)
})
