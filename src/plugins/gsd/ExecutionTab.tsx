import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Square, ChevronDown, RotateCcw } from 'lucide-react'
import { Command } from '@tauri-apps/plugin-shell'
import { parseRoadmap, type Phase } from './parser'
import { cn } from '@/lib/utils'

type ExecStatus = 'idle' | 'starting' | 'running' | 'done' | 'error' | 'cancelled'

interface ExecutionTabProps {
  projectId: string
  projectPath: string
}

export default function ExecutionTab({ projectPath }: ExecutionTabProps) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [status, setStatus] = useState<ExecStatus>('idle')
  const [lines, setLines] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const childRef = useRef<Awaited<ReturnType<typeof Command.prototype.spawn>> | null>(null)

  // Load phases
  useEffect(() => {
    parseRoadmap(projectPath).then((p) => {
      setPhases(p)
      // Default to first executable phase
      const next = p.find((ph) => ph.disk_status === 'planned' || ph.disk_status === 'partial')
      if (next) setSelectedPhase(next.number)
      else if (p.length > 0) setSelectedPhase(p[0].number)
    })
  }, [projectPath])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'instant' })
    }
  }, [lines, autoScroll])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 50)
  }, [])

  const startExecution = async () => {
    if (!selectedPhase) return

    const phase = phases.find((p) => p.number === selectedPhase)
    if (!phase) return

    setStatus('starting')
    setLines([])
    setAutoScroll(true)

    const prompt = `Execute GSD phase ${phase.number}: ${phase.name}. ` +
      `Use /gsd:execute-phase to run this phase. ` +
      `The project is at ${projectPath}.`

    try {
      const cmd = Command.create('claude', [
        '--print',
        '--dangerously-skip-permissions',
        prompt,
      ], { cwd: projectPath })

      cmd.stdout.on('data', (data: string) => {
        setStatus('running')
        setLines((prev) => [...prev, data])
      })

      cmd.stderr.on('data', (data: string) => {
        setLines((prev) => [...prev, data])
      })

      cmd.on('close', (data) => {
        setStatus(data.code === 0 ? 'done' : 'error')
        childRef.current = null
      })

      cmd.on('error', (err: string) => {
        setLines((prev) => [...prev, `Error: ${err}`])
        setStatus('error')
        childRef.current = null
      })

      const child = await cmd.spawn()
      childRef.current = child
      setStatus('running')
    } catch (err) {
      setLines((prev) => [...prev, `Failed to start: ${String(err)}`])
      setStatus('error')
    }
  }

  const stopExecution = async () => {
    if (childRef.current) {
      await childRef.current.kill()
      childRef.current = null
      setStatus('cancelled')
    }
  }

  const isRunning = status === 'running' || status === 'starting'
  const isStopped = status === 'done' || status === 'error' || status === 'cancelled'
  const selectedPhaseName = phases.find((p) => p.number === selectedPhase)?.name

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 px-4 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          {/* Phase selector */}
          <select
            value={selectedPhase ?? ''}
            onChange={(e) => setSelectedPhase(e.target.value)}
            disabled={isRunning}
            className="text-xs px-3 py-1.5 rounded bg-background text-foreground border border-border"
          >
            {phases.map((p) => (
              <option key={p.number} value={p.number}>
                Phase {p.number}: {p.name} ({p.disk_status.replace('_', ' ')})
              </option>
            ))}
          </select>

          {/* Start/Stop buttons */}
          {!isRunning && (
            <button
              onClick={startExecution}
              disabled={!selectedPhase}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-colors duration-100 bg-primary"
              style={{
                color: '#0e0e10',
                opacity: selectedPhase ? 1 : 0.5,
              }}
            >
              <Play size={10} fill="currentColor" />
              Execute
            </button>
          )}

          {isRunning && (
            <button
              onClick={stopExecution}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors duration-100 text-destructive"
              style={{
                background: 'rgba(229,46,46,0.15)',
                border: '1px solid rgba(229,46,46,0.3)',
              }}
            >
              <Square size={10} fill="currentColor" />
              Stop
            </button>
          )}

          {isStopped && status !== 'idle' && (
            <button
              onClick={startExecution}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors duration-100 bg-border text-muted-foreground"
            >
              <RotateCcw size={12} />
              Restart
            </button>
          )}

          {/* Status badge */}
          {status !== 'idle' && (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded font-medium ml-auto',
                (status === 'running' || status === 'starting') && 'text-primary',
                status === 'done' && 'text-green',
                status === 'error' && 'text-destructive',
                status === 'cancelled' && 'text-muted-foreground bg-border',
              )}
              style={{
                background:
                  status === 'running' || status === 'starting' ? 'rgba(200,255,0,0.08)' :
                  status === 'done' ? 'rgba(68,255,177,0.1)' :
                  status === 'error' ? 'rgba(229,46,46,0.1)' :
                  undefined,
              }}
            >
              {status === 'starting' ? 'Starting...' :
               status === 'running' ? `Running ${selectedPhaseName ?? ''}` :
               status === 'done' ? 'Complete' :
               status === 'error' ? 'Failed' :
               'Stopped'}
            </span>
          )}
        </div>
      </div>

      {/* Log output */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="h-full overflow-y-auto p-4 text-xs leading-relaxed bg-background text-muted-foreground"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
          onScroll={handleScroll}
        >
          {lines.length === 0 && status === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full text-dim">
              <Play size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Select a phase and click Execute</p>
              <p className="text-xs mt-1 opacity-60">
                This will run the Claude agent to execute the selected GSD phase
              </p>
            </div>
          )}

          {lines.length === 0 && status === 'starting' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full animate-pulse bg-primary" />
              Starting agent...
            </div>
          )}

          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Jump to bottom */}
        {!autoScroll && lines.length > 0 && (
          <button
            onClick={() => {
              setAutoScroll(true)
              bottomRef.current?.scrollIntoView({ behavior: 'instant' })
            }}
            className="absolute bottom-4 right-4 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium shadow-lg bg-surface text-muted-foreground border border-border"
          >
            <ChevronDown size={12} />
            Jump to bottom
          </button>
        )}
      </div>
    </div>
  )
}
