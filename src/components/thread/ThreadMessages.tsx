import { MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import {
  ArrowClockwise,
  BookOpenText,
  Copy,
  ThumbsDown,
  ThumbsUp,
} from '@phosphor-icons/react'
import remarkGfm from 'remark-gfm'

export const ThreadMessages = () => (
  <div className="thread-messages">
    <ThreadPrimitive.Messages
      components={{
        UserMessage,
        AssistantMessage,
      }}
    />
  </div>
)

const UserMessage = () => (
  <MessagePrimitive.Root className="user-message">
    <div className="user-message-bubble">
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
  <MessagePrimitive.Root className="assistant-message">
    <div className="assistant-avatar" aria-hidden="true">
      <BookOpenText size={20} weight="fill" />
    </div>
    <div className="assistant-message-body">
      <div className="assistant-message-meta">
        <span className="assistant-name">读书推荐 Agent</span>
        <span className="assistant-time">刚刚</span>
      </div>
      <div className="assistant-message-content">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
          }}
        />
      </div>
      <div className="assistant-message-actions" aria-label="消息操作">
        <button type="button">
          <Copy size={15} />
          复制
        </button>
        <button type="button">
          <ArrowClockwise size={15} />
          重新生成
        </button>
        <span className="assistant-action-spacer" />
        <button type="button" aria-label="赞">
          <ThumbsUp size={15} />
          赞
        </button>
        <button type="button" aria-label="不赞">
          <ThumbsDown size={15} />
          不赞
        </button>
      </div>
    </div>
  </MessagePrimitive.Root>
)
