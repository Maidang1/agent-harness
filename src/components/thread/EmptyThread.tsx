import { BookOpenText, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'

const examples = [
  ['小王子', '温柔、短篇，适合睡前慢慢读。', '治愈'],
  ['山茶文具店', '日常感强，节奏松弛。', '温暖'],
  ['也许你该找个人聊聊', '轻松理解情绪和关系。', '疗愈'],
]

export const EmptyThread = () => (
  <Empty className="mx-auto min-h-[calc(100vh-18rem)] max-w-4xl items-start justify-center border-0 p-0 text-left">
    <EmptyHeader className="max-w-2xl items-start">
      <EmptyMedia variant="icon">
        <Sparkles />
      </EmptyMedia>
      <Badge variant="secondary">本地阅读聊天</Badge>
      <EmptyTitle className="text-xl">说说你的阅读需求</EmptyTitle>
      <EmptyDescription>
        描述兴趣、困惑、目标或想解决的问题，我会按心情、难度和阅读场景推荐书。
      </EmptyDescription>
    </EmptyHeader>

    <EmptyContent className="max-w-3xl items-stretch">
      <Card>
        <CardHeader>
          <CardTitle>示例推荐</CardTitle>
          <CardDescription>低压力 · 睡前</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {examples.map(([title, reason, mood], index) => (
            <div key={title}>
              <div className="grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <BookOpenText />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
                </div>
                <Badge variant="outline">{mood}</Badge>
              </div>
              {index < examples.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </EmptyContent>
  </Empty>
)
