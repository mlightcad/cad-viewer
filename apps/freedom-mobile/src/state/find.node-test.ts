// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import type {
  AppMessage,
  FindActivePayload,
  FindResultPayload
} from '../contracts/protocol.ts'
import { findReducer, type FindState, initialFindState } from './find.ts'

const sentFind = (id = 'a-2', query = 'CARIMBO'): BridgeEvent => ({
  kind: 'command-sent',
  id,
  message: {
    v: 1,
    id,
    type: 'find',
    payload: { query, matchCase: true, scope: 'layout' }
  } as AppMessage
})
const sentNav = (type: 'goto' | 'findNext' | 'findPrev'): BridgeEvent => ({
  kind: 'command-sent',
  id: 'a-9',
  message: {
    v: 1,
    id: 'a-9',
    type,
    payload: { findId: 4, index: 0 }
  } as AppMessage
})
const hit = (i: number) => ({
  index: i,
  text: `t${i}`,
  excerpt: `…t${i}…`,
  layoutName: 'Planta',
  layoutId: 'L1',
  layer: '0',
  kind: 'text' as const
})
const result = (
  replyTo: string,
  total: number,
  over: Partial<FindResultPayload> = {}
): BridgeEvent => ({
  kind: 'find-result',
  replyTo,
  payload: {
    findId: 4,
    total,
    truncated: false,
    layoutCount: 3,
    hits: Array.from({ length: total }, (_, i) => hit(i)),
    ...over
  }
})
const active = (over: Partial<FindActivePayload>): BridgeEvent => ({
  kind: 'find-active',
  replyTo: 'a-9',
  payload: { findId: 4, index: 0, outcome: 'navigated', ...over }
})
const run = (
  events: Array<Parameters<typeof findReducer>[1]>,
  from = initialFindState
) => events.reduce<FindState>(findReducer, from)

