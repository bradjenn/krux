import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

interface GitStatus {
  branch: string
  added: number
  modified: number
  deleted: number
}

const POLL_INTERVAL_MS = 5000

export function useGitStatus(projectPath: string | null) {
  const [status, setStatus] = useState<GitStatus | null>(null)

  useEffect(() => {
    if (!projectPath) {
      setStatus(null)
      return
    }

    let cancelled = false

    const fetchStatus = () => {
      invoke<GitStatus | null>('get_git_status', { projectPath })
        .then((s) => {
          if (!cancelled) setStatus(s)
        })
        .catch(() => {
          if (!cancelled) setStatus(null)
        })
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [projectPath])

  return status
}
