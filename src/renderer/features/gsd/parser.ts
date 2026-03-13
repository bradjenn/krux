import { invoke } from '@/lib/bridge'

export interface Phase {
  number: string
  name: string
  goal: string | null
  depends_on: string | null
  plan_count: number
  summary_count: number
  disk_status:
    | 'complete'
    | 'partial'
    | 'planned'
    | 'researched'
    | 'discussed'
    | 'empty'
    | 'no_directory'
  roadmap_complete: boolean
}

export interface ProjectState {
  phase: string | null
  plan: string | null
  status: string | null
  progress: string | null
}

export interface ProjectMeta {
  name: string
  description: string | null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizePhaseName(phaseNum: string): string {
  return phaseNum.replace(/^(\d+)/, (n) => n.padStart(2, '0'))
}

export async function parseRoadmap(projectPath: string): Promise<Phase[]> {
  const roadmapPath = `${projectPath}/.planning/ROADMAP.md`
  const phasesDir = `${projectPath}/.planning/phases`

  let content: string
  try {
    content = await invoke<string>('read_file', { path: roadmapPath })
  } catch {
    return []
  }

  // Get list of phase directories
  let phaseDirNames: string[] = []
  try {
    phaseDirNames = await invoke<string[]>('list_dir', { path: phasesDir })
  } catch {
    // No phases directory
  }

  const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:\s*([^\n]+)/gi
  const phases: Phase[] = []
  let match: RegExpExecArray | null

  match = phasePattern.exec(content)
  while (match !== null) {
    const phaseNum = match[1]
    const phaseName = match[2].replace(/\(INSERTED\)/i, '').trim()

    // Extract section between this header and the next
    const sectionStart = match.index
    const restOfContent = content.slice(sectionStart)
    const nextHeaderMatch = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i)
    const sectionEnd = nextHeaderMatch
      ? sectionStart + (nextHeaderMatch.index as number)
      : content.length
    const section = content.slice(sectionStart, sectionEnd)

    // Extract goal
    const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i)
    const goal = goalMatch ? goalMatch[1].trim() : null

    // Extract depends_on
    const dependsMatch = section.match(/\*\*Depends on:\*\*\s*([^\n]+)/i)
    const depends_on = dependsMatch ? dependsMatch[1].trim() : null

    // Normalize phase number for directory matching
    const padded = normalizePhaseName(phaseNum)

    // Find matching directory
    let diskStatus: Phase['disk_status'] = 'no_directory'
    let planCount = 0
    let summaryCount = 0

    const dirMatch = phaseDirNames.find((d) => d.startsWith(`${padded}-`) || d === padded)
    if (dirMatch) {
      try {
        const phaseFiles = await invoke<string[]>('list_dir', {
          path: `${phasesDir}/${dirMatch}`,
        })
        planCount = phaseFiles.filter((f) => f.endsWith('-PLAN.md') || f === 'PLAN.md').length
        summaryCount = phaseFiles.filter(
          (f) => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md',
        ).length
        const hasResearch = phaseFiles.some(
          (f) => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md',
        )
        const hasContext = phaseFiles.some((f) => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md')

        if (summaryCount >= planCount && planCount > 0) diskStatus = 'complete'
        else if (summaryCount > 0) diskStatus = 'partial'
        else if (planCount > 0) diskStatus = 'planned'
        else if (hasResearch) diskStatus = 'researched'
        else if (hasContext) diskStatus = 'discussed'
        else diskStatus = 'empty'
      } catch {
        // Could not read phase directory
      }
    }

    // Check ROADMAP checkbox status
    const escapedPhase = escapeRegex(phaseNum)
    const checkboxPattern = new RegExp(`-\\s*\\[(x| )\\]\\s*.*Phase\\s+${escapedPhase}`, 'i')
    const checkboxMatch = content.match(checkboxPattern)
    const roadmap_complete = checkboxMatch ? checkboxMatch[1] === 'x' : false

    phases.push({
      number: phaseNum,
      name: phaseName,
      goal,
      depends_on,
      plan_count: planCount,
      summary_count: summaryCount,
      disk_status: diskStatus,
      roadmap_complete,
    })

    match = phasePattern.exec(content)
  }

  return phases
}

export async function parseState(projectPath: string): Promise<ProjectState> {
  const statePath = `${projectPath}/.planning/STATE.md`

  let content: string
  try {
    content = await invoke<string>('read_file', { path: statePath })
  } catch {
    return { phase: null, plan: null, status: null, progress: null }
  }

  function extractField(fieldName: string): string | null {
    const escaped = escapeRegex(fieldName)

    const boldPattern = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, 'i')
    const boldMatch = content.match(boldPattern)
    if (boldMatch) return boldMatch[1].trim() || null

    const plainPattern = new RegExp(`^${escaped}:\\s*(.+)`, 'im')
    const plainMatch = content.match(plainPattern)
    if (plainMatch) return plainMatch[1].trim() || null

    return null
  }

  return {
    phase: extractField('Phase'),
    plan: extractField('Plan'),
    status: extractField('Status'),
    progress: extractField('Progress'),
  }
}

export async function parseProjectMeta(projectPath: string): Promise<ProjectMeta> {
  const projectMdPath = `${projectPath}/.planning/PROJECT.md`

  let content: string
  try {
    content = await invoke<string>('read_file', { path: projectMdPath })
  } catch {
    return { name: 'Unknown', description: null }
  }

  const projectMatch = content.match(/\*\*Project:\*\*\s*([^\n]+)/i)
  const headingMatch = content.match(/^#\s+([^\n]+)/m)
  const name = (projectMatch ? projectMatch[1].trim() : headingMatch?.[1].trim()) ?? 'Unknown'

  const descMatch = content.match(/\*\*(?:Core value|Description):\*\*\s*([^\n]+)/i)
  const description = descMatch ? descMatch[1].trim() : null

  return { name, description }
}
