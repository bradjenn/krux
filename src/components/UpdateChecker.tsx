import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useEffect, useState } from 'react'

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'ready'

export default function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await check()
        if (update) {
          setVersion(update.version)
          setStatus('available')
        }
      } catch {
        // Silently fail — offline, no releases, or endpoint unreachable
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (status === 'idle' || dismissed) return null

  const handleUpdate = async () => {
    try {
      setStatus('downloading')
      const update = await check()
      if (!update) return

      let totalBytes = 0
      let downloadedBytes = 0

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalBytes = event.data.contentLength
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          if (totalBytes > 0) {
            setProgress(Math.round((downloadedBytes / totalBytes) * 100))
          }
        } else if (event.event === 'Finished') {
          setStatus('ready')
        }
      })

      await relaunch()
    } catch {
      // If update fails, dismiss the banner
      setDismissed(true)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-accent/50 text-xs text-foreground border-b border-border shrink-0">
      {status === 'available' && (
        <>
          <span>Update {version} available</span>
          <button
            type="button"
            onClick={handleUpdate}
            className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Update now
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </>
      )}
      {status === 'downloading' && (
        <span>Downloading update… {progress > 0 ? `${progress}%` : ''}</span>
      )}
      {status === 'ready' && <span>Update installed — relaunching…</span>}
    </div>
  )
}
