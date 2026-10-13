// SPDX-License-Identifier: GPL-3.0-or-later
//
// Seleção, zoom e FIND ponta-a-ponta (M1-S1): BridgeClient real + sessionReducer
// real + viewer sintético. As respostas só chegam em `flush()`, por isso os
// estados de loading são observáveis e determinísticos.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createHarness, type Harness } from '../fixtures/harness.ts'
import {
  describeDocument,
  describeFind,
  describeSelection,
  describeZoom
} from './describe.ts'

const PAREDE = { query: 'parede', matchCase: false, scope: 'drawing' } as const

function opened(options: Parameters<typeof createHarness>[0] = {}): Harness {
  const h = createHarness(options)
  h.boot()
  h.open('synthetic-layouts.dxf')
  return h
}

/** `find` + flush (inclui o `goto{index:0}` automático). */
function search(h: Harness, query: string = PAREDE.query): void {
  const r = h.client.find({ ...PAREDE, query })
  assert.ok(r.ok)
  h.flush()
}

const selected = (h: Harness) => h.state.selection.hit?.text ?? null

describe('document loading and errors', () => {
  it('is loading until the viewer answers, then opened with its layouts', () => {
    const h = createHarness()
    h.boot()
    h.client.open({
      name: 'synthetic-layouts.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://127.0.0.1/x' }
    })
    assert.equal(
      describeDocument(h.state.document),
      'A abrir synthetic-layouts.dxf…'
    )
    h.flush()
    assert.equal(
      describeDocument(h.state.document),
      'synthetic-layouts.dxf (DXF, 3 layouts)'
    )
  })

  it('a failed open reports the viewer code and keeps document, find and selection', () => {
    const h = opened({ dwg: 'unavailable' })
    search(h)
    const before = { find: h.state.find, sel: h.state.selection }
    const r = h.client.open({
      name: 'outro.dwg',
      size: 1,
      source: { kind: 'url', url: 'http://127.0.0.1/o' }
    })
    assert.ok(r.ok)
    assert.equal(describeDocument(h.state.document), 'A abrir outro.dwg…')
    h.flush()
    assert.equal(h.state.document.error?.code, 'dwg-unavailable')
    assert.match(describeDocument(h.state.document) ?? '', /DWG indisponível/)
    assert.equal(h.state.document.current?.name, 'synthetic-layouts.dxf')
    assert.equal(h.viewer.doc?.name, 'synthetic-layouts.dxf')
    assert.deepEqual(h.state.find, before.find)
    assert.deepEqual(h.state.selection, before.sel)
  })

  it('an open before ready is queued and delivered on ready; a never-ready viewer ends the loading', () => {
    const queued = createHarness()
    queued.client.open({
      name: 'synthetic-layouts.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://127.0.0.1/x' }
    })
    assert.ok(queued.state.document.opening)
    queued.boot()
    assert.equal(queued.state.document.current?.name, 'synthetic-layouts.dxf')

    const dead = createHarness()
    dead.client.open({
      name: 'synthetic-layouts.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://127.0.0.1/x' }
    })
    dead.timers.advance(15_000)
    assert.equal(dead.state.document.opening, null)
    assert.equal(dead.state.document.error?.code, 'viewer-unavailable')
  })

  it('open timeout ends the loading with an explicit timeout error', () => {
    const h = createHarness()
    h.boot()
    h.client.open({
      name: 'synthetic-layouts.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://127.0.0.1/x' }
    })
    h.timers.advance(120_000)
    assert.equal(h.state.document.opening, null)
    assert.equal(h.state.document.error?.code, 'timeout')
  })
})

