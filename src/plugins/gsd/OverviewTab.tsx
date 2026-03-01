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
    <div
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ background: 'var(--border)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: 'var(--accent)',
        }}
      />
    </div>
  )
}

function getStatusBadgeStyle(status: Phase['disk_status']): React.CSSProperties {
  switch (status) {
    case 'complete':
      return { color: 'var(--green)', background: 'rgba(68,255,177,0.1)', borderRadius: 4 }
    case 'partial':
    case 'planned':
      return { color: 'var(--yellow)', background: 'rgba(255,224,115,0.1)', borderRadius: 4 }
    case 'researched':
    case 'discussed':
      return { color: 'var(--accent2)', background: 'rgba(15,197,237,0.1)', borderRadius: 4 }
    default:
      return { color: 'var(--text-dim)', background: 'var(--border)', borderRadius: 4 }
  }
}

function PhaseCard({ phase }: { phase: Phase }) {
  return (
    <div
      className="p-4 rounded-lg border transition-colors duration-150"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Phase header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-1.5 py-0.5"
              style={{
                color: 'var(--accent)',
                background: 'rgba(71,255,156,0.08)',
                borderRadius: 4,
              }}
            >
              {phase.number}
            </span>
            <span
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--text)' }}
            >
              {phase.name}
            </span>
          </div>
          {phase.goal && (
            <p
              className="text-xs mt-1.5 line-clamp-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {phase.goal}
            </p>
          )}
        </div>

        <div className="shrink-0 mt-0.5">
          {phase.roadmap_complete ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--green)' }} />
          ) : (
            <Circle className="h-4 w-4" style={{ color: 'var(--text-dim)' }} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {phase.plan_count} plan{phase.plan_count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {phase.summary_count} complete
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 font-medium"
          style={getStatusBadgeStyle(phase.disk_status)}
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading project...</p>
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
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
          {meta.name}
        </h1>
        {meta.description && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {meta.description}
          </p>
        )}

        {/* State info */}
        {(state.phase || state.status) && (
          <div
            className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
          >
            {state.phase && (
              <div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Phase </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{state.phase}</span>
              </div>
            )}
            {state.plan && (
              <div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Plan </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{state.plan}</span>
              </div>
            )}
            {state.status && (
              <div
                className="text-xs px-2 py-0.5 font-medium"
                style={{
                  color: 'var(--accent2)',
                  background: 'rgba(15,197,237,0.1)',
                  borderRadius: 4,
                }}
              >
                {state.status}
              </div>
            )}
            {state.progress && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {state.progress}
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{completedPhases} of {totalPhases} phases complete</span>
            <span style={{ color: 'var(--accent)' }}>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      {/* Phase grid */}
      {phases.length === 0 ? (
        <div
          className="text-center py-8 rounded-lg"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No phases found in this project
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
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
