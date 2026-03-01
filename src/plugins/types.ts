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
  tabTypes: TabType[]
  sidebarSection?: ComponentType<{ projectId: string; projectPath: string }>
  /** Gate plugin visibility — e.g. check if .planning/ exists */
  isAvailable?: (projectPath: string) => Promise<boolean>
}
