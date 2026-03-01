import { invoke } from '@tauri-apps/api/core'
import { LayoutDashboard, FileText, Play } from 'lucide-react'
import type { PluginDefinition } from '../types'
import OverviewTab from './OverviewTab'
import DocumentsTab from './DocumentsTab'
import ExecutionTab from './ExecutionTab'
import GsdSidebar from './GsdSidebar'

export const gsdPlugin: PluginDefinition = {
  id: 'gsd',
  name: 'GSD Workflow',
  tabTypes: [
    {
      id: 'gsd:overview',
      label: 'GSD Overview',
      icon: LayoutDashboard,
      component: OverviewTab,
    },
    {
      id: 'gsd:documents',
      label: 'GSD Docs',
      icon: FileText,
      component: DocumentsTab,
    },
    {
      id: 'gsd:execution',
      label: 'GSD Execute',
      icon: Play,
      component: ExecutionTab,
    },
  ],
  sidebarSection: GsdSidebar,
  isAvailable: async (projectPath: string) => {
    return invoke<boolean>('path_exists', { path: `${projectPath}/.planning` })
  },
}
