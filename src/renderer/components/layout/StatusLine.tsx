import { invoke, listen } from '@/lib/bridge'
import { useEffect, useRef, useState } from 'react'
import { useGitStatus } from '@/hooks/useGitStatus'
import { appEvents } from '@/lib/events'
import { useAppStore } from '@/stores/appStore'

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'ready'

const MODE_COLORS: Record<string, string> = {
  prefix: 'var(--yellow)',
}

const MODE_LABELS: Record<string, string> = {
  prefix: 'PREFIX',
}

interface StatusLineProps {
  wallpaperActive?: boolean
  backgroundOpacity?: number
}

export default function StatusLine({ wallpaperActive, backgroundOpacity = 0.8 }: StatusLineProps) {
  const keyboardMode = useAppStore((s) => s.keyboardMode)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const projects = useAppStore((s) => s.projects)
  const tabs = useAppStore((s) => s.tabs)
  const addNotification = useAppStore((s) => s.addNotification)

  const addTab = useAppStore((s) => s.addTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const terminalCount = tabs.filter(
    (t) => t.projectId === activeProjectId && t.type === 'shell',
  ).length

  const gitStatus = useGitStatus(activeProject?.path ?? null)

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)
  const manualCheckRef = useRef(false)

  useEffect(() => {
    const unlistens = [
      listen<{ version: string }>('updater:available', (data) => {
        setUpdateVersion(data.version)
        setUpdateStatus('available')
        if (manualCheckRef.current) {
          addNotification(`Update v${data.version} available`, 'info')
          manualCheckRef.current = false
        }
      }),
      listen('updater:not-available', () => {
        if (manualCheckRef.current) {
          addNotification('You\'re on the latest version', 'success')
          manualCheckRef.current = false
        }
      }),
      listen<{ percent: number }>('updater:progress', (data) => {
        setUpdateProgress(data.percent)
        setUpdateStatus('downloading')
      }),
      listen('updater:downloaded', () => {
        setUpdateStatus('ready')
        addNotification('Update ready — restart to apply', 'success')
      }),
      listen<{ message: string }>('updater:error', (data) => {
        addNotification(`Update failed: ${data.message}`, 'error')
        manualCheckRef.current = false
      }),
    ]

    // Silent check on startup
    invoke('check-for-update')

    // Listen for manual checks triggered from the menu
    const onManualCheck = () => {
      manualCheckRef.current = true
      addNotification('Checking for updates...', 'info')
      invoke('check-for-update')
    }
    appEvents.on('updater:manual-check', onManualCheck)

    return () => {
      for (const u of unlistens) u()
      appEvents.off('updater:manual-check', onManualCheck)
    }
  }, [])

  const handleUpdate = async () => {
    try {
      if (updateStatus === 'available') {
        setUpdateStatus('downloading')
        await invoke('download-update')
      } else if (updateStatus === 'ready') {
        await invoke('install-update')
      }
    } catch (err) {
      addNotification(`Update failed: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  const openLazygit = () => {
    if (!activeProjectId) return
    const existing = tabs.find((t) => t.type === 'tool:lazygit' && t.projectId === activeProjectId)
    if (existing) {
      setActiveTab(existing.id)
    } else {
      addTab({
        id: crypto.randomUUID(),
        type: 'tool:lazygit',
        label: 'Lazygit',
        projectId: activeProjectId,
      })
    }
  }

  const modeColor = MODE_COLORS[keyboardMode]
  const modeLabel = MODE_LABELS[keyboardMode]

  return (
    <div
      className="flex items-center shrink-0 border-t border-border text-xs font-mono select-none z-20 relative"
      style={{
        height: 32,
        padding: '0 14px',
        ...(wallpaperActive
          ? {
              background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
            }
          : { background: 'var(--bg)' }),
      }}
    >
      {/* Left: mode indicator + update status */}
      <div className="flex items-center gap-2">
        {modeLabel && (
          <span
            className="font-bold px-1.5 rounded-sm"
            style={{
              color: 'var(--bg)',
              background: modeColor,
              fontSize: 11,
              lineHeight: '18px',
            }}
          >
            {modeLabel}
          </span>
        )}

        {updateStatus === 'available' && (
          <button
            type="button"
            onClick={handleUpdate}
            className="flex items-center gap-1 px-1.5 rounded-sm font-medium cursor-pointer transition-colors hover:opacity-80"
            style={{
              color: 'var(--bg)',
              background: 'var(--green)',
              fontSize: 11,
              lineHeight: '18px',
            }}
            title={`Download v${updateVersion}`}
          >
            v{updateVersion} available
          </button>
        )}
        {updateStatus === 'downloading' && (
          <span className="text-muted-foreground" style={{ fontSize: 11 }}>
            Downloading{updateProgress > 0 ? ` ${updateProgress}%` : '...'}
          </span>
        )}
        {updateStatus === 'ready' && (
          <button
            type="button"
            onClick={handleUpdate}
            className="flex items-center gap-1 px-1.5 rounded-sm font-medium cursor-pointer transition-colors hover:opacity-80"
            style={{
              color: 'var(--bg)',
              background: 'var(--green)',
              fontSize: 11,
              lineHeight: '18px',
            }}
          >
            Restart to update
          </button>
        )}
      </div>

      {/* Project name */}
      <div className="flex-1 text-dim truncate px-4">
        {activeProject ? <span className="text-muted-foreground">{activeProject.name}</span> : null}
      </div>

      {/* Right: git status + terminal count */}
      {activeProjectId && (
        <div className="flex items-center gap-3 text-dim">
          {gitStatus && (
            <button
              type="button"
              onClick={openLazygit}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors duration-100 cursor-pointer"
              title="Open Lazygit (Ctrl+A, b)"
            >
              <svg
                aria-hidden="true"
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="text-muted-foreground"
              >
                <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
              </svg>
              <span className="text-muted-foreground">{gitStatus.branch}</span>
              {gitStatus.added > 0 && (
                <span style={{ color: 'var(--green)' }}>+{gitStatus.added}</span>
              )}
              {gitStatus.modified > 0 && (
                <span style={{ color: 'var(--yellow)' }}>~{gitStatus.modified}</span>
              )}
              {gitStatus.deleted > 0 && (
                <span style={{ color: 'var(--red)' }}>-{gitStatus.deleted}</span>
              )}
            </button>
          )}
          {terminalCount > 0 && (
            <span className="text-muted-foreground">
              {terminalCount} term{terminalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
