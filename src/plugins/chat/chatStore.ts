import { useLiveQuery } from 'dexie-react-hooks'
import { chatDb } from '../../lib/chatDb'
import type { ChatMessage } from '../../lib/chatDb'

/**
 * Reactive hook that returns messages for a project, sorted by timestamp.
 * Returns undefined while loading (Dexie useLiveQuery behavior).
 */
export function useChatHistory(projectId: string): ChatMessage[] | undefined {
  return useLiveQuery(
    () =>
      chatDb.messages.where('projectId').equals(projectId).sortBy('timestamp'),
    [projectId]
  )
}
