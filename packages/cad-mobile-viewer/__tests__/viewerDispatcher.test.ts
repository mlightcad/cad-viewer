// SPDX-License-Identifier: GPL-3.0-or-later
//
// Dispatcher (envelope v1, input hostil) e adaptador da vista real (spec M3-I4
// §2.1, §2.3). Todas as respostas passam pelo parser REAL do app.

import type { AcApFindLayoutHit } from '@mlightcad/cad-simple-viewer/find'
import { AcGeBox2d } from '@mlightcad/data-model'

import * as app from '../../../apps/freedom-mobile/src/contracts/protocol'
import type { ViewBox } from '../src/model/types'
import {
  createViewerDispatcher,
  type SessionLike
} from '../src/viewer/dispatcher'
import { MAX_ID_LENGTH, MAX_MESSAGE_CHARS } from '../src/viewer/protocol'
import { ViewerSession } from '../src/viewer/session'
import {
  createDocManagerViewPort,
  type DocManagerLike,
  type ViewLike
} from '../src/viewer/viewPort'
import { e2eBytes } from './helpers/openFixture'

function spySession(impl?: SessionLike['handle']) {
  const calls: unknown[] = []
  const session: SessionLike = {
    handle: async msg => {
      calls.push(msg)
      return impl ? impl(msg) : []
    }
  }
  return { session, calls }
}

const parse = (text: string) => {
  const p = app.parseViewerMessage(text)
  if (!p.ok) throw new Error(`app rejeitou ${text}`)
  return p.message
}

