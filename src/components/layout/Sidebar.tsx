import { useEffect, useState, useRef } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore, type Project } from '../../stores/appStore'

interface SidebarProps {
  visible: boolean
  onOpenDiscover: () => void
}

export default function Sidebar({ visible, onOpenDiscover }: SidebarProps) {
  const { projects, activeProjectId, setProjects, setActiveProject, tabs } = useAppStore()
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    invoke<Project[]>('list_projects').then(setProjects)
  }, [setProjects])

  // Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = search
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.path.toLowerCase().includes(search.toLowerCase()),
      )
    : projects

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await invoke('remove_project', { id })
    setProjects(projects.filter((p) => p.id !== id))
    if (activeProjectId === id) setActiveProject(null)
  }

  const getTerminalCount = (projectId: string) =>
    tabs.filter((t) => t.projectId === projectId && t.type === 'shell').length

  return (
    <div
      className="flex flex-col h-full shrink-0 border-r select-none overflow-hidden transition-all duration-200 ease-in-out"
      style={{
        width: visible ? 280 : 0,
        minWidth: visible ? 280 : 0,
        borderColor: 'var(--border)',
        background: 'var(--bg2)',
      }}
    >
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-dim)' }}
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects... (⌘K)"
            className="w-full py-1.5 pl-8 pr-3 rounded transition-colors duration-150"
            style={{
              fontSize: 13,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent2)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          />
        </div>
      </div>

      {/* Scan button */}
      <div className="px-3 pb-2">
        <button
          onClick={onOpenDiscover}
          className="w-full py-1.5 rounded transition-all duration-150"
          style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            border: '1px dashed var(--border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-dim)'
          }}
        >
          Scan for projects
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((project) => {
          const isActive = activeProjectId === project.id
          const termCount = getTerminalCount(project.id)

          return (
            <button
              key={project.id}
              onClick={() => setActiveProject(project.id)}
              className="group flex items-center gap-2.5 w-full text-left transition-all duration-100"
              style={{
                padding: '10px 12px',
                borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                background: isActive ? 'rgba(71,255,156,0.06)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(15,197,237,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {/* Color dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: project.color }}
              />

              {/* Name + path */}
              <div className="flex-1 min-w-0">
                <div
                  className="truncate font-medium"
                  style={{ fontSize: 13 }}
                >
                  {project.name}
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}
                >
                  {project.path.replace(/^\/Users\/[^/]+/, '~')}
                </div>
              </div>

              {/* Terminal count badge */}
              {termCount > 0 && (
                <div
                  className="flex items-center gap-1 shrink-0"
                  style={{ fontSize: 10, color: 'var(--accent)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'var(--accent)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                  {termCount > 1 && <span>{termCount}</span>}
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={(e) => handleRemove(e, project.id)}
                className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--danger)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-dim)'
                }}
                title="Remove project"
              >
                <Trash2 size={12} />
              </button>
            </button>
          )
        })}

        {filtered.length === 0 && projects.length > 0 && (
          <div className="px-4 py-6 text-center" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            No matching projects
          </div>
        )}

        {projects.length === 0 && (
          <div className="px-4 py-8 text-center" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            No projects yet.
            <br />
            Click "Scan for projects" or use the + button.
          </div>
        )}
      </div>
    </div>
  )
}
