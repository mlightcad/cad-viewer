// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  APP_TO_VIEWER_TYPES,
  buildAppMessage,
  createIdGenerator,
  detectDocumentFormat,
  encodeInjection,
  MAX_BASE64_BYTES,
  MAX_DOCUMENT_BYTES,
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
  it('is protocol v1 with FIND/zoom messages and no edit/cloud', () => {
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
    const r = parseViewerMessage(readyMsg({ replyTo: 'a-3' }))
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

  it('no longer accepts an untyped FIND result payload (fail-closed)', () => {
    const r = parseViewerMessage(readyMsg({ type: 'findResult', payload: {} }))
    assert.equal(r.ok, false)
    if (!r.ok) {
      assert.equal(r.error.code, 'invalid-payload')
      assert.equal(r.error.type, 'findResult')
    }
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

const viewerMsg = (type: string, payload: unknown, extra = {}) =>
  JSON.stringify({ v: 1, id: 'w-9', type, payload, ...extra })

const hit = (index: number, over: Record<string, unknown> = {}) => ({
  index,
  text: `texto ${index}`,
  excerpt: `…texto ${index}…`,
  layoutName: 'Planta',
  layoutId: 'L1',
  layer: '0',
  kind: 'text',
  ...over
})

const rejected = (raw: string, code: string, type?: string) => {
  const r = parseViewerMessage(raw)
  assert.equal(r.ok, false, raw)
  if (!r.ok) {
    assert.equal(r.error.code, code, raw)
    if (type) assert.equal(r.error.type, type)
  }
}

describe('parseViewerMessage — typed payloads (fail-closed)', () => {
  it('accepts a valid opened', () => {
    const r = parseViewerMessage(
      viewerMsg(
        'opened',
        {
          name: 'a.dxf',
          format: 'dxf',
          layouts: [{ name: 'Model', btrId: 'B1', tabOrder: 0 }],
          activeLayoutId: 'B1'
        },
        { replyTo: 'a-2' }
      )
    )
    assert.equal(r.ok, true)
    if (r.ok && r.message.type === 'opened') {
      assert.equal(r.message.payload.layouts[0].name, 'Model')
      assert.equal(r.message.replyTo, 'a-2')
    }
  })

  it('rejects opened with a bad format, layout or missing name', () => {
    const base = {
      name: 'a.dxf',
      format: 'dxf',
      layouts: [{ name: 'Model', btrId: 'B1', tabOrder: 0 }],
      activeLayoutId: 'B1'
    }
    for (const over of [
      { format: 'pdf' },
      { name: '' },
      { layouts: 'x' },
      { layouts: [{ name: 'M', btrId: 1, tabOrder: 0 }] },
      { layouts: [{ name: 'M', btrId: 'B', tabOrder: -1 }] },
      { activeLayoutId: 3 }
    ]) {
      rejected(
        viewerMsg('opened', { ...base, ...over }),
        'invalid-payload',
        'opened'
      )
    }
  })

  it('accepts every openFailed code and rejects unknown ones', () => {
    for (const code of [
      'unsupported-ext',
      'too-large',
      'read-failed',
      'parse',
      'dwg-unavailable',
      'oom',
      'timeout'
    ]) {
      const r = parseViewerMessage(
        viewerMsg('openFailed', { code, message: 'x' })
      )
      assert.equal(r.ok, true, code)
    }
    rejected(
      viewerMsg('openFailed', { code: 'boom', message: 'x' }),
      'invalid-payload',
      'openFailed'
    )
    rejected(
      viewerMsg('openFailed', { code: 'parse' }),
      'invalid-payload',
      'openFailed'
    )
  })

  it('accepts a findResult with hits, empty and truncated results', () => {
    const full = parseViewerMessage(
      viewerMsg('findResult', {
        findId: 3,
        total: 2,
        truncated: false,
        layoutCount: 3,
        hits: [hit(0), hit(1, { kind: 'attribute', tag: 'T', blockName: 'B' })]
      })
    )
    assert.equal(full.ok, true)
    const empty = parseViewerMessage(
      viewerMsg('findResult', {
        findId: 4,
        total: 0,
        truncated: false,
        layoutCount: 1,
        hits: []
      })
    )
    assert.equal(empty.ok, true)
    const trunc = parseViewerMessage(
      viewerMsg('findResult', {
        findId: 5,
        total: 1,
        truncated: true,
        layoutCount: 1,
        hits: [hit(0)]
      })
    )
    assert.equal(trunc.ok, true)
  })

  it('rejects inconsistent or malformed findResult payloads', () => {
    const base = {
      findId: 1,
      total: 1,
      truncated: false,
      layoutCount: 1,
      hits: [hit(0)]
    }
    for (const over of [
      { total: 2 }, // total ≠ hits.length
      { hits: [hit(1)] }, // índice não contíguo
      { hits: [hit(0, { kind: 'raster' })] },
      { hits: [hit(0, { text: 5 })] },
      { hits: [hit(0, { tag: 7 })] },
      { hits: 'x' },
      { findId: -1 },
      { findId: 1.5 },
      { truncated: 'no' },
      { layoutCount: null }
    ]) {
      rejected(
        viewerMsg('findResult', { ...base, ...over }),
        'invalid-payload',
        'findResult'
      )
    }
  })

  it('accepts every findActive outcome and index -1, rejects the rest', () => {
    for (const outcome of [
      'navigated',
      'layout-mismatch',
      'layout-missing',
      'layout-switch-failed',
      'no-document',
      'stale'
    ]) {
      const r = parseViewerMessage(
        viewerMsg('findActive', { findId: 1, index: -1, outcome })
      )
      assert.equal(r.ok, true, outcome)
    }
    for (const payload of [
      { findId: 1, index: -2, outcome: 'navigated' },
      { findId: 1, index: 0.5, outcome: 'navigated' },
      { findId: 1, index: 0, outcome: 'teleported' },
      { index: 0, outcome: 'navigated' }
    ]) {
      rejected(
        viewerMsg('findActive', payload),
        'invalid-payload',
        'findActive'
      )
    }
  })

  it('validates error and log payloads and keeps the error replyTo', () => {
    const e = parseViewerMessage(
      viewerMsg('error', { code: 'stale-find', message: 'x', replyTo: 'a-4' })
    )
    assert.equal(e.ok, true)
    rejected(viewerMsg('error', { message: 'x' }), 'invalid-payload', 'error')
    rejected(
      viewerMsg('error', { code: 'c', message: 'x', replyTo: 4 }),
      'invalid-payload',
      'error'
    )
    assert.equal(
      parseViewerMessage(viewerMsg('log', { level: 'warn', message: 'm' })).ok,
      true
    )
    rejected(
      viewerMsg('log', { level: 'trace', message: 'm' }),
      'invalid-payload',
      'log'
    )
  })

  it('rejects a ready with a wrong protocol, caps or dwg status', () => {
    for (const over of [
      { protocol: 2 },
      { caps: ['find', 'edit'] },
      { dwg: 'maybe' },
      { viewerVersion: 1 }
    ]) {
      rejected(
        viewerMsg('ready', {
          viewerVersion: '0',
          protocol: 1,
          caps: ['find'],
          dwg: 'ok',
          ...over
        }),
        'invalid-payload',
        'ready'
      )
    }
  })

  it('exposes the replyTo of an invalid-payload reply so the caller can fail it', () => {
    const r = parseViewerMessage(
      viewerMsg('openFailed', { code: 'x' }, { replyTo: 'a-7' })
    )
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.error.replyTo, 'a-7')
  })
})

const okMsg = (r: ReturnType<typeof buildAppMessage>) => {
  assert.equal(r.ok, true, JSON.stringify(r))
  return r.ok ? r.message : (undefined as never)
}
const failed = (r: ReturnType<typeof buildAppMessage>, code: string) => {
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.error.code, code)
}

describe('buildAppMessage — open', () => {
  const open = (over: Record<string, unknown> = {}) =>
    buildAppMessage('a-1', 'open', {
      name: 'Planta.DWG',
      size: 1000,
      source: { kind: 'url', url: 'http://127.0.0.1:1/f' },
      ...over
    } as never)

  it('builds a valid open for url and base64', () => {
    const m = okMsg(open())
    assert.equal(m.type, 'open')
    assert.equal(m.v, 1)
    assert.equal(m.id, 'a-1')
    okMsg(open({ name: 'a.dxf', source: { kind: 'base64', data: 'QQ==' } }))
  })

  it('rejects extensions other than dwg/dxf before anything is sent', () => {
    for (const name of ['x.dwf', 'x.pdf', 'x', 'dwg', '']) {
      failed(
        open({ name }),
        name === '' ? 'invalid-payload' : 'unsupported-ext'
      )
    }
  })

  it('enforces the per-format size limits and the base64 limit', () => {
    okMsg(open({ name: 'a.dxf', size: MAX_DOCUMENT_BYTES.dxf }))
    failed(
      open({ name: 'a.dxf', size: MAX_DOCUMENT_BYTES.dxf + 1 }),
      'too-large'
    )
    okMsg(open({ name: 'a.dwg', size: MAX_DOCUMENT_BYTES.dwg }))
    failed(
      open({ name: 'a.dwg', size: MAX_DOCUMENT_BYTES.dwg + 1 }),
      'too-large'
    )
    failed(
      open({
        name: 'a.dxf',
        size: MAX_BASE64_BYTES + 1,
        source: { kind: 'base64', data: 'QQ==' }
      }),
      'too-large'
    )
  })

  it('rejects malformed sizes and sources', () => {
    for (const over of [
      { size: -1 },
      { size: 1.5 },
      { size: '10' },
      { source: undefined },
      { source: { kind: 'url' } },
      { source: { kind: 'url', url: '' } },
      { source: { kind: 'base64', data: '' } },
      { source: { kind: 'ftp', url: 'x' } }
    ]) {
      failed(open(over), 'invalid-payload')
    }
  })
})

describe('buildAppMessage — FIND (first-class)', () => {
  it('builds find with and without maxResults', () => {
    const m = okMsg(
      buildAppMessage('a-2', 'find', {
        query: 'CARIMBO',
        matchCase: false,
        scope: 'drawing'
      })
    )
    assert.equal(m.type, 'find')
    okMsg(
      buildAppMessage('a-3', 'find', {
        query: 'x',
        matchCase: true,
        scope: 'layout',
        maxResults: 500
      })
    )
  })

  it('rejects an empty/blank query, bad scope, bad flags and bad maxResults', () => {
    for (const over of [
      { query: '' },
      { query: '   ' },
      { query: 4 },
      { scope: 'xref' },
      { matchCase: 'yes' },
      { maxResults: 0 },
      { maxResults: 501 },
      { maxResults: 1.5 }
    ]) {
      failed(
        buildAppMessage('a-4', 'find', {
          query: 'x',
          matchCase: false,
          scope: 'drawing',
          ...over
        } as never),
        'invalid-payload'
      )
    }
  })

  it('builds goto/findNext/findPrev and validates findId, index and insets', () => {
    const insets = { left: 0, right: 0, top: 0, bottom: 240 }
    okMsg(buildAppMessage('a-5', 'goto', { findId: 1, index: 0, insets }))
    okMsg(buildAppMessage('a-6', 'findNext', { findId: 1 }))
    okMsg(buildAppMessage('a-7', 'findPrev', { findId: 1, insets }))
    failed(
      buildAppMessage('a-8', 'goto', { findId: 1, index: -1 }),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-8', 'goto', { findId: 1.2, index: 0 }),
      'invalid-payload'
    )
    failed(buildAppMessage('a-8', 'findNext', {} as never), 'invalid-payload')
    failed(
      buildAppMessage('a-8', 'findPrev', {
        findId: 1,
        insets: { ...insets, bottom: -1 }
      }),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-8', 'goto', {
        findId: 1,
        index: 0,
        insets: { left: 0, right: 0, top: 0 } as never
      }),
      'invalid-payload'
    )
  })

  it('builds clearHighlight and setInsets and rejects stray fields', () => {
    okMsg(buildAppMessage('a-9', 'clearHighlight', {}))
    failed(
      buildAppMessage('a-9', 'clearHighlight', { x: 1 } as never),
      'invalid-payload'
    )
    okMsg(
      buildAppMessage('a-10', 'setInsets', {
        left: 0,
        right: 0,
        top: 0,
        bottom: 300
      })
    )
    failed(
      buildAppMessage('a-10', 'setInsets', {
        left: 0,
        right: 0,
        top: Number.NaN,
        bottom: 0
      }),
      'invalid-payload'
    )
  })

  it('never builds from a non-object payload', () => {
    failed(buildAppMessage('a-11', 'find', null as never), 'invalid-payload')
    failed(buildAppMessage('a-11', 'zoom', [] as never), 'invalid-payload')
  })
})

