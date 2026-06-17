import { useMemo, useState } from 'react'
import { ThreadPrimitive } from '@assistant-ui/react'
import { type BookAgentClientConfig } from '../../config/client-config'
import {
  type ChatConversationSnapshot,
  type ChatSummary,
} from '../../chat/chat-store'
import { type UserMemoryView } from '../../memory/memory-data'
import { type ReadingWorkspace } from '../../reading/reading-workspace'
import { type AppUpdateState } from '../../updates/app-updates'
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
import { SettingsModal, type SettingsTab } from './SettingsModal'
import { ThreadMessages } from './ThreadMessages'

export type ThreadProps = {
  clientConfig: BookAgentClientConfig
  userMemory: UserMemoryView
  wereadSnapshot: WereadSnapshot
  readingWorkspace: ReadingWorkspace
  isWereadSyncing: boolean
  appVersion: string
  appUpdateState: AppUpdateState
  onClientConfigChange: (config: BookAgentClientConfig) => void
  onUserMemoryChange: (memory: UserMemoryView) => void
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
  onSyncWeread: () => void
  onCheckForAppUpdate: () => void
  onInstallAppUpdate: () => void
  onRestartAfterUpdate: () => void
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
  appVersion,
  appUpdateState,
  onClientConfigChange,
  onUserMemoryChange,
  onReadingWorkspaceChange,
  onSyncWeread,
  onCheckForAppUpdate,
  onInstallAppUpdate,
  onRestartAfterUpdate,
  isModelConfigured,
  chats,
  conversationSnapshots,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ThreadProps) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] =
    useState<SettingsTab>('api')
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
  const openConfig = (tab: SettingsTab = 'api') => {
    setSettingsInitialTab(tab)
    setIsConfigOpen(true)
  }

  return (
    <ThreadPrimitive.Root className={THREAD_ROOT_CLASS_NAME}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        isConfigOpen={isConfigOpen}
        onOpenConfig={() => openConfig()}
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
          appUpdateState={appUpdateState}
          onToggleSidebar={toggleSidebar}
          onOpenConfig={() => openConfig()}
          onOpenAppSettings={() => openConfig('app')}
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
          key={settingsInitialTab}
          initialTab={settingsInitialTab}
          config={clientConfig}
          userMemory={userMemory}
          appVersion={appVersion}
          appUpdateState={appUpdateState}
          onChange={onClientConfigChange}
          onMemoryChange={onUserMemoryChange}
          onCheckForAppUpdate={onCheckForAppUpdate}
          onInstallAppUpdate={onInstallAppUpdate}
          onRestartAfterUpdate={onRestartAfterUpdate}
          onClose={() => setIsConfigOpen(false)}
        />
      ) : null}
    </ThreadPrimitive.Root>
  )
}
