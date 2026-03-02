import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Key } from 'lucide-react'
import ChatPanel from './ChatPanel'

interface ChatTabProps {
  projectId: string
  projectPath: string
}

export default function ChatTab({ projectId, projectPath }: ChatTabProps) {
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
    return (
      <div className="h-full w-full flex flex-col bg-background items-center justify-center">
        <div className="text-dim text-sm">Loading...</div>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="h-full w-full flex flex-col bg-background items-center justify-center gap-3 text-muted-foreground">
        <Key size={32} className="text-dim" />
        <p className="text-sm text-center max-w-xs">
          Set <code className="text-foreground font-mono">ANTHROPIC_API_KEY</code> in your shell
          environment and restart the app
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <ChatPanel projectId={projectId} projectPath={projectPath} apiKey={apiKey} />
    </div>
  )
}
