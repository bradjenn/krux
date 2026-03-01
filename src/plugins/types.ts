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
  sidebarSection?: ComponentType<{ projectId: string; projectPath: string }>
}
