import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Cancel01Icon, CommandLineIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { createTerminal, writeTerminal } from '@/hooks/useTauri'
import { PLUGINS } from '@/plugins'

interface TabBarProps {
  onCloseTab: (id: string) => void
}

export default function TabBar({ onCloseTab }: TabBarProps) {
  const { tabs, activeTabId, activeProjectId, projects, addTab, setActiveTab } =
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
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current && !plusBtnRef.current.contains(e.target as Node)
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

  const handleStartGsd = async () => {
    if (!activeProject) return
    const terminalId = await createTerminal(activeProject.path, 80, 24)
    addTab({
      id: crypto.randomUUID(),
      type: 'shell',
      label: 'GSD Init',
      projectId: activeProject.id,
      terminalId,
    })
    setMenuOpen(false)
    setTimeout(() => {
      writeTerminal(terminalId, 'claude "/gsd:new-project"\r')
    }, 500)
  }

  const handlePlusClick = () => {
    if (PLUGINS.length === 0) {
      handleNewShellTab()
    } else {
      if (plusBtnRef.current) {
        const rect = plusBtnRef.current.getBoundingClientRect()
        setMenuPos({ top: rect.bottom, left: rect.left })
      }
      setMenuOpen(!menuOpen)
    }
  }

  if (!activeProjectId) return null

  return (
    <div
      className="flex items-stretch shrink-0 select-none overflow-x-auto bg-surface border-b border-border"
      style={{
        height: 36,
        scrollbarWidth: 'none',
      }}
    >
      {projectTabs.map((tab) => {
        const isActive = activeTabId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "tab group flex items-center gap-1.5 shrink-0 transition-colors duration-100 cursor-pointer text-xs hover:text-foreground hover:bg-white/[0.02]",
              isActive
                ? 'text-foreground border-b-2 border-primary bg-white/[0.02]'
                : 'text-muted-foreground border-b-2 border-transparent'
            )}
            style={{
              padding: '0 14px',
              height: '100%',
            }}
          >
            <span>{tab.label}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
              className="tab-close opacity-0 group-hover:opacity-100 transition-opacity duration-100 p-0.5 rounded hover:text-destructive hover:bg-destructive/[0.15]"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
            </span>
          </button>
        )
      })}

      {/* New tab button */}
      <button
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

      {/* Dropdown via portal to escape overflow clipping */}
      {menuOpen && createPortal(
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
            onClick={handleNewShellTab}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
          >
            <HugeiconsIcon icon={CommandLineIcon} size={14} strokeWidth={1.5} />
            Terminal
          </button>

          {PLUGINS.length > 0 && (
            <>
              <div className="mx-2 my-1 bg-border" style={{ height: 1 }} />
              {PLUGINS.map((plugin) => (
                <button
                  key={plugin.id}
                  onClick={handleStartGsd}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
                >
                  <plugin.icon size={14} />
                  {plugin.name}
                </button>
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
