import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Cancel01Icon, CommandLineIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { createTerminal, writeTerminal } from '@/hooks/useTauri'
import { PLUGINS } from '@/plugins'
import type { PluginDefinition } from '@/plugins/types'

interface TabBarProps {
  onCloseTab: (id: string) => void
}

export default function TabBar({ onCloseTab }: TabBarProps) {
  const { tabs, activeTabId, activeProjectId, projects, addTab, setActiveTab, hideTitlebar } =
    useAppStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [pluginAvailability, setPluginAvailability] = useState<Record<string, boolean>>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  const projectTabs = tabs.filter((t) => t.projectId === activeProjectId)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Check plugin availability whenever the active project changes
  useEffect(() => {
    if (!activeProject) {
      setPluginAvailability({})
      return
    }

    const checkAvailability = async () => {
      const results: Record<string, boolean> = {}
      for (const plugin of PLUGINS) {
        if (plugin.isAvailable) {
          try {
            results[plugin.id] = await plugin.isAvailable(activeProject.path)
          } catch {
            results[plugin.id] = false
          }
        } else {
          results[plugin.id] = true
        }
      }
      setPluginAvailability(results)
    }

    checkAvailability()
  }, [activeProject?.id, activeProject?.path])

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

  // Generic handler to open or focus a plugin tab from the dropdown
  const handleOpenPlugin = (plugin: PluginDefinition) => {
    if (!activeProject) return
    const tabType = plugin.defaultTabType || plugin.tabTypes[0]?.id
    if (!tabType) return

    const existing = tabs.find((t) => t.type === tabType && t.projectId === activeProject.id)
    if (existing) {
      setActiveTab(existing.id)
    } else {
      addTab({
        id: crypto.randomUUID(),
        type: tabType,
        label: plugin.name,
        projectId: activeProject.id,
      })
    }
    setMenuOpen(false)
  }

  // Legacy GSD init handler — runs claude "/gsd:new-project" in a terminal
  const handleGsdInit = async () => {
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
      {...(hideTitlebar ? { 'data-tauri-drag-region': '' } : {})}
    >
      {projectTabs.map((tab, index) => {
        const isActive = activeTabId === tab.id
        const shortcutNum = index < 9 ? index + 1 : null
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
            {shortcutNum && (
              <span
                className={cn(
                  "text-[10px] text-muted-foreground/50"
                )}
              >
                ⌘{shortcutNum}
              </span>
            )}
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
              {PLUGINS.map((plugin) => {
                const available = pluginAvailability[plugin.id] ?? true
                const isGsd = plugin.id === 'gsd'

                if (!available) {
                  // Show disabled state with tooltip when plugin is unavailable
                  return (
                    <button
                      key={plugin.id}
                      disabled
                      title={isGsd ? 'No .planning/ directory found — run GSD Init to set up' : `${plugin.name} is not available for this project`}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground opacity-40 cursor-not-allowed"
                    >
                      <plugin.icon size={14} />
                      {plugin.name}
                    </button>
                  )
                }

                // Available plugin — open or focus its tab
                return (
                  <button
                    key={plugin.id}
                    onClick={() => handleOpenPlugin(plugin)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
                  >
                    <plugin.icon size={14} />
                    {plugin.name}
                  </button>
                )
              })}

              {/* GSD Init option — shows when GSD is unavailable (no .planning/) */}
              {PLUGINS.some((p) => p.id === 'gsd' && !(pluginAvailability['gsd'] ?? true)) && (
                <button
                  onClick={handleGsdInit}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors duration-100 text-foreground hover:bg-white/[0.05]"
                  title="Initialize GSD in this project"
                >
                  <HugeiconsIcon icon={CommandLineIcon} size={14} strokeWidth={1.5} />
                  GSD Init
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
