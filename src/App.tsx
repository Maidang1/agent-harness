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
  listConversationSnapshots,
  listConversations,
  subscribeChats,
  type ChatConversationSnapshot,
  type ChatSummary,
} from './chat-store'

export const App = () => {
  const [clientConfig, setClientConfig] = useState(loadClientConfig)
  const [userMemory, setUserMemory] = useState(createDefaultUserMemory)
  const [agent] = useState(() => new OpenRouterBookAgent(clientConfig))
  const [conversationId, setConversationId] = useState(createConversationId)
  const [chats, setChats] = useState<ChatSummary[]>(() => listConversations())
  const [conversationSnapshots, setConversationSnapshots] = useState<
    ChatConversationSnapshot[]
  >(() => listConversationSnapshots())

  useEffect(() => {
    return subscribeChats(() => {
      setChats(listConversations())
      setConversationSnapshots(listConversationSnapshots())
    })
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

  useEffect(() => {
    agent.setUserMemory(userMemory)
  }, [agent, userMemory])

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
      conversationSnapshots={conversationSnapshots}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onDeleteChat={deleteConversation}
    />
  )
}
