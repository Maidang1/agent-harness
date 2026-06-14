import { type ReactNode } from 'react'
import {
  GearSix,
  PencilSimple,
  SidebarSimple,
  TrashSimple,
} from '@phosphor-icons/react'
import { type ChatSummary } from '../../chat-store'

type ChatSidebarProps = {
  chats: ChatSummary[]
  activeChatId: string
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
  isConfigOpen: boolean
  onOpenConfig: () => void
  isCollapsed: boolean
  onToggle: () => void
}

export const ChatSidebar = ({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isConfigOpen,
  onOpenConfig,
  isCollapsed,
  onToggle,
}: ChatSidebarProps) => (
  <aside
    className={`codex-sidebar hidden h-full shrink-0 flex-col border-r border-[var(--line)] md:flex ${
      isCollapsed ? 'codex-sidebar-collapsed' : ''
    }`}
    aria-hidden={isCollapsed}
  >
    <div className="codex-sidebar-inner flex h-full flex-col">
      <div
        data-tauri-drag-region
        className="sidebar-chrome-row"
      >
        <button
          type="button"
          className="sidebar-toggle sidebar-chrome-toggle"
          aria-label="收起侧边栏"
          title="收起侧边栏"
          onClick={onToggle}
        >
          <SidebarSimple size={16} weight="bold" />
        </button>
      </div>

      <nav className="px-3 py-1">
        <SidebarAction
          icon={<PencilSimple size={16} weight="bold" />}
          label="New chat"
          onClick={onNewChat}
        />
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-5">
        <section className="sidebar-section">
          <p className="sidebar-section-title">Chats</p>
          <div className="mt-2 space-y-0.5">
            {chats.length > 0 ? (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-row ${
                    chat.id === activeChatId ? 'chat-row-active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="chat-row-label"
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <span className="truncate">{chat.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="删除对话"
                    title="删除对话"
                    className="chat-row-delete"
                    onClick={() => onDeleteChat(chat.id)}
                  >
                    <TrashSimple size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="sidebar-empty">还没有历史对话</p>
            )}
          </div>
        </section>
      </div>

      <div className="shrink-0 px-3 py-3">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isConfigOpen}
          onClick={onOpenConfig}
          className={`sidebar-footer-button ${
            isConfigOpen ? 'sidebar-footer-button-active' : ''
          }`}
        >
          <span className="sidebar-footer-button-left">
            <GearSix size={16} weight="bold" />
            <span>Settings</span>
          </span>
        </button>
      </div>
    </div>
  </aside>
)

type SidebarActionProps = {
  icon: ReactNode
  label: string
  onClick?: () => void
}

const SidebarAction = ({ icon, label, onClick }: SidebarActionProps) => (
  <button type="button" className="sidebar-action" onClick={onClick}>
    {icon}
    <span className="truncate">{label}</span>
  </button>
)
