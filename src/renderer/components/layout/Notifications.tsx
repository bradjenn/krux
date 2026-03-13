import { useEffect, useRef } from 'react'
import { type NotificationSeverity, useAppStore } from '@/stores/appStore'

const AUTO_DISMISS_MS = 4000
const MAX_VISIBLE = 5

const SEVERITY_STYLES: Record<NotificationSeverity, { border: string; text: string }> = {
  info: { border: 'var(--accent2)', text: 'var(--accent2)' },
  warn: { border: 'var(--yellow)', text: 'var(--yellow)' },
  error: { border: 'var(--danger)', text: 'var(--danger)' },
  success: { border: 'var(--green)', text: 'var(--green)' },
}

export default function Notifications() {
  const notifications = useAppStore((s) => s.notifications)
  const dismissNotification = useAppStore((s) => s.dismissNotification)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Auto-dismiss notifications
  useEffect(() => {
    const timers = timersRef.current
    for (const n of notifications) {
      if (!timers.has(n.id)) {
        const timer = setTimeout(() => {
          dismissNotification(n.id)
          timers.delete(n.id)
        }, AUTO_DISMISS_MS)
        timers.set(n.id, timer)
      }
    }

    // Clean up timers for dismissed notifications
    for (const [id, timer] of timers) {
      if (!notifications.find((n) => n.id === id)) {
        clearTimeout(timer)
        timers.delete(id)
      }
    }
  }, [notifications, dismissNotification])

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const visible = notifications.slice(-MAX_VISIBLE)

  if (visible.length === 0) return null

  return (
    <div
      className="fixed top-3 right-3 z-50 flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 340 }}
    >
      {visible.map((n) => {
        const style = SEVERITY_STYLES[n.severity]
        return (
          <div
            key={n.id}
            className="tui-notification animate-slide-in-right pointer-events-auto"
            style={{
              borderColor: style.border,
              color: style.text,
            }}
          >
            <span className="text-[11px] font-mono leading-tight">{n.message}</span>
            <button
              type="button"
              onClick={() => dismissNotification(n.id)}
              className="ml-2 text-dim hover:text-foreground cursor-pointer shrink-0"
              style={{ fontSize: 10, lineHeight: 1 }}
            >
              x
            </button>
          </div>
        )
      })}
    </div>
  )
}
