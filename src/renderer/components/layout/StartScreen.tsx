import { invoke } from '@/lib/bridge'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

interface StartScreenProps {
  onAddProject: () => void
  onSwitchProject: () => void
  wallpaperActive: boolean
  backgroundOpacity: number
}

interface MenuItem {
  key: string
  icon: string
  label: string
  action: () => void
}

export default function StartScreen({
  onAddProject,
  onSwitchProject,
  wallpaperActive,
  backgroundOpacity,
}: StartScreenProps) {
  const { projects, lastActiveProjectId, setActiveProject, setActiveView } = useAppStore()
  const [appVersion, setAppVersion] = useState('…')

  useEffect(() => {
    invoke<string>('get-version').then((v) => setAppVersion(v))
  }, [])

  const lastProjectValid =
    lastActiveProjectId != null && projects.some((p) => p.id === lastActiveProjectId)

  const menuItems: MenuItem[] = [
    { key: 'a', icon: '+', label: 'Add Project', action: onAddProject },
    { key: 'p', icon: '\u2318', label: 'Switch Project', action: onSwitchProject },
    ...(lastProjectValid
      ? [
          {
            key: 'r',
            icon: '\u21A9',
            label: 'Resume Last Session',
            action: () => setActiveProject(lastActiveProjectId),
          },
        ]
      : []),
    { key: 's', icon: '\u2699', label: 'Settings', action: () => setActiveView('settings') },
    { key: 'q', icon: '\u23FB', label: 'Quit', action: () => invoke('quit') },
  ]

  // Keyboard shortcut listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire if modifier keys are held or focus is inside an input/textarea
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      const item = menuItems.find((m) => m.key === e.key.toLowerCase())
      if (item) {
        e.preventDefault()
        item.action()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full select-none',
        wallpaperActive && 'relative z-10',
      )}
      style={
        wallpaperActive
          ? {
              background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
            }
          : undefined
      }
    >
      <div className="flex flex-col items-center gap-6" style={{ minWidth: 280 }}>
        {/* ASCII art logo — rendered as a character grid like a terminal */}
        {(() => {
          const art = [
            '██╗  ██╗██████╗ ██╗   ██╗██╗  ██╗',
            '██║ ██╔╝██╔══██╗██║   ██║╚██╗██╔╝',
            '█████╔╝ ██████╔╝██║   ██║ ╚███╔╝ ',
            '██╔═██╗ ██╔══██╗██║   ██║ ██╔██╗ ',
            '██║  ██╗██║  ██║╚██████╔╝██╔╝ ██╗',
            '╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝',
          ]
          const cols = Math.max(...art.map((r) => [...r].length))
          return (
            <div
              className="text-secondary"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1ch)`,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              {art.flatMap((row, y) => {
                const chars = [...row]
                return Array.from({ length: cols }, (_, x) => (
                  <span key={`${y}-${x}`}>{chars[x] ?? ' '}</span>
                ))
              })}
            </div>
          )
        })()}

        {/* Divider */}
        <div className="w-full h-px bg-border" />

        {/* Menu */}
        <div className="flex flex-col w-full gap-1">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={item.action}
              className="flex items-center gap-3 px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors duration-100 cursor-pointer"
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span className="flex-1 text-left text-sm">{item.label}</span>
              <kbd className="text-xs text-dim font-mono">{item.key}</kbd>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-xs text-dim text-center pt-2">
          v{appVersion} &middot; {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
