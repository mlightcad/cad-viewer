// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  type AppMessage,
  type AppPayloads,
  MAX_DOCUMENT_BYTES
} from '../contracts/protocol.ts'
import {
  initialShellState,
  READY_TIMEOUT_MS,
  shellReducer
} from '../shell/shellState.ts'
import {
  BridgeClient,
  type BridgeEvent,
  MAX_TRACKED,
  OPEN_TIMEOUT_MS,
  type Timers
} from './BridgeClient.ts'

/** Relógio falso: `advance(ms)` dispara os timers vencidos. */
function fakeTimers(): Timers & {
  advance(ms: number): void
  active(): number
} {
  let now = 0
  let seq = 0
  const items = new Map<number, { at: number; fn: () => void }>()
  return {
    set(fn, ms) {
      const h = ++seq
      items.set(h, { at: now + ms, fn })
      return h
    },
    clear(h) {
      items.delete(h as number)
    },
    advance(ms) {
      now += ms
      for (const [h, t] of [...items]) {
        if (t.at <= now) {
          items.delete(h)
          t.fn()
        }
      }
    },
    active: () => items.size
  }
}

function setup(over: { inject?: (s: string) => void } = {}) {
  const events: BridgeEvent[] = []
  const injected: AppMessage[] = []
  const timers = fakeTimers()
  const client = new BridgeClient({
    timers,
    onEvent: e => events.push(e),
    inject: over.inject ?? (s => injected.push(decode(s)))
  })
  return { client, events, injected, timers }
}

/** Inverte `encodeInjection` como o WebView faria. */
function decode(script: string): AppMessage {
  const literal = script.slice(
    'window.__cadBridge.receive('.length,
    -');true;'.length
  )
  return JSON.parse(new Function(`return ${literal}`)() as string)
}

const wire = (type: string, payload: unknown, replyTo?: string) =>
  JSON.stringify({
    v: 1,
    id: 'w-1',
    type,
    payload,
    ...(replyTo !== undefined ? { replyTo } : {})
  })

const READY = {
  viewerVersion: '0.0.1',
  protocol: 1,
  caps: ['find', 'dwg', 'dxf'],
  dwg: 'ok'
}
const OPEN: AppPayloads['open'] = {
  name: 'Planta.dxf',
  size: 1234,
  source: { kind: 'url', url: 'http://127.0.0.1:9/f' }
}
const hit = (i: number) => ({
  index: i,
  text: `t${i}`,
  excerpt: `…t${i}…`,
  layoutName: 'Model',
  layoutId: 'B1',
  layer: '0',
  kind: 'text'
})
const findResult = (findId: number, total: number, over = {}) => ({
  findId,
  total,
  truncated: false,
  layoutCount: 1,
  hits: Array.from({ length: total }, (_, i) => hit(i)),
  ...over
})

const kinds = (events: BridgeEvent[]) => events.map(e => e.kind)
const last = <T extends BridgeEvent['kind']>(
  events: BridgeEvent[],
  kind: T
): Extract<BridgeEvent, { kind: T }> => {
  const e = [...events].reverse().find(x => x.kind === kind)
  assert.ok(e, `no ${kind} event in ${kinds(events).join(',')}`)
  return e as Extract<BridgeEvent, { kind: T }>
}

