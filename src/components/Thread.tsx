import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpenText, PaperPlaneRight, CircleNotch } from '@phosphor-icons/react'

export const Thread = () => {
  return (
    <ThreadPrimitive.Root className="flex h-screen flex-col bg-[var(--page-bg)]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-8 sm:py-5">
        <span className="flex size-9 items-center justify-center rounded-md bg-[var(--brand-tint)] text-[var(--brand)] sm:size-10">
          <BookOpenText size={24} weight="duotone" />
        </span>
        <div>
          <h1 className="font-serif text-xl font-semibold text-[var(--ink)] sm:text-2xl">
            读书推荐 Agent
          </h1>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            为你的阅读，找到一本合适的书
          </p>
        </div>
      </header>

      {/* Messages */}
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
        <ThreadPrimitive.Empty>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <BookOpenText
              className="text-[var(--brand)]"
              size={48}
              weight="duotone"
            />
            <h2 className="mt-4 font-serif text-2xl font-semibold text-[var(--ink)]">
              说说你的阅读需求
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              描述你的兴趣、困惑、目标或想解决的问题，越具体越好。
            </p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      {/* Composer */}
      <div className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-4 sm:px-8 sm:py-5">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  )
}

const UserMessage = () => (
  <MessagePrimitive.Root className="mb-4 flex justify-end">
    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--brand)] px-4 py-3 text-sm leading-7 text-white sm:text-base">
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
  <MessagePrimitive.Root className="mb-4 flex justify-start">
    <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownText,
        }}
      />
    </div>
  </MessagePrimitive.Root>
)

const Composer = () => (
  <ComposerPrimitive.Root className="flex items-end gap-3">
    <ComposerPrimitive.Input
      placeholder="描述你的阅读需求，比如：最近工作压力大，想通过阅读调整心态..."
      className="flex-1 resize-none rounded-xl border border-[var(--line-strong)] bg-[var(--page-bg)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-light)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(27,54,93,0.12)] sm:text-base sm:leading-7"
      autoFocus
    />
    <ComposerPrimitive.Send className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand)] text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:bg-[var(--line-strong)] disabled:text-[var(--muted-light)]">
      <SendIcon />
    </ComposerPrimitive.Send>
  </ComposerPrimitive.Root>
)

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return isRunning ? (
    <CircleNotch size={20} className="animate-spin" />
  ) : (
    <PaperPlaneRight size={20} weight="fill" />
  )
}
