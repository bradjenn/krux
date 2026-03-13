import { type ChildProcess, spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { app, ipcMain } from 'electron'
import { getMainWindow } from '../window'

ipcMain.handle('get_env_var', (_event, args: { name: string }): string | null => {
  return process.env[args.name] ?? null
})

ipcMain.handle('get-version', (): string => {
  return app.getVersion()
})

ipcMain.handle('toggle-maximize', (): void => {
  const win = getMainWindow()
  if (!win) return
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})

ipcMain.handle('quit', (): void => {
  app.quit()
})

ipcMain.handle('relaunch', (): void => {
  app.relaunch()
  app.quit()
})

// Shell execution for GSD ExecutionTab — spawn a CLI command and stream output
const spawnedCommands = new Map<string, ChildProcess>()

ipcMain.handle(
  'spawn_command',
  (_event, args: { command: string; cliArgs: string[]; cwd: string }) => {
    const child = spawn(args.command, args.cliArgs, {
      cwd: args.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const commandId = `cmd-${Date.now()}`
    spawnedCommands.set(commandId, child)

    const win = getMainWindow()

    if (child.stdout) {
      const rl = createInterface({ input: child.stdout })
      rl.on('line', (line: string) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('command:stdout', { commandId, data: line })
        }
      })
    }

    if (child.stderr) {
      const rl = createInterface({ input: child.stderr })
      rl.on('line', (line: string) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('command:stderr', { commandId, data: line })
        }
      })
    }

    child.on('close', (code: number | null) => {
      spawnedCommands.delete(commandId)
      if (win && !win.isDestroyed()) {
        win.webContents.send('command:close', { commandId, code })
      }
    })

    child.on('error', (err: Error) => {
      spawnedCommands.delete(commandId)
      if (win && !win.isDestroyed()) {
        win.webContents.send('command:error', { commandId, error: err.message })
      }
    })

    return { commandId, pid: child.pid }
  },
)

ipcMain.handle('kill_command', (_event, args: { id: string }): void => {
  const child = spawnedCommands.get(args.id)
  if (child) {
    child.kill()
    spawnedCommands.delete(args.id)
  }
})
