import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useEffect, useRef, useState } from 'react'
import { useGitStatus } from '@/hooks/useGitStatus'
import { useAppStore } from '@/stores/appStore'

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'ready' | 'error'

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

  const addTab = useAppStore((s) => s.addTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const terminalCount = tabs.filter(
    (t) => t.projectId === activeProjectId && t.type === 'shell',
  ).length

  const gitStatus = useGitStatus(activeProject?.path ?? null)

  // Update checker state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const pendingUpdate = useRef<Update | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await check()
        if (update) {
          pendingUpdate.current = update
          setUpdateVersion(update.version)
          setUpdateStatus('available')
        }
      } catch {
        // Silently fail — offline, no releases, or endpoint unreachable
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleUpdate = async () => {
    const update = pendingUpdate.current
    if (!update) return

    try {
      setUpdateStatus('downloading')

      let totalBytes = 0
      let downloadedBytes = 0

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalBytes = event.data.contentLength
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          if (totalBytes > 0) {
            setUpdateProgress(Math.round((downloadedBytes / totalBytes) * 100))
          }
        } else if (event.event === 'Finished') {
          setUpdateStatus('ready')
        }
      })

      await relaunch()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : String(err))
      setUpdateStatus('error')
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

  const showUpdate = updateStatus !== 'idle' && !updateDismissed

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
      {/* Left: mode indicator + update notice */}
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

        {showUpdate && updateStatus === 'available' && (
          <>
            <span className="text-muted-foreground">v{updateVersion} available</span>
            <button
              type="button"
              onClick={handleUpdate}
              className="px-1.5 rounded-sm font-medium hover:text-foreground transition-colors cursor-pointer"
              style={{
                color: 'var(--bg)',
                background: 'var(--green)',
                fontSize: 11,
                lineHeight: '18px',
              }}
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setUpdateDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>
          </>
        )}
        {showUpdate && updateStatus === 'downloading' && (
          <span className="text-muted-foreground">
            Downloading{updateProgress > 0 ? ` ${updateProgress}%` : '…'}
          </span>
        )}
        {showUpdate && updateStatus === 'ready' && (
          <span className="text-muted-foreground">Relaunching…</span>
        )}
        {showUpdate && updateStatus === 'error' && (
          <>
            <span style={{ color: 'var(--red)' }}>
              Update failed{updateError ? `: ${updateError}` : ''}
            </span>
            <button
              type="button"
              onClick={handleUpdate}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setUpdateDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>
          </>
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