describe('FIND results and loading', () => {
  it('searching → results; the first hit is selected automatically (§5.4)', () => {
    const h = opened()
    h.client.find(PAREDE)
    assert.equal(h.state.find.status, 'searching')
    assert.equal(describeFind(h.state.find), 'A pesquisar “parede”…')
    assert.equal(h.state.selection.status, 'none')
    h.flush()
    assert.equal(h.state.find.status, 'results')
    assert.equal(h.state.find.total, 4)
    assert.equal(h.state.find.layoutCount, 3)
    assert.equal(h.state.find.activeIndex, 0)
    assert.equal(h.state.selection.status, 'selected')
    assert.equal(selected(h), 'Parede exterior')
    assert.equal(h.viewer.highlighted, true)
    assert.equal(describeFind(h.state.find), '1 / 4 resultados')
    assert.equal(
      describeSelection(h.state.selection),
      'Selecionado: “Parede exterior” (Model)'
    )
  })

  it('no hits: empty, no goto sent, nothing selected', () => {
    const h = opened()
    search(h, 'inexistente')
    assert.equal(h.state.find.status, 'empty')
    assert.equal(
      describeFind(h.state.find),
      'Sem resultados para “inexistente”.'
    )
    assert.equal(h.state.selection.status, 'none')
    assert.equal(h.viewer.received.filter(m => m.type === 'goto').length, 0)
  })

  it('truncated results say so', () => {
    const h = opened()
    const r = h.client.find({ ...PAREDE, maxResults: 2 })
    assert.ok(r.ok)
    h.flush()
    assert.equal(h.state.find.truncated, true)
    assert.equal(h.state.find.hits.length, 2)
    assert.match(describeFind(h.state.find) ?? '', /resultados limitados a 2/)
  })

  it('an invalid query is rejected locally: nothing reaches the viewer', () => {
    const h = opened()
    const before = h.viewer.received.length
    const r = h.client.find({ ...PAREDE, query: '' })
    assert.equal(r.ok, false)
    assert.equal(h.state.find.status, 'error')
    assert.equal(h.state.find.error?.code, 'invalid-payload')
    assert.equal(h.viewer.received.length, before)
  })

  it('a viewer error is a FIND error, not an empty result', () => {
    const h = opened()
    h.viewer.failNext('find', { code: 'boom', message: 'falha injectada' })
    h.client.find(PAREDE)
    h.flush()
    assert.equal(h.state.find.status, 'error')
    assert.equal(
      describeFind(h.state.find),
      'Erro na pesquisa: falha injectada'
    )
    assert.notEqual(h.state.find.status, 'empty')
  })
})

describe('selection', () => {
  it('next/prev move the selection and wrap in both directions', () => {
    const h = opened()
    search(h)
    const findId = h.state.find.findId as number
    const seen: (string | null)[] = []
    for (let i = 0; i < 4; i++) {
      h.client.findNext({ findId })
      h.flush()
      seen.push(selected(h))
    }
    assert.deepEqual(seen, [
      'Parede divisória',
      'PAREDE (caixa alta)',
      'Parede norte',
      'Parede exterior'
    ])
    h.client.findPrev({ findId })
    h.flush()
    assert.equal(selected(h), 'Parede norte')
    assert.equal(h.state.find.activeIndex, 3)
  })

  it('a navigation in flight is pending and keeps the previous selection visible', () => {
    const h = opened()
    search(h)
    h.client.goto({ findId: h.state.find.findId as number, index: 2 })
    assert.equal(h.state.selection.status, 'pending')
    assert.equal(h.state.find.navigation, 'navigating')
    assert.equal(selected(h), 'Parede exterior')
    assert.equal(describeSelection(h.state.selection), 'A ir para o resultado…')
    h.flush()
    assert.equal(h.state.selection.status, 'selected')
    assert.equal(selected(h), 'PAREDE (caixa alta)')
  })

  it('layout-missing is unavailable, with its cause, and the highlight is unchanged', () => {
    const h = opened({ missingLayouts: ['B3'] })
    search(h)
    h.client.goto({ findId: h.state.find.findId as number, index: 3 })
    h.flush()
    assert.equal(h.state.selection.status, 'unavailable')
    assert.equal(h.state.selection.error?.code, 'layout-missing')
    assert.equal(selected(h), 'Parede exterior')
    assert.equal(h.viewer.activeIndex, 0)
    assert.match(
      describeSelection(h.state.selection) ?? '',
      /^Seleção indisponível: layout indisponível/
    )
    // recupera numa navegação válida seguinte
    h.client.goto({ findId: h.state.find.findId as number, index: 1 })
    h.flush()
    assert.equal(h.state.selection.status, 'selected')
    assert.equal(selected(h), 'Parede divisória')
  })

  it('stale-find from the viewer is an explicit navigation error, not a silent success', () => {
    const h = opened()
    search(h)
    h.client.goto({ findId: 999, index: 0 })
    h.flush()
    assert.equal(h.state.selection.status, 'unavailable')
    assert.equal(h.state.selection.error?.code, 'stale-find')
    assert.equal(h.state.find.navigation, 'unavailable')
  })

  it('clearHighlight sent: selection none, list position kept, next continues from it', () => {
    const h = opened()
    search(h)
    const findId = h.state.find.findId as number
    h.client.goto({ findId, index: 2 })
    h.flush()
    h.client.clearHighlight()
    h.flush()
    assert.equal(h.state.selection.status, 'none')
    assert.equal(h.viewer.highlighted, false)
    assert.equal(h.state.find.activeIndex, 2)
    h.client.findNext({ findId })
    h.flush()
    assert.equal(selected(h), 'Parede norte')
  })

  it('clearHighlight that could not be sent does NOT clear the selection and is reported', () => {
    const h = opened({ failInject: t => t === 'clearHighlight' })
    search(h)
    const r = h.client.clearHighlight()
    assert.equal(r.ok, false)
    assert.equal(h.state.selection.status, 'selected')
    assert.equal(h.viewer.highlighted, true)
    assert.equal(h.state.issue?.source, 'command')
    assert.equal(h.state.issue?.code, 'send-failed')
  })

  it('a new find drops the old selection; a new document and a lost viewer reset everything', () => {
    const h = opened()
    search(h)
    h.client.find({ ...PAREDE, query: 'cobertura' })
    assert.equal(h.state.selection.status, 'none')
    h.flush()
    assert.equal(selected(h), 'Cobertura')

    h.open('synthetic-blocks.dxf')
    assert.deepEqual(h.state.selection, {
      status: 'none',
      hit: null,
      findId: null,
      error: null
    })
    assert.equal(h.state.find.status, 'idle')

    search(h, 'obra')
    assert.equal(selected(h), 'Obra 42')
    h.client.processGone()
    assert.equal(h.state.selection.status, 'none')
    assert.equal(h.state.find.status, 'idle')
    assert.equal(h.state.document.current, null)
  })

  it('a no-document error on navigation is unavailable, never a valid selection', () => {
    const h = opened()
    search(h)
    const findId = h.state.find.findId as number
    h.viewer.doc = null
    h.client.findNext({ findId })
    h.flush()
    // O viewer sintético responde `error no-document` (não `findActive`): a
    // navegação fica indisponível com a causa. O caminho `findActive{no-document}`
    // (volta ao ecrã Abrir) está coberto em selection.node-test.ts.
    assert.equal(h.state.selection.status, 'unavailable')
    assert.equal(h.state.selection.error?.code, 'no-document')
  })
})

