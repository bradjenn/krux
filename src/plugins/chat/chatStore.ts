import { create } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { chatDb } from '../../lib/chatDb'
import type { ChatMessage } from '../../lib/chatDb'

interface ChatState {
  isStreaming: boolean
  streamingContent: string
  error: string | null
  setStreaming: (v: boolean) => void
  setStreamingContent: (c: string) => void
  appendStreamingContent: (chunk: string) => void
  resetStream: () => void
  setError: (e: string | null) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  isStreaming: false,
  streamingContent: '',
  error: null,

  setStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (c) => set({ streamingContent: c }),
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),
  resetStream: () => set({ isStreaming: false, streamingContent: '', error: null }),
  setError: (e) => set({ error: e }),
}))

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
