import { useEffect, useRef, useState } from 'react'
import { closeTerminal, createTerminal, writeTerminal } from '@/hooks/useTauri'
import { getAgent } from '@/lib/agents'
import XTerminal from './XTerminal'

interface AgentTabProps {
  agentId: string
  projectId: string
  projectPath: string
}

export default function AgentTab({ agentId, projectPath }: AgentTabProps) {
  const agent = getAgent(agentId)
  const [terminalId, setTerminalId] = useState<string | null>(null)
  const terminalIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!agent) return
    let cancelled = false

    createTerminal(projectPath, 80, 24).then((id) => {
      if (cancelled) {
        closeTerminal(id)
        return
      }
      terminalIdRef.current = id
      setTerminalId(id)

      // Auto-launch agent command after shell is ready
      setTimeout(() => {
        if (!cancelled) {
          writeTerminal(id, `${agent.command}\n`)
        }
      }, 200)
    })

    return () => {
      cancelled = true
      if (terminalIdRef.current) {
        closeTerminal(terminalIdRef.current)
      }
    }
  }, [projectPath, agent])

  if (!agent) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-dim text-sm">Unknown agent: {agentId}</div>
      </div>
    )
  }

  if (!terminalId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-dim text-sm">Starting {agent.name}...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <XTerminal existingTerminalId={terminalId} isActive />
    </div>
  )
}
