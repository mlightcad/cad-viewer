// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  APP_TO_VIEWER_TYPES,
  createIdGenerator,
  detectDocumentFormat,
  encodeInjection,
  parseViewerMessage,
  PROTOCOL_VERSION,
  VIEWER_TO_APP_TYPES
} from './protocol.ts'

const readyMsg = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    v: 1,
    id: 'w-1',
    type: 'ready',
    payload: {
      viewerVersion: '0.0.0',
      protocol: 1,
      caps: ['find', 'dwg', 'dxf'],
      dwg: 'ok'
    },
    ...over
  })

describe('protocol constants', () => {
  it('is protocol v1 and reserves FIND/zoom names without adding edit/cloud', () => {
    assert.equal(PROTOCOL_VERSION, 1)
    for (const t of ['open', 'find', 'goto', 'findNext', 'findPrev', 'zoom']) {
      assert.ok((APP_TO_VIEWER_TYPES as readonly string[]).includes(t), t)
    }
    for (const t of ['ready', 'opened', 'openFailed', 'findResult', 'error']) {
      assert.ok((VIEWER_TO_APP_TYPES as readonly string[]).includes(t), t)
    }
    const all = [...APP_TO_VIEWER_TYPES, ...VIEWER_TO_APP_TYPES].join(' ')
    assert.doesNotMatch(all, /edit|save|cloud|login|account|upload/i)
  })
})

describe('parseViewerMessage', () => {
  it('accepts a valid ready message', () => {
    const r = parseViewerMessage(readyMsg())
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.message.type, 'ready')
      assert.equal(r.message.id, 'w-1')
    }
  })

  it('keeps replyTo', () => {
    const r = parseViewerMessage(readyMsg({ replyTo: 'a-3', type: 'opened' }))
    assert.equal(r.ok && r.message.replyTo, 'a-3')
  })

  it('rejects invalid JSON without throwing', () => {
    const r = parseViewerMessage('{nope')
    assert.deepEqual(r.ok ? null : r.error.code, 'invalid-json')
  })

  it('rejects non-string input without throwing', () => {
    for (const bad of [undefined, null, 42, {}, []] as unknown[]) {
      const r = parseViewerMessage(bad)
      assert.equal(r.ok, false)
    }
  })

  it('rejects non-object JSON and missing fields', () => {
    for (const raw of ['null', '1', '"x"', '[]', '{}', '{"v":1}']) {
      const r = parseViewerMessage(raw)
      assert.equal(r.ok, false, raw)
      if (!r.ok) assert.equal(r.error.code, 'invalid-envelope', raw)
    }
  })

  it('rejects an unsupported version', () => {
    const r = parseViewerMessage(readyMsg({ v: 2 }))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.error.code, 'unsupported-version')
  })

  it('rejects an unknown type', () => {
    const r = parseViewerMessage(readyMsg({ type: 'saveToCloud' }))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.error.code, 'unknown-type')
  })

  it('rejects app→viewer types arriving from the viewer', () => {
    const r = parseViewerMessage(readyMsg({ type: 'open' }))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.error.code, 'unknown-type')
  })

  it('accepts reserved FIND result type without typing its payload', () => {
    const r = parseViewerMessage(readyMsg({ type: 'findResult', payload: {} }))
    assert.equal(r.ok, true)
  })

  it('rejects a payload that is not an object', () => {
    const r = parseViewerMessage(readyMsg({ payload: 'x' }))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.error.code, 'invalid-envelope')
  })
})

describe('encodeInjection', () => {
  const roundTrip = (payload: unknown) => {
    const script = encodeInjection({
      v: 1,
      id: 'a-1',
      type: 'open',
      payload: payload as Record<string, unknown>
    })
    assert.ok(script.startsWith('window.__cadBridge.receive('))
    assert.ok(script.endsWith(');true;'))
    // Evaluate the argument as a JS literal, exactly as the WebView would.
    const literal = script.slice(
      'window.__cadBridge.receive('.length,
      -');true;'.length
    )
    const json = new Function(`return ${literal}`)() as string
    assert.equal(typeof json, 'string')
    return JSON.parse(json)
  }

  it('round-trips quotes, newlines, </script>, emoji and U+2028/2029', () => {
    const payload = {
      name: 'a"b\'c\n\\d</script><!--',
      emoji: '📐 DWG',
      ls: 'x\u2028y\u2029z'
    }
    assert.deepEqual(roundTrip(payload).payload, payload)
  })

  it('never contains a raw line terminator or </script> in the script', () => {
    const script = encodeInjection({
      v: 1,
      id: 'a-1',
      type: 'open',
      payload: { s: 'x\u2028\u2029\n</script>' }
    })
    assert.doesNotMatch(script, /[\n\r\u2028\u2029]/)
    assert.doesNotMatch(script, /<\/script>/i)
  })
})

describe('createIdGenerator', () => {
  it('is monotonic and prefixed', () => {
    const next = createIdGenerator('a')
    assert.deepEqual([next(), next(), next()], ['a-1', 'a-2', 'a-3'])
    assert.equal(createIdGenerator('w')(), 'w-1')
  })
})

describe('detectDocumentFormat', () => {
  it('maps dwg and dxf case-insensitively', () => {
    assert.equal(detectDocumentFormat('Planta.DWG'), 'dwg')
    assert.equal(detectDocumentFormat('a.b.dxf'), 'dxf')
  })

  it('returns null for everything else (the viewer would treat it as DXF)', () => {
    for (const n of ['x.dwf', 'x.pdf', 'dwg', 'x.dwg.txt', '', '.dxf.']) {
      assert.equal(detectDocumentFormat(n), null, n)
    }
  })
})
