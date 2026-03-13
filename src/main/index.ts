import path from 'node:path'
import { BrowserWindow, app, net, protocol, screen } from 'electron'
import { setMainWindow } from './window'

// IPC handler registration (imported for side-effects)
import './ipc/chat'
import './ipc/fs'
import './ipc/projects'
import './ipc/pty'
import './ipc/settings'
import './ipc/updater'
import './ipc/utils'
import { buildMenu } from './menu'

// Register custom protocol for serving local files (wallpapers, favicons)
// Must happen before app.whenReady()
protocol.registerSchemesAsPrivileged([
  { scheme: 'krux-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
])

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    title: 'Krux',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 10 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for node-pty IPC
    },
  })

  setMainWindow(win)

  // Centre if smaller than screen
  if (1280 < screenW && 820 < screenH) {
    win.center()
  }

  // Build native menu
  buildMenu(win)

  // Dev or production
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.on('closed', () => {
    setMainWindow(null)
  })
}

app.whenReady().then(async () => {
  // Set dock icon in dev (packaged builds use forge.config.ts icon)
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(path.join(__dirname, '../../build/icon.png'))
  }
  // Handle krux-file:// protocol — maps to local filesystem
  protocol.handle('krux-file', (request) => {
    const filePath = decodeURIComponent(request.url.replace('krux-file://', ''))
    return net.fetch(`file://${filePath}`)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
