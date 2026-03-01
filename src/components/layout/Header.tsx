import { PanelLeft, Settings, Plus } from 'lucide-react'

interface HeaderProps {
  sidebarVisible: boolean
  onToggleSidebar: () => void
  onOpenSettings: () => void
  onAddProject: () => void
}

export default function Header({
  sidebarVisible,
  onToggleSidebar,
  onOpenSettings,
  onAddProject,
}: HeaderProps) {
  return (
    <header
      className="flex items-center shrink-0 px-4 select-none"
      style={{
        height: 46,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span className="font-semibold tracking-tight" style={{ fontSize: 13, color: 'var(--accent)' }}>
          cc-manager
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <HeaderButton onClick={onToggleSidebar} title="Toggle sidebar">
          <PanelLeft size={14} style={{ opacity: sidebarVisible ? 1 : 0.5 }} />
        </HeaderButton>
        <HeaderButton onClick={onOpenSettings} title="Settings">
          <Settings size={14} />
        </HeaderButton>
        <HeaderButton onClick={onAddProject} title="Add project" accent>
          <Plus size={14} />
          <span>Project</span>
        </HeaderButton>
      </div>
    </header>
  )
}

function HeaderButton({
  children,
  onClick,
  title,
  accent,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all duration-150"
      style={{
        fontSize: 12,
        color: accent ? 'var(--accent)' : 'var(--text-muted)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent ? 'var(--accent)' : 'var(--text-dim)'
        e.currentTarget.style.color = accent ? 'var(--accent)' : 'var(--text)'
        e.currentTarget.style.background = accent ? 'rgba(71,255,156,0.06)' : 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = accent ? 'var(--accent)' : 'var(--text-muted)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
