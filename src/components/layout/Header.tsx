import { HugeiconsIcon } from '@hugeicons/react'
import {
  SidebarLeft01Icon,
  PlusSignIcon,
  CommandLineIcon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  sidebarVisible: boolean
  onToggleSidebar: () => void
  onAddProject: () => void
}

export default function Header({
  sidebarVisible,
  onToggleSidebar,
  onAddProject,
}: HeaderProps) {
  return (
    <header
      className="flex items-center shrink-0 select-none z-10"
      data-tauri-drag-region
      style={{
        height: 46,
        padding: '0 16px 0 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 font-semibold tracking-wide shrink-0"
        style={{ fontSize: 13, color: 'var(--accent)' }}
      >
        <HugeiconsIcon icon={CommandLineIcon} size={20} strokeWidth={2} />
        <span>cc-manager</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={onToggleSidebar} title="Toggle sidebar">
          <HugeiconsIcon
            icon={SidebarLeft01Icon}
            size={16}
            strokeWidth={1.5}
            style={{ opacity: sidebarVisible ? 1 : 0.5 }}
          />
        </Button>
        <Button variant="outline" size="sm" onClick={onAddProject} title="Add project">
          <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={2} />
          <span>Project</span>
        </Button>
      </div>
    </header>
  )
}
