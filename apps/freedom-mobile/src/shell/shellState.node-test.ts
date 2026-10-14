// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  describeViewerStatus,
  initialShellState,
  READY_TIMEOUT_MS,
  shellReducer
} from './shellState.ts'

const ready = (dwg: 'ok' | 'unavailable' = 'ok') =>
  JSON.stringify({
    v: 1,
    id: 'w-1',
    type: 'ready',
    payload: { viewerVersion: '1.2.3', protocol: 1, caps: ['dxf'], dwg }
  })

describe('shellState', () => {
  it('starts on the viewer screen, booting, with unknown DWG capability', () => {
    assert.deepEqual(initialShellState, {
      screen: 'viewer',
      viewer: 'booting',
      dwg: 'unknown',
      viewerVersion: null,
      error: null,
      generation: 0
    })
    assert.equal(READY_TIMEOUT_MS, 15_000)
  })

  it('moves to ready on a valid ready message and records DWG/version', () => {
    const s = shellReducer(initialShellState, {
      type: 'viewer-message',
      raw: ready('ok')
    })
    assert.equal(s.viewer, 'ready')
    assert.equal(s.dwg, 'ok')
    assert.equal(s.viewerVersion, '1.2.3')
    assert.equal(s.error, null)
  })

  it('keeps ready with DWG unavailable (degraded DXF mode, not a failure)', () => {
    const s = shellReducer(initialShellState, {
      type: 'viewer-message',
      raw: ready('unavailable')
    })
    assert.equal(s.viewer, 'ready')
    assert.equal(s.dwg, 'unavailable')
  })

  it('ignores a ready with an invalid payload', () => {
    const raw = JSON.stringify({
      v: 1,
      id: 'w-1',
      type: 'ready',
      payload: { dwg: 'maybe' }
    })
    const s = shellReducer(initialShellState, { type: 'viewer-message', raw })
    assert.equal(s.viewer, 'booting')
  })

  it('ignores a ready with unknown caps, wrong protocol or missing version', () => {
    const base = { viewerVersion: '1', protocol: 1, caps: ['dxf'], dwg: 'ok' }
    for (const bad of [
      { ...base, caps: ['dxf', 'edit'] },
      { ...base, caps: 'dxf' },
      { ...base, protocol: 2 },
      { ...base, viewerVersion: undefined }
    ]) {
      const raw = JSON.stringify({
        v: 1,
        id: 'w-1',
        type: 'ready',
        payload: bad
      })
      const s = shellReducer(initialShellState, { type: 'viewer-message', raw })
      assert.deepEqual(s, initialShellState)
    }
  })

  it('ignores invalid messages without throwing and without changing state', () => {
    for (const raw of [
      '{nope',
      '{}',
      '{"v":9,"id":"x","type":"ready","payload":{}}'
    ]) {
      const s = shellReducer(initialShellState, { type: 'viewer-message', raw })
      assert.deepEqual(s, initialShellState)
    }
  })

  it('ignores non-lifecycle messages (reserved FIND/…) in B1', () => {
    const raw = JSON.stringify({
      v: 1,
      id: 'w-2',
      type: 'findResult',
      payload: {}
    })
    const s = shellReducer(initialShellState, { type: 'viewer-message', raw })
    assert.deepEqual(s, initialShellState)
  })

  it('fails when ready does not arrive in time, only while booting', () => {
    const failed = shellReducer(initialShellState, { type: 'ready-timeout' })
    assert.equal(failed.viewer, 'failed')
    assert.equal(failed.error, 'ready-timeout')

    const ok = shellReducer(initialShellState, {
      type: 'viewer-message',
      raw: ready()
    })
    assert.equal(shellReducer(ok, { type: 'ready-timeout' }), ok)
  })

  it('fails when the web process dies and clears readiness', () => {
    const ok = shellReducer(initialShellState, {
      type: 'viewer-message',
      raw: ready()
    })
    const s = shellReducer(ok, { type: 'process-gone' })
    assert.equal(s.viewer, 'failed')
    assert.equal(s.error, 'process-gone')
    assert.equal(s.dwg, 'unknown')
  })

  // Decisão documentada em shellState.ts: `ready` válido tardio recupera.
  it('recovers to ready on a late valid ready after ready-timeout', () => {
    const failed = shellReducer(initialShellState, { type: 'ready-timeout' })
    assert.equal(failed.viewer, 'failed')
    assert.equal(failed.error, 'ready-timeout')

    const s = shellReducer(failed, {
      type: 'viewer-message',
      raw: ready('unavailable')
    })
    assert.deepEqual(s, {
      screen: 'viewer',
      viewer: 'ready',
      dwg: 'unavailable',
      viewerVersion: '1.2.3',
      error: null,
      generation: 0
    })
    assert.match(describeViewerStatus(s), /Viewer pronto/)
    assert.equal(failed.viewer, 'failed') // estado anterior não mutado
  })

  it('recovers to ready on a late valid ready after process-gone', () => {
    const ok = shellReducer(initialShellState, {
      type: 'viewer-message',
      raw: ready('ok')
    })
    const reloaded = shellReducer(ok, { type: 'reload' })
    const gone = shellReducer(reloaded, { type: 'process-gone' })
    assert.equal(gone.viewer, 'failed')
    assert.equal(gone.error, 'process-gone')
    assert.equal(gone.dwg, 'unknown')
    assert.equal(gone.viewerVersion, null)

    const s = shellReducer(gone, { type: 'viewer-message', raw: ready('ok') })
    assert.deepEqual(s, {
      screen: 'viewer',
      viewer: 'ready',
      dwg: 'ok',
      viewerVersion: '1.2.3',
      error: null,
      generation: 1 // recuperação tardia não recria a superfície
    })
  })

  it('keeps a failed state when the late ready is invalid or non-lifecycle', () => {
    const timedOut = shellReducer(initialShellState, { type: 'ready-timeout' })
    const gone = shellReducer(timedOut, { type: 'process-gone' })
    for (const failed of [timedOut, gone]) {
      for (const raw of [
        '{nope',
        JSON.stringify({
          v: 1,
          id: 'w-1',
          type: 'ready',
          payload: { viewerVersion: '1', protocol: 2, caps: ['dxf'], dwg: 'ok' }
        }),
        JSON.stringify({ v: 1, id: 'w-2', type: 'findResult', payload: {} })
      ]) {
        assert.equal(
          shellReducer(failed, { type: 'viewer-message', raw }),
          failed
        )
      }
    }
  })

  it('reload returns to booting and bumps generation (recreates the surface)', () => {
    const failed = shellReducer(initialShellState, { type: 'ready-timeout' })
    const s = shellReducer(failed, { type: 'reload' })
    assert.equal(s.viewer, 'booting')
    assert.equal(s.error, null)
    assert.equal(s.generation, 1)
    assert.equal(s.screen, 'viewer')
  })

  it('does not mutate the previous state', () => {
    const before = structuredClone(initialShellState)
    shellReducer(initialShellState, { type: 'ready-timeout' })
    assert.deepEqual(initialShellState, before)
  })
})

describe('describeViewerStatus (PT-PT)', () => {
  it('has a message for each phase and error', () => {
    assert.match(describeViewerStatus(initialShellState), /a iniciar/i)
    const ready_ = shellReducer(initialShellState, {
      type: 'viewer-message',
      raw: ready('unavailable')
    })
    assert.match(describeViewerStatus(ready_), /DWG indispon[ií]vel/)
    assert.match(
      describeViewerStatus(
        shellReducer(initialShellState, { type: 'ready-timeout' })
      ),
      /não arrancou/
    )
    const gone = shellReducer(ready_, { type: 'process-gone' })
    assert.match(describeViewerStatus(gone), /demasiado grande|encerrou/)
  })
})
