import { useEffect, useState, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore, type Project } from '@/stores/appStore'
import { PLUGINS } from '@/plugins'
import { cn } from '@/lib/utils'

interface SidebarProps {
  visible: boolean
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
    <div className="border-t border-border">
      {availablePlugins.map((plugin) => {
        const Section = plugin.sidebarSection!
        return <Section key={plugin.id} projectId={projectId} projectPath={projectPath} />
      })}
    </div>
  )
}

export default function Sidebar({ visible }: SidebarProps) {
  const { projects, activeProjectId, setProjects, setActiveProject, tabs } = useAppStore()
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

  const filtered = projects.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()),
  )

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
      className={cn(
        "flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200 ease-in-out bg-surface",
        visible && "border-r border-border"
      )}
      style={{
        width: visible ? 340 : 0,
        minWidth: visible ? 340 : 0,
      }}
    >
      {/* Search */}
      <div className="border-b border-border" style={{ padding: '12px 12px 10px' }}>
        <div
          className="flex items-center bg-background border border-border transition-[border-color,box-shadow] duration-150 focus-within:border-secondary focus-within:[box-shadow:0_0_8px_var(--accent2-glow)]"
          style={{
            gap: 10,
            height: 38,
            padding: '0 12px',
            borderRadius: 6,
          }}
          onClick={() => searchRef.current?.focus()}
        >
          <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.5} className="shrink-0 text-dim" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent text-foreground border-none outline-none min-w-0"
            style={{
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          {!search && (
            <kbd
              className="shrink-0 leading-none text-dim bg-white/[0.04] border border-border"
              style={{
                fontSize: 11,
                fontFamily: 'inherit',
                borderRadius: 3,
                padding: '3px 6px',
              }}
            >
              {'\u2318'}K
            </kbd>
          )}
        </div>
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
              className={cn(
                "project-item group flex items-center gap-2.5 w-full text-left transition-all duration-100 cursor-pointer border-l-[3px]",
                isActive
                  ? "border-l-primary bg-primary/[0.04] text-foreground"
                  : "border-l-transparent bg-transparent text-muted-foreground hover:bg-secondary/[0.04]"
              )}
              style={{
                padding: '8px 12px 8px 10px',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: project.color }}
              />

              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-[15px]">
                  {project.name}
                </div>
                <div
                  className="truncate text-[13px] text-dim"
                  style={{ marginTop: 1 }}
                >
                  {project.path.replace(/^\/Users\/[^/]+/, '~')}
                </div>
              </div>

              {termCount > 0 && (
                <div
                  className="flex items-center gap-1 shrink-0 text-[12px] text-primary"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-[pulse_2s_ease-in-out_infinite] [box-shadow:0_0_4px_var(--accent-glow)]"
                  />
                  {termCount > 1 && <span>{termCount}</span>}
                </div>
              )}

              <button
                onClick={(e) => handleRemove(e, project.id)}
                className="project-remove shrink-0 p-1 rounded opacity-0 transition-opacity duration-100 cursor-pointer text-dim hover:text-destructive"
                title="Remove project"
              >
                <HugeiconsIcon icon={Delete01Icon} size={13} strokeWidth={1.5} />
              </button>
            </div>
          )
        })}

        {filtered.length === 0 && projects.length > 0 && (
          <div className="px-4 py-6 text-center text-xs text-dim">
            No matching projects
          </div>
        )}

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-dim opacity-50"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <div className="mt-3 text-base text-muted-foreground">
              No projects yet
            </div>
            <div className="mt-1 text-xs text-dim">
              Click &quot;New Project&quot; to get started
            </div>
          </div>
        )}

      </div>

      {/* Plugin sidebar sections */}
      {activeProjectId && activeProject && (
        <PluginSidebar projectId={activeProjectId} projectPath={activeProject.path} />
      )}

    </div>
  )
}
