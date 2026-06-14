import { useMemo, useState } from 'react'
import { ThreadPrimitive } from '@assistant-ui/react'
import { type BookAgentClientConfig } from '../../client-config'
import {
  type ChatConversationSnapshot,
  type ChatSummary,
} from '../../chat-store'
import { type UserMemoryView } from '../../memory-data'
import { createRecommendationStats } from '../../recommendation-stats'
import {
  MAIN_WORKSPACE_CLASS_NAME,
  THREAD_ROOT_CLASS_NAME,
} from '../../sidebar-layout'
import { ChatSidebar } from './ChatSidebar'
import { Composer } from './Composer'
import { EmptyThread } from './EmptyThread'
import { MainHeader } from './MainHeader'
import { RecommendationStatsPanel } from './RecommendationStatsPanel'
import { SettingsModal } from './SettingsModal'
import { ThreadMessages } from './ThreadMessages'

export type ThreadProps = {
  clientConfig: BookAgentClientConfig
  userMemory: UserMemoryView
  onClientConfigChange: (config: BookAgentClientConfig) => void
  onUserMemoryChange: (memory: UserMemoryView) => void
  isOpenRouterConfigured: boolean
  chats: ChatSummary[]
  conversationSnapshots: ChatConversationSnapshot[]
  activeChatId: string
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
}

export const Thread = ({
  clientConfig,
  userMemory,
  onClientConfigChange,
  onUserMemoryChange,
  isOpenRouterConfigured,
  chats,
  conversationSnapshots,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ThreadProps) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isStatsPanelOpen, setIsStatsPanelOpen] = useState(false)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
  const activeChat = chats.find((chat) => chat.id === activeChatId)
  const headerTitle = activeChat?.title ?? '读书推荐 Agent'
  const currentStats = useMemo(
    () =>
      createRecommendationStats({
        conversations: conversationSnapshots,
        activeConversationId: activeChatId,
        scope: 'current',
        preferences: clientConfig.preferences,
        userMemory,
      }),
    [activeChatId, clientConfig.preferences, conversationSnapshots, userMemory],
  )
  const allStats = useMemo(
    () =>
      createRecommendationStats({
        conversations: conversationSnapshots,
        activeConversationId: activeChatId,
        scope: 'all',
        preferences: clientConfig.preferences,
        userMemory,
      }),
    [activeChatId, clientConfig.preferences, conversationSnapshots, userMemory],
  )

  const toggleSidebar = () => setIsSidebarCollapsed((value) => !value)
  const toggleStatsPanel = () => setIsStatsPanelOpen((value) => !value)

  return (
    <ThreadPrimitive.Root className={THREAD_ROOT_CLASS_NAME}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        isConfigOpen={isConfigOpen}
        onOpenConfig={() => setIsConfigOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <main className={MAIN_WORKSPACE_CLASS_NAME}>
        <MainHeader
          title={headerTitle}
          model={clientConfig.openrouter.model}
          isOpenRouterConfigured={isOpenRouterConfigured}
          isSidebarCollapsed={isSidebarCollapsed}
          isStatsPanelOpen={isStatsPanelOpen}
          onToggleSidebar={toggleSidebar}
          onOpenConfig={() => setIsConfigOpen(true)}
          onToggleStatsPanel={toggleStatsPanel}
          onOpenStatsDialog={() => setIsStatsDialogOpen(true)}
        />

        <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 pb-44 md:px-8">
          <ThreadPrimitive.Empty>
            <EmptyThread />
          </ThreadPrimitive.Empty>

          <ThreadMessages />
        </ThreadPrimitive.Viewport>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent px-4 pb-3.5 pt-8 md:px-8">
          <Composer />
        </div>
      </main>

      <RecommendationStatsPanel
        currentStats={currentStats}
        allStats={allStats}
        isDesktopOpen={isStatsPanelOpen}
        isDialogOpen={isStatsDialogOpen}
        onCloseDesktop={() => setIsStatsPanelOpen(false)}
        onDialogOpenChange={setIsStatsDialogOpen}
      />

      {isConfigOpen ? (
        <SettingsModal
          config={clientConfig}
          userMemory={userMemory}
          onChange={onClientConfigChange}
          onMemoryChange={onUserMemoryChange}
          onClose={() => setIsConfigOpen(false)}
        />
      ) : null}
    </ThreadPrimitive.Root>
  )
}
