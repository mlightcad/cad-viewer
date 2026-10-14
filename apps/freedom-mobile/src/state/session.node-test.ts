// SPDX-License-Identifier: GPL-3.0-or-later
//
// Integração ponta-a-ponta (sem RN): um viewer simulado responde ao
// `BridgeClient`, e o `sessionReducer` reflecte loading/erro/resultados/zoom/FIND.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  BridgeClient,
  type BridgeEvent,
  type Timers
} from '../bridge/BridgeClient.ts'
import { type AppMessage } from '../contracts/protocol.ts'
import { READY_TIMEOUT_MS } from '../shell/shellState.ts'
import { describeDocument } from './describe.ts'
import {
  initialSessionState,
  type SessionAction,
  sessionReducer,
  type SessionState
} from './session.ts'

function harness(timers?: Timers) {
  let state: SessionState = initialSessionState
  const sent: AppMessage[] = []
  const dispatch = (a: SessionAction) => {
    state = sessionReducer(state, a)
  }
  const client = new BridgeClient({
    onEvent: (e: BridgeEvent) => dispatch(e),
    inject: script => {
      const literal = script.slice(
        'window.__cadBridge.receive('.length,
        -');true;'.length
      )
      sent.push(JSON.parse(new Function(`return ${literal}`)() as string))
    },
    // Timers inertes: os timeouts têm testes próprios em BridgeClient.node-test.ts
    // e timers reais manteriam o processo de teste vivo.
    timers: timers ?? { set: () => 0, clear: () => {} }
  })
  const viewer = (type: string, payload: unknown, replyTo?: string) =>
    client.receive(
      JSON.stringify({
        v: 1,
        id: 'w-1',
        type,
        payload,
        ...(replyTo ? { replyTo } : {})
      })
    )
  return {
    client,
    sent,
    viewer,
    dispatch,
    get state() {
      return state
    }
  }
}

const READY = {
  viewerVersion: '1.0.0',
  protocol: 1,
  caps: ['find', 'dwg', 'dxf'],
  dwg: 'ok'
}
const hit = (i: number) => ({
  index: i,
  text: `t${i}`,
  excerpt: `…t${i}…`,
  layoutName: i === 0 ? 'Model' : 'Planta',
  layoutId: `B${i}`,
  layer: '0',
  kind: 'text'
})

function openedHarness() {
  const h = harness()
  h.viewer('ready', READY)
  const r = h.client.open({
    name: 'find-layouts.dxf',
    size: 100,
    source: { kind: 'url', url: 'http://127.0.0.1:1/f' }
  })
  assert.ok(r.ok)
  h.viewer(
    'opened',
    {
      name: 'find-layouts.dxf',
      format: 'dxf',
      layouts: [
        { name: 'Model', btrId: 'B0', tabOrder: 0 },
        { name: 'Planta', btrId: 'B1', tabOrder: 1 }
      ],
      activeLayoutId: 'B0'
    },
    r.ok ? r.id : ''
  )
  return h
}

describe('session — open lifecycle', () => {
  it('ready → loading → opened', () => {
    const h = harness()
    assert.equal(h.state.shell.viewer, 'booting')
    h.viewer('ready', READY)
    assert.equal(h.state.shell.viewer, 'ready')
    assert.equal(h.state.shell.viewerVersion, '1.0.0')
    const r = h.client.open({
      name: 'a.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://x' }
    })
    assert.equal(h.state.document.opening?.name, 'a.dxf')
    h.viewer(
      'opened',
      { name: 'a.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
      r.ok ? r.id : ''
    )
    assert.equal(h.state.document.current?.name, 'a.dxf')
    assert.equal(h.state.document.opening, null)
  })

  it('an open requested before ready shows loading and resolves after ready', () => {
    const h = harness()
    const r = h.client.open({
      name: 'a.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://x' }
    })
    assert.equal(h.state.document.opening?.name, 'a.dxf')
    assert.equal(h.sent.length, 0)
    h.viewer('ready', READY)
    assert.equal(h.sent[0].id, r.ok ? r.id : '')
    h.viewer(
      'opened',
      { name: 'a.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
      r.ok ? r.id : ''
    )
    assert.equal(h.state.document.current?.name, 'a.dxf')
  })

  it('openFailed and local rejection surface an explicit error', () => {
    const h = harness()
    h.viewer('ready', { ...READY, dwg: 'unavailable' })
    h.client.open({
      name: 'a.pdf',
      size: 1,
      source: { kind: 'url', url: 'http://x' }
    })
    assert.equal(h.state.document.error?.code, 'unsupported-ext')
    const r = h.client.open({
      name: 'a.dwg',
      size: 1,
      source: { kind: 'url', url: 'http://x' }
    })
    h.viewer(
      'openFailed',
      { code: 'dwg-unavailable', message: 'DWG indisponível' },
      r.ok ? r.id : ''
    )
    assert.equal(h.state.document.error?.code, 'dwg-unavailable')
    assert.equal(h.state.document.error?.origin, 'viewer')
    assert.equal(h.state.shell.dwg, 'unavailable')
  })
})

