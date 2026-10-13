// SPDX-License-Identifier: GPL-3.0-or-later
//
// Análise do alvo, tipos de conteúdo e nomes de bundle (M3-I5, spec §3 A3).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isAssetId, isLocalAssetUrl } from '../files/names.ts'
import {
  ASSET_ROUTE,
  buildAssetPath,
  buildViewerPath,
  contentTypeFor,
  DEFAULT_CONTENT_TYPE,
  isBundlePath,
  isHtmlPath,
  isSafeSegment,
  MAX_SEGMENTS,
  MAX_TARGET_LENGTH,
  parseTarget,
  ROUTE_PREFIX
} from './paths.ts'

describe('parseTarget', () => {
  it('segmentos simples, raiz e barra final', () => {
    assert.deepEqual(parseTarget('/'), {
      ok: true,
      segments: [],
      trailingSlash: true
    })
    assert.deepEqual(parseTarget('/s/tok/a/f1-abc'), {
      ok: true,
      segments: ['s', 'tok', 'a', 'f1-abc'],
      trailingSlash: false
    })
    assert.deepEqual(parseTarget('/s/tok/'), {
      ok: true,
      segments: ['s', 'tok'],
      trailingSlash: true
    })
    assert.deepEqual(parseTarget('/s/tok/assets/app.v2-min.js'), {
      ok: true,
      segments: ['s', 'tok', 'assets', 'app.v2-min.js'],
      trailingSlash: false
    })
  })

  const hostile: [string, string][] = [
    ['traversal ..', '/s/tok/../x'],
    ['traversal . ', '/s/tok/./x'],
    ['.. final', '/s/tok/x/..'],
    ['%2e%2e', '/s/tok/%2e%2e/x'],
    ['%2E%2E', '/s/tok/%2E%2E/x'],
    ['%2f', '/s/tok/a%2fb'],
    ['%5c', '/s/tok/a%5cb'],
    ['% isolado', '/s/tok/%'],
    ['barra dupla', '/s/tok//x'],
    ['barra dupla no início', '//s/tok/x'],
    ['só duas barras', '//'],
    ['três barras', '///'],
    ['backslash', '/s/tok/x\\y'],
    ['NUL', '/s/tok/x\u0000y'],
    ['NUL codificado', '/s/tok/x%00y'],
    ['controlo', '/s/tok/x\ny'],
    ['espaço', '/s/tok/x y'],
    ['tab', '/s/tok/x\ty'],
    ['query', '/s/tok/x?y=1'],
    ['query vazia', '/s/tok/x?'],
    ['fragmento', '/s/tok/x#y'],
    ['unicode', '/s/tok/café'],
    ['bidi', '/s/tok/x‮y'],
    ['absoluta http', 'http://evil.example/s/tok/'],
    ['absoluta sem esquema', '//evil.example/s/tok/'],
    ['asterisco', '*'],
    ['vazio', ''],
    ['sem barra inicial', 's/tok'],
    ['segmento de 129', `/s/tok/${'a'.repeat(129)}`],
    [
      'profundidade 9',
      `/${Array(MAX_SEGMENTS + 1)
        .fill('a')
        .join('/')}`
    ],
    ['dois pontos', '/s/tok/a:b'],
    ['ponto e vírgula', '/s/tok/a;b'],
    ['parêntese', '/s/tok/a(b)']
  ]
  for (const [label, target] of hostile) {
    it(`rejeita ${label}`, () => {
      assert.deepEqual(parseTarget(target), { ok: false, status: 400 })
    })
  }

  it('alvo acima do tecto → 414 (antes de qualquer análise)', () => {
    const long = `/${'a'.repeat(MAX_TARGET_LENGTH)}`
    assert.deepEqual(parseTarget(long), { ok: false, status: 414 })
    const limit = `/${'a'.repeat(MAX_TARGET_LENGTH - 1)}`
    assert.equal(limit.length, MAX_TARGET_LENGTH)
    // 255 chars de segmento > 128 → 400 por segmento, não 414
    assert.deepEqual(parseTarget(limit), { ok: false, status: 400 })
  })

  it('profundidade máxima aceite; tipos não string → 400', () => {
    const deep = `/${Array(MAX_SEGMENTS).fill('a').join('/')}`
    assert.equal(parseTarget(deep).ok, true)
    for (const v of [undefined, null, 1, {}, [], ['/s']]) {
      assert.deepEqual(parseTarget(v), { ok: false, status: 400 })
    }
  })

  it('segmentos com nomes de protótipo são só texto', () => {
    const r = parseTarget('/__proto__/constructor/toString')
    assert.deepEqual(r, {
      ok: true,
      segments: ['__proto__', 'constructor', 'toString'],
      trailingSlash: false
    })
  })
})

