import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Key } from 'lucide-react'

interface ChatTabProps {
  projectId: string
  projectPath: string
}

export default function ChatTab({ projectId: _projectId, projectPath: _projectPath }: ChatTabProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    invoke<string | null>('get_env_var', { name: 'ANTHROPIC_API_KEY' })
      .then((key) => {
        setApiKey(key ?? null)
      })
      .catch(() => {
        setApiKey(null)
      })
      .finally(() => {
        setLoaded(true)
      })
  }, [])

  if (!loaded) {
    return null
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Key size={32} className="text-dim" />
        <p className="text-sm text-center max-w-xs">
          Set <code className="text-foreground font-mono">ANTHROPIC_API_KEY</code> in your shell
          environment and restart the app
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Chat ready — UI coming in Plan 02
    </div>
  )
}
