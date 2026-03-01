import { LayoutDashboard, FileText, Play, Rocket } from 'lucide-react'
import type { PluginDefinition } from '../types'
import OverviewTab from './OverviewTab'
import DocumentsTab from './DocumentsTab'
import ExecutionTab from './ExecutionTab'
import GsdSidebar from './GsdSidebar'

export const gsdPlugin: PluginDefinition = {
  id: 'gsd',
  name: 'GSD Workflow',
  icon: Rocket,
  defaultTabType: 'gsd:overview',
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
  // Always available — tabs handle missing .planning/ gracefully
}
