// SPDX-License-Identifier: GPL-3.0-or-later
//
// Contrato do viewer sintético (M1-S1): tudo o que emite passa por
// `parseViewerMessage` e o seu comportamento segue §5.2/§5.5 sobre dados
// sintéticos. Não prova DXF/DWG reais.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  type AppMessage,
  type AppPayloads,
  type AppToViewerType,
  buildAppMessage,
  encodeInjection,
  parseViewerMessage,
  type ViewerMessage
} from '../contracts/protocol.ts'
import {
  SYNTHETIC_BLOCKS_DOC,
  SYNTHETIC_DOCUMENTS,
  SYNTHETIC_LAYOUTS_DOC,
  syntheticManyDoc
} from './syntheticDocuments.ts'
import {
  decodeInjection,
  scaleBox,
  SyntheticViewer
} from './syntheticViewer.ts'

let seq = 0
function drive(
  viewer: SyntheticViewer,
  type: AppToViewerType,
  payload: unknown
): ViewerMessage[] {
  const id = `a-${++seq}`
  const built = buildAppMessage(id, type, payload as never)
  assert.ok(built.ok, `payload inválido para ${type}`)
  viewer.handle(encodeInjection(built.message))
  return viewer.drain().map(raw => {
    const parsed = parseViewerMessage(raw)
    assert.ok(
      parsed.ok,
      `o viewer sintético emitiu mensagem fora do contrato: ${raw}`
    )
    return parsed.message
  })
}

const openPayload = (name: string) => ({
  name,
  size: 10,
  source: { kind: 'url', url: `http://127.0.0.1/${name}` }
})
const open = (v: SyntheticViewer, name: string) =>
  drive(v, 'open', openPayload(name))

/** Ignora a validação da app (que já recusa `.pdf`): o viewer também se defende. */
function openRaw(v: SyntheticViewer, name: string): ViewerMessage[] {
  const msg = {
    v: 1,
    id: `a-${++seq}`,
    type: 'open',
    payload: openPayload(name)
  }
  v.handle(encodeInjection(msg as AppMessage))
  return v.drain().map(raw => {
    const parsed = parseViewerMessage(raw)
    assert.ok(parsed.ok)
    return parsed.message
  })
}
const find = (v: SyntheticViewer, query: string, extra: object = {}) =>
  drive(v, 'find', { query, matchCase: false, scope: 'drawing', ...extra })

function openedViewer(
  opts: ConstructorParameters<typeof SyntheticViewer>[0] = {
    documents: [...SYNTHETIC_DOCUMENTS, syntheticManyDoc(600)]
  }
) {
  const v = new SyntheticViewer(opts)
  open(v, 'synthetic-layouts.dxf')
  return v
}

describe('synthetic viewer — transport', () => {
  it('decodes exactly what encodeInjection produced, including hostile text', () => {
    const msg = buildAppMessage('a-1', 'find', {
      query: 'a"b\n</script>😀 ',
      matchCase: true,
      scope: 'drawing'
    })
    assert.ok(msg.ok)
    assert.deepEqual(decodeInjection(encodeInjection(msg.message)), msg.message)
    assert.throws(() => decodeInjection('alert(1)'), /inválido/)
  })

  it('boots with a contract-valid ready, dwg ok or unavailable', () => {
    for (const dwg of ['ok', 'unavailable'] as const) {
      const v = new SyntheticViewer({ documents: [], dwg })
      v.boot()
      const [m] = v.drain().map(r => parseViewerMessage(r))
      assert.ok(m.ok && m.message.type === 'ready')
      assert.equal(m.message.payload.dwg, dwg)
    }
  })
})

describe('synthetic viewer — open', () => {
  it('opens a known document and reports its layouts', () => {
    const v = new SyntheticViewer({ documents: SYNTHETIC_DOCUMENTS })
    const [m] = open(v, 'synthetic-layouts.dxf')
    assert.equal(m.type, 'opened')
    assert.ok(m.type === 'opened')
    assert.deepEqual(
      m.payload.layouts.map(l => l.name),
      ['Model', 'Planta', 'Alçados']
    )
    assert.equal(m.payload.format, 'dxf')
    assert.deepEqual(v.camera, SYNTHETIC_LAYOUTS_DOC.extents)
  })

  it('fails with explicit codes and keeps the previous document', () => {
    const v = new SyntheticViewer({
      documents: SYNTHETIC_DOCUMENTS,
      dwg: 'unavailable'
    })
    open(v, 'synthetic-layouts.dxf')
    const codes = [
      ['desenho.pdf', 'unsupported-ext'],
      ['synthetic-layouts.dwg', 'dwg-unavailable'],
      ['nao-existe.dxf', 'read-failed']
    ] as const
    for (const [name, code] of codes) {
      const [m] = openRaw(v, name)
      assert.ok(m.type === 'openFailed', name)
      assert.equal(m.payload.code, code)
      assert.equal(v.doc?.name, 'synthetic-layouts.dxf')
    }
  })
})

