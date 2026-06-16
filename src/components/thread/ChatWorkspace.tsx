import { useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui'
import { BookRecommendationAgent } from '../../agents/openrouter-book-agent'
import {
  isBookAgentConfigured,
  type BookAgentClientConfig,
} from '../../config/client-config'
import {
  createChatHistoryAdapter,
  type ChatConversationSnapshot,
  type ChatSummary,
} from '../../chat/chat-store'
import { type UserMemoryView } from '../../memory/memory-data'
import { type ReadingWorkspace } from '../../reading/reading-workspace'
import { type WereadSnapshot } from '../../weread/weread-data'
import { Thread } from './Thread'

type ChatWorkspaceProps = {
  conversationId: string
  agent: BookRecommendationAgent
  clientConfig: BookAgentClientConfig
  userMemory: UserMemoryView
  wereadSnapshot: WereadSnapshot
  readingWorkspace: ReadingWorkspace
  isWereadSyncing: boolean
  onClientConfigChange: (config: BookAgentClientConfig) => void
  onUserMemoryChange: (memory: UserMemoryView) => void
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
  onSyncWeread: () => void
  chats: ChatSummary[]
  conversationSnapshots: ChatConversationSnapshot[]
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
}

export const ChatWorkspace = ({
  conversationId,
  agent,
  clientConfig,
  userMemory,
  wereadSnapshot,
  readingWorkspace,
  isWereadSyncing,
  onClientConfigChange,
  onUserMemoryChange,
  onReadingWorkspaceChange,
  onSyncWeread,
  chats,
  conversationSnapshots,
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
        wereadSnapshot={wereadSnapshot}
        readingWorkspace={readingWorkspace}
        isWereadSyncing={isWereadSyncing}
        onClientConfigChange={onClientConfigChange}
        onUserMemoryChange={onUserMemoryChange}
        onReadingWorkspaceChange={onReadingWorkspaceChange}
        onSyncWeread={onSyncWeread}
        isModelConfigured={isBookAgentConfigured(clientConfig)}
        chats={chats}
        conversationSnapshots={conversationSnapshots}
        activeChatId={conversationId}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
      />
    </AssistantRuntimeProvider>
  )
}
