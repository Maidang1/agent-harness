import {
  CaretDown,
  DotsThreeVertical,
  SidebarSimple,
} from '@phosphor-icons/react'

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
  model,
  isOpenRouterConfigured,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenConfig,
}: MainHeaderProps) => (
  <header
    data-tauri-drag-region
    className={`main-header ${
      isSidebarCollapsed ? 'main-header-sidebar-collapsed' : ''
    }`}
  >
    <div className="main-header-left">
      {isSidebarCollapsed ? (
        <button
          type="button"
          className="sidebar-toggle main-header-sidebar-toggle"
          aria-label="展开侧边栏"
          title="展开侧边栏"
          onClick={onToggleSidebar}
        >
          <SidebarSimple size={16} weight="bold" />
        </button>
      ) : null}
      <div className="main-header-copy">
        <h1 className="main-header-title">{title}</h1>
        <p className="main-header-subtitle">读书推荐 Agent</p>
      </div>
    </div>
    <div className="main-header-actions">
      <span
        className={`provider-status ${
          isOpenRouterConfigured ? 'provider-status-ready' : 'provider-status-missing'
        }`}
      >
        <span className="provider-status-dot" aria-hidden="true" />
        {isOpenRouterConfigured ? 'OpenRouter Ready' : 'OpenRouter 待配置'}
      </span>
      <span className="model-pill">
        <span className="truncate">{formatModelName(model)}</span>
        <CaretDown size={14} weight="bold" />
      </span>
      <button
        type="button"
        className="icon-button main-header-menu"
        aria-label="打开设置"
        title="打开设置"
        onClick={onOpenConfig}
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>
    </div>
  </header>
)

const formatModelName = (model: string) =>
  model
    .split('/')
    .at(-1)
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || model