describe('synthetic viewer — find', () => {
  it('no match → total 0, no hits, not truncated', () => {
    const v = openedViewer()
    const [m] = find(v, 'inexistente')
    assert.ok(m.type === 'findResult')
    assert.deepEqual(
      { t: m.payload.total, h: m.payload.hits.length, tr: m.payload.truncated },
      { t: 0, h: 0, tr: false }
    )
  })

  it('one match, with the contract invariants hits[i].index === i', () => {
    const v = openedViewer()
    const [m] = find(v, 'cobertura')
    assert.ok(m.type === 'findResult')
    assert.equal(m.payload.total, 1)
    assert.equal(m.payload.hits[0].layoutName, 'Alçados')
    assert.equal(m.payload.hits[0].kind, 'mtext')
    assert.equal(m.payload.layoutCount, 1)
  })

  it('multi-layout hits come ordered by tabOrder and keep document order inside a layout', () => {
    const v = openedViewer()
    const [m] = find(v, 'parede')
    assert.ok(m.type === 'findResult')
    assert.deepEqual(
      m.payload.hits.map(h => `${h.layoutName}:${h.text}`),
      [
        'Model:Parede exterior',
        'Planta:Parede divisória',
        'Planta:PAREDE (caixa alta)',
        'Alçados:Parede norte'
      ]
    )
    assert.equal(m.payload.layoutCount, 3)
    assert.deepEqual(
      m.payload.hits.map(h => h.index),
      [0, 1, 2, 3]
    )
  })

  it('matchCase and scope:layout (active layout only) narrow the result', () => {
    const v = openedViewer()
    const [cased] = find(v, 'Parede', { matchCase: true })
    assert.ok(cased.type === 'findResult')
    assert.equal(cased.payload.total, 3)
    const [layout] = find(v, 'parede', { scope: 'layout' })
    assert.ok(layout.type === 'findResult')
    assert.deepEqual(
      layout.payload.hits.map(h => h.layoutName),
      ['Model']
    )
  })

  it('text inside blocks keeps blockName and tag', () => {
    const v = new SyntheticViewer({ documents: [SYNTHETIC_BLOCKS_DOC] })
    open(v, 'synthetic-blocks.dxf')
    const [m] = find(v, 'obra')
    assert.ok(m.type === 'findResult')
    assert.equal(m.payload.hits[0].blockName, 'CARIMBO')
    assert.equal(m.payload.hits[0].tag, 'OBRA')
  })

  it('truncated: maxResults caps hits and total stays consistent', () => {
    const v = openedViewer()
    open(v, 'synthetic-many.dxf')
    const [one] = find(v, 'cota', { maxResults: 1 })
    assert.ok(one.type === 'findResult')
    assert.deepEqual(
      [one.payload.total, one.payload.hits.length, one.payload.truncated],
      [1, 1, true]
    )
    const [cap] = find(v, 'cota')
    assert.ok(cap.type === 'findResult')
    assert.deepEqual([cap.payload.total, cap.payload.truncated], [500, true])
  })

  it('findId grows with every find and without a document the answer is an explicit error', () => {
    const v = openedViewer()
    const ids = [find(v, 'a'), find(v, 'b')].map(([m]) => {
      assert.ok(m.type === 'findResult')
      return m.payload.findId
    })
    assert.deepEqual(ids, [1, 2])
    const bare = new SyntheticViewer({ documents: SYNTHETIC_DOCUMENTS })
    const [e] = find(bare, 'x')
    assert.ok(e.type === 'error')
    assert.equal(e.payload.code, 'no-document')
    assert.ok(e.replyTo)
  })
})

