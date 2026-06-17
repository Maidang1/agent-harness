import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
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
import {
  INSPECTOR_PANEL_WIDTH,
  INSPECTOR_WIDTH_STORAGE_KEY,
  SIDEBAR_PANEL_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
  calculateDraggedPanelWidth,
  clampPanelWidth,
  readStoredPanelWidth,
  writeStoredPanelWidth,
  type PanelWidthBounds,
  type ResizeEdge,
} from '../../layout/resizable-panels'
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
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredPanelWidth(
      getLayoutStorage(),
      SIDEBAR_WIDTH_STORAGE_KEY,
      SIDEBAR_PANEL_WIDTH,
    ),
  )
  const [inspectorWidth, setInspectorWidth] = useState(() =>
    readStoredPanelWidth(
      getLayoutStorage(),
      INSPECTOR_WIDTH_STORAGE_KEY,
      INSPECTOR_PANEL_WIDTH,
    ),
  )
  const [resizingPanel, setResizingPanel] = useState<ResizablePanelId | null>(
    null,
  )
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
  const startPanelResize = useCallback(
    ({
      event,
      panel,
      edge,
      startWidth,
      bounds,
      storageKey,
    }: StartPanelResizeInput) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      event.preventDefault()

      const storage = getLayoutStorage()
      const startClientX = event.clientX
      const setWidth =
        panel === 'sidebar' ? setSidebarWidth : setInspectorWidth

      setResizingPanel(panel)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
        const nextWidth = calculateDraggedPanelWidth({
          edge,
          startWidth,
          startClientX,
          currentClientX: moveEvent.clientX,
          bounds,
        })

        setWidth(nextWidth)
        writeStoredPanelWidth(storage, storageKey, nextWidth, bounds)
      }

      const stopResize = () => {
        setResizingPanel(null)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', stopResize)
        window.removeEventListener('pointercancel', stopResize)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopResize)
      window.addEventListener('pointercancel', stopResize)
    },
    [],
  )
  const resizePanelByKeyboard = useCallback(
    ({
      event,
      panel,
      edge,
      width,
      bounds,
      storageKey,
    }: KeyboardPanelResizeInput) => {
      const keyDelta = resizeKeyDelta(event.key)

      if (keyDelta === 0) {
        return
      }

      event.preventDefault()

      const direction = edge === 'right' ? 1 : -1
      const nextWidth = clampPanelWidth(width + keyDelta * direction, bounds)
      const setWidth =
        panel === 'sidebar' ? setSidebarWidth : setInspectorWidth

      setWidth(nextWidth)
      writeStoredPanelWidth(getLayoutStorage(), storageKey, nextWidth, bounds)
    },
    [],
  )

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
        width={sidebarWidth}
        minWidth={SIDEBAR_PANEL_WIDTH.min}
        maxWidth={SIDEBAR_PANEL_WIDTH.max}
        isResizing={resizingPanel === 'sidebar'}
        onResizePointerDown={(event) =>
          startPanelResize({
            event,
            panel: 'sidebar',
            edge: 'right',
            startWidth: sidebarWidth,
            bounds: SIDEBAR_PANEL_WIDTH,
            storageKey: SIDEBAR_WIDTH_STORAGE_KEY,
          })
        }
        onResizeKeyDown={(event) =>
          resizePanelByKeyboard({
            event,
            panel: 'sidebar',
            edge: 'right',
            width: sidebarWidth,
            bounds: SIDEBAR_PANEL_WIDTH,
            storageKey: SIDEBAR_WIDTH_STORAGE_KEY,
          })
        }
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
        desktopWidth={inspectorWidth}
        minDesktopWidth={INSPECTOR_PANEL_WIDTH.min}
        maxDesktopWidth={INSPECTOR_PANEL_WIDTH.max}
        isDesktopResizing={resizingPanel === 'inspector'}
        onSyncWeread={onSyncWeread}
        onReadingWorkspaceChange={onReadingWorkspaceChange}
        onDesktopResizePointerDown={(event) =>
          startPanelResize({
            event,
            panel: 'inspector',
            edge: 'left',
            startWidth: inspectorWidth,
            bounds: INSPECTOR_PANEL_WIDTH,
            storageKey: INSPECTOR_WIDTH_STORAGE_KEY,
          })
        }
        onDesktopResizeKeyDown={(event) =>
          resizePanelByKeyboard({
            event,
            panel: 'inspector',
            edge: 'left',
            width: inspectorWidth,
            bounds: INSPECTOR_PANEL_WIDTH,
            storageKey: INSPECTOR_WIDTH_STORAGE_KEY,
          })
        }
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

type ResizablePanelId = 'sidebar' | 'inspector'

type StartPanelResizeInput = {
  event: PointerEvent<HTMLDivElement>
  panel: ResizablePanelId
  edge: ResizeEdge
  startWidth: number
  bounds: PanelWidthBounds
  storageKey: string
}

type KeyboardPanelResizeInput = {
  event: KeyboardEvent<HTMLDivElement>
  panel: ResizablePanelId
  edge: ResizeEdge
  width: number
  bounds: PanelWidthBounds
  storageKey: string
}

const getLayoutStorage = () =>
  typeof window === 'undefined' ? undefined : window.localStorage

const resizeKeyDelta = (key: string) => {
  if (key === 'ArrowLeft') {
    return -16
  }

  if (key === 'ArrowRight') {
    return 16
  }

  return 0
}
