// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { MIN_TOUCH_TARGET } from './touchTarget.ts'

const screenSource = readFileSync(
  new URL('../screens/ViewerScreen.tsx', import.meta.url),
  'utf8'
)

describe('touchTarget', () => {
  it('requires at least 44 dp', () => {
    assert.equal(MIN_TOUCH_TARGET, 44)
  })

  // ViewerScreen importa react-native e não corre sob node:test: inspecção da
  // fonte para garantir que o aviso dispensável mantém o alvo >= 44 dp.
  describe('ViewerScreen dismissible notice (source inspection)', () => {
    const pressable = screenSource
      .split('<Pressable')
      .find(block => block.includes('accessibilityLabel="Dispensar aviso"'))

    it('is a button that dispatches issue-dismissed', () => {
      assert.ok(pressable, 'Pressable "Dispensar aviso" not found')
      assert.match(pressable, /accessibilityRole="button"/)
      assert.match(pressable, /issue-dismissed/)
    })

    it('gets its size from the shared minimum, not a literal', () => {
      assert.ok(pressable)
      assert.match(pressable, /style=\{styles\.noticeTarget\}/)
      assert.match(
        screenSource,
        /noticeTarget:\s*\{[^}]*minHeight:\s*MIN_TOUCH_TARGET/
      )
      assert.match(
        screenSource,
        /noticeTarget:\s*\{[^}]*minWidth:\s*MIN_TOUCH_TARGET/
      )
    })

    it('every Pressable declares a style with a minimum height', () => {
      for (const block of screenSource.split('<Pressable').slice(1)) {
        assert.match(block, /style=\{styles\.(noticeTarget|button)\}/)
      }
    })
  })
})
