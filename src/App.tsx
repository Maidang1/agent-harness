import { useCallback, useEffect, useState } from 'react'
import { OpenRouterBookAgent } from './agents/openrouter-book-agent'
import { ChatWorkspace } from './components/ChatWorkspace'
import {
  loadClientConfig,
  saveClientConfig,
  type BookAgentClientConfig,
} from './client-config'
import {
  createDefaultUserMemory,
  type UserMemoryView,
} from './memory-data'
import { loadUserMemory } from './memory-store'
import {
  createConversationId,
  deleteConversation,
  listConversations,
  subscribeChats,
  type ChatSummary,
} from './chat-store'

export const App = () => {
  const [clientConfig, setClientConfig] = useState(loadClientConfig)
  const [userMemory, setUserMemory] = useState(createDefaultUserMemory)
  const [agent] = useState(() => new OpenRouterBookAgent(clientConfig))
  const [conversationId, setConversationId] = useState(createConversationId)
  const [chats, setChats] = useState<ChatSummary[]>(() => listConversations())

  useEffect(() => {
    return subscribeChats(() => setChats(listConversations()))
  }, [])

  useEffect(() => {
    let isMounted = true

    void loadUserMemory().then((memory) => {
      if (isMounted) {
        setUserMemory(memory)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    agent.setMemoryChangeHandler(setUserMemory)
  }, [agent])

  const updateClientConfig = useCallback(
    (config: BookAgentClientConfig) => {
      agent.setClientConfig(config)
      setClientConfig(config)
      saveClientConfig(config)
    },
    [agent],
  )

  const updateUserMemory = useCallback((memory: UserMemoryView) => {
    setUserMemory(memory)
  }, [])

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
      userMemory={userMemory}
      onClientConfigChange={updateClientConfig}
      onUserMemoryChange={updateUserMemory}
      chats={chats}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onDeleteChat={deleteConversation}
    />
  )
}
