import type { ComponentType } from 'react'

export interface TabType {
  id: string
  label: string
  icon: ComponentType<{ size?: number }>
  component: ComponentType<{ projectId: string; projectPath: string }>
}

export interface PluginDefinition {
  id: string
  name: string
  icon: ComponentType<{ size?: number }>
  tabTypes: TabType[]
  /** Tab type to open from the + dropdown (defaults to first tabType) */
  defaultTabType?: string
  /** Async check whether plugin is usable for a given project */
  isAvailable?: (projectPath: string) => Promise<boolean>
  /** Whether to auto-open a tab for this plugin when a project is selected and isAvailable returns true */
  autoOpen?: boolean
}
