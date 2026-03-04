import type { ComponentType } from 'react'
import ClaudeLogo from '@/components/icons/ClaudeLogo'
import OpenAILogo from '@/components/icons/OpenAILogo'
import OpenCodeLogo from '@/components/icons/OpenCodeLogo'

export interface AgentConfig {
  id: string
  name: string
  command: string
  icon: ComponentType<{ size?: number }>
}

export const AGENTS: AgentConfig[] = [
  { id: 'claude-code', name: 'Claude Code', command: 'claude', icon: ClaudeLogo },
  { id: 'codex', name: 'Codex', command: 'codex', icon: OpenAILogo },
  { id: 'opencode', name: 'OpenCode', command: 'opencode', icon: OpenCodeLogo },
]

export function getAgent(id: string): AgentConfig | undefined {
  return AGENTS.find((a) => a.id === id)
}

/** Extract agent config from a tab type like "agent:claude-code" */
export function getAgentFromTabType(tabType: string): AgentConfig | undefined {
  if (!tabType.startsWith('agent:')) return undefined
  return getAgent(tabType.slice(6))
}
