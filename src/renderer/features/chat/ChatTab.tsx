import { Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { checkClaudeCli } from '@/hooks/useTerminal'
import ChatPanel from './ChatPanel'

interface ChatTabProps {
  projectId: string
  projectPath: string
}

export default function ChatTab({ projectId, projectPath }: ChatTabProps) {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    checkClaudeCli()
      .then(setAvailable)
      .catch(() => setAvailable(false))
  }, [])

  if (available === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="text-dim text-sm">Loading...</div>
      </div>
    )
  }

  if (!available) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Terminal size={32} className="text-dim" />
        <p className="text-sm text-center max-w-xs">
          Claude CLI not found. Install it from{' '}
          <span className="text-foreground font-mono">claude.ai/download</span>
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      <ChatPanel projectId={projectId} projectPath={projectPath} />
    </div>
  )
}
