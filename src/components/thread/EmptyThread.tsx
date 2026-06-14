import { BookOpenText, Sparkles } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

const examples = [
  ['小王子', '温柔、短篇，适合睡前慢慢读。', '治愈'],
  ['山茶文具店', '日常感强，节奏松弛。', '温暖'],
  ['也许你该找个人聊聊', '轻松理解情绪和关系。', '疗愈'],
]

export const EmptyThread = () => (
  <Empty className="mx-auto min-h-[calc(100vh-18rem)] max-w-3xl items-start justify-center border-0 p-0 text-left">
    <EmptyHeader className="max-w-2xl items-start gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-system-accent-soft">
        <Sparkles className="size-3.5 text-system-accent" />
      </div>
      <EmptyTitle className="text-xl font-semibold tracking-tight">
        说说你的阅读需求
      </EmptyTitle>
      <EmptyDescription className="text-[12.5px] leading-relaxed text-muted-foreground">
        描述兴趣、困惑、目标或想解决的问题，我会按心情、难度和阅读场景推荐书。
      </EmptyDescription>
    </EmptyHeader>

    <EmptyContent className="mt-3 max-w-2xl items-stretch">
      <div className="rounded-lg border border-hairline bg-card/40 backdrop-blur-sm">
        <div className="px-3.5 pb-0.5 pt-2.5">
          <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            示例推荐 · 低压力 · 睡前
          </p>
        </div>
        <div className="flex flex-col">
          {examples.map(([title, reason, mood], index) => (
            <div key={title}>
              {index > 0 ? (
                <div className="mx-3.5 border-t border-hairline" />
              ) : null}
              <div className="flex items-center gap-3 px-3.5 py-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-system-accent-soft">
                  <BookOpenText className="size-3 text-system-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium leading-snug">{title}</p>
                  <p className="mt-px text-[11px] leading-snug text-muted-foreground">
                    {reason}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {mood}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </EmptyContent>
  </Empty>
)
