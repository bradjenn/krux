import { useEffect, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import {
  parseRoadmap,
  parseState,
  parseProjectMeta,
  type Phase,
  type ProjectState,
  type ProjectMeta,
} from './parser'

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden bg-border">
      <div
        className="h-full rounded-full transition-all duration-500 bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function getStatusBadgeClasses(status: Phase['disk_status']): { className: string; style?: React.CSSProperties } {
  switch (status) {
    case 'complete':
      return { className: 'text-green rounded', style: { background: 'rgba(68,255,177,0.1)' } }
    case 'partial':
    case 'planned':
      return { className: 'text-yellow rounded', style: { background: 'rgba(255,224,115,0.1)' } }
    case 'researched':
    case 'discussed':
      return { className: 'text-secondary rounded', style: { background: 'rgba(15,197,237,0.1)' } }
    default:
      return { className: 'text-dim bg-border rounded' }
  }
}

function PhaseCard({ phase }: { phase: Phase }) {
  return (
    <div className="p-4 rounded-lg border transition-colors duration-150 bg-surface border-border">
      {/* Phase header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-1.5 py-0.5 text-primary rounded"
              style={{ background: 'rgba(200,255,0,0.06)' }}
            >
              {phase.number}
            </span>
            <span className="text-base font-semibold truncate text-foreground">
              {phase.name}
            </span>
          </div>
          {phase.goal && (
            <p className="text-xs mt-1.5 line-clamp-2 text-muted-foreground">
              {phase.goal}
            </p>
          )}
        </div>

        <div className="shrink-0 mt-0.5">
          {phase.roadmap_complete ? (
            <CheckCircle2 className="h-4 w-4 text-green" />
          ) : (
            <Circle className="h-4 w-4 text-dim" />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {phase.plan_count} plan{phase.plan_count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-dim">·</span>
          <span className="text-xs text-muted-foreground">
            {phase.summary_count} complete
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 font-medium ${getStatusBadgeClasses(phase.disk_status).className}`}
          style={getStatusBadgeClasses(phase.disk_status).style}
        >
          {phase.disk_status.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}

interface OverviewTabProps {
  projectId: string
  projectPath: string
}

export default function OverviewTab({ projectPath }: OverviewTabProps) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [state, setState] = useState<ProjectState>({ phase: null, plan: null, status: null, progress: null })
  const [meta, setMeta] = useState<ProjectMeta>({ name: 'Loading...', description: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, s, m] = await Promise.all([
        parseRoadmap(projectPath),
        parseState(projectPath),
        parseProjectMeta(projectPath),
      ])
      setPhases(p)
      setState(s)
      setMeta(m)
      setLoading(false)
    }
    load()
  }, [projectPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-base text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  const completedPhases = phases.filter((p) => p.disk_status === 'complete').length
  const totalPhases = phases.length
  const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Project header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1 text-foreground">
          {meta.name}
        </h1>
        {meta.description && (
          <p className="text-xs mb-3 text-muted-foreground">
            {meta.description}
          </p>
        )}

        {/* State info */}
        {(state.phase || state.status) && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-surface border border-border">
            {state.phase && (
              <div>
                <span className="text-xs text-muted-foreground">Phase </span>
                <span className="text-xs font-semibold text-foreground">{state.phase}</span>
              </div>
            )}
            {state.plan && (
              <div>
                <span className="text-xs text-muted-foreground">Plan </span>
                <span className="text-xs font-semibold text-foreground">{state.plan}</span>
              </div>
            )}
            {state.status && (
              <div
                className="text-xs px-2 py-0.5 font-medium text-secondary rounded"
                style={{ background: 'rgba(15,197,237,0.1)' }}
              >
                {state.status}
              </div>
            )}
            {state.progress && (
              <div className="text-xs text-muted-foreground">
                {state.progress}
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedPhases} of {totalPhases} phases complete</span>
            <span className="text-primary">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      {/* Phase grid */}
      {phases.length === 0 ? (
        <div className="text-center py-8 rounded-lg bg-surface border border-border">
          <p className="text-base text-muted-foreground">
            No phases found in this project
          </p>
          <p className="text-xs mt-1 text-dim">
            Make sure .planning/ROADMAP.md exists with phase definitions
          </p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {phases.map((phase) => (
            <PhaseCard key={phase.number} phase={phase} />
          ))}
        </div>
      )}
    </div>
  )
}
