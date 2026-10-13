// SPDX-License-Identifier: GPL-3.0-or-later
//
// Validação de entrada do viewer (spec M3-I4 §2.1) e deriva contra o contrato
// do app (apps/freedom-mobile/src/contracts/protocol.ts, só leitura).

import * as app from '../../../apps/freedom-mobile/src/contracts/protocol'
import {
  APP_TO_VIEWER_TYPES,
  checkAppPayload,
  FIND_HIT_KINDS,
  FIND_MAX_RESULTS,
  FIND_OUTCOMES,
  isValidFindResult,
  isValidInsets,
  isValidOpenedPayload,
  MAX_INSET,
  MAX_NAME_LENGTH,
  MAX_QUERY_LENGTH,
  PROTOCOL_VERSION,
  VIEWER_TO_APP_TYPES,
  ZOOM_FACTOR_MAX,
  ZOOM_FACTOR_MIN
} from '../src/viewer/protocol'

const INSETS = { left: 0, right: 0, top: 10, bottom: 300 }

describe('constantes iguais às do app', () => {
  test('tipos, kinds, outcomes e limites', () => {
    expect(PROTOCOL_VERSION).toBe(app.PROTOCOL_VERSION)
    expect([...APP_TO_VIEWER_TYPES]).toEqual([...app.APP_TO_VIEWER_TYPES])
    expect([...VIEWER_TO_APP_TYPES]).toEqual([...app.VIEWER_TO_APP_TYPES])
    expect([...FIND_HIT_KINDS]).toEqual([...app.FIND_HIT_KINDS])
    expect([...FIND_OUTCOMES]).toEqual([...app.FIND_OUTCOMES])
    expect(FIND_MAX_RESULTS).toBe(app.FIND_MAX_RESULTS)
    expect(ZOOM_FACTOR_MIN).toBe(app.ZOOM_FACTOR_MIN)
    expect(ZOOM_FACTOR_MAX).toBe(app.ZOOM_FACTOR_MAX)
  })
})

/** Corpus [type, payload] com casos válidos e inválidos para o app. */
const CORPUS: Array<[app.AppToViewerType, unknown]> = [
  [
    'open',
    { name: 'a.dxf', size: 10, source: { kind: 'base64', data: 'QQ==' } }
  ],
  [
    'open',
    {
      name: 'a.dwg',
      size: 10,
      source: { kind: 'url', url: 'http://127.0.0.1:1/a' }
    }
  ],
  ['open', { name: '', size: 10, source: { kind: 'base64', data: 'QQ==' } }],
  [
    'open',
    { name: 'a.dxf', size: -1, source: { kind: 'base64', data: 'QQ==' } }
  ],
  [
    'open',
    { name: 'a.dxf', size: 1.5, source: { kind: 'base64', data: 'QQ==' } }
  ],
  ['open', { name: 'a.dxf', size: 10, source: { kind: 'ftp', url: 'x' } }],
  ['open', { name: 'a.dxf', size: 10, source: { kind: 'url', url: '' } }],
  ['open', { name: 'a.dxf', size: 10 }],
  ['find', { query: 'sala', matchCase: false, scope: 'drawing' }],
  ['find', { query: 'sala', matchCase: true, scope: 'layout', maxResults: 1 }],
  [
    'find',
    { query: 'sala', matchCase: true, scope: 'layout', maxResults: 500 }
  ],
  ['find', { query: '   ', matchCase: false, scope: 'drawing' }],
  ['find', { query: 'x', matchCase: 'no', scope: 'drawing' }],
  ['find', { query: 'x', matchCase: false, scope: 'all' }],
  ['find', { query: 'x', matchCase: false, scope: 'drawing', maxResults: 0 }],
  ['find', { query: 'x', matchCase: false, scope: 'drawing', maxResults: 501 }],
  ['find', { query: 'x', matchCase: false, scope: 'drawing', maxResults: 2.5 }],
  ['find', { query: 7, matchCase: false, scope: 'drawing' }],
  ['goto', { findId: 1, index: 0 }],
  ['goto', { findId: 1, index: 3, insets: INSETS }],
  ['goto', { findId: -1, index: 0 }],
  ['goto', { findId: 1, index: -1 }],
  ['goto', { findId: 1 }],
  ['goto', { findId: 1, index: 0, insets: { ...INSETS, left: -1 } }],
  ['goto', { findId: 1, index: 0, insets: { ...INSETS, top: NaN } }],
  ['findNext', { findId: 0 }],
  ['findPrev', { findId: 2, insets: INSETS }],
  ['findNext', { findId: '2' }],
  ['zoom', { op: 'in' }],
  ['zoom', { op: 'out', factor: 0.1 }],
  ['zoom', { op: 'in', factor: 10 }],
  ['zoom', { op: 'extents' }],
  ['zoom', { op: 'extents', factor: 2 }],
  ['zoom', { op: 'in', factor: 0.05 }],
  ['zoom', { op: 'in', factor: 11 }],
  ['zoom', { op: 'in', factor: Infinity }],
  ['zoom', { op: 'pan' }],
  ['clearHighlight', {}],
  ['clearHighlight', { all: true }],
  ['setInsets', INSETS],
  ['setInsets', { left: 0, right: 0, top: 0 }],
  ['setInsets', { ...INSETS, bottom: '3' }]
]

