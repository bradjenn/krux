import { useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete01Icon, NoteAddIcon } from '@hugeicons/core-free-icons'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore, type Project } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface SidebarProps {
  visible: boolean
  onAddProject: () => void
}

export default function Sidebar({ visible, onAddProject }: SidebarProps) {
  const { projects, activeProjectId, setProjects, setActiveProject, tabs } = useAppStore()

  useEffect(() => {
    invoke<Project[]>('list_projects').then(setProjects)
  }, [setProjects])

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
      {/* Sidebar header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-foreground font-semibold" style={{ fontSize: 15 }}>
          Projects
        </span>
        <button
          onClick={onAddProject}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors duration-100 cursor-pointer"
          title="Add project"
        >
          <HugeiconsIcon icon={NoteAddIcon} size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-1">
        {projects.map((project) => {
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
              Tap the icon above to add one
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
