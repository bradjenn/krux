import Dexie, { type EntityTable } from 'dexie'

export interface ChatMessage {
  id?: number
  projectId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const MAX_MESSAGES = 50

class ChatDatabase extends Dexie {
  messages!: EntityTable<ChatMessage, 'id'>

  constructor() {
    super('ChatDatabase')
    this.version(1).stores({
      messages: '++id, projectId, timestamp',
    })
  }
}

export const chatDb = new ChatDatabase()

/**
 * Persist a chat message and enforce the 50-message cap for the project.
 * Oldest messages are deleted when count exceeds MAX_MESSAGES.
 */
export async function persistMessage(msg: Omit<ChatMessage, 'id'>): Promise<void> {
  await chatDb.messages.add(msg)

  // Enforce cap: keep only the most recent MAX_MESSAGES messages for this project
  const allMessages = await chatDb.messages
    .where('projectId')
    .equals(msg.projectId)
    .sortBy('timestamp')

  if (allMessages.length > MAX_MESSAGES) {
    const toDelete = allMessages.slice(0, allMessages.length - MAX_MESSAGES)
    const idsToDelete = toDelete.map((m) => m.id!).filter(Boolean)
    await chatDb.messages.bulkDelete(idsToDelete)
  }
}

/**
 * Delete all messages for a project (clear history).
 */
export async function clearProjectHistory(projectId: string): Promise<void> {
  await chatDb.messages.where('projectId').equals(projectId).delete()
}
