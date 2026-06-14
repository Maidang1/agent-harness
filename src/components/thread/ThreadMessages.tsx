import { MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import remarkGfm from 'remark-gfm'

export const ThreadMessages = () => (
  <div className="mx-auto w-full max-w-[880px]">
    <ThreadPrimitive.Messages
      components={{
        UserMessage,
        AssistantMessage,
      }}
    />
  </div>
)

const UserMessage = () => (
  <MessagePrimitive.Root className="mb-5 flex justify-end">
    <div className="max-w-[min(74%,42rem)] rounded-3xl rounded-br-lg bg-[var(--user-message)] px-4 py-3 text-[15px] leading-7 text-white">
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
  <MessagePrimitive.Root className="mb-5 flex justify-start">
    <div className="max-w-[min(82%,46rem)] rounded-3xl rounded-bl-lg border border-[var(--line)] bg-white px-4 py-3 text-[15px] leading-7 text-[var(--text)] shadow-sm">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownText,
        }}
      />
    </div>
  </MessagePrimitive.Root>
)