describe('session — FIND end to end', () => {
  it('find → results → automatic goto(0) → findNext/findPrev wrap', () => {
    const h = openedHarness()
    const f = h.client.find({
      query: 'CARIMBO',
      matchCase: false,
      scope: 'drawing'
    })
    assert.equal(h.state.find.status, 'searching')
    h.viewer(
      'findResult',
      {
        findId: 1,
        total: 3,
        truncated: false,
        layoutCount: 2,
        hits: [hit(0), hit(1), hit(2)]
      },
      f.ok ? f.id : ''
    )
    assert.equal(h.state.find.status, 'results')
    assert.equal(h.state.find.navigation, 'navigating')
    const goto = h.sent[h.sent.length - 1]
    assert.equal(goto.type, 'goto')
    h.viewer(
      'findActive',
      { findId: 1, index: 0, outcome: 'navigated' },
      goto.id
    )
    assert.equal(h.state.find.activeIndex, 0)
    assert.equal(h.state.find.navigation, 'ok')

    // O wrap é decidido no viewer (§5.2); a app só reflecte o índice devolvido.
    const prev = h.client.findPrev({ findId: 1 })
    h.viewer(
      'findActive',
      { findId: 1, index: 2, outcome: 'navigated' },
      prev.ok ? prev.id : ''
    )
    assert.equal(h.state.find.activeIndex, 2)
    const next = h.client.findNext({ findId: 1 })
    h.viewer(
      'findActive',
      { findId: 1, index: 0, outcome: 'navigated' },
      next.ok ? next.id : ''
    )
    assert.equal(h.state.find.activeIndex, 0)
  })

  it('no match → explicit empty state, no goto', () => {
    const h = openedHarness()
    const before = h.sent.length
    const f = h.client.find({ query: 'zzz', matchCase: true, scope: 'layout' })
    h.viewer(
      'findResult',
      { findId: 1, total: 0, truncated: false, layoutCount: 2, hits: [] },
      f.ok ? f.id : ''
    )
    assert.equal(h.state.find.status, 'empty')
    assert.equal(h.sent.length, before + 1)
  })

  it('truncated result stays flagged', () => {
    const h = openedHarness()
    const f = h.client.find({
      query: 'a',
      matchCase: false,
      scope: 'drawing',
      maxResults: 1
    })
    h.viewer(
      'findResult',
      {
        findId: 1,
        total: 1,
        truncated: true,
        layoutCount: 2,
        hits: [hit(0)]
      },
      f.ok ? f.id : ''
    )
    assert.equal(h.state.find.truncated, true)
  })

  it('a new search supersedes the older one; its late result never lands', () => {
    const h = openedHarness()
    const a = h.client.find({ query: 'a', matchCase: false, scope: 'drawing' })
    const b = h.client.find({ query: 'b', matchCase: false, scope: 'drawing' })
    h.viewer(
      'findResult',
      { findId: 1, total: 1, truncated: false, layoutCount: 1, hits: [hit(0)] },
      a.ok ? a.id : ''
    )
    assert.equal(h.state.find.status, 'searching')
    assert.equal(h.state.find.query, 'b')
    h.viewer(
      'findResult',
      { findId: 2, total: 0, truncated: false, layoutCount: 1, hits: [] },
      b.ok ? b.id : ''
    )
    assert.equal(h.state.find.status, 'empty')
    assert.equal(h.state.find.findId, 2)
  })

  it('a find before ready is an explicit error, not a silent placeholder', () => {
    const h = harness()
    const r = h.client.find({ query: 'x', matchCase: false, scope: 'drawing' })
    assert.equal(r.ok, false)
    assert.equal(h.state.find.status, 'error')
    assert.equal(h.state.find.error?.code, 'not-ready')
    assert.deepEqual(h.state.find.hits, [])
  })

  it('a viewer error on goto (stale-find) is visible and keeps the list', () => {
    const h = openedHarness()
    const f = h.client.find({ query: 'a', matchCase: false, scope: 'drawing' })
    h.viewer(
      'findResult',
      {
        findId: 1,
        total: 2,
        truncated: false,
        layoutCount: 1,
        hits: [hit(0), hit(1)]
      },
      f.ok ? f.id : ''
    )
    const g = h.client.goto({ findId: 0, index: 1 })
    h.viewer('error', {
      code: 'stale-find',
      message: 'findId obsoleto',
      replyTo: g.ok ? g.id : ''
    })
    assert.equal(h.state.find.status, 'results')
    assert.equal(h.state.find.navigation, 'unavailable')
    assert.equal(h.state.find.error?.code, 'stale-find')
  })

  it('opening another document resets FIND', () => {
    const h = openedHarness()
    const f = h.client.find({ query: 'a', matchCase: false, scope: 'drawing' })
    h.viewer(
      'findResult',
      { findId: 1, total: 1, truncated: false, layoutCount: 1, hits: [hit(0)] },
      f.ok ? f.id : ''
    )
    const r = h.client.open({
      name: 'b.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://x' }
    })
    h.viewer(
      'opened',
      { name: 'b.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
      r.ok ? r.id : ''
    )
    assert.equal(h.state.find.status, 'idle')
    assert.equal(h.state.find.total, 0)
  })

  it('find-cleared (closing the panel) returns to idle', () => {
    const h = openedHarness()
    const f = h.client.find({ query: 'a', matchCase: false, scope: 'drawing' })
    h.viewer(
      'findResult',
      { findId: 1, total: 0, truncated: false, layoutCount: 1, hits: [] },
      f.ok ? f.id : ''
    )
    h.dispatch({ kind: 'find-cleared' })
    assert.equal(h.state.find.status, 'idle')
  })
})

