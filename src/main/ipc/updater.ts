import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getMainWindow } from '../window'

// Disable auto-download — let renderer decide when to install
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function send(channel: string, data?: unknown) {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

autoUpdater.on('update-available', (info) => {
  send('updater:available', { version: info.version })
})

autoUpdater.on('update-not-available', () => {
  send('updater:not-available')
})

autoUpdater.on('download-progress', (progress) => {
  send('updater:progress', { percent: Math.round(progress.percent) })
})

autoUpdater.on('update-downloaded', () => {
  send('updater:downloaded')
})

autoUpdater.on('error', (err) => {
  // Ignore missing app-update.yml (electron-forge doesn't generate it)
  if (err.message.includes('app-update.yml')) return
  send('updater:error', { message: err.message })
})

ipcMain.handle('check-for-update', async () => {
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // Silently fail in dev or if no update server configured
  }
})

ipcMain.handle('download-update', async () => {
  await autoUpdater.downloadUpdate()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall()
})
