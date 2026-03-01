import type { PluginDefinition } from './types'
import { gsdPlugin } from './gsd'

// All registered plugins
export const PLUGINS: PluginDefinition[] = [gsdPlugin]

/** Get all tab types from all plugins */
export function getAllPluginTabTypes() {
  return PLUGINS.flatMap((p) => p.tabTypes)
}

/** Get a specific plugin by ID */
export function getPlugin(id: string) {
  return PLUGINS.find((p) => p.id === id)
}