describe('envelope: entrada hostil → um único error, sessão intocada', () => {
  const big = 'x'.repeat(MAX_MESSAGE_CHARS + 1)
  test.each([
    ['não-string', 42, 'invalid-json', undefined],
    ['objecto (não texto)', { v: 1 }, 'invalid-json', undefined],
    ['acima do limite', big, 'message-too-large', undefined],
    ['JSON inválido', '{"v":1,', 'invalid-json', undefined],
    ['array', '[1,2]', 'invalid-envelope', undefined],
    ['null', 'null', 'invalid-envelope', undefined],
    [
      'sem id',
      '{"v":1,"type":"zoom","payload":{"op":"in"}}',
      'invalid-envelope',
      undefined
    ],
    [
      'id vazio',
      '{"v":1,"id":"","type":"zoom","payload":{"op":"in"}}',
      'invalid-envelope',
      undefined
    ],
    [
      'id longo',
      JSON.stringify({
        v: 1,
        id: 'a'.repeat(MAX_ID_LENGTH + 1),
        type: 'zoom',
        payload: { op: 'in' }
      }),
      'invalid-envelope',
      undefined
    ],
    [
      'id numérico',
      '{"v":1,"id":7,"type":"zoom","payload":{"op":"in"}}',
      'invalid-envelope',
      undefined
    ],
    [
      'v=2',
      '{"v":2,"id":"a-1","type":"zoom","payload":{"op":"in"}}',
      'unsupported-version',
      'a-1'
    ],
    [
      'v="1"',
      '{"v":"1","id":"a-1","type":"zoom","payload":{"op":"in"}}',
      'unsupported-version',
      'a-1'
    ],
    [
      'tipo desconhecido',
      '{"v":1,"id":"a-1","type":"edit","payload":{}}',
      'unknown-type',
      'a-1'
    ],
    [
      'tipo de saída',
      '{"v":1,"id":"a-1","type":"opened","payload":{}}',
      'unknown-type',
      'a-1'
    ],
    [
      '__proto__ como tipo',
      '{"v":1,"id":"a-1","type":"__proto__","payload":{}}',
      'unknown-type',
      'a-1'
    ],
    [
      'payload em falta',
      '{"v":1,"id":"a-1","type":"zoom"}',
      'invalid-payload',
      'a-1'
    ],
    [
      'payload inválido',
      '{"v":1,"id":"a-1","type":"zoom","payload":{"op":"in","factor":1e9}}',
      'invalid-payload',
      'a-1'
    ],
    [
      'payload com __proto__',
      '{"v":1,"id":"a-1","type":"find","payload":{"__proto__":{"query":"x"},"matchCase":false,"scope":"drawing"}}',
      'invalid-payload',
      'a-1'
    ]
  ])('%s → error{%s}', async (_l, raw, code, replyTo) => {
    const { session, calls } = spySession()
    const out = await createViewerDispatcher(session).receive(raw)
    expect(out).toHaveLength(1)
    const msg = parse(out[0])
    expect(msg.type).toBe('error')
    if (msg.type !== 'error') return
    expect(msg.payload.code).toBe(code)
    expect(msg.replyTo).toBe(replyTo)
    expect(msg.payload.replyTo).toBe(replyTo)
    expect(calls).toHaveLength(0)
    expect(({} as Record<string, unknown>).query).toBeUndefined()
  })

  test('sessão que rejeita → error{internal} correlacionado (nunca lança)', async () => {
    const d = createViewerDispatcher({
      handle: async () => {
        throw new Error('defeito')
      }
    })
    const [text] = await d.receive(
      '{"v":1,"id":"a-9","type":"clearHighlight","payload":{}}'
    )
    const msg = parse(text)
    expect(msg).toMatchObject({
      type: 'error',
      replyTo: 'a-9',
      payload: { code: 'internal', replyTo: 'a-9' }
    })
  })

  test('ids de saída monotónicos com prefixo; replyTo em todas as respostas', async () => {
    const { session } = spySession(async () => [
      { type: 'log', payload: { level: 'info', message: 'a' } },
      { type: 'log', payload: { level: 'info', message: 'b' } }
    ])
    const d = createViewerDispatcher(session)
    const out = (
      await d.receive('{"v":1,"id":"a-1","type":"clearHighlight","payload":{}}')
    ).map(parse)
    expect(out.map(m => [m.id, m.replyTo])).toEqual([
      ['w-1', 'a-1'],
      ['w-2', 'a-1']
    ])
  })

  test.each(['ok', 'unavailable'] as const)(
    'ready(%s) aceite pelo app; DWG só anunciado quando ok',
    dwg => {
      const msg = parse(createViewerDispatcher(spySession().session).ready(dwg))
      expect(msg.type).toBe('ready')
      if (msg.type !== 'ready') return
      expect(msg.payload.dwg).toBe(dwg)
      expect(msg.payload.caps.includes('dwg')).toBe(dwg === 'ok')
    }
  )

  test('ida e volta pela injecção real do app (aspas, \\n, </script>, emoji, U+2028)', async () => {
    const { session, calls } = spySession()
    const query = 'a"b\n</script>😀 '
    const built = app.buildAppMessage('a-1', 'find', {
      query,
      matchCase: true,
      scope: 'drawing'
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const script = app.encodeInjection(built.message)
    const literal = /^window\.__cadBridge\.receive\((.*)\);true;$/s.exec(
      script
    )![1]
    await createViewerDispatcher(session).receive(JSON.parse(literal))
    expect(calls).toEqual([
      {
        id: 'a-1',
        type: 'find',
        payload: { query, matchCase: true, scope: 'drawing' }
      }
    ])
  })
})

// ---------------------------------------------------------------------------

function fakeManager(over: Partial<ViewLike> = {}) {
  const zooms: Array<{ box: AcGeBox2d; margin?: number }> = []
  let clears = 0
  const view: ViewLike = {
    activeLayoutBtrId: '1F',
    width: 400,
    height: 200,
    // ecrã → mundo: 1 px = 0.5 unidades, Y invertido, origem do ecrã em (10, 100)
    screenToWorld: p => ({ x: 10 + p.x * 0.5, y: 100 - p.y * 0.5 }),
    zoomTo: (box, margin) => zooms.push({ box, margin }),
    selectionSet: { clear: () => void clears++ },
    ...over
  }
  const manager: DocManagerLike & { curView: ViewLike | null } = {
    curView: view
  }
  return { manager, view, zooms, clears: () => clears }
}

describe('createDocManagerViewPort (vista real estrutural)', () => {
  const nav = jest.fn(async () => 'navigated' as const)

  test('activeLayoutId e visibleBox a partir de screenToWorld (Y invertido)', () => {
    const { manager } = fakeManager()
    const port = createDocManagerViewPort(manager, { navigateToHit: nav })
    expect(port.activeLayoutId()).toBe('1F')
    expect(port.visibleBox()).toEqual({
      min: { x: 10, y: 0 },
      max: { x: 210, y: 100 }
    })
  })

  test.each([
    ['sem largura', { width: 0 }],
    ['altura NaN', { height: NaN }],
    ['sem screenToWorld', { screenToWorld: undefined }],
    ['screenToWorld não-finito', { screenToWorld: () => ({ x: NaN, y: 0 }) }]
  ])('visibleBox %s → null', (_l, over) => {
    const { manager } = fakeManager(over as Partial<ViewLike>)
    expect(
      createDocManagerViewPort(manager, { navigateToHit: nav }).visibleBox()
    ).toBeNull()
  })

  test('zoomTo converte para AcGeBox2d com as coordenadas exactas e a margem', () => {
    const { manager, zooms } = fakeManager()
    const box: ViewBox = { min: { x: 1, y: 2 }, max: { x: 3, y: 5 } }
    createDocManagerViewPort(manager, { navigateToHit: nav }).zoomTo(box, 1)
    expect(zooms).toHaveLength(1)
    expect(zooms[0].box).toBeInstanceOf(AcGeBox2d)
    expect([
      zooms[0].box.min.x,
      zooms[0].box.min.y,
      zooms[0].box.max.x,
      zooms[0].box.max.y
    ]).toEqual([1, 2, 3, 5])
    expect(zooms[0].margin).toBe(1)
  })

  test('zoomTo com caixa inválida lança (defesa em profundidade) e não chama a vista', () => {
    const { manager, zooms } = fakeManager()
    const port = createDocManagerViewPort(manager, { navigateToHit: nav })
    expect(() =>
      port.zoomTo({ min: { x: 0, y: 0 }, max: { x: NaN, y: 1 } }, 1)
    ).toThrow('caixa de zoom inválida')
    expect(zooms).toHaveLength(0)
  })

  test('sem vista: zoomTo lança, clearSelection é no-op, navigate → no-document', async () => {
    const { manager } = fakeManager()
    manager.curView = null
    const port = createDocManagerViewPort(manager, { navigateToHit: nav })
    expect(port.activeLayoutId()).toBeNull()
    expect(port.visibleBox()).toBeNull()
    expect(() =>
      port.zoomTo({ min: { x: 0, y: 0 }, max: { x: 1, y: 1 } }, 1)
    ).toThrow('sem vista activa')
    expect(() => port.clearSelection()).not.toThrow()
    expect(
      await port.navigate({
        hit: {} as never,
        entry: {} as never,
        box: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
        signal: new AbortController().signal
      })
    ).toBe('no-document')
  })

  test('navigate delega no navigateToHit injectado com o hit e uma cópia dos insets', async () => {
    const { manager } = fakeManager()
    const navigateToHit = jest.fn(async () => 'layout-missing' as const)
    const port = createDocManagerViewPort(manager, { navigateToHit })
    const hit = { entityId: 'B1' } as AcApFindLayoutHit
    const insets = { left: 0, right: 0, top: 0, bottom: 9 }
    const out = await port.navigate({
      hit,
      entry: {} as never,
      box: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
      insets,
      signal: new AbortController().signal
    })
    expect(out).toBe('layout-missing')
    // o gestor entregue é o «guardado» (vista com zoom vetado e escritas condicionadas)
    expect(navigateToHit).toHaveBeenCalledWith(expect.anything(), hit, {
      insets
    })
    const passed = (navigateToHit.mock.calls[0] as unknown[])[2] as {
      insets: object
    }
    expect(passed.insets).not.toBe(insets)
  })

  test('integração: sessão + adaptador + DXF real — zoom in usa a caixa visível real', async () => {
    const { manager, zooms } = fakeManager()
    const session = new ViewerSession({
      dwg: 'unavailable',
      view: createDocManagerViewPort(manager, { navigateToHit: nav })
    })
    const d = createViewerDispatcher(session)
    const bytes = new Uint8Array(e2eBytes('find-layouts.dxf'))
    const open = {
      v: 1,
      id: 'a-1',
      type: 'open',
      payload: {
        name: 'f.dxf',
        size: bytes.byteLength,
        source: { kind: 'base64', data: Buffer.from(bytes).toString('base64') }
      }
    }
    expect(parse((await d.receive(JSON.stringify(open)))[0]).type).toBe(
      'opened'
    )
    expect(
      await d.receive('{"v":1,"id":"a-2","type":"zoom","payload":{"op":"in"}}')
    ).toEqual([])
    const b = zooms[0].box
    expect([b.min.x, b.min.y, b.max.x, b.max.y]).toEqual([60, 25, 160, 75])
  })
})
