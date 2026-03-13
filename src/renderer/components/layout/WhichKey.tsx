import { CHORD_BINDINGS } from '@/lib/keybindings'
import { useAppStore } from '@/stores/appStore'

const CATEGORIES = ['navigation', 'tabs', 'panels', 'special'] as const
const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  tabs: 'Tabs',
  panels: 'Panels',
  special: 'Special',
}

// Filter out individual number tabs 1-9 from display, show as range
const DISPLAY_BINDINGS = CHORD_BINDINGS.filter(
  (b) => !(b.action.startsWith('jump-tab-') && b.key !== '1'),
)

export default function WhichKey() {
  const keyboardMode = useAppStore((s) => s.keyboardMode)

  if (keyboardMode !== 'prefix') return null

  return (
    <div className="fixed bottom-10 right-4 z-50">
      <div className="tui-panel" style={{ minWidth: 340, maxWidth: 420 }}>
        {/* Header */}
        <div className="tui-panel-header">
          <span className="text-muted-foreground text-[11px] font-mono">Ctrl+A</span>
        </div>

        {/* Chord grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 p-3">
          {CATEGORIES.map((cat) => {
            const bindings = DISPLAY_BINDINGS.filter((b) => b.category === cat)
            if (bindings.length === 0) return null
            return (
              <div key={cat} className="col-span-2">
                <div className="text-dim text-[10px] font-mono uppercase tracking-wider mb-1 mt-1">
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {bindings.map((b) => (
                    <div key={b.key} className="flex items-center gap-2">
                      <kbd
                        className="inline-flex items-center justify-center rounded-sm font-mono text-[11px] font-bold"
                        style={{
                          minWidth: 20,
                          height: 18,
                          padding: '0 4px',
                          background: 'var(--border)',
                          color: 'var(--text)',
                          border: '1px solid var(--text-dim)',
                        }}
                      >
                        {b.action === 'jump-tab-1' ? '1-9' : b.key}
                      </kbd>
                      <span className="text-muted-foreground text-[11px] font-mono">
                        {b.action === 'jump-tab-1' ? 'Jump to tab' : b.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="tui-panel-footer">
          <span>
            <kbd className="text-muted-foreground">key</kbd> execute
          </span>
          <span>
            <kbd className="text-muted-foreground">Esc</kbd> cancel
          </span>
          <span>
            <kbd className="text-muted-foreground">?</kbd> help
          </span>
        </div>
      </div>
    </div>
  )
}
