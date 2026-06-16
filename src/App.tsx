import { useCallback, useEffect, useState } from 'react'
import { BookRecommendationAgent } from './agents/openrouter-book-agent'
import { ChatWorkspace } from './components/thread/ChatWorkspace'
import {
  loadClientConfig,
  saveClientConfig,
  type BookAgentClientConfig,
} from './config/client-config'
import {
  createDefaultUserMemory,
  type UserMemoryView,
} from './memory/memory-data'
import { loadUserMemory } from './memory/memory-store'
import {
  createConversationId,
  deleteConversation,
  listConversationSnapshots,
  listConversations,
  subscribeChats,
  type ChatConversationSnapshot,
  type ChatSummary,
} from './chat/chat-store'
import { parseBookRecommendationCards } from './recommendations/book-cards'
import {
  createDefaultReadingWorkspace,
  mergeRecommendationCards,
  normalizeReadingWorkspace,
  type ReadingWorkspace,
} from './reading/reading-workspace'
import {
  getReadingWorkspace,
  saveReadingWorkspace,
} from './reading/reading-store'
import {
  createDefaultWereadSnapshot,
} from './weread/weread-data'
import {
  getWereadSnapshot,
  syncWereadSnapshot,
} from './weread/weread-store'

const mergeWorkspaceWithSnapshots = (
  workspace: ReadingWorkspace,
  snapshots: ChatConversationSnapshot[],
) => {
  const cards = snapshots.flatMap((conversation) =>
    conversation.messages
      .filter((message) => message.role === 'assistant')
      .flatMap((message) =>
        parseBookRecommendationCards(message.content, message.createdAt),
      ),
  )

  return cards.length > 0
    ? mergeRecommendationCards(normalizeReadingWorkspace(workspace), cards)
    : normalizeReadingWorkspace(workspace)
}

const sameWorkspace = (left: ReadingWorkspace, right: ReadingWorkspace) =>
  JSON.stringify(left) === JSON.stringify(right)

export const App = () => {
  const [clientConfig, setClientConfig] = useState(loadClientConfig)
  const [userMemory, setUserMemory] = useState(createDefaultUserMemory)
  const [wereadSnapshot, setWereadSnapshot] = useState(createDefaultWereadSnapshot)
  const [readingWorkspace, setReadingWorkspace] = useState(
    createDefaultReadingWorkspace,
  )
  const [isWereadSyncing, setIsWereadSyncing] = useState(false)
  const [agent] = useState(() => new BookRecommendationAgent(clientConfig))
  const [conversationId, setConversationId] = useState(createConversationId)
  const [chats, setChats] = useState<ChatSummary[]>(() => listConversations())
  const [conversationSnapshots, setConversationSnapshots] = useState<
    ChatConversationSnapshot[]
  >(() => listConversationSnapshots())

  useEffect(() => {
    return subscribeChats(() => {
      const nextSnapshots = listConversationSnapshots()

      setChats(listConversations())
      setConversationSnapshots(nextSnapshots)
      setReadingWorkspace((currentWorkspace) => {
        const nextWorkspace = mergeWorkspaceWithSnapshots(
          currentWorkspace,
          nextSnapshots,
        )

        if (sameWorkspace(nextWorkspace, currentWorkspace)) {
          return currentWorkspace
        }

        void saveReadingWorkspace(nextWorkspace)

        return nextWorkspace
      })
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    void Promise.all([
      loadUserMemory(),
      getWereadSnapshot(),
      getReadingWorkspace(),
    ]).then(([memory, snapshot, workspace]) => {
      if (isMounted) {
        const nextWorkspace = mergeWorkspaceWithSnapshots(
          workspace,
          listConversationSnapshots(),
        )

        setUserMemory(memory)
        setWereadSnapshot(snapshot)
        setReadingWorkspace(nextWorkspace)

        if (!sameWorkspace(nextWorkspace, workspace)) {
          void saveReadingWorkspace(nextWorkspace)
        }
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

  useEffect(() => {
    agent.setReadingContext({
      wereadSnapshot,
      readingWorkspace,
    })
  }, [agent, readingWorkspace, wereadSnapshot])

  const syncWeread = useCallback(
    async (config: BookAgentClientConfig = clientConfig) => {
      setIsWereadSyncing(true)

      try {
        const snapshot = await syncWereadSnapshot(config)
        setWereadSnapshot(snapshot)
      } finally {
        setIsWereadSyncing(false)
      }
    },
    [clientConfig],
  )

  const updateClientConfig = useCallback(
    (config: BookAgentClientConfig) => {
      const shouldSyncWeread =
        config.wechatApiKey.trim().length > 0 &&
        config.wechatApiKey.trim() !== clientConfig.wechatApiKey.trim()

      agent.setClientConfig(config)
      setClientConfig(config)
      saveClientConfig(config)

      if (shouldSyncWeread) {
        void syncWeread(config)
      }
    },
    [agent, clientConfig.wechatApiKey, syncWeread],
  )

  const updateUserMemory = useCallback((memory: UserMemoryView) => {
    setUserMemory(memory)
  }, [])

  const updateReadingWorkspace = useCallback((workspace: ReadingWorkspace) => {
    const normalizedWorkspace = normalizeReadingWorkspace(workspace)

    setReadingWorkspace(normalizedWorkspace)
    void saveReadingWorkspace(normalizedWorkspace)
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
      wereadSnapshot={wereadSnapshot}
      readingWorkspace={readingWorkspace}
      isWereadSyncing={isWereadSyncing}
      onClientConfigChange={updateClientConfig}
      onUserMemoryChange={updateUserMemory}
      onReadingWorkspaceChange={updateReadingWorkspace}
      onSyncWeread={() => void syncWeread()}
      chats={chats}
      conversationSnapshots={conversationSnapshots}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onDeleteChat={deleteConversation}
    />
  )
}
