import { HugeiconsIcon } from '@hugeicons/react'
import {
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/appStore'

interface HeaderProps {
  onAddProject: () => void
}

export default function Header({
  onAddProject,
}: HeaderProps) {
  const { projects, tabs } = useAppStore()
  const activeSessions = new Set(tabs.filter((t) => t.type === 'shell').map((t) => t.projectId)).size

  return (
    <header
      className="flex items-center shrink-0 select-none z-10 border-b border-border bg-surface"
      data-tauri-drag-region
      style={{
        height: 54,
        padding: '0 16px',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0" data-tauri-drag-region>
        <div
          className="flex items-center justify-center shrink-0 rounded-lg font-bold bg-primary text-background [box-shadow:0_0_12px_var(--accent-glow),0_0_25px_rgba(200,255,0,0.06)]"
          style={{
            width: 34,
            height: 34,
            fontSize: 13,
            letterSpacing: '0.5px',
          }}
        >
          CC
        </div>
        <div data-tauri-drag-region>
          <div className="flex items-center gap-1.5" style={{ fontSize: 14 }}>
            <span className="font-semibold text-foreground">Claude Code</span>
            <span
              className="font-semibold text-primary [text-shadow:0_0_10px_var(--accent-glow)]"
            >
              Manager
            </span>
          </div>
          <div
            className="uppercase tracking-widest text-dim"
            style={{ fontSize: 10, marginTop: 1 }}
          >
            {projects.length} project{projects.length !== 1 ? 's' : ''}
            {' \u00b7 '}
            {activeSessions} active session{activeSessions !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex-1" data-tauri-drag-region />

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={onAddProject}
          title="Add project"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={2.5} />
          <span>New Project</span>
        </Button>
      </div>
    </header>
  )
}
