import { useRef, useState } from 'react'
import {
  BookMarked,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Library,
  LoaderCircle,
  NotebookTabs,
  PanelRightClose,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { INSPECTOR_PANEL_CLASS_NAME } from '../../layout/sidebar-layout'
import { type UserMemoryView } from '../../memory/memory-data'
import {
  createReviewDraftFromCard,
  createWorkspacePlanFromCard,
  markRecommendationCardStatus,
  type ReadingWorkspace,
  type ReadingWorkspaceCard,
} from '../../reading/reading-workspace'
import {
  type RecommendationStats,
  type RecommendationStatsScope,
  type StatsCountItem,
} from '../../recommendations/recommendation-stats'
import {
  type WereadSnapshot,
  type WereadShelfItem,
} from '../../weread/weread-data'
import { gsap, shouldReduceMotion, useGSAP } from '@/lib/gsap'

type ReadingHubTab = 'overview' | 'plans' | 'shelf' | 'notes' | 'reviews'

type RecommendationStatsPanelProps = {
  currentStats: RecommendationStats
  allStats: RecommendationStats
  userMemory: UserMemoryView
  wereadSnapshot: WereadSnapshot
  readingWorkspace: ReadingWorkspace
  isWereadSyncing: boolean
  isDesktopOpen: boolean
  isDialogOpen: boolean
  onSyncWeread: () => void
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
  onCloseDesktop: () => void
  onDialogOpenChange: (open: boolean) => void
}

export const RecommendationStatsPanel = ({
  currentStats,
  allStats,
  userMemory,
  wereadSnapshot,
  readingWorkspace,
  isWereadSyncing,
  isDesktopOpen,
  isDialogOpen,
  onSyncWeread,
  onReadingWorkspaceChange,
  onCloseDesktop,
  onDialogOpenChange,
}: RecommendationStatsPanelProps) => {
  const [scope, setScope] = useState<RecommendationStatsScope>('current')
  const stats = scope === 'current' ? currentStats : allStats

  return (
    <>
      {isDesktopOpen ? (
        <aside className={INSPECTOR_PANEL_CLASS_NAME} data-reading-hub-panel>
          <ReadingHubContent
            stats={stats}
            scope={scope}
            userMemory={userMemory}
            wereadSnapshot={wereadSnapshot}
            readingWorkspace={readingWorkspace}
            isWereadSyncing={isWereadSyncing}
            onScopeChange={setScope}
            onSyncWeread={onSyncWeread}
            onReadingWorkspaceChange={onReadingWorkspaceChange}
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
            <DialogTitle>阅读中枢</DialogTitle>
            <DialogDescription>计划、书架、笔记和复盘</DialogDescription>
          </DialogHeader>
          <ReadingHubContent
            stats={stats}
            scope={scope}
            userMemory={userMemory}
            wereadSnapshot={wereadSnapshot}
            readingWorkspace={readingWorkspace}
            isWereadSyncing={isWereadSyncing}
            onScopeChange={setScope}
            onSyncWeread={onSyncWeread}
            onReadingWorkspaceChange={onReadingWorkspaceChange}
            onClose={() => onDialogOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

type ReadingHubContentProps = {
  stats: RecommendationStats
  scope: RecommendationStatsScope
  userMemory: UserMemoryView
  wereadSnapshot: WereadSnapshot
  readingWorkspace: ReadingWorkspace
  isWereadSyncing: boolean
  onScopeChange: (scope: RecommendationStatsScope) => void
  onSyncWeread: () => void
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
  onClose: () => void
}

const ReadingHubContent = ({
  stats,
  scope,
  userMemory,
  wereadSnapshot,
  readingWorkspace,
  isWereadSyncing,
  onScopeChange,
  onSyncWeread,
  onReadingWorkspaceChange,
  onClose,
}: ReadingHubContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<ReadingHubTab>('overview')

  useGSAP(() => {
    const targets = contentRef.current?.querySelectorAll<HTMLElement>(
      '[data-reading-hub-tab][data-state="active"] > *',
    )

    if (shouldReduceMotion() || !targets?.length) {
      return
    }

    gsap.from(targets, {
      autoAlpha: 0,
      y: 8,
      duration: 0.22,
      ease: 'power2.out',
      stagger: 0.025,
      clearProps: 'transform,opacity,visibility',
    })
  }, {
    dependencies: [activeTab],
    revertOnUpdate: true,
  })

  return (
    <div ref={contentRef} className="flex min-h-0 w-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md border border-glass-edge bg-card/55">
            <BookOpenCheck className="size-3 shrink-0 text-system-accent" />
          </div>
          <h2 className="truncate text-[13px] font-semibold">阅读中枢</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭阅读中枢"
          title="关闭阅读中枢"
          onClick={onClose}
          className="size-7 rounded-lg text-muted-foreground hover:bg-card/65 hover:text-foreground"
        >
          <PanelRightClose className="size-3" />
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ReadingHubTab)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="shrink-0 border-b border-hairline px-3 py-3">
          <TabsList className="grid h-auto w-full grid-cols-5 gap-1 rounded-xl border border-glass-edge bg-background/35 p-0.5">
            <TabsTrigger value="overview" className="h-8 rounded-lg px-1 text-[11px] data-[state=active]:bg-card data-[state=active]:text-system-accent">
              总览
            </TabsTrigger>
            <TabsTrigger value="plans" className="h-8 rounded-lg px-1 text-[11px] data-[state=active]:bg-card data-[state=active]:text-system-accent">
              计划
            </TabsTrigger>
            <TabsTrigger value="shelf" className="h-8 rounded-lg px-1 text-[11px] data-[state=active]:bg-card data-[state=active]:text-system-accent">
              书架
            </TabsTrigger>
            <TabsTrigger value="notes" className="h-8 rounded-lg px-1 text-[11px] data-[state=active]:bg-card data-[state=active]:text-system-accent">
              笔记
            </TabsTrigger>
            <TabsTrigger value="reviews" className="h-8 rounded-lg px-1 text-[11px] data-[state=active]:bg-card data-[state=active]:text-system-accent">
              复盘
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="py-4 pl-4 pr-6">
            <TabsContent value="overview" className="m-0" data-reading-hub-tab>
              <OverviewTab
                stats={stats}
                scope={scope}
                wereadSnapshot={wereadSnapshot}
                readingWorkspace={readingWorkspace}
                isWereadSyncing={isWereadSyncing}
                onScopeChange={onScopeChange}
                onSyncWeread={onSyncWeread}
              />
            </TabsContent>
            <TabsContent value="plans" className="m-0" data-reading-hub-tab>
              <PlansTab
                userMemory={userMemory}
                readingWorkspace={readingWorkspace}
                onReadingWorkspaceChange={onReadingWorkspaceChange}
              />
            </TabsContent>
            <TabsContent value="shelf" className="m-0" data-reading-hub-tab>
              <ShelfTab
                wereadSnapshot={wereadSnapshot}
                isWereadSyncing={isWereadSyncing}
                onSyncWeread={onSyncWeread}
              />
            </TabsContent>
            <TabsContent value="notes" className="m-0" data-reading-hub-tab>
              <NotesTab wereadSnapshot={wereadSnapshot} />
            </TabsContent>
            <TabsContent value="reviews" className="m-0" data-reading-hub-tab>
              <ReviewsTab
                readingWorkspace={readingWorkspace}
                onReadingWorkspaceChange={onReadingWorkspaceChange}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

type OverviewTabProps = {
  stats: RecommendationStats
  scope: RecommendationStatsScope
  wereadSnapshot: WereadSnapshot
  readingWorkspace: ReadingWorkspace
  isWereadSyncing: boolean
  onScopeChange: (scope: RecommendationStatsScope) => void
  onSyncWeread: () => void
}

const OverviewTab = ({
  stats,
  scope,
  wereadSnapshot,
  readingWorkspace,
  isWereadSyncing,
  onScopeChange,
  onSyncWeread,
}: OverviewTabProps) => (
  <div className="flex flex-col gap-5">
    <SyncSummary
      snapshot={wereadSnapshot}
      isWereadSyncing={isWereadSyncing}
      onSyncWeread={onSyncWeread}
    />
    <MetricGrid stats={stats} snapshot={wereadSnapshot} workspace={readingWorkspace} />
    <div className="rounded-xl border border-glass-edge bg-card/35 p-3">
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
        <ToggleGroupItem value="current" className="h-8 w-full rounded-lg border-0 text-[12px] data-[state=on]:bg-card data-[state=on]:text-system-accent">
          当前对话
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className="h-8 w-full rounded-lg border-0 text-[12px] data-[state=on]:bg-card data-[state=on]:text-system-accent">
          全部历史
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
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
)

const SyncSummary = ({
  snapshot,
  isWereadSyncing,
  onSyncWeread,
}: {
  snapshot: WereadSnapshot
  isWereadSyncing: boolean
  onSyncWeread: () => void
}) => (
  <section className="rounded-xl border border-glass-edge bg-card/45 p-3 shadow-[0_12px_28px_-24px_var(--glass-shadow)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Library className="size-3.5 text-system-accent" />
          <h3 className="text-[12px] font-semibold">微信读书同步</h3>
          <Badge variant={snapshot.status === 'failed' ? 'destructive' : 'secondary'}>
            {snapshot.status === 'success' ? '已同步' : snapshot.status === 'failed' ? '失败' : '未同步'}
          </Badge>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          {snapshot.status === 'failed'
            ? snapshot.errorMessage
            : snapshot.updatedAt > 0
              ? `最近同步 ${formatTimestamp(snapshot.updatedAt)}`
              : '配置微信读书 API Key 后可刷新书架、笔记和阅读统计。'}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isWereadSyncing}
        onClick={onSyncWeread}
        className="h-8 shrink-0 rounded-lg px-2.5 text-[12px]"
      >
        {isWereadSyncing ? (
          <LoaderCircle className="animate-spin" data-icon="inline-start" />
        ) : (
          <RefreshCw data-icon="inline-start" />
        )}
        刷新
      </Button>
    </div>
  </section>
)

const MetricGrid = ({
  stats,
  snapshot,
  workspace,
}: {
  stats: RecommendationStats
  snapshot: WereadSnapshot
  workspace: ReadingWorkspace
}) => {
  const metrics = [
    { label: '对话', value: stats.chatCount, className: 'text-system-accent' },
    { label: '书架', value: snapshot.shelf.totalCount, className: 'text-system-blue' },
    { label: '笔记', value: snapshot.notebooks.totalNoteCount, className: 'text-system-green' },
    { label: '计划', value: workspace.plans.filter((plan) => plan.status === 'active').length, className: 'text-system-amber' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
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

const PlansTab = ({
  userMemory,
  readingWorkspace,
  onReadingWorkspaceChange,
}: {
  userMemory: UserMemoryView
  readingWorkspace: ReadingWorkspace
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
}) => {
  const activeMemoryPlans = userMemory.plans.filter((plan) => plan.status === 'active')
  const activeWorkspacePlans = readingWorkspace.plans.filter(
    (plan) => plan.status === 'active',
  )

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2.5">
        <SectionHeader icon={ClipboardList} title="当前计划" count={activeWorkspacePlans.length + activeMemoryPlans.length} />
        {activeWorkspacePlans.length > 0 || activeMemoryPlans.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activeWorkspacePlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-glass-edge bg-card/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-semibold">{plan.title}</h4>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{plan.goal}</p>
                    {plan.nextAction ? (
                      <p className="mt-2 text-[11px] text-system-accent">{plan.nextAction}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-[11px]"
                    onClick={() =>
                      onReadingWorkspaceChange({
                        ...readingWorkspace,
                        plans: readingWorkspace.plans.map((item) =>
                          item.id === plan.id
                            ? { ...item, status: 'done', updatedAt: Date.now() }
                            : item,
                        ),
                      })
                    }
                  >
                    完成
                  </Button>
                </div>
              </div>
            ))}
            {activeMemoryPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-glass-edge bg-card/25 p-3">
                <h4 className="text-[13px] font-semibold">{plan.title}</h4>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{plan.goal}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel label="暂无活跃计划，可从下方推荐书卡加入计划。" />
        )}
      </section>

      <BookCardsSection
        cards={readingWorkspace.cards}
        readingWorkspace={readingWorkspace}
        onReadingWorkspaceChange={onReadingWorkspaceChange}
      />
    </div>
  )
}

const BookCardsSection = ({
  cards,
  readingWorkspace,
  onReadingWorkspaceChange,
}: {
  cards: ReadingWorkspaceCard[]
  readingWorkspace: ReadingWorkspace
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
}) => (
  <section className="flex flex-col gap-2.5">
    <SectionHeader icon={Sparkles} title="推荐书卡" count={cards.length} />
    {cards.length > 0 ? (
      <div className="flex flex-col gap-2">
        {cards.slice(0, 8).map((card) => (
          <BookCardRow
            key={card.id}
            card={card}
            onPlan={() =>
              onReadingWorkspaceChange(
                createWorkspacePlanFromCard(readingWorkspace, card.id),
              )
            }
            onRead={() =>
              onReadingWorkspaceChange(
                markRecommendationCardStatus(readingWorkspace, card.id, 'read'),
              )
            }
            onReview={() =>
              onReadingWorkspaceChange(
                createReviewDraftFromCard(readingWorkspace, card.id),
              )
            }
          />
        ))}
      </div>
    ) : (
      <EmptyPanel label="模型推荐书籍后会自动生成书卡。" />
    )}
  </section>
)

const BookCardRow = ({
  card,
  onPlan,
  onRead,
  onReview,
}: {
  card: ReadingWorkspaceCard
  onPlan: () => void
  onRead: () => void
  onReview: () => void
}) => (
  <div className="rounded-xl border border-glass-edge bg-card/35 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="truncate text-[13px] font-semibold">《{card.title}》</h4>
        {card.author ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{card.author}</p>
        ) : null}
      </div>
      <Badge variant="secondary">{cardStatusLabel(card.status)}</Badge>
    </div>
    {card.reason ? (
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{card.reason}</p>
    ) : null}
    {card.evidence ? (
      <p className="mt-2 rounded-lg bg-muted/55 px-2.5 py-2 text-[11px] leading-5 text-muted-foreground">
        依据：{card.evidence}
      </p>
    ) : null}
    <div className="mt-3 flex flex-wrap gap-1.5">
      <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={onPlan}>
        加入计划
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={onRead}>
        标记已读
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={onReview}>
        生成复盘
      </Button>
    </div>
  </div>
)

const ShelfTab = ({
  wereadSnapshot,
  isWereadSyncing,
  onSyncWeread,
}: {
  wereadSnapshot: WereadSnapshot
  isWereadSyncing: boolean
  onSyncWeread: () => void
}) => (
  <div className="flex flex-col gap-5">
    <SyncSummary
      snapshot={wereadSnapshot}
      isWereadSyncing={isWereadSyncing}
      onSyncWeread={onSyncWeread}
    />
    <div className="grid grid-cols-2 gap-2">
      <MiniMetric label="总条目" value={wereadSnapshot.shelf.totalCount} />
      <MiniMetric label="电子书" value={wereadSnapshot.shelf.bookCount} />
      <MiniMetric label="有声书" value={wereadSnapshot.shelf.albumCount} />
      <MiniMetric label="已读" value={wereadSnapshot.shelf.finishedBookCount} />
      <MiniMetric label="公开" value={wereadSnapshot.shelf.publicCount} />
      <MiniMetric label="私密" value={wereadSnapshot.shelf.privateCount} />
    </div>
    <ShelfItems items={wereadSnapshot.shelf.recentItems} />
  </div>
)

const ShelfItems = ({ items }: { items: WereadShelfItem[] }) => (
  <section className="flex flex-col gap-2.5">
    <SectionHeader icon={Library} title="最近阅读" count={items.length} />
    {items.length > 0 ? (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="rounded-xl border border-glass-edge bg-card/35 p-3 pr-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-[13px] font-semibold">{item.title}</h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {[item.author, item.category, item.updatedAtLabel].filter(Boolean).join(' · ')}
                </p>
              </div>
              {item.isFinished ? (
                <CheckCircle2 className="mr-0.5 size-4 shrink-0 text-system-green" />
              ) : (
                <BookMarked className="mr-0.5 size-4 shrink-0 text-system-accent" />
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyPanel label="刷新微信读书后显示最近阅读。" />
    )}
  </section>
)

const NotesTab = ({ wereadSnapshot }: { wereadSnapshot: WereadSnapshot }) => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-2 gap-2">
      <MiniMetric label="笔记书籍" value={wereadSnapshot.notebooks.totalBookCount} />
      <MiniMetric label="笔记总数" value={wereadSnapshot.notebooks.totalNoteCount} />
    </div>
    <section className="flex flex-col gap-2.5">
      <SectionHeader icon={NotebookTabs} title="笔记较多" count={wereadSnapshot.notebooks.books.length} />
      {wereadSnapshot.notebooks.books.length > 0 ? (
        <div className="flex flex-col gap-2">
          {wereadSnapshot.notebooks.books.slice(0, 10).map((book) => (
            <div key={book.bookId} className="rounded-xl border border-glass-edge bg-card/35 p-3">
              <h4 className="truncate text-[13px] font-semibold">{book.title}</h4>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                {book.totalNoteCount} 条：{book.reviewCount} 条想法、{book.noteCount} 条划线、{book.bookmarkCount} 个书签
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">进度 {book.readingProgress}% · {book.sortLabel}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel label="刷新微信读书后显示笔记和划线概览。" />
      )}
    </section>
  </div>
)

const ReviewsTab = ({
  readingWorkspace,
  onReadingWorkspaceChange,
}: {
  readingWorkspace: ReadingWorkspace
  onReadingWorkspaceChange: (workspace: ReadingWorkspace) => void
}) => (
  <div className="flex flex-col gap-5">
    <BookCardsSection
      cards={readingWorkspace.cards.filter((card) => card.status === 'read')}
      readingWorkspace={readingWorkspace}
      onReadingWorkspaceChange={onReadingWorkspaceChange}
    />
    <section className="flex flex-col gap-2.5">
      <SectionHeader icon={NotebookTabs} title="复盘记录" count={readingWorkspace.reviews.length} />
      {readingWorkspace.reviews.length > 0 ? (
        <div className="flex flex-col gap-2">
          {readingWorkspace.reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-glass-edge bg-card/35 p-3">
              <h4 className="text-[13px] font-semibold">{review.title}</h4>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/55 p-2.5 text-[11px] leading-5 text-muted-foreground">
                {review.content}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel label="从已读书卡生成复盘草稿。" />
      )}
    </section>
  </div>
)

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
      <EmptyPanel label={emptyLabel} />
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
      <EmptyPanel label="暂无提示" />
    )}
  </section>
)

const SectionHeader = ({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Library
  title: string
  count: number
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-system-accent" />
      <h3 className="truncate text-[11px] font-semibold text-muted-foreground">{title}</h3>
    </div>
    <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
  </div>
)

const MiniMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-glass-edge bg-card/35 px-3 py-2.5">
    <div className="text-lg font-semibold tabular-nums text-system-accent">{value}</div>
    <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
  </div>
)

const EmptyPanel = ({ label }: { label: string }) => (
  <p className="rounded-xl border border-dashed border-hairline bg-card/22 px-3 py-5 text-center text-[11px] text-muted-foreground">
    {label}
  </p>
)

const cardStatusLabel = (status: ReadingWorkspaceCard['status']) => {
  switch (status) {
    case 'planned':
      return '计划中'
    case 'reading':
      return '在读'
    case 'read':
      return '已读'
    case 'recommended':
      return '推荐'
  }
}

const sumCounts = (items: StatsCountItem[]) =>
  items.reduce((sum, item) => sum + item.count, 0)

const formatTimestamp = (value: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
