import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { contentToText, truncateTextTitle } from '../src/chat/text-content.ts'

describe('text content helpers', () => {
  test('extracts text from string and text parts', () => {
    assert.equal(contentToText('plain text'), 'plain text')
    assert.equal(
      contentToText([
        { type: 'text', text: 'hello' },
        { type: 'image', imageUrl: 'https://example.com/a.png' },
        { type: 'text', text: ' world' },
      ]),
      'hello world',
    )
  })

  test('normalizes whitespace and truncates long titles', () => {
    assert.equal(truncateTextTitle('a   compact\n title'), 'a compact title')
    assert.equal(
      truncateTextTitle('abcdefghijklmnopqrstuvwxyz0123456789'),
      'abcdefghijklmnopqrstuvwxyz0…',
    )
  })
})
