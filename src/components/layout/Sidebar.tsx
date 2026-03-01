import { useEffect, useState } from 'react'
import { Plus, Trash2, FolderSearch } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore, type Project } from '../../stores/appStore'
import SettingsDialog from './SettingsDialog'

export default function Sidebar() {
  const { projects, activeProjectId, setProjects, setActiveProject } = useAppStore()
  const [showDiscover, setShowDiscover] = useState(false)
  const [scanPath, setScanPath] = useState('~/Code')
  const [discovered, setDiscovered] = useState<{ name: string; path: string }[]>([])

  useEffect(() => {
    invoke<Project[]>('list_projects').then(setProjects)
  }, [setProjects])

  const handleDiscover = async () => {
    const results = await invoke<{ name: string; path: string }[]>('discover_projects', {
      scanPath,
    })
    setDiscovered(results)
  }

  const handleAddDiscovered = async (d: { name: string; path: string }) => {
    const project = await invoke<Project>('add_project', {
      name: d.name,
      path: d.path,
    })
    setProjects([...projects, project])
    setDiscovered((prev) => prev.filter((p) => p.path !== d.path))
  }

  const handleRemove = async (id: string) => {
    await invoke('remove_project', { id })
    setProjects(projects.filter((p) => p.id !== id))
    if (activeProjectId === id) {
      setActiveProject(null)
    }
  }

  return (
    <div
      className="flex flex-col h-full w-56 border-r"
      style={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors"
            style={{
              color: activeProjectId === project.id ? 'var(--text)' : 'var(--text-muted)',
              backgroundColor: activeProjectId === project.id ? 'var(--bg)' : 'transparent',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(project.id)
              }}
              className="ml-auto opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5"
              style={{ color: 'var(--text-dim)' }}
              title="Remove project"
            >
              <Trash2 size={12} />
            </button>
          </button>
        ))}
      </div>

      {/* Discover panel */}
      {showDiscover && (
        <div className="border-t p-2 space-y-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-1">
            <input
              type="text"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded border bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Scan path..."
            />
            <button
              onClick={handleDiscover}
              className="px-2 py-1 text-xs rounded"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
            >
              Scan
            </button>
          </div>
          {discovered.map((d) => (
            <button
              key={d.path}
              onClick={() => handleAddDiscovered(d)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-left rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <Plus size={12} />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
          {discovered.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Click Scan to find projects
            </p>
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div className="border-t p-2 flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowDiscover(!showDiscover)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Discover projects"
        >
          <FolderSearch size={14} />
          <span>Discover</span>
        </button>
        <SettingsDialog />
      </div>
    </div>
  )
}
