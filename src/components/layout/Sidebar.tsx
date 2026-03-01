import { useEffect, useState, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete01Icon, Settings02Icon } from '@hugeicons/core-free-icons'
import { invoke } from '@tauri-apps/api/core'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAppStore, type Project } from '@/stores/appStore'
import { PLUGINS } from '@/plugins'

interface SidebarProps {
  visible: boolean
  onOpenDiscover: () => void
}

function PluginSidebar({ projectId, projectPath }: { projectId: string; projectPath: string }) {
  const [availablePlugins, setAvailablePlugins] = useState<typeof PLUGINS>([])

  useEffect(() => {
    async function check() {
      const available = []
      for (const plugin of PLUGINS) {
        if (plugin.sidebarSection) {
          const isAvail = plugin.isAvailable ? await plugin.isAvailable(projectPath) : true
          if (isAvail) available.push(plugin)
        }
      }
      setAvailablePlugins(available)
    }
    check()
  }, [projectId, projectPath])

  if (availablePlugins.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      {availablePlugins.map((plugin) => {
        const Section = plugin.sidebarSection!
        return <Section key={plugin.id} projectId={projectId} projectPath={projectPath} />
      })}
    </div>
  )
}

export default function Sidebar({ visible, onOpenDiscover }: SidebarProps) {
  const { projects, activeProjectId, setProjects, setActiveProject, tabs, activeView, setActiveView } = useAppStore()
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  useEffect(() => {
    invoke<Project[]>('list_projects').then(setProjects)
  }, [setProjects])

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
      className="flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200 ease-in-out"
      style={{
        width: visible ? 280 : 0,
        minWidth: visible ? 280 : 0,
        borderRight: visible ? '1px solid var(--border)' : 'none',
        background: 'var(--bg2)',
      }}
    >
      {/* Search */}
      <div className="p-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects... (Cmd+K)"
          className="text-xs py-[7px]"
        />
      </div>

      {/* Scan */}
      <div className="px-2 pb-1.5 pt-1">
        <Button variant="dashed" size="sm" className="w-full text-[11px]" onClick={onOpenDiscover}>
          Scan
        </Button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.map((project) => {
          const isActive = activeProjectId === project.id
          const termCount = getTerminalCount(project.id)

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveProject(project.id)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveProject(project.id)}
              className="project-item group flex items-center gap-2.5 w-full text-left transition-all duration-100 cursor-pointer"
              style={{
                padding: '7px 10px 7px 9px',
                borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                background: isActive ? 'rgba(71,255,156,0.06)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(15,197,237,0.05)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: project.color }}
              />

              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-[13px]">
                  {project.name}
                </div>
                <div
                  className="truncate text-[11px]"
                  style={{ color: 'var(--text-dim)', marginTop: 1 }}
                >
                  {project.path.replace(/^\/Users\/[^/]+/, '~')}
                </div>
              </div>

              {termCount > 0 && (
                <div
                  className="flex items-center gap-1 shrink-0 text-[10px]"
                  style={{ color: 'var(--accent)' }}
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

              <button
                onClick={(e) => handleRemove(e, project.id)}
                className="project-remove shrink-0 p-1 rounded opacity-0 transition-opacity duration-100 cursor-pointer hover:text-[var(--danger)]"
                style={{ color: 'var(--text-dim)' }}
                title="Remove project"
              >
                <HugeiconsIcon icon={Delete01Icon} size={13} strokeWidth={1.5} />
              </button>
            </div>
          )
        })}

        {filtered.length === 0 && projects.length > 0 && (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
            No matching projects
          </div>
        )}

        {projects.length === 0 && (
          <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
            No projects yet.
            <br />
            Click &quot;Scan&quot; to discover projects.
          </div>
        )}
      </div>

      {/* Plugin sidebar sections */}
      {activeProjectId && activeProject && (
        <PluginSidebar projectId={activeProjectId} projectPath={activeProject.path} />
      )}

      {/* Settings footer */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 10px',
        }}
      >
        <button
          onClick={() => setActiveView('settings')}
          className="flex items-center gap-2 w-full rounded-md px-2.5 py-2 text-xs transition-colors duration-100 cursor-pointer"
          style={{
            color: activeView === 'settings' ? 'var(--accent)' : 'var(--text-muted)',
            background: activeView === 'settings' ? 'rgba(71,255,156,0.06)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (activeView !== 'settings') e.currentTarget.style.background = 'rgba(15,197,237,0.05)'
          }}
          onMouseLeave={(e) => {
            if (activeView !== 'settings') e.currentTarget.style.background = 'transparent'
          }}
        >
          <HugeiconsIcon icon={Settings02Icon} size={15} strokeWidth={1.5} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