describe('zoom', () => {
  it('sends the op, applies §5.5 in the viewer and records lastOp', () => {
    const h = opened()
    h.client.zoom({ op: 'in' })
    h.flush()
    assert.equal(h.state.zoom.lastOp, 'in')
    assert.deepEqual(h.viewer.camera, {
      minX: 100,
      minY: 50,
      maxX: 300,
      maxY: 150
    })
    h.client.zoom({ op: 'extents' })
    h.flush()
    assert.equal(h.state.zoom.lastOp, 'extents')
    assert.deepEqual(h.viewer.camera, h.viewer.doc?.extents)
  })

  it('a zoom error is visible in zoom state and cleared by the next zoom', () => {
    const h = opened()
    h.viewer.failNext('zoom', { code: 'zoom-failed', message: 'sem vista' })
    h.client.zoom({ op: 'in' })
    h.flush()
    assert.equal(h.state.zoom.error?.code, 'zoom-failed')
    assert.equal(describeZoom(h.state.zoom), 'Erro no zoom: sem vista')
    h.client.zoom({ op: 'out' })
    assert.equal(h.state.zoom.error, null)
  })

  it('zoom with an invalid factor is rejected locally, nothing is sent', () => {
    const h = opened()
    const before = h.viewer.received.length
    const r = h.client.zoom({ op: 'in', factor: 99 })
    assert.equal(r.ok, false)
    assert.equal(h.state.zoom.error?.code, 'invalid-payload')
    assert.equal(h.viewer.received.length, before)
  })

  it('opening a new document resets the zoom state (and the viewer view)', () => {
    const h = opened()
    h.client.zoom({ op: 'in' })
    h.viewer.failNext('zoom', { code: 'zoom-failed', message: 'x' })
    h.client.zoom({ op: 'in' })
    h.flush()
    assert.ok(h.state.zoom.error)
    h.open('synthetic-blocks.dxf')
    assert.deepEqual(h.state.zoom, { lastOp: null, error: null })
    assert.deepEqual(h.viewer.camera, h.viewer.doc?.extents)
  })
})
