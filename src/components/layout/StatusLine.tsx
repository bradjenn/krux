import { useGitBranch } from '@/hooks/useGitBranch'
import { useAppStore } from '@/stores/appStore'

const MODE_COLORS: Record<string, string> = {
  terminal: 'var(--green)',
  prefix: 'var(--yellow)',
  sidebar: 'var(--accent2)',
}

const MODE_LABELS: Record<string, string> = {
  terminal: 'TERMINAL',
  prefix: 'PREFIX',
  sidebar: 'SIDEBAR',
}

export default function StatusLine() {
  const keyboardMode = useAppStore((s) => s.keyboardMode)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const projects = useAppStore((s) => s.projects)
  const tabs = useAppStore((s) => s.tabs)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const terminalCount = tabs.filter(
    (t) => t.projectId === activeProjectId && t.type === 'shell',
  ).length

  const gitBranch = useGitBranch(activeProject?.path ?? null)

  const modeColor = MODE_COLORS[keyboardMode] ?? 'var(--text-dim)'
  const modeLabel = MODE_LABELS[keyboardMode] ?? keyboardMode.toUpperCase()

  return (
    <div
      className="flex items-center shrink-0 border-t border-border text-[11px] font-mono select-none z-20 relative"
      style={{ height: 24, padding: '0 10px', background: 'var(--bg)' }}
    >
      {/* Left: mode indicator */}
      <div className="flex items-center gap-2">
        <span
          className="font-bold px-1.5 rounded-sm"
          style={{
            color: 'var(--bg)',
            background: modeColor,
            fontSize: 10,
            lineHeight: '16px',
          }}
        >
          {modeLabel}
        </span>
      </div>

      {/* Center: project name */}
      <div className="flex-1 text-center text-dim truncate px-4">
        {activeProject ? (
          <span className="text-muted-foreground">{activeProject.name}</span>
        ) : (
          <span className="text-dim">No project</span>
        )}
      </div>

      {/* Right: git branch + terminal count */}
      <div className="flex items-center gap-3 text-dim">
        {gitBranch && (
          <span className="flex items-center gap-1">
            <svg
              aria-hidden="true"
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-muted-foreground"
            >
              <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
            </svg>
            <span className="text-muted-foreground">{gitBranch}</span>
          </span>
        )}
        {terminalCount > 0 && (
          <span className="text-muted-foreground">
            {terminalCount} term{terminalCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
