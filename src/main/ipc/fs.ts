import fs from 'node:fs'
import path from 'node:path'
import { ipcMain } from 'electron'

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
}

function buildTree(dirPath: string, basePath: string): TreeNode[] {
  const nodes: TreeNode[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return nodes
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    // Skip hidden files/dirs
    if (entry.name.startsWith('.')) continue

    const fullPath = path.join(dirPath, entry.name)
    const relativePath = path.relative(basePath, fullPath)

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'dir',
        children: buildTree(fullPath, basePath),
      })
    } else {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      })
    }
  }

  return nodes
}

const FAVICON_CANDIDATES = [
  'favicon.svg',
  'favicon.ico',
  'favicon.png',
  'public/favicon.svg',
  'public/favicon.ico',
  'public/favicon.png',
  'app/favicon.ico',
  'app/favicon.png',
  'app/icon.svg',
  'app/icon.png',
  'app/icon.ico',
  'src/favicon.ico',
  'src/favicon.svg',
  'src/app/favicon.ico',
  'src/app/icon.svg',
  'src/app/icon.png',
  'assets/icon.svg',
  'assets/icon.png',
  'assets/logo.svg',
  'assets/logo.png',
]

function mimeForExt(ext: string): string {
  switch (ext) {
    case 'svg': return 'image/svg+xml'
    case 'png': return 'image/png'
    case 'ico': return 'image/x-icon'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    default: return 'application/octet-stream'
  }
}

ipcMain.handle('read_file', (_event, args: { path: string }): string => {
  return fs.readFileSync(args.path, 'utf-8')
})

ipcMain.handle('read_dir_tree', (_event, args: { path: string }): TreeNode[] => {
  const p = args.path
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    throw new Error(`Not a directory: ${p}`)
  }
  return buildTree(p, p)
})

ipcMain.handle('path_exists', (_event, args: { path: string }): boolean => {
  return fs.existsSync(args.path)
})

ipcMain.handle('list_dir', (_event, args: { path: string }): string[] => {
  const p = args.path
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    throw new Error(`Not a directory: ${p}`)
  }
  const entries = fs.readdirSync(p)
  entries.sort()
  return entries
})

ipcMain.handle(
  'find_project_favicon',
  (_event, args: { projectPath: string }): string | null => {
    for (const candidate of FAVICON_CANDIDATES) {
      const fullPath = path.join(args.projectPath, candidate)
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        try {
          const bytes = fs.readFileSync(fullPath)
          const ext = path.extname(fullPath).slice(1) || 'png'
          const mime = mimeForExt(ext)
          const b64 = bytes.toString('base64')
          return `data:${mime};base64,${b64}`
        } catch {
          continue
        }
      }
    }
    return null
  },
)
