import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'

const CONFIG_DIR = path.join(os.homedir(), '.krux')
fs.mkdirSync(CONFIG_DIR, { recursive: true })

const PROJECT_MARKERS = [
  '.git',
  'package.json',
  'CLAUDE.md',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'Gemfile',
  'composer.json',
]

const PROJECT_COLORS = [
  '#47ff9c', '#0fc5ed', '#a277ff', '#ffe073',
  '#e52e2e', '#44ffb1', '#ff79c6', '#bd93f9',
]

interface Project {
  id: string
  name: string
  path: string
  color: string
  created_at: string
}

interface DiscoveredProject {
  name: string
  path: string
}

interface GitStatus {
  branch: string
  added: number
  modified: number
  deleted: number
}

function projectsPath(): string {
  return path.join(CONFIG_DIR, 'projects.json')
}

function loadProjects(): Project[] {
  try {
    if (!fs.existsSync(projectsPath())) return []
    const data = fs.readFileSync(projectsPath(), 'utf-8')
    return JSON.parse(data) as Project[]
  } catch {
    return []
  }
}

function saveProjects(projects: Project[]): void {
  const filePath = projectsPath()
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(projects, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

ipcMain.handle('list_projects', (): Project[] => {
  return loadProjects()
})

ipcMain.handle(
  'add_project',
  (_event, args: { name: string; path: string; color?: string }): Project => {
    const projects = loadProjects()

    if (projects.some((p) => p.path === args.path)) {
      throw new Error('Project with this path already exists')
    }

    const color = args.color ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
    const project: Project = {
      id: uuidv4().slice(0, 8),
      name: args.name,
      path: args.path,
      color,
      created_at: String(Math.floor(Date.now() / 1000)),
    }

    projects.push(project)
    saveProjects(projects)
    return project
  },
)

ipcMain.handle('remove_project', (_event, args: { id: string }): void => {
  const projects = loadProjects()
  const filtered = projects.filter((p) => p.id !== args.id)
  if (filtered.length === projects.length) {
    throw new Error('Project not found')
  }
  saveProjects(filtered)
})

ipcMain.handle('reorder_projects', (_event, args: { ids: string[] }): void => {
  const projects = loadProjects()
  const reordered: Project[] = []

  for (const id of args.ids) {
    const p = projects.find((proj) => proj.id === id)
    if (p) reordered.push(p)
  }

  // Append any projects not in the ids list
  for (const p of projects) {
    if (!args.ids.includes(p.id)) reordered.push(p)
  }

  saveProjects(reordered)
})

ipcMain.handle(
  'discover_projects',
  (_event, args: { scanPath: string }): DiscoveredProject[] => {
    let resolved = args.scanPath
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(2))
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return []
    }

    const knownPaths = new Set(loadProjects().map((p) => p.path))
    const discovered: DiscoveredProject[] = []

    const entries = fs.readdirSync(resolved, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(resolved, entry.name)
      if (knownPaths.has(fullPath)) continue

      const hasMarker = PROJECT_MARKERS.some((m) =>
        fs.existsSync(path.join(fullPath, m)),
      )

      if (hasMarker) {
        discovered.push({ name: entry.name, path: fullPath })
      }
    }

    return discovered
  },
)

ipcMain.handle(
  'get_git_status',
  (_event, args: { projectPath: string }): GitStatus | null => {
    try {
      const stdout = execFileSync('git', ['status', '--porcelain=v2', '--branch'], {
        cwd: args.projectPath,
        encoding: 'utf-8',
        timeout: 5000,
      })

      let branch = ''
      let added = 0
      let modified = 0
      let deleted = 0

      for (const line of stdout.split('\n')) {
        if (line.startsWith('# branch.head ')) {
          branch = line.slice('# branch.head '.length)
        } else if (line.startsWith('?')) {
          added++
        } else if (line.startsWith('1') || line.startsWith('2')) {
          const parts = line.split(' ', 3)
          if (parts.length >= 2) {
            for (const ch of parts[1]) {
              if (ch === 'A') added++
              else if (ch === 'M') modified++
              else if (ch === 'D') deleted++
            }
          }
        }
      }

      if (!branch) return null
      return { branch, added, modified, deleted }
    } catch {
      return null
    }
  },
)