describe('findReducer', () => {
  it('starts idle with no hits and no active index', () => {
    assert.equal(initialFindState.status, 'idle')
    assert.equal(initialFindState.activeIndex, -1)
    assert.deepEqual(initialFindState.hits, [])
  })

  it('searching: keeps the query/options and clears any previous results', () => {
    const prev = run([sentFind('a-1'), result('a-1', 2)])
    const s = run([sentFind('a-5', 'outro')], prev)
    assert.equal(s.status, 'searching')
    assert.equal(s.pendingId, 'a-5')
    assert.equal(s.query, 'outro')
    assert.equal(s.matchCase, true)
    assert.equal(s.scope, 'layout')
    assert.deepEqual(s.hits, [])
    assert.equal(s.findId, null)
  })

  it('results: stores hits, total, layoutCount and truncated', () => {
    const s = run([sentFind(), result('a-2', 2, { truncated: true })])
    assert.equal(s.status, 'results')
    assert.equal(s.total, 2)
    assert.equal(s.truncated, true)
    assert.equal(s.layoutCount, 3)
    assert.equal(s.findId, 4)
    assert.equal(s.pendingId, null)
    assert.equal(s.activeIndex, -1)
  })

  it('empty: zero hits is its own explicit state', () => {
    const s = run([sentFind(), result('a-2', 0)])
    assert.equal(s.status, 'empty')
    assert.equal(s.total, 0)
    assert.equal(s.query, 'CARIMBO')
  })

  it('ignores a result that does not answer the pending find (stale)', () => {
    const s = run([sentFind('a-5'), result('a-2', 3)])
    assert.equal(s.status, 'searching')
    assert.deepEqual(s.hits, [])
  })

  it('navigating → navigated sets the active index', () => {
    const s0 = run([sentFind(), result('a-2', 3)])
    const nav = run([sentNav('findNext')], s0)
    assert.equal(nav.navigation, 'navigating')
    const s = run([active({ index: 1 })], nav)
    assert.equal(s.activeIndex, 1)
    assert.equal(s.navigation, 'ok')
    assert.equal(s.lastOutcome, 'navigated')
  })

  it('findActive index -1 (no hits) keeps no active hit', () => {
    const s = run([sentFind(), result('a-2', 1), active({ index: -1 })])
    assert.equal(s.activeIndex, -1)
  })

  it('a navigated index outside the hits is unavailable, never an active hit', () => {
    const base = run([sentFind(), result('a-2', 3), active({ index: 1 })])
    for (const index of [3, 99, -1]) {
      const s = run([sentNav('goto'), active({ index })], base)
      assert.equal(s.activeIndex, 1, `index ${index}`)
      assert.equal(s.navigation, 'unavailable')
      assert.equal(s.error?.code, 'invalid-index')
    }
  })

  it('a rejected automatic goto flags navigation unavailable and keeps the list', () => {
    const base = run([sentFind(), result('a-2', 3)])
    const s = run(
      [
        {
          kind: 'find-navigation-failed',
          replyTo: 'a-2',
          findId: 4,
          error: { code: 'send-failed', message: 'ref em falta' }
        }
      ],
      base
    )
    assert.equal(s.status, 'results')
    assert.equal(s.hits.length, 3)
    assert.equal(s.activeIndex, -1)
    assert.equal(s.navigation, 'unavailable')
    assert.equal(s.error?.code, 'send-failed')
    // De outra pesquisa: ignorado.
    const other = run(
      [
        {
          kind: 'find-navigation-failed',
          replyTo: 'a-1',
          findId: 3,
          error: { code: 'send-failed', message: 'x' }
        }
      ],
      base
    )
    assert.equal(other, base)
  })

  it('stale outcome keeps the previous selection and is reported', () => {
    const base = run([sentFind(), result('a-2', 3), active({ index: 2 })])
    const s = run([active({ index: 0, outcome: 'stale' })], base)
    assert.equal(s.activeIndex, 2)
    assert.equal(s.navigation, 'ok')
    assert.equal(s.lastOutcome, 'stale')
  })

  it('layout-missing / layout-switch-failed / layout-mismatch keep the list and flag unavailable', () => {
    for (const outcome of [
      'layout-missing',
      'layout-switch-failed',
      'layout-mismatch'
    ] as const) {
      const base = run([sentFind(), result('a-2', 3), active({ index: 1 })])
      const s = run([active({ index: 0, outcome })], base)
      assert.equal(s.status, 'results', outcome)
      assert.equal(s.hits.length, 3)
      assert.equal(s.activeIndex, 1)
      assert.equal(s.navigation, 'unavailable')
      assert.equal(s.lastOutcome, outcome)
    }
  })

  it('ignores a findActive for another findId', () => {
    const base = run([sentFind(), result('a-2', 3)])
    const s = run([active({ findId: 99 })], base)
    assert.equal(s, base)
  })

  it('a viewer error for the find becomes an explicit error state', () => {
    const s = run([
      sentFind(),
      {
        kind: 'viewer-error',
        command: 'find',
        replyTo: 'a-2',
        payload: { code: 'no-document', message: 'sem documento' }
      }
    ])
    assert.equal(s.status, 'error')
    assert.equal(s.error?.code, 'no-document')
    assert.equal(s.pendingId, null)
  })

  it('a viewer error for a navigation (stale-find) flags unavailable but keeps results', () => {
    const base = run([sentFind(), result('a-2', 3)])
    const s = run(
      [
        {
          kind: 'viewer-error',
          command: 'goto',
          replyTo: 'a-9',
          payload: { code: 'stale-find', message: 'findId obsoleto' }
        }
      ],
      base
    )
    assert.equal(s.status, 'results')
    assert.equal(s.navigation, 'unavailable')
    assert.equal(s.error?.code, 'stale-find')
  })

  it('a locally rejected find (e.g. not-ready) is an error, never an empty result', () => {
    const s = run([
      {
        kind: 'command-rejected',
        command: 'find',
        error: { code: 'not-ready', message: 'ainda não está pronto' }
      }
    ])
    assert.equal(s.status, 'error')
    assert.equal(s.error?.code, 'not-ready')
  })

  it('a locally rejected navigation keeps the results and flags unavailable', () => {
    const base = run([sentFind(), result('a-2', 3)])
    const s = run(
      [
        {
          kind: 'command-rejected',
          command: 'findNext',
          error: { code: 'send-failed', message: 'x' }
        }
      ],
      base
    )
    assert.equal(s.status, 'results')
    assert.equal(s.navigation, 'unavailable')
  })

  it('resets on find-cleared, a newly opened document and process-gone', () => {
    const base = run([sentFind(), result('a-2', 3)])
    assert.deepEqual(run([{ kind: 'find-cleared' }], base), initialFindState)
    assert.deepEqual(run([{ kind: 'process-gone' }], base), initialFindState)
    assert.deepEqual(
      run(
        [
          {
            kind: 'opened',
            replyTo: 'a-1',
            payload: {
              name: 'x.dxf',
              format: 'dxf',
              layouts: [],
              activeLayoutId: ''
            }
          }
        ],
        base
      ),
      initialFindState
    )
  })

  it('ignores unrelated events and does not mutate the previous state', () => {
    const base = run([sentFind(), result('a-2', 1)])
    const snapshot = JSON.stringify(base)
    run([{ kind: 'log', payload: { level: 'info', message: 'x' } }], base)
    run([sentNav('goto'), active({ index: 0 })], base)
    assert.equal(JSON.stringify(base), snapshot)
  })
})
