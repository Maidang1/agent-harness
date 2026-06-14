import {
  PanelLeftClose,
  Settings,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { type ChatSummary } from '../../chat-store'
import {
  SIDEBAR_PANEL_CLASS_NAME,
  SIDEBAR_TOGGLE_ICON_CLASS_NAME,
  SIDEBAR_TITLEBAR_CLASS_NAME,
} from '../../sidebar-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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
    className={cn(
      SIDEBAR_PANEL_CLASS_NAME,
      isCollapsed && 'w-0 border-r-0',
    )}
    aria-hidden={isCollapsed}
  >
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div
        data-tauri-drag-region
        className={SIDEBAR_TITLEBAR_CLASS_NAME}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="收起侧边栏"
          title="收起侧边栏"
          onClick={onToggle}
        >
          <PanelLeftClose className={SIDEBAR_TOGGLE_ICON_CLASS_NAME} />
        </Button>
      </div>

      <div className="px-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between"
          onClick={onNewChat}
        >
          <span className="flex min-w-0 items-center gap-2">
            <SquarePen data-icon="inline-start" />
            <span className="truncate">新建对话</span>
          </span>
          <Badge variant="outline">⌘ N</Badge>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-5">
        {chats.length > 0 ? (
          <div className="flex flex-col gap-6">
            {groupChats(chats).map((group) => (
              <section key={group.label} className="flex min-w-0 flex-col gap-2">
                <p className="px-2 text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1">
                  {group.chats.map((chat) => (
                    <ChatRow
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      onSelectChat={onSelectChat}
                      onDeleteChat={onDeleteChat}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Empty className="min-h-52 border">
            <EmptyHeader>
              <EmptyTitle>还没有历史对话</EmptyTitle>
              <EmptyDescription>新的阅读问题会出现在这里。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </ScrollArea>

      <Separator />
      <div className="shrink-0 p-3">
        <Button
          type="button"
          variant={isConfigOpen ? 'secondary' : 'ghost'}
          aria-haspopup="dialog"
          aria-expanded={isConfigOpen}
          onClick={onOpenConfig}
          className="w-full justify-between"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Settings data-icon="inline-start" />
            <span>设置</span>
          </span>
          <Badge variant="outline">⌘ ,</Badge>
        </Button>
      </div>
    </div>
  </aside>
)

type ChatRowProps = {
  chat: ChatSummary
  isActive: boolean
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
}

const ChatRow = ({
  chat,
  isActive,
  onSelectChat,
  onDeleteChat,
}: ChatRowProps) => (
  <div
    className={cn(
      'group flex items-center gap-1 rounded-lg',
      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
    )}
  >
    <Button
      type="button"
      variant="ghost"
      className="h-9 min-w-0 flex-1 justify-start gap-2 px-2"
      onClick={() => onSelectChat(chat.id)}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
      <span className="truncate text-left">{chat.title}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {formatChatTime(chat.updatedAt)}
      </span>
    </Button>
    <Button
      type="button"
      aria-label="删除对话"
      title="删除对话"
      variant="ghost"
      size="icon-xs"
      className="mr-1 opacity-0 group-hover:opacity-100"
      onClick={() => onDeleteChat(chat.id)}
    >
      <Trash2 />
    </Button>
  </div>
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
