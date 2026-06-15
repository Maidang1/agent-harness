import {
  ActionBarPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import {
  BookOpenText,
  Copy,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import remarkGfm from 'remark-gfm'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export const ThreadMessages = () => (
  <div className="mx-auto w-full max-w-4xl">
    <ThreadPrimitive.Messages
      components={{
        UserMessage,
        AssistantMessage,
      }}
    />
    <ThinkingIndicator />
  </div>
)

const UserMessage = () => (
  <MessagePrimitive.Root className="mb-4 flex justify-end">
    <div className="max-w-2xl rounded-2xl rounded-br-md border border-glass-edge bg-accent/65 px-3.5 py-2 text-[13.5px] leading-7 shadow-[0_12px_30px_-26px_var(--glass-shadow)]">
      <MessagePrimitive.Content />
    </div>
  </MessagePrimitive.Root>
)

const MarkdownText = () => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className="markdown-content"
  />
)

const AssistantMessage = () => (
  <MessagePrimitive.Root className="group/msg mb-5 grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
    <Avatar size="sm" className="mt-0.5 size-8 rounded-xl">
      <AvatarFallback className="rounded-xl border border-glass-edge bg-system-accent-soft text-system-accent">
        <BookOpenText className="size-3" />
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <div className="text-[13.5px] leading-7">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
          }}
        />
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        className="mt-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100"
        aria-label="消息操作"
      >
        <ActionBarPrimitive.Copy asChild>
          <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-card/70 hover:text-foreground">
            <Copy className="size-2.5" />
          </Button>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-card/70 hover:text-foreground">
            <RefreshCw className="size-2.5" />
          </Button>
        </ActionBarPrimitive.Reload>
        <div className="mx-0.5 h-2.5 w-px bg-hairline" />
        <ActionBarPrimitive.FeedbackPositive asChild>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="赞" className="text-muted-foreground hover:bg-card/70 hover:text-foreground">
            <ThumbsUp className="size-2.5" />
          </Button>
        </ActionBarPrimitive.FeedbackPositive>
        <ActionBarPrimitive.FeedbackNegative asChild>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="不赞" className="text-muted-foreground hover:bg-card/70 hover:text-foreground">
            <ThumbsDown className="size-2.5" />
          </Button>
        </ActionBarPrimitive.FeedbackNegative>
      </ActionBarPrimitive.Root>
    </div>
  </MessagePrimitive.Root>
)

const ThinkingIndicator = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)
  const messageCount = useAuiState((s) => s.thread.messages.length)
  const lastMessage = useAuiState((s) => {
    const msgs = s.thread.messages
    return msgs.length > 0 ? msgs[msgs.length - 1] : null
  })

  const showThinking =
    isRunning &&
    messageCount > 0 &&
    lastMessage?.role === 'user'

  if (!showThinking) return null

  return (
    <div className="mb-5 grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <Avatar size="sm" className="mt-0.5 size-8 rounded-xl">
        <AvatarFallback className="rounded-xl border border-glass-edge bg-system-accent-soft text-system-accent">
          <BookOpenText className="size-3" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 pt-1.5">
        <span className="thinking-dot size-1.25 rounded-full bg-muted-foreground/50" />
        <span className="thinking-dot size-1.25 rounded-full bg-muted-foreground/50 [animation-delay:160ms]" />
        <span className="thinking-dot size-1.25 rounded-full bg-muted-foreground/50 [animation-delay:320ms]" />
      </div>
    </div>
  )
}
