import { useCallback, useEffect, useRef, useState } from 'react'
import ProjectFavicon from '@/components/ProjectFavicon'
import { useAppStore } from '@/stores/appStore'

interface ProjectSwitcherProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProjectSwitcher({ isOpen, onClose }: ProjectSwitcherProps) {
  const { projects, activeProjectId, setActiveProject, tabs } = useAppStore()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = projects.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()),
  )

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      // Focus after the modal renders (preventScroll avoids WebKit
      // scrolling the viewport behind the fixed overlay)
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    }
  }, [isOpen])

  // Clamp selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const selectProject = useCallback(
    (id: string) => {
      setActiveProject(id)
      onClose()
    },
    [setActiveProject, onClose],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
        } else {
          setSelectedIndex((i) => (i + 1) % filtered.length)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filtered.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[selectedIndex]) {
          selectProject(filtered[selectedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  const getTerminalCount = (projectId: string) =>
    tabs.filter((t) => t.projectId === projectId && t.type === 'shell').length

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '18vh' }}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Close project switcher"
      />

      {/* Modal */}
      <div
        role="dialog"
        className="relative w-full max-w-md tui-panel overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="border-b border-border" style={{ padding: '12px 16px' }}>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Switch project..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="w-full bg-transparent text-foreground border-none outline-none"
            style={{ fontSize: 15, fontFamily: 'inherit' }}
          />
        </div>

        {/* Project list */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 320 }}>
          {filtered.map((project, index) => {
            const isActive = activeProjectId === project.id
            const isSelected = index === selectedIndex
            const termCount = getTerminalCount(project.id)

            return (
              <button
                type="button"
                key={project.id}
                onClick={() => selectProject(project.id)}
                onMouseEnter={() => setSelectedIndex(index)}
                className="flex items-center gap-3 cursor-pointer transition-colors duration-75 w-full text-left"
                style={{
                  padding: '10px 16px',
                  background: isSelected
                    ? 'var(--color-white-alpha-5, rgba(255,255,255,0.05))'
                    : 'transparent',
                  border: 'none',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <ProjectFavicon projectPath={project.path} />

                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{project.name}</div>
                  <div className="truncate text-xs text-dim" style={{ marginTop: 1 }}>
                    {project.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                </div>

                {termCount > 0 && (
                  <div className="flex items-center gap-1 shrink-0 text-xs text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {termCount > 1 && <span>{termCount}</span>}
                  </div>
                )}

                {isActive && <span className="text-xs text-dim shrink-0">current</span>}
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-dim">No matching projects</div>
          )}
        </div>

        {/* Footer hint */}
        <div className="tui-panel-footer">
          <span>
            <kbd className="text-muted-foreground">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="text-muted-foreground">↵</kbd> select
          </span>
          <span>
            <kbd className="text-muted-foreground">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