describe('isSafeSegment / isBundlePath', () => {
  it('segmentos', () => {
    for (const s of ['a', 'A-b_c.d~e', 'app.js', '...', '.hidden']) {
      assert.equal(isSafeSegment(s), true, s)
    }
    for (const s of ['', '.', '..', 'a/b', 'a b', '%41', 'ç', 1, null]) {
      assert.equal(isSafeSegment(s), false, String(s))
    }
  })

  it('caminhos de bundle: relativos, seguros e fora da rota reservada', () => {
    for (const p of ['index.html', 'assets/app.js', 'a1/b/c.wasm', 'b/a']) {
      assert.equal(isBundlePath(p), true, p)
    }
    for (const p of [
      '',
      '/index.html',
      'index.html/',
      '../x',
      'a/../b',
      'a//b',
      `${ASSET_ROUTE}`,
      `${ASSET_ROUTE}/x`,
      'x?y',
      'x%2fy',
      undefined,
      42
    ]) {
      assert.equal(isBundlePath(p), false, String(p))
    }
    assert.equal(isBundlePath(`${'a1/'.repeat(MAX_SEGMENTS + 1)}x`), false)
  })
})

describe('contentTypeFor / isHtmlPath', () => {
  it('tabela fixa por extensão (case-insensitive)', () => {
    assert.equal(contentTypeFor('index.html'), 'text/html; charset=utf-8')
    assert.equal(contentTypeFor('a/app.js'), 'text/javascript; charset=utf-8')
    assert.equal(contentTypeFor('x.MJS'), 'text/javascript; charset=utf-8')
    assert.equal(contentTypeFor('x.wasm'), 'application/wasm')
    assert.equal(contentTypeFor('x.CSS'), 'text/css; charset=utf-8')
    assert.equal(contentTypeFor('x.woff2'), 'font/woff2')
  })

  it('desconhecido, sem extensão ou extensão vazia → octet-stream', () => {
    for (const p of ['x.shx', 'x', 'x.', '.', 'a.b/c', 'README']) {
      assert.equal(contentTypeFor(p), DEFAULT_CONTENT_TYPE, p)
    }
  })

  it('extensões com nomes de protótipo não vazam Object.prototype', () => {
    for (const ext of [
      '__proto__',
      'constructor',
      'toString',
      'hasOwnProperty'
    ]) {
      assert.equal(contentTypeFor(`x.${ext}`), DEFAULT_CONTENT_TYPE, ext)
    }
  })

  it('html reconhecido só pela extensão', () => {
    assert.equal(isHtmlPath('index.html'), true)
    assert.equal(isHtmlPath('a/b.HTM'), true)
    assert.equal(isHtmlPath('a.html.js'), false)
    assert.equal(isHtmlPath('html'), false)
  })
})

describe('URLs construídos são aceites pelos validadores do fluxo de ficheiros', () => {
  const token = 'A'.repeat(43)

  it('o URL de asset passa por isLocalAssetUrl (o mesmo que o FileFlow aplica)', () => {
    const url = `http://127.0.0.1:43210${buildAssetPath(token, 'f1-abcd1234')}`
    assert.equal(isLocalAssetUrl(url), true)
    assert.equal(isAssetId('f1-abcd1234'), true)
  })

  it('constantes de rota: s / a e caminho do viewer com barra final', () => {
    assert.equal(ROUTE_PREFIX, 's')
    assert.equal(ASSET_ROUTE, 'a')
    assert.equal(buildViewerPath(token), `/s/${token}/`)
    assert.equal(
      buildAssetPath(token, 'f1-abcd1234'),
      `/s/${token}/a/f1-abcd1234`
    )
  })
})
