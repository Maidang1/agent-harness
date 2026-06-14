import {
  ChartNoAxesColumnIncreasing,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from 'lucide-react'
import {
  COLLAPSED_MAIN_HEADER_CLASS_NAME,
  COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME,
  MAIN_HEADER_CLASS_NAME,
  MAIN_HEADER_TITLE_CLASS_NAME,
  SIDEBAR_TOGGLE_ICON_CLASS_NAME,
} from '../../sidebar-layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MainHeaderProps = {
  title: string
  model: string
  isOpenRouterConfigured: boolean
  isSidebarCollapsed: boolean
  isStatsPanelOpen: boolean
  onToggleSidebar: () => void
  onOpenConfig: () => void
  onToggleStatsPanel: () => void
  onOpenStatsDialog: () => void
}

const formatModelName = (model: string) => {
  const parts = model.split('/')
  const name = parts[parts.length - 1]
  return name.replace(/:.*$/, '').replace(/-/g, ' ')
}

export const MainHeader = ({
  title,
  model,
  isOpenRouterConfigured,
  isSidebarCollapsed,
  isStatsPanelOpen,
  onToggleSidebar,
  onOpenConfig,
  onToggleStatsPanel,
  onOpenStatsDialog,
}: MainHeaderProps) => (
  <header
    data-tauri-drag-region
    className={cn(
      MAIN_HEADER_CLASS_NAME,
      isSidebarCollapsed && COLLAPSED_MAIN_HEADER_CLASS_NAME,
    )}
  >
    <div className="flex min-w-0 items-center gap-2">
      {isSidebarCollapsed ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="展开侧边栏"
          title="展开侧边栏"
          onClick={onToggleSidebar}
          className={COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME}
        >
          <PanelLeftOpen className={SIDEBAR_TOGGLE_ICON_CLASS_NAME} />
        </Button>
      ) : null}
      <div className="min-w-0">
        <h1 className={MAIN_HEADER_TITLE_CLASS_NAME}>{title}</h1>
      </div>
    </div>

    <div className="flex items-center gap-1">
      {isOpenRouterConfigured ? (
        <button
          type="button"
          onClick={onOpenConfig}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Sparkles className="size-2.5 text-system-accent" />
          <span className="max-w-24 truncate">{formatModelName(model)}</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="设置"
          title="设置"
          onClick={onOpenConfig}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-3" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="打开统计面板"
        title="打开统计面板"
        onClick={onOpenStatsDialog}
        className="text-muted-foreground hover:text-foreground md:hidden"
      >
        <ChartNoAxesColumnIncreasing className="size-3" />
      </Button>
      <Button
        type="button"
        variant={isStatsPanelOpen ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={isStatsPanelOpen}
        aria-label={isStatsPanelOpen ? '关闭统计面板' : '打开统计面板'}
        title={isStatsPanelOpen ? '关闭统计面板' : '打开统计面板'}
        onClick={onToggleStatsPanel}
        className={cn(
          'hidden md:inline-flex',
          !isStatsPanelOpen && 'text-muted-foreground hover:text-foreground',
        )}
      >
        <ChartNoAxesColumnIncreasing className="size-3" />
      </Button>
    </div>
  </header>
)
