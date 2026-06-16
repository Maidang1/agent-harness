export const TITLEBAR_TRAFFIC_LIGHT_CLEARANCE_PX = 80
export const TITLEBAR_TRAFFIC_LIGHT_CLEARANCE_CLASS = 'pl-20'
export const TITLEBAR_HEIGHT_CLASS = 'h-12'

export const THREAD_ROOT_CLASS_NAME =
  'flex h-screen overflow-hidden bg-transparent text-foreground'

export const MAIN_WORKSPACE_CLASS_NAME =
  'relative flex min-w-0 flex-1 flex-col bg-[color-mix(in_oklch,var(--background)_82%,transparent)] shadow-[inset_1px_0_0_var(--glass-edge),inset_-1px_0_0_var(--glass-edge)]'

export const SIDEBAR_PANEL_CLASS_NAME = [
  'hidden h-full w-72 shrink-0 overflow-hidden',
  'border-r border-hairline',
  'bg-[color-mix(in_oklch,var(--sidebar)_72%,transparent)]',
  'text-sidebar-foreground backdrop-blur-xl',
  'shadow-[inset_-1px_0_0_var(--glass-edge)]',
  'transition-[width] duration-200 md:flex',
].join(' ')

export const SIDEBAR_TITLEBAR_CLASS_NAME = [
  'flex shrink-0 items-center pr-3',
  TITLEBAR_HEIGHT_CLASS,
  TITLEBAR_TRAFFIC_LIGHT_CLEARANCE_CLASS,
].join(' ')

export const MAIN_HEADER_CLASS_NAME = [
  'flex shrink-0 items-center justify-between gap-4',
  'border-b border-hairline',
  'bg-[color-mix(in_oklch,var(--background)_82%,transparent)]',
  'px-5 backdrop-blur-2xl',
  'shadow-[inset_0_-1px_0_var(--glass-edge)]',
  TITLEBAR_HEIGHT_CLASS,
].join(' ')

export const COLLAPSED_MAIN_HEADER_CLASS_NAME =
  TITLEBAR_TRAFFIC_LIGHT_CLEARANCE_CLASS

export const COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME = 'shrink-0'

export const MAIN_HEADER_TITLE_CLASS_NAME =
  'truncate text-[13px] font-semibold leading-none text-foreground'

export const SIDEBAR_TOGGLE_ICON_CLASS_NAME = '-translate-y-px'

export const INSPECTOR_PANEL_CLASS_NAME = [
  'hidden h-full w-80 shrink-0 overflow-hidden',
  'border-l border-hairline',
  'bg-[color-mix(in_oklch,var(--inspector)_68%,transparent)]',
  'text-inspector-foreground backdrop-blur-2xl',
  'shadow-[inset_1px_0_0_var(--glass-edge)]',
  'md:flex',
].join(' ')
