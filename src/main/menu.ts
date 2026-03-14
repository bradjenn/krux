import { type BrowserWindow, Menu, app } from 'electron'

export function buildMenu(window: BrowserWindow): void {
  const send = (id: string) => {
    if (!window.isDestroyed()) {
      window.webContents.send('menu-action', id)
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => send('check-for-updates'),
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => send('settings'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+T',
          click: () => send('new-terminal'),
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => send('close-tab'),
        },
        { type: 'separator' },
        {
          label: 'Add Project...',
          click: () => send('add-project'),
        },
        {
          label: 'Switch Project...',
          accelerator: 'CmdOrCtrl+K',
          click: () => send('project-switcher'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => send('toggle-sidebar'),
        },
        { type: 'separator' },
        {
          label: 'Increase Font Size',
          accelerator: 'CmdOrCtrl+=',
          click: () => send('font-increase'),
        },
        {
          label: 'Decrease Font Size',
          accelerator: 'CmdOrCtrl+-',
          click: () => send('font-decrease'),
        },
        {
          label: 'Reset Font Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => send('font-reset'),
        },
        { type: 'separator' },
        {
          label: 'Change Wallpaper',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => send('change-wallpaper'),
        },
        {
          label: 'Change Theme',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => send('change-theme'),
        },
        {
          label: 'Increase Background Opacity',
          accelerator: 'CmdOrCtrl+Shift+=',
          click: () => send('opacity-increase'),
        },
        {
          label: 'Decrease Background Opacity',
          accelerator: 'CmdOrCtrl+Shift+-',
          click: () => send('opacity-decrease'),
        },
        {
          label: 'Increase Background Blur',
          accelerator: 'CmdOrCtrl+Alt+=',
          click: () => send('blur-increase'),
        },
        {
          label: 'Decrease Background Blur',
          accelerator: 'CmdOrCtrl+Alt+-',
          click: () => send('blur-decrease'),
        },
        { type: 'separator' },
        {
          label: 'GSD Workflow',
          accelerator: 'CmdOrCtrl+G',
          click: () => send('open-gsd'),
        },
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => send('open-chat'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: 'Show Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => send('prev-tab'),
        },
        {
          label: 'Show Next Tab',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => send('next-tab'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
