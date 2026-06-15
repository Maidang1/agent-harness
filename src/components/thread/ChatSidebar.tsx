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
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
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
        className={cn(SIDEBAR_TITLEBAR_CLASS_NAME, 'justify-end')}
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
          variant="outline"
          className="h-9 w-full justify-between border-glass-edge bg-card/50 text-[12.5px] shadow-[0_10px_24px_-20px_var(--glass-shadow)] hover:bg-card/80"
          onClick={onNewChat}
        >
          <span className="flex min-w-0 items-center gap-2">
            <SquarePen className="size-3.5 text-system-accent" data-icon="inline-start" />
            <span className="truncate">新建对话</span>
          </span>
          <span className="rounded-md border border-hairline bg-background/45 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ⌘ N
          </span>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-5">
        {chats.length > 0 ? (
          <div className="flex flex-col gap-5">
            {groupChats(chats).map((group) => (
              <section key={group.label} className="flex min-w-0 flex-col gap-1">
                <p className="px-2 text-[10.5px] font-semibold text-muted-foreground">
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
          <Empty className="mt-7 min-h-42 rounded-xl border border-dashed border-hairline bg-card/20 px-4 py-7">
            <EmptyHeader>
              <EmptyTitle className="text-[12px] text-foreground">还没有历史对话</EmptyTitle>
              <EmptyDescription className="text-[11px] text-muted-foreground">新的阅读问题会出现在这里。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </ScrollArea>

      <div className="border-t border-hairline" />
      <div className="shrink-0 p-3">
        <Button
          type="button"
          variant={isConfigOpen ? 'secondary' : 'ghost'}
          aria-haspopup="dialog"
          aria-expanded={isConfigOpen}
          onClick={onOpenConfig}
          className="h-9 w-full justify-between rounded-xl text-[12.5px] hover:bg-card/60"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Settings className="size-3.5 text-muted-foreground" data-icon="inline-start" />
            <span>设置</span>
          </span>
          <span className="rounded-md border border-hairline bg-background/45 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ⌘ ,
          </span>
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
      'group flex items-center gap-0.5 rounded-lg transition-colors',
      isActive && 'bg-sidebar-accent/75 shadow-[inset_0_0_0_1px_var(--glass-edge)]',
    )}
  >
    <Button
      type="button"
      variant="ghost"
      className="h-8 min-w-0 flex-1 justify-start gap-2 rounded-lg px-2 text-[12px] hover:bg-card/45"
      onClick={() => onSelectChat(chat.id)}
    >
      <span className={cn(
        'size-1.5 shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_oklch,currentColor_14%,transparent)]',
        isActive ? 'bg-system-accent' : 'bg-muted-foreground',
      )} />
      <span className={cn('truncate text-left', isActive && 'font-medium text-sidebar-accent-foreground')}>
        {chat.title}
      </span>
    </Button>
    <Button
      type="button"
      aria-label="删除对话"
      title="删除对话"
      variant="ghost"
      size="icon-xs"
      className="mr-0.5 opacity-0 group-hover:opacity-60 hover:opacity-100!"
      onClick={() => onDeleteChat(chat.id)}
    >
      <Trash2 className="size-3" />
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