describe('BridgeClient — ready handshake', () => {
  it('becomes ready, emits ready and clears the ready timer', () => {
    const { client, events, timers } = setup()
    assert.equal(client.phase, 'booting')
    client.receive(wire('ready', READY))
    assert.equal(client.phase, 'ready')
    assert.equal(last(events, 'ready').payload.dwg, 'ok')
    assert.equal(timers.active(), 0)
  })

  it('times out waiting for ready and then rejects every command', () => {
    const { client, events, timers, injected } = setup()
    timers.advance(READY_TIMEOUT_MS)
    assert.equal(client.phase, 'failed')
    assert.deepEqual(kinds(events), ['ready-timeout'])
    const r = client.find({ query: 'a', matchCase: false, scope: 'drawing' })
    assert.equal(r.ok, false)
    assert.equal(
      last(events, 'command-rejected').error.code,
      'viewer-unavailable'
    )
    assert.equal(injected.length, 0)
    // `ready` válido tardio recupera (decisão de shellState.ts, 531f82ef)…
    client.receive(wire('ready', READY))
    assert.equal(client.phase, 'ready')
    assert.equal(last(events, 'ready').payload.viewerVersion, '0.0.1')
    // …e volta a aceitar comandos; o que estava pendente não regressou.
    assert.equal(client.zoom({ op: 'extents' }).ok, true)
    assert.equal(injected.length, 1)
  })

  it('does not resend an open queued before a failure when a late ready recovers', () => {
    const { client, injected, timers } = setup()
    client.open(OPEN)
    timers.advance(READY_TIMEOUT_MS)
    client.receive(wire('ready', READY))
    assert.equal(client.phase, 'ready')
    assert.equal(injected.length, 0)
  })

  it('keeps failed on an invalid late ready', () => {
    const { client, events, timers } = setup()
    timers.advance(READY_TIMEOUT_MS)
    client.receive(wire('ready', { ...READY, dwg: 'maybe' }))
    assert.equal(client.phase, 'failed')
    assert.equal(last(events, 'protocol-error').code, 'invalid-payload')
  })

  it('reports a duplicate ready instead of ignoring it', () => {
    const { client, events } = setup()
    client.receive(wire('ready', READY))
    client.receive(wire('ready', READY))
    assert.equal(last(events, 'protocol-error').code, 'duplicate-ready')
  })

  it('surfaces an invalid ready as a protocol error and stays booting', () => {
    const { client, events } = setup()
    client.receive(wire('ready', { ...READY, protocol: 2 }))
    assert.equal(client.phase, 'booting')
    assert.equal(last(events, 'protocol-error').code, 'invalid-payload')
  })
})

describe('BridgeClient — pre-ready queue (§5.1)', () => {
  it('queues one open and sends it on ready; the newest open wins', () => {
    const { client, events, injected } = setup()
    const a = client.open(OPEN)
    const b = client.open({ ...OPEN, name: 'B.dxf' })
    assert.ok(a.ok && b.ok && a.queued && b.queued)
    assert.equal(last(events, 'open-superseded').id, a.ok ? a.id : '')
    assert.equal(injected.length, 0)
    client.receive(wire('ready', READY))
    assert.equal(injected.length, 1)
    assert.equal(injected[0].type, 'open')
    assert.equal((injected[0].payload as AppPayloads['open']).name, 'B.dxf')
    assert.equal(kinds(events).filter(k => k === 'command-sent').length, 1)
  })

  it('rejects every other command before ready (no silent drop)', () => {
    const { client, events, injected } = setup()
    client.find({ query: 'a', matchCase: false, scope: 'drawing' })
    client.zoom({ op: 'extents' })
    client.clearHighlight()
    const rejected = events.filter(e => e.kind === 'command-rejected')
    assert.equal(rejected.length, 3)
    for (const e of rejected) {
      assert.equal(e.kind === 'command-rejected' && e.error.code, 'not-ready')
    }
    assert.equal(injected.length, 0)
  })
})

