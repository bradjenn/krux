import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { useAppStore } from '@/stores/appStore'
import { createTerminal } from '@/hooks/useTauri'

interface TabBarProps {
  onCloseTab: (id: string) => void
}

export default function TabBar({ onCloseTab }: TabBarProps) {
  const { tabs, activeTabId, activeProjectId, projects, addTab, setActiveTab } =
    useAppStore()

  const projectTabs = tabs.filter((t) => t.projectId === activeProjectId)
  const activeProject = projects.find((p) => p.id === activeProjectId)

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
  }

  if (!activeProjectId || projectTabs.length === 0) return null

  return (
    <div
      className="flex items-stretch shrink-0 select-none overflow-x-auto"
      style={{
        height: 36,
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        scrollbarWidth: 'none',
      }}
    >
      {projectTabs.map((tab) => {
        const isActive = activeTabId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="tab group flex items-center gap-1.5 shrink-0 transition-colors duration-100 cursor-pointer text-xs"
            style={{
              padding: '0 14px',
              height: '100%',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              background: isActive ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span>{tab.label}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
              className="tab-close opacity-0 group-hover:opacity-100 transition-opacity duration-100 p-0.5 rounded hover:text-[var(--danger)] hover:bg-[rgba(229,46,46,0.15)]"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
            </span>
          </button>
        )
      })}

      <button
        onClick={handleNewShellTab}
        className="flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer hover:text-[var(--accent)]"
        style={{
          width: 36,
          height: '100%',
          color: 'var(--text-dim)',
        }}
        title="New terminal (⌘T)"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
