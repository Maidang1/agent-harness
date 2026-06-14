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

      <nav className="px-3 pt-4">
        <SidebarAction
          icon={<PencilSimple size={18} weight="bold" />}
          label="新建对话"
          shortcut="⌘ N"
          onClick={onNewChat}
        />
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-7">
        {chats.length > 0 ? (
          groupChats(chats).map((group) => (
            <section key={group.label} className="sidebar-section">
              <p className="sidebar-section-title">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.chats.map((chat) => (
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
                      <span className="chat-row-dot" aria-hidden="true" />
                      <span className="chat-row-title truncate">{chat.title}</span>
                      <span className="chat-row-time">{formatChatTime(chat.updatedAt)}</span>
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
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="sidebar-empty">还没有历史对话</p>
        )}
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
            <span>设置</span>
          </span>
          <span className="sidebar-shortcut">⌘ ,</span>
        </button>
      </div>
    </div>
  </aside>
)

type SidebarActionProps = {
  icon: ReactNode
  label: string
  shortcut?: string
  onClick?: () => void
}

const SidebarAction = ({ icon, label, shortcut, onClick }: SidebarActionProps) => (
  <button type="button" className="sidebar-action" onClick={onClick}>
    <span className="sidebar-action-left">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    {shortcut ? <span className="sidebar-shortcut">{shortcut}</span> : null}
  </button>
)

type ChatGroup = {
  label: string
  chats: ChatSummary[]
}

const groupChats = (chats: ChatSummary[]): ChatGroup[] => {
  const groups = new Map<string, ChatSummary[]>()

  for (const chat of chats) {
    const label = getChatGroupLabel(chat.updatedAt)
    groups.set(label, [...(groups.get(label) ?? []), chat])
  }

  return ['今天', '昨天', '更早']
    .map((label) => ({ label, chats: groups.get(label) ?? [] }))
    .filter((group) => group.chats.length > 0)
}

const getChatGroupLabel = (timestamp: number) => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) {
    return '今天'
  }

  if (isSameDay(date, yesterday)) {
    return '昨天'
  }

  return '更早'
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const formatChatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const today = new Date()

  if (isSameDay(date, today)) {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
