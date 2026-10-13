// SPDX-License-Identifier: GPL-3.0-or-later
//
// Token, aleatoriedade e validação de cabeçalhos (M3-I5, spec §3 A1/A2/A9).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { LocalServerError } from './errors.ts'
import {
  checkRequestHeaders,
  COMMON_HEADERS,
  DEFAULT_CSP,
  defaultRandomBytes,
  safeEqual,
  TOKEN_BYTES,
  TOKEN_PATTERN,
  tokenFromBytes
} from './security.ts'

const EXPECTED = { host: '127.0.0.1:43210', origin: 'http://127.0.0.1:43210' }
const verdict = (headers: Record<string, string | string[] | undefined>) =>
  checkRequestHeaders(headers, EXPECTED)

describe('tokenFromBytes', () => {
  it('é base64url sem padding e igual ao do Node para qualquer comprimento', () => {
    for (let n = 0; n <= 70; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 53 + n) & 255)
      assert.equal(
        tokenFromBytes(bytes),
        Buffer.from(bytes).toString('base64url'),
        `n=${n}`
      )
    }
  })

  it('32 bytes dão 43 caracteres do alfabeto seguro (segmento de URL válido)', () => {
    const token = tokenFromBytes(new Uint8Array(TOKEN_BYTES).fill(255))
    assert.match(token, TOKEN_PATTERN)
    assert.equal(token.length, 43)
    assert.match(token, /^[A-Za-z0-9_-]+$/)
  })

  it('bytes distintos dão tokens distintos', () => {
    const a = new Uint8Array(TOKEN_BYTES)
    const b = new Uint8Array(TOKEN_BYTES)
    b[31] = 1
    assert.notEqual(tokenFromBytes(a), tokenFromBytes(b))
  })
})

describe('defaultRandomBytes', () => {
  it('usa crypto.getRandomValues (32 bytes, não todos iguais entre chamadas)', () => {
    const a = defaultRandomBytes(32)
    const b = defaultRandomBytes(32)
    assert.equal(a.length, 32)
    assert.notDeepEqual(a, b)
  })

  it('sem crypto seguro lança no-secure-random (nunca recorre a Math.random)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    const realRandom = Math.random
    let usedMathRandom = false
    Math.random = () => {
      usedMathRandom = true
      return 0.5
    }
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true
    })
    try {
      assert.throws(
        () => defaultRandomBytes(32),
        (e: unknown) =>
          e instanceof LocalServerError && e.code === 'no-secure-random'
      )
      assert.equal(usedMathRandom, false)
    } finally {
      Math.random = realRandom
      if (original) Object.defineProperty(globalThis, 'crypto', original)
    }
  })

  it('crypto sem getRandomValues também falha fechado', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Object.defineProperty(globalThis, 'crypto', {
      value: {},
      configurable: true
    })
    try {
      assert.throws(
        () => defaultRandomBytes(32),
        (e: unknown) =>
          e instanceof LocalServerError && e.code === 'no-secure-random'
      )
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original)
    }
  })
})

describe('safeEqual', () => {
  it('igualdade exacta; comprimentos ou conteúdos diferentes falham', () => {
    assert.equal(safeEqual('abc', 'abc'), true)
    assert.equal(safeEqual('abc', 'abd'), false)
    assert.equal(safeEqual('abc', 'ab'), false)
    assert.equal(safeEqual('', ''), true)
    assert.equal(safeEqual('abc', 'ABC'), false)
  })

  it('percorre o comprimento todo (sem saída antecipada no 1.º carácter)', () => {
    // primeiro e último carácter diferentes dão o mesmo veredicto
    const base = 'a'.repeat(43)
    assert.equal(safeEqual(base, `b${'a'.repeat(42)}`), false)
    assert.equal(safeEqual(base, `${'a'.repeat(42)}b`), false)
  })
})

