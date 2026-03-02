import mitt from 'mitt'

export type AppEvents = {
  'project:switched': { projectId: string | null }
  'file:changed': { projectId: string; path: string }
  'execution:started': { sessionId: string; phaseId: string }
}

export const appEvents = mitt<AppEvents>()

export function onAppEvent<K extends keyof AppEvents>(
  event: K,
  handler: (payload: AppEvents[K]) => void
): () => void {
  appEvents.on(event, handler)
  return () => appEvents.off(event, handler)
}
