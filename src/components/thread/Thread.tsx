import { useState } from 'react'
import { ThreadPrimitive } from '@assistant-ui/react'
import { type BookAgentClientConfig } from '../../client-config'
import { type ChatSummary } from '../../chat-store'
import { type UserMemoryView } from '../../memory-data'
import {
  MAIN_WORKSPACE_CLASS_NAME,
  THREAD_ROOT_CLASS_NAME,
} from '../../sidebar-layout'
import { ChatSidebar } from './ChatSidebar'
import { Composer } from './Composer'
import { EmptyThread } from './EmptyThread'
import { MainHeader } from './MainHeader'
import { SettingsModal } from './SettingsModal'
import { ThreadMessages } from './ThreadMessages'

export type ThreadProps = {
  clientConfig: BookAgentClientConfig
  userMemory: UserMemoryView
  onClientConfigChange: (config: BookAgentClientConfig) => void
  onUserMemoryChange: (memory: UserMemoryView) => void
  isOpenRouterConfigured: boolean
  chats: ChatSummary[]
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
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ThreadProps) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const activeChat = chats.find((chat) => chat.id === activeChatId)
  const headerTitle = activeChat?.title ?? '读书推荐 Agent'

  const toggleSidebar = () => setIsSidebarCollapsed((value) => !value)

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
          onToggleSidebar={toggleSidebar}
          onOpenConfig={() => setIsConfigOpen(true)}
        />

        <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 pb-56 md:px-8">
          <ThreadPrimitive.Empty>
            <EmptyThread />
          </ThreadPrimitive.Empty>

          <ThreadMessages />
        </ThreadPrimitive.Viewport>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/95 to-background/0 px-4 pb-5 pt-12 md:px-8">
          <Composer />
        </div>
      </main>

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
