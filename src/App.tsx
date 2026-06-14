import { useCallback, useEffect, useState } from 'react'
import { OpenRouterBookAgent } from './agents/openrouter-book-agent'
import { ChatWorkspace } from './components/ChatWorkspace'
import {
  loadClientConfig,
  saveClientConfig,
  type BookAgentClientConfig,
} from './client-config'
import {
  createConversationId,
  deleteConversation,
  listConversations,
  subscribeChats,
  type ChatSummary,
} from './chat-store'

export const App = () => {
  const [clientConfig, setClientConfig] = useState(loadClientConfig)
  const [agent] = useState(() => new OpenRouterBookAgent(clientConfig))
  const [conversationId, setConversationId] = useState(createConversationId)
  const [chats, setChats] = useState<ChatSummary[]>(() => listConversations())

  useEffect(() => {
    return subscribeChats(() => setChats(listConversations()))
  }, [])

  const updateClientConfig = useCallback(
    (config: BookAgentClientConfig) => {
      agent.setClientConfig(config)
      setClientConfig(config)
      saveClientConfig(config)
    },
    [agent],
  )

  const handleNewChat = useCallback(() => {
    setConversationId(createConversationId())
  }, [])

  const handleSelectChat = useCallback((id: string) => {
    setConversationId(id)
  }, [])

  return (
    <ChatWorkspace
      key={conversationId}
      conversationId={conversationId}
      agent={agent}
      clientConfig={clientConfig}
      onClientConfigChange={updateClientConfig}
      chats={chats}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onDeleteChat={deleteConversation}
    />
  )
}