describe('synthetic viewer — navigation', () => {
  function withHits() {
    const v = openedViewer()
    const [r] = find(v, 'parede')
    assert.ok(r.type === 'findResult')
    return { v, findId: r.payload.findId }
  }
  const active = (m: ViewerMessage) => {
    assert.ok(m.type === 'findActive', m.type)
    return m.payload
  }

  it('goto navigates and highlights; next/prev wrap in both directions', () => {
    const { v, findId } = withHits()
    assert.equal(active(drive(v, 'goto', { findId, index: 1 })[0]).index, 1)
    assert.ok(v.highlighted)
    assert.equal(active(drive(v, 'findNext', { findId })[0]).index, 2)
    assert.equal(active(drive(v, 'findNext', { findId })[0]).index, 3)
    assert.equal(active(drive(v, 'findNext', { findId })[0]).index, 0)
    assert.equal(active(drive(v, 'findPrev', { findId })[0]).index, 3)
    assert.equal(active(drive(v, 'findPrev', { findId })[0]).index, 2)
  })

  it('from no active hit both directions go to 0 (useFind.submit)', () => {
    for (const dir of ['findNext', 'findPrev'] as const) {
      const { v, findId } = withHits()
      assert.equal(active(drive(v, dir, { findId })[0]).index, 0)
    }
  })

  it('zero hits: findActive index -1 / stale, nothing highlighted', () => {
    const v = openedViewer()
    const [r] = find(v, 'inexistente')
    assert.ok(r.type === 'findResult')
    const a = active(drive(v, 'findNext', { findId: r.payload.findId })[0])
    assert.deepEqual([a.index, a.outcome], [-1, 'stale'])
    assert.equal(v.highlighted, false)
  })

  it('stale findId → error stale-find, no navigation', () => {
    const { v, findId } = withHits()
    for (const type of ['goto', 'findNext', 'findPrev'] as const) {
      const payload =
        type === 'goto'
          ? { findId: findId - 1, index: 0 }
          : { findId: findId + 5 }
      const [e] = drive(v, type, payload)
      assert.ok(e.type === 'error' && e.payload.code === 'stale-find', type)
    }
    assert.equal(v.activeIndex, -1)
    assert.equal(v.highlighted, false)
  })

  it('index out of range → explicit error, selection unchanged', () => {
    const { v, findId } = withHits()
    drive(v, 'goto', { findId, index: 1 })
    const [e] = drive(v, 'goto', { findId, index: 99 })
    assert.ok(e.type === 'error' && e.payload.code === 'index-out-of-range')
    assert.equal(v.activeIndex, 1)
  })

  it('layout-missing is reported, not navigated', () => {
    const v = new SyntheticViewer({
      documents: SYNTHETIC_DOCUMENTS,
      missingLayouts: ['B3']
    })
    open(v, 'synthetic-layouts.dxf')
    const [r] = find(v, 'cobertura')
    assert.ok(r.type === 'findResult')
    const a = active(
      drive(v, 'goto', { findId: r.payload.findId, index: 0 })[0]
    )
    assert.deepEqual([a.index, a.outcome], [-1, 'layout-missing'])
    assert.equal(v.highlighted, false)
  })

  it('a new find clears the highlight; clearHighlight keeps the list position', () => {
    const { v, findId } = withHits()
    drive(v, 'goto', { findId, index: 2 })
    drive(v, 'clearHighlight', {})
    assert.deepEqual([v.highlighted, v.activeIndex], [false, 2])
    drive(v, 'goto', { findId, index: 2 })
    find(v, 'parede')
    assert.deepEqual([v.highlighted, v.activeIndex], [false, -1])
  })
})

describe('synthetic viewer — zoom, insets, injected failures', () => {
  it('in/out use default factors 2 / 0.5 and keep the centre; extents restores', () => {
    const v = openedViewer()
    const centre = (b: NonNullable<typeof v.camera>) => [
      (b.minX + b.maxX) / 2,
      (b.minY + b.maxY) / 2
    ]
    drive(v, 'zoom', { op: 'in' })
    assert.deepEqual(v.camera, { minX: 100, minY: 50, maxX: 300, maxY: 150 })
    drive(v, 'zoom', { op: 'out' })
    assert.deepEqual(v.camera, SYNTHETIC_LAYOUTS_DOC.extents)
    drive(v, 'zoom', { op: 'in', factor: 4 })
    assert.deepEqual(centre(v.camera!), [200, 100])
    drive(v, 'zoom', { op: 'extents' })
    assert.deepEqual(v.camera, SYNTHETIC_LAYOUTS_DOC.extents)
  })

  it('[H] out with an explicit factor divides literally (factor 2 zooms in)', () => {
    const v = openedViewer()
    drive(v, 'zoom', { op: 'out', factor: 2 })
    assert.deepEqual(v.camera, scaleBox(SYNTHETIC_LAYOUTS_DOC.extents, 2))
  })

  it('zoom never touches find or highlight', () => {
    const v = openedViewer()
    const [r] = find(v, 'parede')
    assert.ok(r.type === 'findResult')
    drive(v, 'goto', { findId: r.payload.findId, index: 1 })
    drive(v, 'zoom', { op: 'in' })
    drive(v, 'zoom', { op: 'extents' })
    assert.deepEqual(
      [v.highlighted, v.activeIndex, v.find?.findId],
      [true, 1, 1]
    )
  })

  it('zoom without a document is an explicit error', () => {
    const v = new SyntheticViewer({ documents: [] })
    const [e] = drive(v, 'zoom', { op: 'in' })
    assert.ok(e.type === 'error' && e.payload.code === 'no-document')
  })

  it('setInsets is stored; failNext replaces exactly one reply by a replyTo error', () => {
    const v = openedViewer()
    drive(v, 'setInsets', { left: 1, right: 2, top: 3, bottom: 4 })
    assert.deepEqual(v.insets, { left: 1, right: 2, top: 3, bottom: 4 })
    v.failNext('find', { code: 'boom', message: 'falha injectada' })
    const [e] = find(v, 'parede')
    assert.ok(
      e.type === 'error' && e.payload.code === 'boom' && e.payload.replyTo
    )
    const [ok] = find(v, 'parede')
    assert.equal(ok.type, 'findResult')
  })

  it('records every received command in order', () => {
    const v = openedViewer()
    find(v, 'x')
    drive(v, 'clearHighlight', {})
    const types: AppMessage['type'][] = v.received.map(m => m.type)
    assert.deepEqual(types, ['open', 'find', 'clearHighlight'])
    const _payloadCheck: AppPayloads['clearHighlight'] = {}
    void _payloadCheck
  })
})
