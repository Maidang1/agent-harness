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
        <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-md md:hidden">
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
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <ChartNoAxesColumnIncreasing className="size-3 shrink-0 text-muted-foreground" />
        <h2 className="truncate text-[12px] font-medium">推荐统计</h2>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="关闭统计面板"
        title="关闭统计面板"
        onClick={onClose}
        className="size-6 text-muted-foreground hover:text-foreground"
      >
        <PanelRightClose className="size-3" />
      </Button>
    </div>

    <div className="shrink-0 border-b border-hairline px-3 py-2">
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
        className="grid w-full grid-cols-2"
      >
        <ToggleGroupItem value="current" className="w-full text-[11px]">
          当前对话
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className="w-full text-[11px]">
          全部历史
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-3 py-3.5">
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
    { label: '对话', value: stats.chatCount },
    { label: '提示', value: stats.userPromptCount },
    { label: '回复', value: stats.assistantReplyCount },
  ]

  return (
    <div className="grid grid-cols-3 gap-1">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-md border border-hairline bg-muted/15 px-2 py-1.5"
        >
          <div className="text-sm font-medium tabular-nums">{metric.value}</div>
          <div className="text-[10px] text-muted-foreground">{metric.label}</div>
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
  <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{title}</h3>
      {items.length > 0 ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{sumCounts(items)} 次</span>
      ) : null}
    </div>

    {items.length > 0 ? (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <DistributionRow key={item.id} item={item} />
        ))}
      </div>
    ) : (
      <p className="rounded-md border border-dashed border-hairline px-3 py-4 text-center text-[10px] text-muted-foreground">
        {emptyLabel}
      </p>
    )}
  </section>
)

const DistributionRow = ({ item }: { item: StatsCountItem }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="min-w-0 truncate">{item.label}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {item.count} · {item.percentage}%
      </span>
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-muted/30">
      <div
        className="h-full rounded-full bg-system-accent/35"
        style={{ width: `${Math.max(item.percentage, 6)}%` }}
      />
    </div>
  </div>
)

const RecentPrompts = ({ prompts }: { prompts: string[] }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">最近提示</h3>
    {prompts.length > 0 ? (
      <ol className="flex flex-col gap-1">
        {prompts.map((prompt, index) => (
          <li
            key={`${index}-${prompt}`}
            className="rounded-md border border-hairline px-2 py-1.5 text-[11px] leading-5"
          >
            {prompt}
          </li>
        ))}
      </ol>
    ) : (
      <p className="rounded-md border border-dashed border-hairline px-3 py-4 text-center text-[10px] text-muted-foreground">
        暂无提示
      </p>
    )}
  </section>
)

const sumCounts = (items: StatsCountItem[]) =>
  items.reduce((sum, item) => sum + item.count, 0)
