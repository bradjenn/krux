import { Rocket } from 'lucide-react'
import type { PluginDefinition } from '../types'
import GsdTab from './GsdTab'
import GsdSidebar from './GsdSidebar'

export const gsdPlugin: PluginDefinition = {
  id: 'gsd',
  name: 'GSD Workflow',
  icon: Rocket,
  defaultTabType: 'gsd:main',
  tabTypes: [
    {
      id: 'gsd:main',
      label: 'GSD',
      icon: Rocket,
      component: GsdTab,
    },
  ],
  sidebarSection: GsdSidebar,
}
