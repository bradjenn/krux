import { useEffect, useRef, useState } from 'react'
import { closeTerminal, createTerminal, writeTerminal } from '@/hooks/useTerminal'
import { getTool } from '@/lib/tools'
import { useAppStore } from '@/stores/appStore'
import XTerminal from './XTerminal'

interface ToolTabProps {
  toolId: string
  projectId: string
  projectPath: string
}

export default function ToolTab({ toolId, projectPath }: ToolTabProps) {
  const tool = getTool(toolId)
  const [terminalId, setTerminalId] = useState<string | null>(null)
  const terminalIdRef = useRef<string | null>(null)
  const backgroundImage = useAppStore((s) => s.backgroundImage)
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)

  useEffect(() => {
    if (!tool) return
    let cancelled = false

    createTerminal(projectPath, 80, 24).then((id) => {
      if (cancelled) {
        closeTerminal(id)
        return
      }
      terminalIdRef.current = id
      setTerminalId(id)

      // Auto-launch tool command after shell is ready
      setTimeout(() => {
        if (!cancelled) {
          writeTerminal(id, `${tool.command}\n`)
        }
      }, 200)
    })

    return () => {
      cancelled = true
      if (terminalIdRef.current) {
        closeTerminal(terminalIdRef.current)
      }
    }
  }, [projectPath, tool])

  if (!tool) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-dim text-sm">Unknown tool: {toolId}</div>
      </div>
    )
  }

  if (!terminalId) {
    return (
      <div
        className="h-full w-full flex items-center justify-center"
        style={
          backgroundImage
            ? {
                background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
              }
            : undefined
        }
      >
        <div className="text-dim text-sm">Starting {tool.name}...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <XTerminal existingTerminalId={terminalId} isActive />
    </div>
  )
}
