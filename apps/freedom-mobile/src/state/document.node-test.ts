// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import type { AppMessage, OpenedPayload } from '../contracts/protocol.ts'
import {
  documentReducer,
  type DocumentState,
  initialDocumentState
} from './document.ts'

const sentOpen = (
  id: string,
  name: string,
  kind: 'command-sent' | 'command-queued' = 'command-sent'
): BridgeEvent => ({
  kind,
  id,
  message: {
    v: 1,
    id,
    type: 'open',
    payload: { name, size: 1, source: { kind: 'url', url: 'http://x' } }
  } as AppMessage
})
const doc = (name: string): OpenedPayload => ({
  name,
  format: 'dxf',
  layouts: [{ name: 'Model', btrId: 'B1', tabOrder: 0 }],
  activeLayoutId: 'B1'
})
const run = (
  events: BridgeEvent[],
  from: DocumentState = initialDocumentState
) => events.reduce(documentReducer, from)

describe('documentReducer', () => {
  it('loading → opened', () => {
    const loading = run([sentOpen('a-1', 'A.dxf')])
    assert.deepEqual(loading.opening, { id: 'a-1', name: 'A.dxf' })
    const s = run(
      [{ kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }],
      loading
    )
    assert.equal(s.opening, null)
    assert.equal(s.current?.name, 'A.dxf')
    assert.equal(s.error, null)
  })

  it('shows loading while the open is only queued (before ready)', () => {
    const s = run([sentOpen('a-1', 'A.dxf', 'command-queued')])
    assert.equal(s.opening?.name, 'A.dxf')
  })

  it('a failed open keeps the previous document (§6.4) and records the error', () => {
    const open = run([
      sentOpen('a-1', 'A.dxf'),
      { kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }
    ])
    const s = run(
      [
        sentOpen('a-2', 'B.dwg'),
        {
          kind: 'open-failed',
          replyTo: 'a-2',
          code: 'dwg-unavailable',
          message: 'DWG indisponível',
          origin: 'viewer'
        }
      ],
      open
    )
    assert.equal(s.current?.name, 'A.dxf')
    assert.equal(s.opening, null)
    assert.deepEqual(s.error, {
      code: 'dwg-unavailable',
      message: 'DWG indisponível',
      origin: 'viewer'
    })
  })

  it('maps a local timeout to an explicit local error', () => {
    const s = run([
      sentOpen('a-1', 'A.dxf'),
      {
        kind: 'open-failed',
        replyTo: 'a-1',
        code: 'timeout',
        message: 'sem resposta',
        origin: 'local'
      }
    ])
    assert.equal(s.error?.code, 'timeout')
    assert.equal(s.error?.origin, 'local')
    assert.equal(s.opening, null)
  })

  it('locally rejected opens (extension, size) set an error without loading', () => {
    for (const code of ['unsupported-ext', 'too-large'] as const) {
      const s = run([
        {
          kind: 'command-rejected',
          command: 'open',
          error: { code, message: 'x' }
        }
      ])
      assert.equal(s.opening, null)
      assert.equal(s.error?.code, code)
      assert.equal(s.error?.origin, 'local')
    }
  })

  it('a viewer error answering open ends the loading', () => {
    const s = run([
      sentOpen('a-1', 'A.dxf'),
      {
        kind: 'viewer-error',
        command: 'open',
        replyTo: 'a-1',
        payload: { code: 'bad', message: 'm' }
      }
    ])
    assert.equal(s.opening, null)
    assert.equal(s.error?.code, 'viewer-error')
  })

  it('ignores an opened that does not answer the open in progress', () => {
    const loading = run([sentOpen('a-2', 'B.dxf')])
    const s = run(
      [{ kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }],
      loading
    )
    assert.equal(s, loading)
  })

  it('a new open clears the previous error', () => {
    const failed = run([
      {
        kind: 'command-rejected',
        command: 'open',
        error: { code: 'too-large', message: 'x' }
      }
    ])
    assert.equal(run([sentOpen('a-3', 'C.dxf')], failed).error, null)
  })

  it('no-document from FIND navigation drops the document (back to Open)', () => {
    const open = run([
      sentOpen('a-1', 'A.dxf'),
      { kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }
    ])
    const s = run(
      [
        {
          kind: 'find-active',
          replyTo: 'a-5',
          payload: { findId: 1, index: -1, outcome: 'no-document' }
        }
      ],
      open
    )
    assert.equal(s.current, null)
    assert.equal(s.error?.code, 'no-document')
  })

  it('process-gone drops the document; an open in progress ends with an explicit error', () => {
    const open = run([
      sentOpen('a-1', 'A.dxf'),
      { kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }
    ])
    for (const kind of ['command-sent', 'command-queued'] as const) {
      const s = run(
        [
          sentOpen('a-2', 'B.dxf', kind),
          { kind: 'process-gone' },
          { kind: 'open-dropped', id: 'a-2', cause: 'process-gone' }
        ],
        open
      )
      assert.equal(s.current, null)
      assert.equal(s.opening, null)
      assert.deepEqual(s.error, {
        code: 'viewer-unavailable',
        message: 'o viewer terminou inesperadamente; a abertura foi cancelada',
        origin: 'local'
      })
    }
  })

  it('process-gone without an open in progress drops the document and sets no error', () => {
    const open = run([
      sentOpen('a-1', 'A.dxf'),
      { kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }
    ])
    assert.deepEqual(
      run([{ kind: 'process-gone' }], open),
      initialDocumentState
    )
  })

  it('ready-timeout cancels a queued open (loading) and keeps a previous document', () => {
    const open = run([
      sentOpen('a-1', 'A.dxf'),
      { kind: 'opened', replyTo: 'a-1', payload: doc('A.dxf') }
    ])
    const s = run([sentOpen('a-2', 'B.dxf'), { kind: 'ready-timeout' }], open)
    assert.equal(s.opening, null)
    assert.equal(s.current?.name, 'A.dxf')
    assert.equal(s.error?.code, 'viewer-unavailable')
    assert.equal(s.error?.origin, 'local')
  })

  it('ready-timeout without an open in progress changes nothing', () => {
    assert.deepEqual(run([{ kind: 'ready-timeout' }]), initialDocumentState)
  })
})