describe('checkRequestHeaders', () => {
  const ok = { host: EXPECTED.host }

  it('aceita o Host exacto', () => {
    assert.deepEqual(verdict(ok), { ok: true })
  })

  it('nomes em qualquer capitalização', () => {
    assert.deepEqual(verdict({ Host: EXPECTED.host }), { ok: true })
    assert.deepEqual(verdict({ HOST: EXPECTED.host }), { ok: true })
  })

  it('Host em falta, vazio ou repetido → 400', () => {
    assert.deepEqual(verdict({}), { ok: false, status: 400 })
    assert.deepEqual(verdict({ host: '' }), { ok: false, status: 400 })
    assert.deepEqual(verdict({ host: [EXPECTED.host, EXPECTED.host] }), {
      ok: false,
      status: 400
    })
    // o mesmo nome em duas capitalizações conta como repetido
    assert.deepEqual(verdict({ host: EXPECTED.host, Host: EXPECTED.host }), {
      ok: false,
      status: 400
    })
  })

  for (const host of [
    'evil.example',
    'evil.example:43210',
    '127.0.0.1',
    '127.0.0.1:1',
    '127.0.0.1:43210.evil.example',
    'localhost:43210',
    '[::1]:43210',
    '0.0.0.0:43210',
    '127.0.0.1:43210 ',
    ' 127.0.0.1:43210',
    '127.0.0.1:043210',
    'user@127.0.0.1:43210',
    '2130706433:43210'
  ]) {
    it(`Host ${JSON.stringify(host)} → 403 (rebinding/origem errada)`, () => {
      assert.deepEqual(verdict({ host }), { ok: false, status: 403 })
    })
  }

  it('Origin: só a própria origem', () => {
    assert.deepEqual(verdict({ ...ok, origin: EXPECTED.origin }), { ok: true })
    for (const origin of [
      'null',
      'http://evil.example',
      'http://localhost:43210',
      'http://127.0.0.1:1',
      'https://127.0.0.1:43210',
      'http://127.0.0.1:43210/'
    ]) {
      assert.deepEqual(verdict({ ...ok, origin }), { ok: false, status: 403 })
    }
    assert.deepEqual(verdict({ ...ok, origin: [EXPECTED.origin, 'x'] }), {
      ok: false,
      status: 400
    })
  })

  it('Sec-Fetch-Site: só same-origin ou none', () => {
    for (const v of ['same-origin', 'none']) {
      assert.deepEqual(verdict({ ...ok, 'sec-fetch-site': v }), { ok: true })
    }
    for (const v of ['cross-site', 'same-site', 'SAME-ORIGIN', '']) {
      assert.deepEqual(verdict({ ...ok, 'sec-fetch-site': v }), {
        ok: false,
        status: 403
      })
    }
  })

  it('corpo: content-length > 0 ou transfer-encoding → 400; content-length 0 é aceite', () => {
    assert.deepEqual(verdict({ ...ok, 'content-length': '0' }), { ok: true })
    for (const bad of ['1', '5', 'abc', '-0', '00x']) {
      assert.deepEqual(verdict({ ...ok, 'content-length': bad }), {
        ok: false,
        status: 400
      })
    }
    assert.deepEqual(verdict({ ...ok, 'transfer-encoding': 'chunked' }), {
      ok: false,
      status: 400
    })
  })

  it('o Host é avaliado primeiro (um atacante não aprende nada com o resto)', () => {
    assert.deepEqual(
      verdict({ host: 'evil.example', origin: 'x', 'content-length': '9' }),
      { ok: false, status: 403 }
    )
  })

  it('chaves hostis (__proto__, constructor) são inertes', () => {
    const headers = JSON.parse(
      '{"host":"127.0.0.1:43210","__proto__":"x","constructor":"y"}'
    ) as Record<string, string>
    assert.deepEqual(verdict(headers), { ok: true })
    assert.equal(({} as Record<string, unknown>).x, undefined)
  })
})

describe('cabeçalhos de resposta', () => {
  it('sem CORS nem identificação do servidor; sem cache; sem sniffing', () => {
    const names = Object.keys(COMMON_HEADERS).map(n => n.toLowerCase())
    assert.ok(!names.some(n => n.startsWith('access-control-')))
    for (const n of ['server', 'etag', 'last-modified', 'x-powered-by']) {
      assert.ok(!names.includes(n), n)
    }
    assert.equal(COMMON_HEADERS['Cache-Control'], 'no-store')
    assert.equal(COMMON_HEADERS['X-Content-Type-Options'], 'nosniff')
    assert.equal(COMMON_HEADERS['Referrer-Policy'], 'no-referrer')
    assert.equal(COMMON_HEADERS['Cross-Origin-Resource-Policy'], 'same-origin')
  })

  it('a CSP só permite a própria origem (zero rede externa) e nega o resto', () => {
    assert.match(DEFAULT_CSP, /default-src 'none'/)
    assert.match(DEFAULT_CSP, /connect-src 'self'/)
    assert.match(DEFAULT_CSP, /frame-ancestors 'none'/)
    assert.match(DEFAULT_CSP, /object-src 'none'/)
    assert.doesNotMatch(DEFAULT_CSP, /https?:|\*|unsafe-eval(?!')/)
    assert.doesNotMatch(DEFAULT_CSP, /script-src[^;]*'unsafe-inline'/)
  })
})
