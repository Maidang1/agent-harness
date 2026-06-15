import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import {
  COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME,
  MAIN_HEADER_CLASS_NAME,
  MAIN_HEADER_TITLE_CLASS_NAME,
  MAIN_WORKSPACE_CLASS_NAME,
  SIDEBAR_PANEL_CLASS_NAME,
  SIDEBAR_TOGGLE_ICON_CLASS_NAME,
  SIDEBAR_TITLEBAR_CLASS_NAME,
  THREAD_ROOT_CLASS_NAME,
  TITLEBAR_TRAFFIC_LIGHT_CLEARANCE_PX,
} from '../src/sidebar-layout.ts'

describe('sidebar layout', () => {
  test('keeps titlebar controls clear of macOS traffic lights', () => {
    const config = JSON.parse(
      readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), {
        encoding: 'utf8',
      }),
    )
    const trafficLightX = config.app.windows[0].trafficLightPosition.x
    const trafficLightClusterWidth = 60

    assert.ok(
      TITLEBAR_TRAFFIC_LIGHT_CLEARANCE_PX >=
        trafficLightX + trafficLightClusterWidth,
    )
    assert.match(SIDEBAR_TITLEBAR_CLASS_NAME, /\bpl-20\b/)
    assert.match(SIDEBAR_TITLEBAR_CLASS_NAME, /\bh-12\b/)
    assert.match(
      SIDEBAR_PANEL_CLASS_NAME,
      /color-mix\(in_oklch,var\(--sidebar\)_72%,transparent\)/,
    )
    assert.match(SIDEBAR_PANEL_CLASS_NAME, /\bbackdrop-blur-xl\b/)
  })

  test('lets the sidebar translucency reach the desktop background', () => {
    assert.match(THREAD_ROOT_CLASS_NAME, /\bbg-transparent\b/)
    assert.doesNotMatch(THREAD_ROOT_CLASS_NAME, /\bbg-background\b/)
    assert.match(MAIN_WORKSPACE_CLASS_NAME, /--background/)
  })

  test('uses one-row titlebar headers', () => {
    const source = readFileSync(
      new URL('../src/components/thread/MainHeader.tsx', import.meta.url),
      { encoding: 'utf8' },
    )

    assert.match(MAIN_HEADER_CLASS_NAME, /\bh-12\b/)
    assert.match(
      MAIN_HEADER_CLASS_NAME,
      /color-mix\(in_oklch,var\(--background\)_82%,transparent\)/,
    )
    assert.match(MAIN_HEADER_TITLE_CLASS_NAME, /\bleading-none\b/)
    assert.doesNotMatch(source, /<p[^>]*>JIAJIA<\/p>/)
  })

  test('keeps the collapsed sidebar toggle in the header flow', () => {
    assert.doesNotMatch(COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME, /\babsolute\b/)
    assert.match(SIDEBAR_TOGGLE_ICON_CLASS_NAME, /-translate-y-px/)
  })

  test('keeps the composer in normal flow below the scroll viewport', () => {
    const source = readFileSync(
      new URL('../src/components/thread/Thread.tsx', import.meta.url),
      { encoding: 'utf8' },
    )

    assert.doesNotMatch(source, /\babsolute\s+inset-x-0\s+bottom-0\b/)
    assert.doesNotMatch(source, /\bpb-50\b/)
    assert.match(source, /\bshrink-0\b/)
  })
})
