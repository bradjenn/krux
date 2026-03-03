import { useLiveQuery } from 'dexie-react-hooks'
import type { ChatMessage, Conversation } from '../../lib/chatDb'
import { chatDb } from '../../lib/chatDb'

/**
 * Reactive hook that returns messages for a conversation, sorted by timestamp.
 * Returns undefined while loading (Dexie useLiveQuery behavior).
 */
export function useChatHistory(conversationId: number | null): ChatMessage[] | undefined {
  return useLiveQuery(
    () =>
      conversationId
        ? chatDb.messages.where('conversationId').equals(conversationId).sortBy('timestamp')
        : [],
    [conversationId],
  )
}

/**
 * Reactive hook that returns all conversations for a project, sorted by updatedAt desc.
 */
export function useConversationList(projectId: string): Conversation[] | undefined {
  return useLiveQuery(
    () => chatDb.conversations.where('projectId').equals(projectId).reverse().sortBy('updatedAt'),
    [projectId],
  )
}
