import {
  Cancel01Icon,
  CommandLineIcon,
  GitBranchIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ClaudeLogo from '@/components/icons/ClaudeLogo'
import OpenAILogo from '@/components/icons/OpenAILogo'
import OpenCodeLogo from '@/components/icons/OpenCodeLogo'
import { createTerminal } from '@/hooks/useTauri'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

interface TabBarProps {
  onCloseTab: (id: string) => void
  wallpaperActive?: boolean
  backgroundOpacity?: number
  chatOpen?: boolean
  onToggleChat?: () => void
}

export default function TabBar({
  onCloseTab,
  wallpaperActive,
  backgroundOpacity = 0.8,
  chatOpen,
  onToggleChat,
}: TabBarProps) {
  const { tabs, activeTabId, activeProjectId, projects, addTab, setActiveTab, hideTitlebar } =
    useAppStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  const projectTabs = tabs.filter((t) => t.projectId === activeProjectId)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleNewShellTab = async () => {
    if (!activeProject) return
    const shellCount = projectTabs.filter((t) => t.type === 'shell').length
    const terminalId = await createTerminal(activeProject.path, 80, 24)
    addTab({
      id: crypto.randomUUID(),
      type: 'shell',
      label: `Terminal ${shellCount + 1}`,
      projectId: activeProject.id,
      terminalId,
    })
    setMenuOpen(false)
  }

  const handleOpenTool = (type: string, label: string) => {
    if (!activeProject) return
    const existing = tabs.find((t) => t.type === type && t.projectId === activeProject.id)
    if (existing) {
      setActiveTab(existing.id)
    } else {
      addTab({
        id: crypto.randomUUID(),
        type,
        label,
        projectId: activeProject.id,
      })
    }
    setMenuOpen(false)
  }

  const handlePlusClick = () => {
    if (plusBtnRef.current) {
      const rect = plusBtnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom, left: rect.left })
    }
    setMenuOpen(!menuOpen)
  }

  if (!activeProjectId) return null

  return (
    <div
      className={cn(
        'flex items-stretch shrink-0 select-none overflow-x-auto border-b border-border relative z-[1]',
      )}
      style={{
        height: 36,
        scrollbarWidth: 'none',
        ...(wallpaperActive
          ? {
              background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
            }
          : {}),
      }}
      {...(hideTitlebar ? { 'data-tauri-drag-region': '' } : {})}
    >
      {projectTabs.map((tab, index) => {
        const isActive = activeTabId === tab.id
        return (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setActiveTab(tab.id)
              }
            }}
            className={cn(
              'tab group flex items-center gap-1.5 shrink-0 transition-colors duration-100 cursor-pointer text-xs hover:text-foreground hover:bg-white/[0.02]',
              isActive
                ? 'text-foreground border-b-2 border-primary bg-white/[0.02]'
                : 'text-muted-foreground border-b-2 border-transparent',
            )}
            style={{
              padding: '0 14px',
              height: '100%',
            }}
          >
            <span>{tab.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
              className="tab-close opacity-0 group-hover:opacity-100 transition-opacity duration-100 p-0.5 rounded hover:text-destructive hover:bg-destructive/[0.15]"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
            </button>
          </div>
        )
      })}

      {/* New tab button */}
      <button
        type="button"
        ref={plusBtnRef}
        onClick={handlePlusClick}
        className="flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer text-dim hover:text-primary"
        style={{
          width: 36,
          height: '100%',
        }}
        title="New tab (⌘T)"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
      </button>

      {/* Spacer pushes chat toggle to far right */}
      <div className="flex-1" />

      {/* Chat panel toggle */}
      {onToggleChat && (
        <button
          type="button"
          onClick={onToggleChat}
          className={cn(
            'flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer',
            chatOpen
              ? 'text-primary border-b-2 border-primary'
              : 'text-dim hover:text-primary border-b-2 border-transparent',
          )}
          style={{
            width: 36,
            height: '100%',
          }}
          title="Toggle chat (Ctrl+A, I)"
        >
          <ClaudeLogo size={16} />
        </button>
      )}

      {/* Dropdown via portal to escape overflow clipping */}
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 py-1 min-w-[160px] bg-surface border border-border"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <button
              type="button"
              onClick={handleNewShellTab}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
            >
              <HugeiconsIcon icon={CommandLineIcon} size={14} strokeWidth={1.5} />
              Terminal
            </button>

            <div className="mx-2 my-1 bg-border" style={{ height: 1 }} />
            <div className="px-3 py-1 text-[10px] text-dim uppercase tracking-wider">AI Tools</div>

            <button
              type="button"
              onClick={() => handleOpenTool('tool:claude-code', 'Claude Code')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
            >
              <ClaudeLogo size={14} />
              Claude Code
            </button>
            <button
              type="button"
              onClick={() => handleOpenTool('tool:codex', 'Codex')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
            >
              <OpenAILogo size={14} />
              Codex
            </button>
            <button
              type="button"
              onClick={() => handleOpenTool('tool:opencode', 'OpenCode')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
            >
              <OpenCodeLogo size={14} />
              OpenCode
            </button>

            <div className="mx-2 my-1 bg-border" style={{ height: 1 }} />
            <div className="px-3 py-1 text-[10px] text-dim uppercase tracking-wider">Dev Tools</div>

            <button
              type="button"
              onClick={() => handleOpenTool('tool:lazygit', 'Lazygit')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
            >
              <HugeiconsIcon icon={GitBranchIcon} size={14} strokeWidth={1.5} />
              Lazygit
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
