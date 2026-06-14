import { useState } from 'react'
import { ThreadPrimitive } from '@assistant-ui/react'
import { type BookAgentClientConfig } from '../../client-config'
import { type ChatSummary } from '../../chat-store'
import { ChatSidebar } from './ChatSidebar'
import { Composer } from './Composer'
import { EmptyThread } from './EmptyThread'
import { MainHeader } from './MainHeader'
import { SettingsModal } from './SettingsModal'
import { ThreadMessages } from './ThreadMessages'

export type ThreadProps = {
  clientConfig: BookAgentClientConfig
  onClientConfigChange: (config: BookAgentClientConfig) => void
  isOpenRouterConfigured: boolean
  chats: ChatSummary[]
  activeChatId: string
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
}

export const Thread = ({
  clientConfig,
  onClientConfigChange,
  isOpenRouterConfigured,
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ThreadProps) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => setIsSidebarCollapsed((value) => !value)

  return (
    <ThreadPrimitive.Root className="flex h-screen overflow-hidden bg-transparent text-[var(--text)]">
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

      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--main-bg)]">
        <MainHeader
          isOpenRouterConfigured={isOpenRouterConfigured}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-36 pt-8">
          <ThreadPrimitive.Empty>
            <EmptyThread />
          </ThreadPrimitive.Empty>

          <ThreadMessages />
        </ThreadPrimitive.Viewport>

        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,var(--main-bg)_24%)] px-5 pb-5 pt-10">
          <Composer />
        </div>
      </main>

      {isConfigOpen ? (
        <SettingsModal
          config={clientConfig}
          onChange={onClientConfigChange}
          onClose={() => setIsConfigOpen(false)}
        />
      ) : null}
    </ThreadPrimitive.Root>
  )
}
