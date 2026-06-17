import {
  BookOpenText,
  Brain,
  CalendarDays,
  Leaf,
  Moon,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

const examples = [
  {
    title: '小王子',
    reason: '温柔、短篇，适合睡前慢慢读。',
    mood: '治愈',
    toneClass: 'bg-system-green-soft text-system-green',
  },
  {
    title: '山茶文具店',
    reason: '日常感强，节奏松弛。',
    mood: '温暖',
    toneClass: 'bg-system-amber-soft text-system-amber',
  },
  {
    title: '也许你该找个人聊聊',
    reason: '轻松理解情绪和关系。',
    mood: '疗愈',
    toneClass: 'bg-system-blue-soft text-system-blue',
  },
]

const taskPatterns = [
  {
    title: '书架补洞',
    description: '从已读结构里找缺口，补一组下一步书单。',
    icon: Target,
  },
  {
    title: '划线复盘',
    description: '把笔记整理成观点、证据、行动和延伸阅读。',
    icon: Brain,
  },
  {
    title: '本周计划',
    description: '按精力、场景和时间排一周阅读节奏。',
    icon: CalendarDays,
  },
]

export const EmptyThread = () => (
  <Empty className="mx-auto min-h-[25rem] max-w-4xl items-start justify-center border-0 p-0 text-left">
    <EmptyHeader className="max-w-3xl items-start gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-system-accent/18 bg-system-accent-soft px-2.5 py-1 text-[11px] font-medium text-system-accent">
        <BookOpenText className="size-3" />
        本地阅读聊天
      </span>
      <div className="flex size-10 items-center justify-center rounded-xl border border-glass-edge bg-card/70 shadow-[0_16px_36px_-28px_var(--glass-shadow)]">
        <Sparkles className="size-3.5 text-system-accent" />
      </div>
      <EmptyTitle className="text-[28px] font-semibold leading-tight text-balance">
        说说你的阅读需求
      </EmptyTitle>
      <EmptyDescription className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
        描述兴趣、困惑、目标或想解决的问题，我会按心情、难度和阅读场景推荐书。
      </EmptyDescription>
    </EmptyHeader>

    <EmptyContent className="mt-4 max-w-3xl items-stretch gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {taskPatterns.map((pattern) => {
          const Icon = pattern.icon

          return (
            <div
              key={pattern.title}
              className="rounded-xl border border-glass-edge bg-card/38 p-3 shadow-[0_14px_36px_-30px_var(--glass-shadow)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-system-accent-soft text-system-accent">
                  <Icon className="size-3.5" />
                </span>
                <h3 className="text-[12.5px] font-semibold">{pattern.title}</h3>
              </div>
              <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
                {pattern.description}
              </p>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-glass-edge bg-card/52 shadow-[0_18px_46px_-36px_var(--glass-shadow)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <p className="text-[12px] font-medium text-muted-foreground">
            示例推荐
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Leaf className="size-3 text-system-green" />
            低压力
            <span className="text-muted-foreground/40">·</span>
            <Moon className="size-3 text-system-accent" />
            睡前
          </div>
        </div>
        <div className="flex flex-col">
          {examples.map((example, index) => (
            <div key={example.title}>
              {index > 0 ? (
                <div className="mx-4 border-t border-hairline" />
              ) : null}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-glass-edge bg-system-accent-soft">
                  <BookOpenText className="size-3 text-system-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-snug">{example.title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                    {example.reason}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${example.toneClass}`}>
                  {example.mood}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </EmptyContent>
  </Empty>
)