describe('mesma decisão que buildAppMessage do app (corpus)', () => {
  test.each(CORPUS)('%s %j', (type, payload) => {
    const appOk = app.buildAppMessage('a-1', type, payload as never).ok
    const ours = checkAppPayload(type, payload).ok
    // o app recusa também por extensão/tamanho (open), que no viewer são
    // decididos pelo importador com `openFailed` — aí o viewer aceita a forma
    expect(ours).toBe(appOk)
  })
})

describe('limites próprios do viewer (input hostil)', () => {
  test('query acima de MAX_QUERY_LENGTH é recusada', () => {
    const p = {
      query: 'a'.repeat(MAX_QUERY_LENGTH + 1),
      matchCase: false,
      scope: 'drawing'
    }
    expect(checkAppPayload('find', p)).toEqual({
      ok: false,
      message: 'find.query demasiado longo'
    })
    expect(
      checkAppPayload('find', { ...p, query: 'a'.repeat(MAX_QUERY_LENGTH) }).ok
    ).toBe(true)
  })

  test.each([
    ['a\u0000.dxf'],
    ['a\n.dxf'],
    ['a\u007f.dxf'],
    ['x'.repeat(MAX_NAME_LENGTH) + '.dxf']
  ])('open.name hostil %j é recusado', name => {
    const out = checkAppPayload('open', {
      name,
      size: 1,
      source: { kind: 'base64', data: 'QQ==' }
    })
    expect(out.ok).toBe(false)
  })

  test('insets acima de MAX_INSET são recusados', () => {
    expect(isValidInsets({ ...INSETS, bottom: MAX_INSET })).toBe(true)
    expect(isValidInsets({ ...INSETS, bottom: MAX_INSET + 1 })).toBe(false)
  })

  test('índices inteiros mas não seguros são recusados', () => {
    expect(
      checkAppPayload('goto', { findId: 1, index: Number.MAX_SAFE_INTEGER + 1 })
        .ok
    ).toBe(false)
  })

  test('payload não-objecto é recusado em todos os tipos', () => {
    for (const type of APP_TO_VIEWER_TYPES) {
      for (const p of [null, [], 'x', 3, undefined]) {
        expect(checkAppPayload(type, p).ok).toBe(false)
      }
    }
  })

  test('a cópia validada não leva chaves extra nem referências recebidas', () => {
    const insets = { ...INSETS, evil: 1 }
    const out = checkAppPayload('goto', {
      findId: 1,
      index: 0,
      insets,
      extra: 'x',
      ['__proto__']: { polluted: true }
    })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.payload).toEqual({ findId: 1, index: 0, insets: INSETS })
    expect(out.payload.insets).not.toBe(insets)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('getter hostil no payload não escapa como excepção para fora do dispatcher', () => {
    // a guarda lê a propriedade: quem chama (dispatcher) apanha — aqui só se
    // fixa que o validador não engole o erro com um «ok» falso
    const p = Object.defineProperty({}, 'query', {
      get() {
        throw new Error('boom')
      },
      enumerable: true
    })
    expect(() => checkAppPayload('find', p)).toThrow('boom')
  })
})

describe('guardas de saída iguais às do app', () => {
  const env = (type: string, payload: unknown) =>
    JSON.stringify({ v: 1, id: 'w-1', type, payload })

  const opened = {
    name: 'a.dxf',
    format: 'dxf' as const,
    layouts: [{ name: 'Model', btrId: '1F', tabOrder: 0 }],
    activeLayoutId: '1F'
  }

  test.each([
    [opened, true],
    [{ ...opened, layouts: [{ ...opened.layouts[0], tabOrder: -1 }] }, false],
    [{ ...opened, layouts: [{ ...opened.layouts[0], tabOrder: 1.5 }] }, false],
    [{ ...opened, name: '' }, false]
  ])('opened %#', (payload, expected) => {
    expect(isValidOpenedPayload(payload)).toBe(expected)
    // o app concorda (o viewer pode ser mais estrito, nunca menos)
    if (expected)
      expect(app.parseViewerMessage(env('opened', payload)).ok).toBe(true)
    else expect(app.parseViewerMessage(env('opened', payload)).ok).toBe(false)
  })

  test('opened com activeLayoutId fora dos layouts é recusado (mais estrito que o app)', () => {
    expect(isValidOpenedPayload({ ...opened, activeLayoutId: 'ZZ' })).toBe(
      false
    )
    expect(isValidOpenedPayload({ ...opened, layouts: [] })).toBe(false)
  })

  const hit = {
    index: 0,
    text: 'Sala',
    excerpt: 'Sala',
    layoutName: 'Model',
    layoutId: '1F',
    layer: '0',
    kind: 'text' as const
  }
  const result = {
    findId: 1,
    total: 1,
    truncated: false,
    layoutCount: 1,
    hits: [hit]
  }

  test.each([
    [result, true],
    [{ ...result, total: 2 }, false],
    [{ ...result, hits: [{ ...hit, index: 1 }] }, false],
    [{ ...result, hits: [{ ...hit, kind: 'xline' }] }, false],
    [{ ...result, hits: [{ ...hit, tag: 3 }] }, false]
  ])('findResult %#', (payload, expected) => {
    expect(isValidFindResult(payload as never)).toBe(expected)
    expect(app.parseViewerMessage(env('findResult', payload)).ok).toBe(expected)
  })
})
