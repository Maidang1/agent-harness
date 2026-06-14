import {
  ActionBarPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const ThreadMessages = () => (
  <div className="mx-auto w-full max-w-4xl">
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
    <div className="max-w-2xl rounded-xl rounded-br-sm border bg-card px-3 py-2 text-sm leading-7 shadow-sm">
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
  <MessagePrimitive.Root className="mb-6 grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
    <Avatar size="sm" className="mt-1">
      <AvatarFallback>
        <BookOpenText />
      </AvatarFallback>
    </Avatar>
    <Card className="min-w-0 shadow-none">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span>读书推荐 Agent</span>
          <span className="text-xs font-normal text-muted-foreground">刚刚</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-7">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
          }}
        />
      </CardContent>
      <CardFooter className="justify-between">
        <ActionBarPrimitive.Root
          hideWhenRunning
          className="flex w-full items-center gap-1"
          aria-label="消息操作"
        >
          <ActionBarPrimitive.Copy asChild>
            <Button type="button" variant="ghost" size="sm">
              <Copy data-icon="inline-start" />
              复制
            </Button>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload asChild>
            <Button type="button" variant="ghost" size="sm">
              <RefreshCw data-icon="inline-start" />
              重新生成
            </Button>
          </ActionBarPrimitive.Reload>
          <Separator orientation="vertical" className="ml-auto" />
          <ActionBarPrimitive.FeedbackPositive asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="赞">
              <ThumbsUp />
            </Button>
          </ActionBarPrimitive.FeedbackPositive>
          <ActionBarPrimitive.FeedbackNegative asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="不赞">
              <ThumbsDown />
            </Button>
          </ActionBarPrimitive.FeedbackNegative>
        </ActionBarPrimitive.Root>
      </CardFooter>
    </Card>
  </MessagePrimitive.Root>
)
