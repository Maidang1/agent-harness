import {
  PanelLeftOpen,
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
  onToggleSidebar: () => void
  onOpenConfig: () => void
}

export const MainHeader = ({
  title,
  isSidebarCollapsed,
  onToggleSidebar,
}: MainHeaderProps) => (
  <header
    data-tauri-drag-region
    className={cn(
      MAIN_HEADER_CLASS_NAME,
      isSidebarCollapsed && COLLAPSED_MAIN_HEADER_CLASS_NAME,
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
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
  </header>
)
