import Dexie, { type EntityTable } from 'dexie'

export interface Conversation {
  id?: number
  projectId: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id?: number
  projectId: string
  conversationId: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const MAX_MESSAGES = 50

class ChatDatabase extends Dexie {
  messages!: EntityTable<ChatMessage, 'id'>
  conversations!: EntityTable<Conversation, 'id'>

  constructor() {
    super('ChatDatabase')

    this.version(1).stores({
      messages: '++id, projectId, timestamp',
    })

    this.version(2)
      .stores({
        messages: '++id, conversationId, projectId, timestamp',
        conversations: '++id, projectId, updatedAt',
      })
      .upgrade(async (tx) => {
        // Group existing messages by projectId and create a default conversation for each
        const messages = await tx.table('messages').toArray()
        const projectIds = [...new Set(messages.map((m: { projectId: string }) => m.projectId))]

        for (const projectId of projectIds) {
          const now = Date.now()
          const convId = await tx.table('conversations').add({
            projectId,
            title: 'Chat',
            createdAt: now,
            updatedAt: now,
          })
          await tx
            .table('messages')
            .where('projectId')
            .equals(projectId)
            .modify({ conversationId: convId })
        }
      })
  }
}

export const chatDb = new ChatDatabase()
export const DEFAULT_CONVERSATION_TITLE = 'New session'

/**
 * Create a new conversation for a project.
 */
export async function createConversation(projectId: string): Promise<number> {
  const now = Date.now()
  const id = await chatDb.conversations.add({
    projectId,
    title: DEFAULT_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
  })
  return id as number
}

/**
 * Get all conversations for a project, sorted by updatedAt descending.
 */
export async function getProjectConversations(projectId: string): Promise<Conversation[]> {
  return chatDb.conversations.where('projectId').equals(projectId).reverse().sortBy('updatedAt')
}

/**
 * Delete a conversation and all its messages.
 */
export async function deleteConversation(id: number): Promise<void> {
  await chatDb.messages.where('conversationId').equals(id).delete()
  await chatDb.conversations.delete(id)
}

export async function renameConversation(id: number, title: string): Promise<void> {
  await chatDb.conversations.update(id, { title })
}

/**
 * Persist a chat message and enforce the 50-message cap for the conversation.
 * Oldest messages are deleted when count exceeds MAX_MESSAGES.
 * Auto-titles the conversation from the first user message.
 */
export async function persistMessage(msg: Omit<ChatMessage, 'id'>): Promise<void> {
  const conversation = await chatDb.conversations.get(msg.conversationId)
  if (!conversation) return

  await chatDb.messages.add(msg)

  // Update conversation's updatedAt
  await chatDb.conversations.update(msg.conversationId, {
    updatedAt: Date.now(),
  })

  // Auto-title from first user message
  if (msg.role === 'user') {
    const conv = await chatDb.conversations.get(msg.conversationId)
    if (conv && (conv.title === 'New chat' || conv.title === DEFAULT_CONVERSATION_TITLE)) {
      const title = msg.content.length > 60 ? `${msg.content.slice(0, 57)}...` : msg.content
      await chatDb.conversations.update(msg.conversationId, { title })
    }
  }

  // Enforce cap per conversation
  const allMessages = await chatDb.messages
    .where('conversationId')
    .equals(msg.conversationId)
    .sortBy('timestamp')

  if (allMessages.length > MAX_MESSAGES) {
    const toDelete = allMessages.slice(0, allMessages.length - MAX_MESSAGES)
    const idsToDelete = toDelete.map((m) => m.id!).filter(Boolean)
    await chatDb.messages.bulkDelete(idsToDelete)
  }
}

/**
 * Delete all messages for a conversation (clear history).
 */
export async function clearConversationHistory(conversationId: number): Promise<void> {
  await chatDb.messages.where('conversationId').equals(conversationId).delete()
}
