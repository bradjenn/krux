import { MessageCircle } from 'lucide-react'
import type { PluginDefinition } from '../types'
import ChatTab from './ChatTab'

export const chatPlugin: PluginDefinition = {
  id: 'chat',
  name: 'Chat',
  icon: MessageCircle,
  defaultTabType: 'chat:main',
  tabTypes: [
    {
      id: 'chat:main',
      label: 'Chat',
      icon: MessageCircle,
      component: ChatTab,
    },
  ],
  isAvailable: async () => true, // Chat is always available
}
