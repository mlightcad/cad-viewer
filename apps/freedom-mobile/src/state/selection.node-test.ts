// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import type { AppMessage, FindHit } from '../contracts/protocol.ts'
import { findReducer, type FindState, initialFindState } from './find.ts'
import {
  initialSelectionState,
  selectionReducer,
  type SelectionState
} from './selection.ts'

const hit = (i: number): FindHit => ({
  index: i,
  text: `t${i}`,
  excerpt: `…t${i}…`,
  layoutName: 'Model',
  layoutId: 'B1',
  layer: '0',
  kind: 'text'
})

/** Aplica o evento a FIND e seleção, como o `sessionReducer`. */
function step(s: { find: FindState; sel: SelectionState }, event: BridgeEvent) {
  const find = findReducer(s.find, event)
  return { find, sel: selectionReducer(s.sel, event, find) }
}

const sent = (id: string, message: AppMessage): BridgeEvent => ({
  kind: 'command-sent',
  id,
  message
})

function withResults() {
  let s = { find: initialFindState, sel: initialSelectionState }
  s = step(
    s,
    sent('a-1', {
      v: 1,
      id: 'a-1',
      type: 'find',
      payload: { query: 'q', matchCase: false, scope: 'drawing' }
    })
  )
  return step(s, {
    kind: 'find-result',
    replyTo: 'a-1',
    payload: {
      findId: 7,
      total: 3,
      truncated: false,
      layoutCount: 1,
      hits: [hit(0), hit(1), hit(2)]
    }
  })
}

const goto = (id: string, index: number): AppMessage => ({
  v: 1,
  id,
  type: 'goto',
  payload: { findId: 7, index }
})
const active = (
  index: number,
  outcome: Extract<BridgeEvent, { kind: 'find-active' }>['payload']['outcome'],
  findId = 7
): BridgeEvent => ({
  kind: 'find-active',
  replyTo: 'a-2',
  payload: { findId, index, outcome }
})

describe('selectionReducer', () => {
  it('starts none and a find result alone selects nothing', () => {
    assert.deepEqual(withResults().sel, initialSelectionState)
  })

  it('navigated with a valid index selects the hit from the reduced FIND state', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 1)))
    assert.equal(s.sel.status, 'pending')
    s = step(s, active(1, 'navigated'))
    assert.deepEqual(s.sel, {
      status: 'selected',
      hit: hit(1),
      findId: 7,
      error: null
    })
  })

  it('navigated with an index outside the hits is unavailable with NO hit (viewer state unknown)', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 1)))
    s = step(s, active(1, 'navigated'))
    s = step(s, sent('a-3', goto('a-3', 2)))
    s = step(s, active(9, 'navigated'))
    assert.equal(s.sel.status, 'unavailable')
    assert.equal(s.sel.hit, null)
    assert.equal(s.sel.error?.code, 'invalid-index')
  })

  it('stale keeps the previous selection; with none it settles back to none', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 0)))
    s = step(s, active(-1, 'stale'))
    assert.equal(s.sel.status, 'none')
    s = step(s, sent('a-3', goto('a-3', 1)))
    s = step(s, active(1, 'navigated'))
    s = step(s, sent('a-4', goto('a-4', 2)))
    s = step(s, active(-1, 'stale'))
    assert.equal(s.sel.status, 'selected')
    assert.equal(s.sel.hit?.index, 1)
  })

  it('every non-navigated outcome is unavailable carrying the outcome as code', () => {
    for (const outcome of [
      'layout-mismatch',
      'layout-missing',
      'layout-switch-failed'
    ] as const) {
      let s = withResults()
      s = step(s, sent('a-2', goto('a-2', 0)))
      s = step(s, active(-1, outcome))
      assert.equal(s.sel.status, 'unavailable', outcome)
      assert.equal(s.sel.error?.code, outcome)
    }
  })

  it('findActive{no-document} clears the selection (document is gone, §5.4)', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 0)))
    s = step(s, active(0, 'navigated'))
    assert.equal(s.sel.status, 'selected')
    s = step(s, active(-1, 'no-document'))
    assert.deepEqual(s.sel, initialSelectionState)
  })

  it('a findActive for another findId or with no results is ignored', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 0)))
    const before = s.sel
    s = step(s, active(1, 'navigated', 99))
    assert.deepEqual(s.sel, before)
    const idle = step(
      { find: initialFindState, sel: initialSelectionState },
      active(0, 'navigated')
    )
    assert.deepEqual(idle.sel, initialSelectionState)
  })

  it('navigation commands before any results do not create a pending selection', () => {
    const s = step(
      { find: initialFindState, sel: initialSelectionState },
      sent('a-1', goto('a-1', 0))
    )
    assert.deepEqual(s.sel, initialSelectionState)
  })

  it('zoom traffic and zoom failures never touch the selection', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 2)))
    s = step(s, active(2, 'navigated'))
    const before = s
    const zoom: AppMessage = {
      v: 1,
      id: 'a-5',
      type: 'zoom',
      payload: { op: 'in' }
    }
    for (const e of [
      sent('a-5', zoom),
      {
        kind: 'viewer-error',
        command: 'zoom',
        replyTo: 'a-5',
        payload: { code: 'x', message: 'y' }
      },
      {
        kind: 'command-rejected',
        command: 'zoom',
        error: { code: 'send-failed', message: 'z' }
      }
    ] as BridgeEvent[]) {
      s = step(s, e)
    }
    assert.deepEqual(s, before)
  })

  it('FIND UI close clears it; rejected navigation is unavailable, keeping the hit', () => {
    let s = withResults()
    s = step(s, sent('a-2', goto('a-2', 1)))
    s = step(s, active(1, 'navigated'))
    s = step(s, {
      kind: 'command-rejected',
      command: 'findNext',
      error: { code: 'send-failed', message: 'sem ponte' }
    })
    assert.equal(s.sel.status, 'unavailable')
    assert.equal(s.sel.hit?.index, 1)
    const find = findReducer(s.find, { kind: 'find-cleared' })
    assert.deepEqual(
      selectionReducer(s.sel, { kind: 'find-cleared' }, find),
      initialSelectionState
    )
  })

  it('find-navigation-failed (automatic goto rejected) is unavailable for that findId only', () => {
    const s = withResults()
    const err = { code: 'not-ready' as const, message: 'ainda não' }
    const hit0 = step(s, {
      kind: 'find-navigation-failed',
      replyTo: 'a-1',
      findId: 7,
      error: err
    })
    assert.equal(hit0.sel.status, 'unavailable')
    const other = step(s, {
      kind: 'find-navigation-failed',
      replyTo: 'a-1',
      findId: 8,
      error: err
    })
    assert.deepEqual(other.sel, initialSelectionState)
  })
})