describe('session — zoom', () => {
  it('records the last zoom op and clears the previous error', () => {
    const h = openedHarness()
    h.client.zoom({ op: 'in' })
    assert.equal(h.state.zoom.lastOp, 'in')
    h.client.zoom({ op: 'extents' })
    assert.equal(h.state.zoom.lastOp, 'extents')
    assert.equal(h.state.zoom.error, null)
  })

  it('an invalid zoom factor is an explicit zoom error', () => {
    const h = openedHarness()
    h.client.zoom({ op: 'in', factor: 99 })
    assert.equal(h.state.zoom.error?.code, 'invalid-payload')
    assert.equal(h.state.zoom.lastOp, null)
  })

  it('a viewer error answering a zoom is attributed to zoom', () => {
    const h = openedHarness()
    const z = h.client.zoom({ op: 'out' })
    h.viewer('error', { code: 'no-document', message: 'x' }, z.ok ? z.id : '')
    assert.equal(h.state.zoom.error?.code, 'no-document')
    assert.equal(h.state.issue, null)
  })
})

describe('session — failures are never silent', () => {
  it('protocol errors land in `issue`', () => {
    const h = openedHarness()
    h.client.receive('{nope')
    assert.equal(h.state.issue?.source, 'protocol')
    assert.equal(h.state.issue?.code, 'invalid-json')
    h.dispatch({ kind: 'issue-dismissed' })
    assert.equal(h.state.issue, null)
  })

  it('an unattributed viewer error lands in `issue`', () => {
    const h = openedHarness()
    h.viewer('error', { code: 'boom', message: 'inesperado' })
    assert.equal(h.state.issue?.source, 'viewer')
    assert.equal(h.state.issue?.code, 'boom')
  })

  it('a failing clearHighlight (no dedicated state) lands in `issue`', () => {
    const h = harness()
    h.client.clearHighlight() // antes de ready → rejeitado
    assert.equal(h.state.issue?.source, 'command')
    assert.equal(h.state.issue?.code, 'not-ready')
  })

  it('process-gone fails the shell and wipes document, FIND and zoom', () => {
    const h = openedHarness()
    h.client.zoom({ op: 'in' })
    h.client.processGone()
    assert.equal(h.state.shell.viewer, 'failed')
    assert.equal(h.state.shell.error, 'process-gone')
    assert.equal(h.state.document.current, null)
    assert.equal(h.state.find.status, 'idle')
    assert.equal(h.state.zoom.lastOp, null)
  })

  it('ready-timeout fails the shell', () => {
    let state = initialSessionState
    state = sessionReducer(state, { kind: 'ready-timeout' })
    assert.equal(state.shell.viewer, 'failed')
    assert.equal(state.shell.error, 'ready-timeout')
  })

  it('late ready after ready-timeout: dropped queued open is not left loading, nothing is resent', () => {
    let fire: (() => void) | null = null
    const h = harness({
      set: (fn, ms) => {
        if (ms === READY_TIMEOUT_MS) fire = fn
        return 0
      },
      clear: () => {}
    })
    const r = h.client.open({
      name: 'a.dxf',
      size: 1,
      source: { kind: 'url', url: 'http://x' }
    })
    assert.ok(r.ok && r.queued)
    assert.equal(h.state.document.opening?.id, r.ok ? r.id : '')
    ;(fire as unknown as () => void)()
    assert.equal(h.state.shell.viewer, 'failed')
    assert.equal(h.state.shell.error, 'ready-timeout')
    assert.equal(h.state.document.opening, null)
    assert.equal(h.state.document.error?.code, 'viewer-unavailable')

    h.viewer('ready', READY)
    assert.equal(h.state.shell.viewer, 'ready')
    assert.equal(h.state.shell.error, null)
    assert.equal(h.state.shell.generation, 0)
    assert.equal(h.sent.length, 0)
    assert.equal(h.state.document.opening, null)
    assert.equal(h.state.document.current, null)

    // Resposta ao `open` descartado é stale e não ressuscita o carregamento.
    h.viewer(
      'opened',
      { name: 'a.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
      r.ok ? r.id : ''
    )
    assert.equal(h.state.document.current, null)
    assert.equal(h.state.document.opening, null)
  })

  it('late ready after process-gone restores the shell but not document, FIND or zoom', () => {
    const h = openedHarness()
    h.client.zoom({ op: 'in' })
    h.client.processGone()
    h.viewer('ready', READY)
    assert.equal(h.state.shell.viewer, 'ready')
    assert.equal(h.state.shell.error, null)
    assert.equal(h.state.document.current, null)
    assert.equal(h.state.document.opening, null)
    assert.equal(h.state.find.status, 'idle')
    assert.equal(h.state.zoom.lastOp, null)
    // O cliente aceita comandos de novo.
    assert.equal(h.client.zoom({ op: 'out' }).ok, true)
  })

  it('late ready after process-gone with an open in progress: explicit error, not silently discarded', () => {
    for (const booted of [true, false]) {
      const h = harness()
      if (booted) h.viewer('ready', READY)
      const r = h.client.open({
        name: 'b.dxf',
        size: 1,
        source: { kind: 'url', url: 'http://x' }
      })
      assert.ok(r.ok && r.queued === !booted)
      assert.equal(h.state.document.opening?.id, r.id)

      h.client.processGone()
      assert.equal(h.state.shell.error, 'process-gone')
      assert.equal(h.state.document.opening, null)
      assert.equal(h.state.document.error?.code, 'viewer-unavailable')
      assert.equal(h.state.document.error?.origin, 'local')

      h.viewer('ready', READY)
      assert.equal(h.state.shell.viewer, 'ready')
      assert.equal(h.state.shell.error, null)
      // O erro sobrevive à recuperação: o utilizador sabe que tem de reabrir.
      assert.equal(h.state.document.opening, null)
      assert.equal(h.state.document.current, null)
      assert.equal(h.state.document.error?.code, 'viewer-unavailable')
      assert.equal(
        describeDocument(h.state.document),
        'O viewer não está disponível; recarregue.'
      )
      assert.equal(h.sent.length, booted ? 1 : 0)

      // A resposta tardia ao `open` descartado é stale e não o ressuscita.
      h.viewer(
        'opened',
        { name: 'b.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
        r.id
      )
      assert.equal(h.state.document.current, null)
      assert.equal(h.state.document.error?.code, 'viewer-unavailable')
    }
  })

  it('reload resets everything and bumps the surface generation', () => {
    const h = openedHarness()
    h.client.processGone()
    h.dispatch({ kind: 'reload' })
    assert.equal(h.state.shell.viewer, 'booting')
    assert.equal(h.state.shell.generation, 1)
    assert.equal(h.state.document.current, null)
    assert.equal(h.state.issue, null)
  })
})
