import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  INSPECTOR_PANEL_WIDTH,
  SIDEBAR_PANEL_WIDTH,
  calculateDraggedPanelWidth,
  readStoredPanelWidth,
  writeStoredPanelWidth,
} from '../src/layout/resizable-panels.ts'

describe('resizable panels', () => {
  test('clamps sidebar and inspector widths to usable desktop bounds', () => {
    assert.equal(
      calculateDraggedPanelWidth({
        edge: 'right',
        startWidth: SIDEBAR_PANEL_WIDTH.default,
        startClientX: 200,
        currentClientX: -100,
        bounds: SIDEBAR_PANEL_WIDTH,
      }),
      SIDEBAR_PANEL_WIDTH.min,
    )
    assert.equal(
      calculateDraggedPanelWidth({
        edge: 'left',
        startWidth: INSPECTOR_PANEL_WIDTH.default,
        startClientX: 900,
        currentClientX: 300,
        bounds: INSPECTOR_PANEL_WIDTH,
      }),
      INSPECTOR_PANEL_WIDTH.max,
    )
  })

  test('right-edge dragging grows a left panel when the pointer moves right', () => {
    assert.equal(
      calculateDraggedPanelWidth({
        edge: 'right',
        startWidth: 288,
        startClientX: 200,
        currentClientX: 260,
        bounds: SIDEBAR_PANEL_WIDTH,
      }),
      348,
    )
  })

  test('left-edge dragging grows a right panel when the pointer moves left', () => {
    assert.equal(
      calculateDraggedPanelWidth({
        edge: 'left',
        startWidth: 320,
        startClientX: 900,
        currentClientX: 840,
        bounds: INSPECTOR_PANEL_WIDTH,
      }),
      380,
    )
  })

  test('reads stored widths and falls back for malformed values', () => {
    const storage = createMemoryStorage()
    storage.setItem('sidebar', '420')
    storage.setItem('inspector', 'bad')

    assert.equal(
      readStoredPanelWidth(storage, 'sidebar', SIDEBAR_PANEL_WIDTH),
      420,
    )
    assert.equal(
      readStoredPanelWidth(storage, 'inspector', INSPECTOR_PANEL_WIDTH),
      INSPECTOR_PANEL_WIDTH.default,
    )
  })

  test('stores clamped integer widths', () => {
    const storage = createMemoryStorage()

    writeStoredPanelWidth(storage, 'sidebar', 999, SIDEBAR_PANEL_WIDTH)

    assert.equal(storage.getItem('sidebar'), `${SIDEBAR_PANEL_WIDTH.max}`)
  })
})

const createMemoryStorage = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const values = new Map<string, string>()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}
