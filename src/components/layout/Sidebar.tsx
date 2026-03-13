import { Delete01Icon, NoteAddIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { invoke } from '@tauri-apps/api/core'
import { Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ProjectFavicon from '@/components/ProjectFavicon'
import { cn } from '@/lib/utils'
import { type Project, useAppStore } from '@/stores/appStore'

interface SidebarProps {
  visible: boolean
  onAddProject: () => void
  wallpaperActive?: boolean
  backgroundOpacity?: number
}

export default function Sidebar({
  visible,
  onAddProject,
  wallpaperActive,
  backgroundOpacity = 0.8,
}: SidebarProps) {
  const { projects, activeProjectId, setProjects, setActiveProject, setActiveView, tabs } =
    useAppStore()
  const keyboardMode = useAppStore((s) => s.keyboardMode)
  const sidebarSelectedIndex = useAppStore((s) => s.sidebarSelectedIndex)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    invoke<Project[]>('list_projects').then(setProjects)
  }, [setProjects])

  // Scroll selected item into view when in sidebar mode
  useEffect(() => {
    if (keyboardMode !== 'sidebar' || !listRef.current) return
    const item = listRef.current.children[sidebarSelectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [keyboardMode, sidebarSelectedIndex])

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
        'flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200 ease-in-out relative z-[1]',
        !wallpaperActive && 'bg-surface',
        visible && 'border-r border-border',
      )}
      style={{
        width: visible ? 340 : 0,
        minWidth: visible ? 340 : 0,
        ...(wallpaperActive
          ? {
              background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
            }
          : {}),
      }}
    >
      {/* Branded header — inline with macOS traffic lights */}
      <div
        data-tauri-drag-region=""
        className="shrink-0 flex items-start pl-[78px] pr-4 pt-[7px] pb-4"
      >
        <span className="text-sm font-medium tracking-tight text-foreground">Krux</span>
      </div>

      {/* PROJECTS section header */}
      <div className="shrink-0 flex items-center justify-between px-4 pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
          Projects
        </span>
        <button
          type="button"
          onClick={onAddProject}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors duration-100 cursor-pointer"
          title="Add project"
        >
          <HugeiconsIcon icon={NoteAddIcon} size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Project list */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {projects.map((project, index) => {
          const isActive = activeProjectId === project.id
          const termCount = getTerminalCount(project.id)
          const isVimSelected = keyboardMode === 'sidebar' && index === sidebarSelectedIndex

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveProject(project.id)
                }
              }}
              className={cn(
                'project-item group flex items-center gap-2.5 w-full text-left transition-all duration-100 cursor-pointer border-l-[3px]',
                isActive
                  ? 'border-l-primary bg-primary/[0.04] text-foreground'
                  : 'border-l-transparent bg-transparent text-muted-foreground hover:bg-secondary/[0.04]',
                isVimSelected && 'sidebar-vim-selected',
              )}
              style={{
                padding: '8px 12px 8px 10px',
              }}
            >
              <ProjectFavicon projectPath={project.path} />

              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-[15px]">{project.name}</div>
                <div className="truncate text-[13px] text-dim" style={{ marginTop: 1 }}>
                  {project.path.replace(/^\/Users\/[^/]+/, '~')}
                </div>
              </div>

              {termCount > 0 && (
                <div className="flex items-center gap-1 shrink-0 text-[12px] text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[pulse_2s_ease-in-out_infinite] [box-shadow:0_0_4px_var(--accent-glow)]" />
                  {termCount > 1 && <span>{termCount}</span>}
                </div>
              )}

              <button
                type="button"
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
              aria-hidden="true"
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
            <div className="mt-3 text-base text-muted-foreground">No projects yet</div>
            <div className="mt-1 text-xs text-dim">Tap the icon above to add one</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0">
        {keyboardMode === 'sidebar' && (
          <div
            className="flex items-center gap-3 text-dim font-mono border-t border-b border-border"
            style={{ padding: '4px 12px', fontSize: 10 }}
          >
            <span>
              <kbd className="text-secondary">j/k</kbd> nav
            </span>
            <span>
              <kbd className="text-secondary">Enter</kbd> select
            </span>
            <span>
              <kbd className="text-secondary">Esc</kbd> back
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          className="flex items-center gap-2.5 px-4 border-t border-border text-[12.5px] text-dim transition-colors hover:text-foreground hover:bg-foreground/[0.03] cursor-pointer w-full"
          style={{ height: 32 }}
        >
          <Settings size={14} strokeWidth={1.5} />
          Settings
        </button>
      </div>
    </div>
  )
}
