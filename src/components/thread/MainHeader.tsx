import {
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Circle,
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
import { type BookAgentProvider } from '../../client-config'

type MainHeaderProps = {
  title: string
  provider: BookAgentProvider
  model: string
  isModelConfigured: boolean
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

const formatProviderName = (provider: BookAgentProvider) =>
  provider === 'codex' ? 'Codex' : 'OpenRouter'

export const MainHeader = ({
  title,
  provider,
  model,
  isModelConfigured,
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
    <div className="flex min-w-0 items-center gap-2.5">
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

    <div className="flex items-center gap-1.5">
      {isModelConfigured ? (
        <button
          type="button"
          onClick={onOpenConfig}
          className="hidden h-7 items-center gap-1.5 rounded-lg border border-glass-edge bg-card/50 px-2 text-[11px] text-muted-foreground shadow-[0_1px_10px_-8px_var(--glass-shadow)] transition-colors hover:bg-card/80 hover:text-foreground sm:flex"
        >
          <Circle className="size-2 fill-system-green text-system-green" />
          <span className="max-w-32 truncate">
            {formatProviderName(provider)} 已配置
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenConfig}
          className="hidden h-7 items-center gap-1.5 rounded-lg border border-glass-edge bg-card/50 px-2 text-[11px] text-muted-foreground shadow-[0_1px_10px_-8px_var(--glass-shadow)] transition-colors hover:bg-card/80 hover:text-foreground sm:flex"
        >
          <Circle className="size-2 fill-system-amber text-system-amber" />
          <span>模型待配置</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenConfig}
        className="hidden h-7 max-w-48 items-center gap-1.5 rounded-lg border border-glass-edge bg-card/45 px-2 text-[11px] text-muted-foreground shadow-[0_1px_10px_-8px_var(--glass-shadow)] transition-colors hover:bg-card/80 hover:text-foreground md:flex"
      >
        <Sparkles className="size-3 text-system-accent" />
        <span className="truncate">{formatModelName(model)}</span>
        <ChevronDown className="size-3" />
      </button>

      {isModelConfigured ? null : (
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
