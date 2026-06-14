import { useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui'
import { OpenRouterBookAgent } from '../agents/openrouter-book-agent'
import { hasOpenRouterApiKey, type BookAgentClientConfig } from '../client-config'
import {
  createChatHistoryAdapter,
  type ChatSummary,
} from '../chat-store'
import { type UserMemoryView } from '../memory-data'
import { Thread } from './Thread'

type ChatWorkspaceProps = {
  conversationId: string
  agent: OpenRouterBookAgent
  clientConfig: BookAgentClientConfig
  userMemory: UserMemoryView
  onClientConfigChange: (config: BookAgentClientConfig) => void
  onUserMemoryChange: (memory: UserMemoryView) => void
  chats: ChatSummary[]
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
}

export const ChatWorkspace = ({
  conversationId,
  agent,
  clientConfig,
  userMemory,
  onClientConfigChange,
  onUserMemoryChange,
  chats,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatWorkspaceProps) => {
  const [history] = useState(() => createChatHistoryAdapter(conversationId))
  const runtime = useAgUiRuntime({ agent, adapters: { history } })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        clientConfig={clientConfig}
        userMemory={userMemory}
        onClientConfigChange={onClientConfigChange}
        onUserMemoryChange={onUserMemoryChange}
        isOpenRouterConfigured={hasOpenRouterApiKey(clientConfig)}
        chats={chats}
        activeChatId={conversationId}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
      />
    </AssistantRuntimeProvider>
  )
}
