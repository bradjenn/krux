import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 5000

export function useGitBranch(projectPath: string | null): string | null {
  const [branch, setBranch] = useState<string | null>(null)

  useEffect(() => {
    if (!projectPath) {
      setBranch(null)
      return
    }

    let cancelled = false

    const fetchBranch = () => {
      invoke<string | null>('get_git_branch', { projectPath })
        .then((b) => {
          if (!cancelled) setBranch(b)
        })
        .catch(() => {
          if (!cancelled) setBranch(null)
        })
    }

    fetchBranch()
    const interval = setInterval(fetchBranch, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [projectPath])

  return branch
}
