import type { ComponentType } from 'react'
import { GitBranchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import ClaudeLogo from '@/components/icons/ClaudeLogo'
import OpenAILogo from '@/components/icons/OpenAILogo'
import OpenCodeLogo from '@/components/icons/OpenCodeLogo'

export interface ToolConfig {
  id: string
  name: string
  command: string
  category: 'ai' | 'dev'
  icon: ComponentType<{ size?: number }>
}

function LazyGitIcon({ size = 16 }: { size?: number }) {
  return <HugeiconsIcon icon={GitBranchIcon} size={size} strokeWidth={1.5} />
}

export const TOOLS: ToolConfig[] = [
  { id: 'claude-code', name: 'Claude Code', command: 'claude', category: 'ai', icon: ClaudeLogo },
  { id: 'codex', name: 'Codex', command: 'codex', category: 'ai', icon: OpenAILogo },
  { id: 'opencode', name: 'OpenCode', command: 'opencode', category: 'ai', icon: OpenCodeLogo },
  { id: 'lazygit', name: 'Lazygit', command: 'lazygit', category: 'dev', icon: LazyGitIcon },
]

export function getTool(id: string): ToolConfig | undefined {
  return TOOLS.find((t) => t.id === id)
}

/** Extract tool config from a tab type like "tool:claude-code" */
export function getToolFromTabType(tabType: string): ToolConfig | undefined {
  if (!tabType.startsWith('tool:')) return undefined
  return getTool(tabType.slice(5))
}
