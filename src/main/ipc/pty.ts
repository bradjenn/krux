import { ipcMain } from 'electron'
import { type IPty, spawn } from 'node-pty'
import { v4 as uuidv4 } from 'uuid'
import { getMainWindow } from '../window'

const terminals = new Map<string, IPty>()

ipcMain.handle(
  'create_terminal',
  (_event, args: { projectPath: string; cols: number; rows: number }): string => {
    const { projectPath, cols, rows } = args

    const shell = process.env.SHELL || '/bin/zsh'
    const terminalId = uuidv4()

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    }

    // Ensure UTF-8 locale
    if (!env.LANG) env.LANG = 'en_US.UTF-8'
    if (!env.LC_CTYPE) env.LC_CTYPE = 'en_US.UTF-8'

    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: projectPath,
      env,
    })

    pty.onData((data: string) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:output', {
          terminal_id: terminalId,
          data,
        })
      }
    })

    pty.onExit(() => {
      terminals.delete(terminalId)
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:exit', {
          terminal_id: terminalId,
        })
      }
    })

    terminals.set(terminalId, pty)
    return terminalId
  },
)

ipcMain.handle(
  'write_terminal',
  (_event, args: { terminalId: string; data: string }): void => {
    const pty = terminals.get(args.terminalId)
    if (pty) pty.write(args.data)
  },
)

ipcMain.handle(
  'resize_terminal',
  (_event, args: { terminalId: string; cols: number; rows: number }): void => {
    const pty = terminals.get(args.terminalId)
    if (pty) pty.resize(args.cols, args.rows)
  },
)

ipcMain.handle(
  'close_terminal',
  (_event, args: { terminalId: string }): void => {
    const pty = terminals.get(args.terminalId)
    if (pty) {
      pty.kill()
      terminals.delete(args.terminalId)
    }
  },
)
