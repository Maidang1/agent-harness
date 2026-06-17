import { useMemo, useState } from 'react'
import { ThreadPrimitive } from '@assistant-ui/react'
import { type BookAgentClientConfig } from '../../config/client-config'
import {
  type ChatConversationSnapshot,
  type ChatSummary,
} from '../../chat/chat-store'
import { type UserMemoryView } from '../../memory/memory-data'
import { type ReadingWorkspace } from '../../reading/reading-workspace'
import { createRecommendationStats } from '../../recommendations/recommendation-stats'
import { type WereadSnapshot } from '../../weread/weread-data'
import {
  MAIN_WORKSPACE_CLASS_NAME,
  THREAD_ROOT_CLASS_NAME,
} from '../../layout/sidebar-layout'
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
  wereadSnapshot: WereadSnapshot
  readingWorkspace: ReadingWorkspace
  isWereadSyncing: boolean
  onClientConfigChange: (config: BookAgentClientConfig) => void
  onUserMemoryChange: (memory: UserMemoryView) => void
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
  onSyncWeread: () => void
  isModelConfigured: boolean
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
  wereadSnapshot,
  readingWorkspace,
  isWereadSyncing,
  onClientConfigChange,
  onUserMemoryChange,
  onReadingWorkspaceChange,
  onSyncWeread,
  isModelConfigured,
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
  const headerTitle = activeChat?.title ?? 'JIAJIA'
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

      <main
        className={MAIN_WORKSPACE_CLASS_NAME}
      >
        <MainHeader
          title={headerTitle}
          provider={clientConfig.provider}
          model={
            clientConfig.provider === 'codex'
              ? clientConfig.codex.model || 'Codex 默认模型'
              : clientConfig.openrouter.model
          }
          isModelConfigured={isModelConfigured}
          isSidebarCollapsed={isSidebarCollapsed}
          isStatsPanelOpen={isStatsPanelOpen}
          onToggleSidebar={toggleSidebar}
          onOpenConfig={() => setIsConfigOpen(true)}
          onToggleStatsPanel={toggleStatsPanel}
          onOpenStatsDialog={() => setIsStatsDialogOpen(true)}
        />

        <ThreadPrimitive.Viewport
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-7 md:px-10"
        >
          <ThreadPrimitive.Empty>
            <EmptyThread />
          </ThreadPrimitive.Empty>

          <ThreadMessages />
        </ThreadPrimitive.Viewport>

        <div className="shrink-0 bg-gradient-to-t from-background via-background/96 to-background/70 px-5 pb-5 pt-4 md:px-10">
          <Composer />
        </div>
      </main>

      <RecommendationStatsPanel
        currentStats={currentStats}
        allStats={allStats}
        userMemory={userMemory}
        wereadSnapshot={wereadSnapshot}
        readingWorkspace={readingWorkspace}
        isWereadSyncing={isWereadSyncing}
        isDesktopOpen={isStatsPanelOpen}
        isDialogOpen={isStatsDialogOpen}
        onSyncWeread={onSyncWeread}
        onReadingWorkspaceChange={onReadingWorkspaceChange}
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