describe('buildAppMessage — zoom', () => {
  it('builds in/out/extents, with and without factor', () => {
    okMsg(buildAppMessage('a-1', 'zoom', { op: 'in' }))
    okMsg(buildAppMessage('a-2', 'zoom', { op: 'in', factor: 2 }))
    okMsg(buildAppMessage('a-3', 'zoom', { op: 'out', factor: 0.5 }))
    okMsg(buildAppMessage('a-4', 'zoom', { op: 'extents' }))
  })

  it('rejects unknown ops, out-of-range/non-finite factors and extents+factor', () => {
    failed(
      buildAppMessage('a-5', 'zoom', { op: 'pan' } as never),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-5', 'zoom', { op: 'in', factor: 0 }),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-5', 'zoom', { op: 'in', factor: 11 }),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-5', 'zoom', {
        op: 'out',
        factor: Number.POSITIVE_INFINITY
      }),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-5', 'zoom', { op: 'in', factor: '2' as never }),
      'invalid-payload'
    )
    failed(
      buildAppMessage('a-5', 'zoom', { op: 'extents', factor: 2 }),
      'invalid-payload'
    )
  })

  it('built messages survive encodeInjection', () => {
    const m = okMsg(
      buildAppMessage('a-6', 'find', {
        query: 'a"b</script>\n📐',
        matchCase: false,
        scope: 'drawing'
      })
    )
    const script = encodeInjection(m)
    assert.doesNotMatch(script, /<\/script>/i)
  })
})
