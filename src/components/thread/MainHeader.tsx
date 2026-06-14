import { SidebarSimple } from '@phosphor-icons/react'

type MainHeaderProps = {
  isOpenRouterConfigured: boolean
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export const MainHeader = ({
  isSidebarCollapsed,
  onToggleSidebar,
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
      <h1 className="main-header-title">读书推荐 Agent</h1>
    </div>
  </header>
)
