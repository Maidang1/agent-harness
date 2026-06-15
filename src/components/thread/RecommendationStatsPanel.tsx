import { useState } from 'react'
import {
  ChartNoAxesColumnIncreasing,
  PanelRightClose,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { INSPECTOR_PANEL_CLASS_NAME } from '../../sidebar-layout'
import {
  type RecommendationStats,
  type RecommendationStatsScope,
  type StatsCountItem,
} from '../../recommendation-stats'

type RecommendationStatsPanelProps = {
  currentStats: RecommendationStats
  allStats: RecommendationStats
  isDesktopOpen: boolean
  isDialogOpen: boolean
  onCloseDesktop: () => void
  onDialogOpenChange: (open: boolean) => void
}

export const RecommendationStatsPanel = ({
  currentStats,
  allStats,
  isDesktopOpen,
  isDialogOpen,
  onCloseDesktop,
  onDialogOpenChange,
}: RecommendationStatsPanelProps) => {
  const [scope, setScope] = useState<RecommendationStatsScope>('current')
  const stats = scope === 'current' ? currentStats : allStats

  return (
    <>
      {isDesktopOpen ? (
        <aside className={INSPECTOR_PANEL_CLASS_NAME}>
          <StatsPanelContent
            stats={stats}
            scope={scope}
            onScopeChange={setScope}
            onClose={onCloseDesktop}
          />
        </aside>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-md md:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>推荐统计</DialogTitle>
            <DialogDescription>分类和意图统计</DialogDescription>
          </DialogHeader>
          <StatsPanelContent
            stats={stats}
            scope={scope}
            onScopeChange={setScope}
            onClose={() => onDialogOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

type StatsPanelContentProps = {
  stats: RecommendationStats
  scope: RecommendationStatsScope
  onScopeChange: (scope: RecommendationStatsScope) => void
  onClose: () => void
}

const StatsPanelContent = ({
  stats,
  scope,
  onScopeChange,
  onClose,
}: StatsPanelContentProps) => (
  <div className="flex min-h-0 w-full flex-col">
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md border border-glass-edge bg-card/55">
          <ChartNoAxesColumnIncreasing className="size-3 shrink-0 text-system-accent" />
        </div>
        <h2 className="truncate text-[13px] font-semibold">推荐统计</h2>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="关闭统计面板"
        title="关闭统计面板"
        onClick={onClose}
        className="size-7 rounded-lg text-muted-foreground hover:bg-card/65 hover:text-foreground"
      >
        <PanelRightClose className="size-3" />
      </Button>
    </div>

    <div className="shrink-0 border-b border-hairline px-4 py-3">
      <ToggleGroup
        type="single"
        value={scope}
        onValueChange={(value) => {
          if (value === 'current' || value === 'all') {
            onScopeChange(value)
          }
        }}
        variant="outline"
        size="sm"
        spacing={0}
        className="grid w-full grid-cols-2 overflow-hidden rounded-xl border border-glass-edge bg-background/35 p-0.5"
      >
        <ToggleGroupItem value="current" className="h-8 w-full rounded-lg border-0 text-[12px] data-[state=on]:bg-card data-[state=on]:text-system-accent data-[state=on]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
          当前对话
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className="h-8 w-full rounded-lg border-0 text-[12px] data-[state=on]:bg-card data-[state=on]:text-system-accent data-[state=on]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
          全部历史
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-5 px-4 py-4">
        <MetricGrid stats={stats} />
        <DistributionSection
          title="书籍分类"
          items={stats.categoryCounts}
          emptyLabel="暂无分类信号"
        />
        <DistributionSection
          title="推荐意图"
          items={stats.intentCounts}
          emptyLabel="暂无推荐意图"
        />
        <RecentPrompts prompts={stats.recentPrompts} />
      </div>
    </ScrollArea>
  </div>
)

const MetricGrid = ({ stats }: { stats: RecommendationStats }) => {
  const metrics = [
    { label: '对话', value: stats.chatCount, className: 'text-system-accent' },
    { label: '提示', value: stats.userPromptCount, className: 'text-system-blue' },
    { label: '回复', value: stats.assistantReplyCount, className: 'text-system-green' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-glass-edge bg-card/45 px-3 py-2.5 shadow-[0_12px_28px_-24px_var(--glass-shadow)]"
        >
          <div className={`text-lg font-semibold tabular-nums ${metric.className}`}>{metric.value}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{metric.label}</div>
        </div>
      ))}
    </div>
  )
}

type DistributionSectionProps = {
  title: string
  items: StatsCountItem[]
  emptyLabel: string
}

const DistributionSection = ({
  title,
  items,
  emptyLabel,
}: DistributionSectionProps) => (
  <section className="flex flex-col gap-2.5">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[11px] font-semibold text-muted-foreground">{title}</h3>
      {items.length > 0 ? (
        <span className="text-[11px] tabular-nums text-muted-foreground">{sumCounts(items)} 次</span>
      ) : null}
    </div>

    {items.length > 0 ? (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <DistributionRow key={item.id} item={item} />
        ))}
      </div>
    ) : (
      <p className="rounded-xl border border-dashed border-hairline bg-card/22 px-3 py-5 text-center text-[11px] text-muted-foreground">
        {emptyLabel}
      </p>
    )}
  </section>
)

const DistributionRow = ({ item }: { item: StatsCountItem }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="min-w-0 truncate">{item.label}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {item.count} · {item.percentage}%
      </span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted/45">
      <div
        className="h-full rounded-full bg-system-accent/55"
        style={{ width: `${Math.max(item.percentage, 6)}%` }}
      />
    </div>
  </div>
)

const RecentPrompts = ({ prompts }: { prompts: string[] }) => (
  <section className="flex flex-col gap-2.5">
    <h3 className="text-[11px] font-semibold text-muted-foreground">最近提示</h3>
    {prompts.length > 0 ? (
      <ol className="flex flex-col gap-1">
        {prompts.map((prompt, index) => (
          <li
            key={`${index}-${prompt}`}
            className="rounded-lg border border-glass-edge bg-card/35 px-3 py-2 text-[12px] leading-5"
          >
            {prompt}
          </li>
        ))}
      </ol>
    ) : (
      <p className="rounded-xl border border-dashed border-hairline bg-card/22 px-3 py-5 text-center text-[11px] text-muted-foreground">
        暂无提示
      </p>
    )}
  </section>
)

const sumCounts = (items: StatsCountItem[]) =>
  items.reduce((sum, item) => sum + item.count, 0)
