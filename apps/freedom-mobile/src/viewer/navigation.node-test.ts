// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isAllowedNavigation,
  isViewerUrl,
  SURFACE_ORIGIN_WHITELIST
} from './navigation.ts'

const TOKEN = 'A'.repeat(43)
const PAGE = `http://127.0.0.1:41234/s/${TOKEN}/`

describe('ViewerSurface: política de navegação (spec M3-I5 §8 item 3)', () => {
  it('whitelist só loopback IPv4 em claro (sem about:*, sem https, sem file)', () => {
    assert.deepEqual(SURFACE_ORIGIN_WHITELIST, ['http://127.0.0.1:*'])
  })

  it('isViewerUrl aceita só a página exacta da sessão', () => {
    assert.equal(isViewerUrl(PAGE), true)
    for (const bad of [
      null,
      undefined,
      42,
      'about:blank',
      `http://localhost:41234/s/${TOKEN}/`,
      `https://127.0.0.1:41234/s/${TOKEN}/`,
      `http://127.0.0.1:0/s/${TOKEN}/`,
      `http://127.0.0.1:99999/s/${TOKEN}/`,
      'http://127.0.0.1:41234/s/curto/',
      `http://127.0.0.1:41234/s/${TOKEN}/?x=1`,
      `http://127.0.0.1:41234/s/${TOKEN}/index.html`,
      `http://127.0.0.2:41234/s/${TOKEN}/`,
      'http://evil.example/',
      ''
    ]) {
      assert.equal(isViewerUrl(bad), false, String(bad))
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
      `${PAGE}%2E%2E/x`,
      `${PAGE}a\\b`,
      `${PAGE}?q`,
      `${PAGE}#f`,
      'about:blank',
      'about:srcdoc',
      'data:text/html,x',
      'blob:http://127.0.0.1:41234/x',
      'file:///data/x.dxf',
      'javascript:alert(1)',
      'intent://x#Intent;end'
    ]) {
      assert.equal(isAllowedNavigation(bad, PAGE), false, bad)
    }
  })

  it('sem página válida nada navega (nem about:blank)', () => {
    for (const viewerUrl of [null, '', 'about:blank', 'http://evil.example/']) {
      assert.equal(isAllowedNavigation('about:blank', viewerUrl), false)
      assert.equal(isAllowedNavigation(PAGE, viewerUrl), false)
    }
    assert.equal(isAllowedNavigation(undefined, PAGE), false)
  })
})
