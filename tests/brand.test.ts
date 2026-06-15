import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

describe('app brand', () => {
  test('uses JIAJIA in browser and desktop titles', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), {
      encoding: 'utf8',
    })
    const tauriConfig = JSON.parse(
      readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), {
        encoding: 'utf8',
      }),
    )

    assert.match(html, /<title>JIAJIA<\/title>/)
    assert.equal(tauriConfig.productName, 'JIAJIA')
    assert.equal(tauriConfig.app.windows[0].title, 'JIAJIA')
  })
})
