// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  BLANK_URI,
  isAllowedNavigation,
  isViewerUrl,
  SURFACE_ORIGIN_WHITELIST,
  surfaceUri
} from './navigation.ts'

const TOKEN = 'A'.repeat(43)
const PAGE = `http://127.0.0.1:41234/s/${TOKEN}/`

describe('ViewerSurface: política de navegação (spec M3-I5 §8 item 3)', () => {
  it('whitelist só loopback IPv4 e about:', () => {
    assert.deepEqual(SURFACE_ORIGIN_WHITELIST, [
      'http://127.0.0.1:*',
      'about:*'
    ])
  })

  it('surfaceUri aceita só a página exacta da sessão', () => {
    assert.equal(surfaceUri(PAGE), PAGE)
    assert.equal(surfaceUri(null), BLANK_URI)
    for (const bad of [
      `http://localhost:41234/s/${TOKEN}/`,
      `https://127.0.0.1:41234/s/${TOKEN}/`,
      `http://127.0.0.1:0/s/${TOKEN}/`,
      `http://127.0.0.1:99999/s/${TOKEN}/`,
      'http://127.0.0.1:41234/s/curto/',
      `http://127.0.0.1:41234/s/${TOKEN}/?x=1`,
      `http://127.0.0.2:41234/s/${TOKEN}/`,
      'http://evil.example/',
      ''
    ]) {
      assert.equal(isViewerUrl(bad), false, bad)
      assert.equal(surfaceUri(bad), BLANK_URI, bad)
    }
  })

  it('navegação: só dentro do prefixo da sessão', () => {
    assert.ok(isAllowedNavigation(PAGE, PAGE))
    assert.ok(isAllowedNavigation(`${PAGE}assets/index.js`, PAGE))
    for (const bad of [
      'https://cdn.jsdelivr.net/npm/x',
      'http://127.0.0.1:41234/',
      `http://127.0.0.1:41235/s/${TOKEN}/`,
      `http://127.0.0.1:41234/s/${'B'.repeat(43)}/`,
      `${PAGE}../../etc`,
      `${PAGE}%2e%2e/x`,
      `${PAGE}?q`,
      `${PAGE}#f`,
      'about:blank',
      'file:///data/x.dxf',
      'javascript:alert(1)'
    ]) {
      assert.equal(isAllowedNavigation(bad, PAGE), false, bad)
    }
  })

  it('sem sessão só about:blank', () => {
    assert.ok(isAllowedNavigation(BLANK_URI, null))
    assert.equal(isAllowedNavigation(PAGE, null), false)
    assert.equal(isAllowedNavigation('about:srcdoc', null), false)
  })
})