describe('BridgeClient — open', () => {
  const ready = () => {
    const s = setup()
    s.client.receive(wire('ready', READY))
    return s
  }

  it('sends open after ready and resolves with opened (correlated by replyTo)', () => {
    const { client, events, injected } = ready()
    const r = client.open(OPEN)
    assert.ok(r.ok && !r.queued)
    assert.equal(injected[0].id, r.ok ? r.id : '')
    client.receive(
      wire(
        'opened',
        {
          name: 'Planta.dxf',
          format: 'dxf',
          layouts: [{ name: 'Model', btrId: 'B1', tabOrder: 0 }],
          activeLayoutId: 'B1'
        },
        r.ok ? r.id : ''
      )
    )
    assert.equal(last(events, 'opened').payload.name, 'Planta.dxf')
  })

  it('maps openFailed from the viewer with its code', () => {
    const { client, events } = ready()
    const r = client.open({ ...OPEN, name: 'a.dwg' })
    client.receive(
      wire(
        'openFailed',
        { code: 'dwg-unavailable', message: 'DWG indisponível' },
        r.ok ? r.id : ''
      )
    )
    const e = last(events, 'open-failed')
    assert.equal(e.code, 'dwg-unavailable')
    assert.equal(e.origin, 'viewer')
  })

  it('rejects bad extension / too-large locally and sends nothing', () => {
    const { client, events, injected } = ready()
    client.open({ ...OPEN, name: 'x.pdf' })
    assert.equal(last(events, 'command-rejected').error.code, 'unsupported-ext')
    client.open({ ...OPEN, name: 'x.dwg', size: MAX_DOCUMENT_BYTES.dwg + 1 })
    assert.equal(last(events, 'command-rejected').error.code, 'too-large')
    assert.equal(injected.length, 0)
  })

  it('times out an open that gets no answer, and a late reply is stale', () => {
    const { client, events, timers } = ready()
    const r = client.open(OPEN)
    timers.advance(OPEN_TIMEOUT_MS)
    const e = last(events, 'open-failed')
    assert.equal(e.code, 'timeout')
    assert.equal(e.origin, 'local')
    client.receive(
      wire('openFailed', { code: 'parse', message: 'x' }, r.ok ? r.id : '')
    )
    assert.equal(last(events, 'stale-reply').type, 'openFailed')
  })

  it('cancels the open timer when the reply arrives', () => {
    const { client, timers } = ready()
    const r = client.open(OPEN)
    client.receive(
      wire('openFailed', { code: 'parse', message: 'x' }, r.ok ? r.id : '')
    )
    assert.equal(timers.active(), 0)
  })

  it('a newer open supersedes the in-flight one: the old reply is stale', () => {
    const { client, events } = ready()
    const a = client.open(OPEN)
    const b = client.open({ ...OPEN, name: 'B.dxf' })
    client.receive(
      wire('openFailed', { code: 'parse', message: 'x' }, a.ok ? a.id : '')
    )
    assert.equal(last(events, 'stale-reply').replyTo, a.ok ? a.id : '')
    client.receive(
      wire(
        'opened',
        { name: 'B.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
        b.ok ? b.id : ''
      )
    )
    assert.equal(last(events, 'opened').payload.name, 'B.dxf')
  })

  it('resolves an open whose reply payload is invalid (no hanging until timeout)', () => {
    const { client, events, timers } = ready()
    const r = client.open(OPEN)
    client.receive(wire('opened', { name: '' }, r.ok ? r.id : ''))
    assert.equal(last(events, 'protocol-error').code, 'invalid-payload')
    const e = last(events, 'open-failed')
    assert.equal(e.origin, 'local')
    assert.equal(e.code, 'parse')
    assert.equal(timers.active(), 0)
  })

  it('reports a viewer error replying to an open and ends the open', () => {
    const { client, events, timers } = ready()
    const r = client.open(OPEN)
    client.receive(
      wire('error', { code: 'bad', message: 'm' }, r.ok ? r.id : '')
    )
    const e = last(events, 'viewer-error')
    assert.equal(e.command, 'open')
    assert.equal(timers.active(), 0)
  })

  it('reports a failing bridge (inject throws) as send-failed, not as sent', () => {
    const { client, events } = setup({
      inject: () => {
        throw new Error('webview ref em falta')
      }
    })
    client.receive(wire('ready', READY))
    const r = client.zoom({ op: 'extents' })
    assert.equal(r.ok, false)
    const e = last(events, 'command-rejected')
    assert.equal(e.error.code, 'send-failed')
    assert.match(e.error.message, /webview ref em falta/)
    assert.equal(kinds(events).includes('command-sent'), false)
  })
})

describe('BridgeClient — FIND (first-class)', () => {
  const ready = () => {
    const s = setup()
    s.client.receive(wire('ready', READY))
    return s
  }
  const doFind = (s: ReturnType<typeof ready>, query = 'CARIMBO') => {
    const r = s.client.find({ query, matchCase: false, scope: 'drawing' })
    assert.ok(r.ok)
    return r.ok ? r.id : ''
  }

  it('sends find and, with hits, automatically sends goto index 0 (§5.4)', () => {
    const s = ready()
    const id = doFind(s)
    s.client.receive(wire('findResult', findResult(7, 2), id))
    const res = last(s.events, 'find-result')
    assert.equal(res.payload.total, 2)
    assert.equal(s.injected.length, 2)
    assert.equal(s.injected[1].type, 'goto')
    assert.deepEqual(s.injected[1].payload, { findId: 7, index: 0 })
  })

  it('does not send goto for an empty result', () => {
    const s = ready()
    const id = doFind(s)
    s.client.receive(wire('findResult', findResult(1, 0), id))
    assert.equal(last(s.events, 'find-result').payload.total, 0)
    assert.equal(s.injected.length, 1)
  })

  it('keeps truncated visible in the result event', () => {
    const s = ready()
    const id = doFind(s)
    s.client.receive(
      wire('findResult', findResult(1, 1, { truncated: true }), id)
    )
    assert.equal(last(s.events, 'find-result').payload.truncated, true)
  })

  it('a newer find makes the older result stale (no event applied, no goto)', () => {
    const s = ready()
    const first = doFind(s, 'a')
    const second = doFind(s, 'b')
    s.client.receive(wire('findResult', findResult(1, 3), first))
    assert.equal(last(s.events, 'stale-reply').replyTo, first)
    assert.equal(
      s.events.some(e => e.kind === 'find-result'),
      false
    )
    assert.equal(s.injected.filter(m => m.type === 'goto').length, 0)
    s.client.receive(wire('findResult', findResult(2, 1), second))
    assert.equal(last(s.events, 'find-result').payload.findId, 2)
  })

  it('correlates findActive for goto, findNext and findPrev', () => {
    const s = ready()
    const g = s.client.goto({ findId: 1, index: 0 })
    const n = s.client.findNext({ findId: 1 })
    const p = s.client.findPrev({ findId: 1 })
    for (const [r, idx] of [
      [g, 0],
      [n, 1],
      [p, 0]
    ] as const) {
      s.client.receive(
        wire(
          'findActive',
          { findId: 1, index: idx, outcome: 'navigated' },
          r.ok ? r.id : ''
        )
      )
      assert.equal(last(s.events, 'find-active').payload.index, idx)
    }
  })

  it('rejects an empty query locally (no silent placeholder search)', () => {
    const s = ready()
    const r = s.client.find({ query: '  ', matchCase: false, scope: 'drawing' })
    assert.equal(r.ok, false)
    assert.equal(last(s.events, 'command-rejected').command, 'find')
    assert.equal(s.injected.length, 0)
  })

  it('attributes a viewer stale-find error to the goto it replies to', () => {
    const s = ready()
    const g = s.client.goto({ findId: 1, index: 3 })
    s.client.receive(
      wire('error', {
        code: 'stale-find',
        message: 'x',
        replyTo: g.ok ? g.id : ''
      })
    )
    const e = last(s.events, 'viewer-error')
    assert.equal(e.command, 'goto')
    assert.equal(e.payload.code, 'stale-find')
  })

  it('a findResult answering a non-find id is a protocol error', () => {
    const s = ready()
    const z = s.client.zoom({ op: 'in' })
    s.client.receive(wire('findResult', findResult(1, 0), z.ok ? z.id : ''))
    assert.equal(last(s.events, 'protocol-error').code, 'wrong-reply-type')
  })

  it('a reply without replyTo is stale, never applied', () => {
    const s = ready()
    doFind(s)
    s.client.receive(wire('findResult', findResult(1, 1)))
    assert.equal(last(s.events, 'stale-reply').replyTo, null)
    assert.equal(
      s.events.some(e => e.kind === 'find-result'),
      false
    )
  })
})

describe('BridgeClient — zoom, highlight and insets', () => {
  const ready = () => {
    const s = setup()
    s.client.receive(wire('ready', READY))
    return s
  }

  it('sends zoom in/out/extents with explicit payloads', () => {
    const s = ready()
    s.client.zoom({ op: 'in', factor: 2 })
    s.client.zoom({ op: 'out', factor: 0.5 })
    s.client.zoom({ op: 'extents' })
    assert.deepEqual(
      s.injected.map(m => m.payload),
      [{ op: 'in', factor: 2 }, { op: 'out', factor: 0.5 }, { op: 'extents' }]
    )
  })

  it('rejects an invalid zoom factor locally', () => {
    const s = ready()
    const r = s.client.zoom({ op: 'in', factor: 0 })
    assert.equal(r.ok, false)
    assert.equal(s.injected.length, 0)
    assert.equal(last(s.events, 'command-rejected').command, 'zoom')
  })

  it('attributes a viewer error to the zoom that caused it', () => {
    const s = ready()
    const z = s.client.zoom({ op: 'in' })
    s.client.receive(
      wire('error', { code: 'no-document', message: 'x' }, z.ok ? z.id : '')
    )
    assert.equal(last(s.events, 'viewer-error').command, 'zoom')
  })

  it('sends clearHighlight and setInsets', () => {
    const s = ready()
    s.client.clearHighlight()
    s.client.setInsets({ left: 0, right: 0, top: 0, bottom: 280 })
    assert.deepEqual(
      s.injected.map(m => m.type),
      ['clearHighlight', 'setInsets']
    )
  })
})

describe('BridgeClient — protocol failures are explicit', () => {
  const ready = () => {
    const s = setup()
    s.client.receive(wire('ready', READY))
    return s
  }

  it('turns invalid JSON, bad envelope, wrong version and unknown type into events', () => {
    const s = ready()
    s.client.receive('{nope')
    s.client.receive('{}')
    s.client.receive(
      JSON.stringify({ v: 2, id: 'w', type: 'ready', payload: {} })
    )
    s.client.receive(wire('saveToCloud', {}))
    s.client.receive(42)
    const codes = s.events
      .filter(e => e.kind === 'protocol-error')
      .map(e => (e.kind === 'protocol-error' ? e.code : ''))
    assert.deepEqual(codes, [
      'invalid-json',
      'invalid-envelope',
      'unsupported-version',
      'unknown-type',
      'invalid-json'
    ])
  })

  it('forwards viewer logs', () => {
    const s = ready()
    s.client.receive(wire('log', { level: 'warn', message: 'm' }))
    assert.equal(last(s.events, 'log').payload.level, 'warn')
  })

  it('process-gone fails the client, drops pending work and rejects new commands', () => {
    const s = ready()
    s.client.open(OPEN)
    s.client.processGone()
    assert.equal(s.client.phase, 'failed')
    assert.equal(last(s.events, 'process-gone').kind, 'process-gone')
    assert.equal(s.timers.active(), 0)
    s.client.zoom({ op: 'extents' })
    assert.equal(
      last(s.events, 'command-rejected').error.code,
      'viewer-unavailable'
    )
  })

  it('emits nothing after dispose', () => {
    const s = ready()
    s.client.dispose()
    const n = s.events.length
    s.client.receive(wire('log', { level: 'info', message: 'x' }))
    s.client.processGone()
    s.client.zoom({ op: 'in' })
    assert.equal(s.events.length, n)
  })
})

describe('BridgeClient — late ready recovery (decisão de shellState.ts)', () => {
  const OPENED = (name: string) => ({
    name,
    format: 'dxf',
    layouts: [],
    activeLayoutId: ''
  })
  const FIND = { query: 'a', matchCase: false, scope: 'drawing' } as const

  it('after ready-timeout: queued open is dropped, never resent, and the late ready re-arms nothing', () => {
    const { client, events, injected, timers } = setup()
    const queued = client.open(OPEN)
    assert.ok(queued.ok && queued.queued)
    timers.advance(READY_TIMEOUT_MS)
    assert.equal(client.phase, 'failed')
    assert.equal(timers.active(), 0)

    client.receive(wire('ready', READY))
    assert.equal(client.phase, 'ready')
    assert.equal(injected.length, 0)
    assert.equal(kinds(events).filter(k => k === 'command-sent').length, 0)
    assert.equal(timers.active(), 0)

    // O `open` descartado não deixou rasto: uma resposta com o seu id é stale.
    client.receive(
      wire('openFailed', { code: 'parse', message: 'x' }, queued.id)
    )
    assert.equal(last(events, 'stale-reply').replyTo, queued.id)
    // Novo `open` envia-se de imediato (já não há fila).
    const next = client.open(OPEN)
    assert.ok(next.ok && !next.queued)
    assert.equal(injected.length, 1)
  })

  it('after process-gone: in-flight open and find are dropped; their late replies are stale', () => {
    const { client, events, injected, timers } = setup()
    client.receive(wire('ready', READY))
    const o = client.open(OPEN)
    const f = client.find(FIND)
    assert.ok(o.ok && f.ok)
    client.processGone()
    assert.equal(client.phase, 'failed')
    assert.equal(timers.active(), 0)

    client.receive(wire('ready', READY))
    assert.equal(client.phase, 'ready')
    assert.equal(last(events, 'ready').payload.viewerVersion, '0.0.1')
    // Nada é reenviado (só os 2 envios originais).
    assert.equal(injected.length, 2)

    client.receive(wire('opened', OPENED('Planta.dxf'), o.id))
    assert.equal(last(events, 'stale-reply').type, 'opened')
    client.receive(wire('findResult', findResult(1, 1), f.id))
    assert.equal(last(events, 'stale-reply').type, 'findResult')
    // Resposta stale a `find` não dispara `goto` automático.
    assert.equal(injected.length, 2)
    assert.equal(kinds(events).includes('opened'), false)
    assert.equal(kinds(events).includes('find-result'), false)
  })

  it('after process-gone the open timer stays dead: no open-failed(timeout) fires post-recovery', () => {
    const { client, events, timers } = setup()
    client.receive(wire('ready', READY))
    client.open(OPEN)
    client.processGone()
    client.receive(wire('ready', READY))
    timers.advance(OPEN_TIMEOUT_MS * 2)
    assert.equal(kinds(events).includes('open-failed'), false)
  })

  it('recovered client works end to end: new open resolves, ids do not collide with dropped ones', () => {
    const { client, events, injected } = setup()
    client.receive(wire('ready', READY))
    const old = client.open(OPEN)
    client.processGone()
    client.receive(wire('ready', READY))
    const fresh = client.open({ ...OPEN, name: 'B.dxf' })
    assert.ok(old.ok && fresh.ok && !fresh.queued)
    assert.notEqual(old.id, fresh.id)
    client.receive(wire('opened', OPENED('B.dxf'), fresh.id))
    assert.equal(last(events, 'opened').payload.name, 'B.dxf')
    assert.equal(injected.length, 2)
  })

  it('a second ready after recovery is a duplicate-ready protocol error and changes nothing', () => {
    const { client, events } = setup()
    client.processGone()
    client.receive(wire('ready', READY))
    const readyEvents = kinds(events).filter(k => k === 'ready').length
    client.receive(wire('ready', READY))
    assert.equal(last(events, 'protocol-error').code, 'duplicate-ready')
    assert.equal(kinds(events).filter(k => k === 'ready').length, readyEvents)
    assert.equal(client.phase, 'ready')
  })

  it('invalid late ready after process-gone keeps failed, rejects commands, and a valid one still recovers', () => {
    const { client, events, injected } = setup()
    client.processGone()
    client.receive(wire('ready', { ...READY, protocol: 2 }))
    assert.equal(client.phase, 'failed')
    assert.equal(last(events, 'protocol-error').code, 'invalid-payload')
    assert.equal(client.zoom({ op: 'in' }).ok, false)
    assert.equal(injected.length, 0)
    client.receive(wire('ready', READY))
    assert.equal(client.phase, 'ready')
    assert.equal(client.zoom({ op: 'in' }).ok, true)
  })

  it('after dispose a late ready is ignored', () => {
    const { client, events, timers } = setup()
    timers.advance(READY_TIMEOUT_MS)
    client.dispose()
    const n = events.length
    client.receive(wire('ready', READY))
    assert.equal(events.length, n)
    assert.equal(client.phase, 'failed')
  })

  it('stays consistent with shellReducer when the same events drive both (timeout and process-gone)', () => {
    for (const trigger of ['timeout', 'process-gone'] as const) {
      const { client, events, timers } = setup()
      let shell = initialShellState
      let seen = 0
      const drain = () => {
        for (const e of events.slice(seen)) {
          if (e.kind === 'ready')
            shell = shellReducer(shell, {
              type: 'viewer-ready',
              payload: e.payload
            })
          if (e.kind === 'ready-timeout')
            shell = shellReducer(shell, { type: 'ready-timeout' })
          if (e.kind === 'process-gone')
            shell = shellReducer(shell, { type: 'process-gone' })
        }
        seen = events.length
      }
      if (trigger === 'timeout') timers.advance(READY_TIMEOUT_MS)
      else client.processGone()
      drain()
      assert.equal(shell.viewer, 'failed')
      assert.equal(client.phase, 'failed')
      assert.equal(
        shell.error,
        trigger === 'timeout' ? 'ready-timeout' : 'process-gone'
      )

      client.receive(wire('ready', { ...READY, dwg: 'maybe' }))
      drain()
      assert.equal(shell.viewer, 'failed')
      assert.equal(client.phase, 'failed')

      client.receive(wire('ready', READY))
      drain()
      assert.equal(shell.viewer, 'ready')
      assert.equal(client.phase, 'ready')
      assert.equal(shell.error, null)
      assert.equal(shell.dwg, 'ok')
      assert.equal(shell.generation, 0)
    }
  })
})

describe('BridgeClient — rework M1-B2 (t_ffb4eb41)', () => {
  /** Inject que lança enquanto `failing(msg)` for verdadeiro. */
  function setupFlaky(failing: (m: AppMessage) => boolean) {
    const injected: AppMessage[] = []
    return setup({
      inject: s => {
        const m = decode(s)
        if (failing(m)) throw new Error('webview ref em falta')
        injected.push(m)
      }
    })
  }

  it('a queued open whose inject throws on ready ends as open-failed(send-failed) for that id', () => {
    let broken = false
    const { client, events } = setupFlaky(() => broken)
    const r = client.open(OPEN)
    assert.ok(r.ok && r.queued)
    broken = true
    client.receive(wire('ready', READY))
    const f = last(events, 'open-failed')
    assert.equal(f.replyTo, r.id)
    assert.equal(f.code, 'send-failed')
    assert.equal(f.origin, 'local')
    assert.match(f.message, /webview ref em falta/)
    assert.equal(kinds(events).includes('command-sent'), false)
    // Sem `command-rejected` anónimo: a falha está correlacionada pelo id.
    assert.equal(kinds(events).includes('command-rejected'), false)
    // O cliente continua utilizável quando a ponte volta.
    assert.equal(client.phase, 'ready')
    broken = false
    const again = client.open(OPEN)
    assert.ok(again.ok && !again.queued)
  })

  it('never evicts the in-flight open, find or latest navigation past MAX_TRACKED', () => {
    const { client, events } = setup()
    client.receive(wire('ready', READY))
    const o = client.open(OPEN)
    const f = client.find({ query: 'A', matchCase: false, scope: 'drawing' })
    const z0 = client.zoom({ op: 'in' })
    assert.ok(o.ok && f.ok && z0.ok)
    for (let i = 0; i < MAX_TRACKED + 10; i++) client.zoom({ op: 'out' })
    const g = client.goto({ findId: 1, index: 0 })
    assert.ok(g.ok)
    for (let i = 0; i < MAX_TRACKED + 10; i++) client.zoom({ op: 'out' })

    client.receive(
      wire(
        'opened',
        { name: 'Planta.dxf', format: 'dxf', layouts: [], activeLayoutId: '' },
        o.id
      )
    )
    assert.equal(last(events, 'opened').replyTo, o.id)
    client.receive(wire('findResult', findResult(1, 0), f.id))
    assert.equal(last(events, 'find-result').replyTo, f.id)
    client.receive(
      wire('findActive', { findId: 1, index: 0, outcome: 'navigated' }, g.id)
    )
    assert.equal(last(events, 'find-active').replyTo, g.id)
    assert.equal(kinds(events).includes('stale-reply'), false)

    // Só os sem estado activo saem: o erro tardio do zoom mais antigo é
    // visível como não atribuído, nunca atribuído a outro comando.
    client.receive(
      wire('error', { code: 'x', message: 'tarde', replyTo: z0.id })
    )
    assert.equal(last(events, 'viewer-error').command, null)
  })

  it('a rejected automatic goto after findResult emits find-navigation-failed for that search', () => {
    const { client, events } = setupFlaky(m => m.type === 'goto')
    client.receive(wire('ready', READY))
    const f = client.find({ query: 'A', matchCase: false, scope: 'drawing' })
    assert.ok(f.ok)
    client.receive(wire('findResult', findResult(7, 2), f.id))
    const e = last(events, 'find-navigation-failed')
    assert.equal(e.replyTo, f.id)
    assert.equal(e.findId, 7)
    assert.equal(e.error.code, 'send-failed')
    assert.equal(kinds(events).includes('command-rejected'), false)
  })
})
