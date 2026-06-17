export type PanelWidthBounds = {
  min: number
  max: number
  default: number
}

export type ResizeEdge = 'left' | 'right'

export type DraggedPanelWidthInput = {
  edge: ResizeEdge
  startWidth: number
  startClientX: number
  currentClientX: number
  bounds: PanelWidthBounds
}

export const SIDEBAR_PANEL_WIDTH = {
  min: 224,
  max: 520,
  default: 288,
} as const satisfies PanelWidthBounds

export const INSPECTOR_PANEL_WIDTH = {
  min: 300,
  max: 600,
  default: 320,
} as const satisfies PanelWidthBounds

export const SIDEBAR_WIDTH_STORAGE_KEY = 'book-agent.layout.sidebar-width'
export const INSPECTOR_WIDTH_STORAGE_KEY =
  'book-agent.layout.inspector-width'

export const calculateDraggedPanelWidth = ({
  edge,
  startWidth,
  startClientX,
  currentClientX,
  bounds,
}: DraggedPanelWidthInput) => {
  const delta =
    edge === 'right'
      ? currentClientX - startClientX
      : startClientX - currentClientX

  return clampPanelWidth(startWidth + delta, bounds)
}

export const readStoredPanelWidth = (
  storage: Pick<Storage, 'getItem'> | undefined,
  key: string,
  bounds: PanelWidthBounds,
) => {
  const storedValue = storage?.getItem(key)
  const parsedValue = storedValue ? Number.parseInt(storedValue, 10) : NaN

  if (!Number.isFinite(parsedValue)) {
    return bounds.default
  }

  return clampPanelWidth(parsedValue, bounds)
}

export const writeStoredPanelWidth = (
  storage: Pick<Storage, 'setItem'> | undefined,
  key: string,
  value: number,
  bounds: PanelWidthBounds,
) => {
  storage?.setItem(key, `${clampPanelWidth(value, bounds)}`)
}

export const clampPanelWidth = (
  value: number,
  bounds: PanelWidthBounds,
) => {
  if (!Number.isFinite(value)) {
    return bounds.default
  }

  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)))
}
