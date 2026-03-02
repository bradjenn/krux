import { invoke } from '@tauri-apps/api/core'
import { Rocket } from 'lucide-react'
import type { PluginDefinition } from '../types'
import GsdTab from './GsdTab'

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
  isAvailable: async (projectPath: string) => {
    try {
      return await invoke<boolean>('path_exists', { path: `${projectPath}/.planning` })
    } catch {
      return false
    }
  },
}
