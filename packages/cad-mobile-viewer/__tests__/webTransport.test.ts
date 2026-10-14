// SPDX-License-Identifier: GPL-3.0-or-later
//
// Transporte e loader do bundle real (card M4-I6): `installBridge` com uma
// janela falsa e o dispatcher REAL; mensagens validadas pelo parser REAL do app.
import * as app from '../../../apps/freedom-mobile/src/contracts/protocol'
import { createViewerDispatcher } from '../src/viewer/dispatcher'
import { ViewerSession } from '../src/viewer/session'
import { createDocManagerLoader } from '../src/web/docManagerLoader'
import { BridgeTransportError, installBridge } from '../src/web/transport'
import { FakeView } from './helpers/viewerHarness'

function setup() {
  const out: string[] = []
  const win: Parameters<typeof installBridge>[0] = {
    ReactNativeWebView: { postMessage: m => out.push(m) }
  }
  const session = new ViewerSession({
    view: new FakeView(),
    dwg: 'unavailable'
  })
  const bridge = installBridge(
    win,
    createViewerDispatcher(session),
    'unavailable'
  )
  const parsed = () =>
    out.map(raw => {
      const p = app.parseViewerMessage(raw)
      if (!p.ok) throw new Error(raw)
      return p.message
    })
  return { win, out, bridge, parsed }
}

describe('installBridge (WebView ↔ app)', () => {
  it('sem ReactNativeWebView falha à instalação (fail-closed)', () => {
    const win = {}
    const dispatcher = createViewerDispatcher({ handle: async () => [] })
    expect(() => installBridge(win, dispatcher, 'ok')).toThrow(
      BridgeTransportError
    )
    expect(win).not.toHaveProperty('__cadBridge')
  })

  it('envia ready depois de definir __cadBridge.receive', () => {
    const { win, parsed } = setup()
    expect(typeof win.__cadBridge?.receive).toBe('function')
    const [ready] = parsed()
    expect(ready.type).toBe('ready')
  })

  it('a string injectada pelo app chega ao dispatcher e a resposta volta validada', async () => {
    const { win, bridge, parsed } = setup()
    const built = app.buildAppMessage('a-1', 'zoom', { op: 'in' })
    if (!built.ok) throw new Error('build')
    const script = app.encodeInjection(built.message)
    // executa a injecção exactamente como a WebView
    new Function('window', script)(win)
    await bridge.idle()
    const reply = parsed().find(m => m.replyTo === 'a-1')
    expect(reply?.type).toBe('error')
  })

  it('lixo vira error explícito, nunca silêncio', async () => {
    const { win, bridge, parsed } = setup()
    win.__cadBridge!.receive('{nope')
    await bridge.idle()
    expect(parsed().some(m => m.type === 'error')).toBe(true)
  })

  it('falha do dispatcher vira error interno fixo', async () => {
    const out: string[] = []
    const win: Parameters<typeof installBridge>[0] = {
      ReactNativeWebView: { postMessage: m => out.push(m) }
    }
    const bridge = installBridge(
      win,
      {
        receive: async () => Promise.reject(new Error('segredo /data/x')),
        ready: () => '{}'
      },
      'ok'
    )
    win.__cadBridge!.receive('x')
    await bridge.idle()
    expect(out[1]).toContain('"internal"')
    expect(out[1]).not.toContain('segredo')
  })
})

describe('createDocManagerLoader', () => {
  const bytes = new ArrayBuffer(4)
  it('devolve a base do documento aberto', async () => {
    const database = {} as never
    const load = createDocManagerLoader({
      openDocument: async () => true,
      curDocument: { database }
    })
    await expect(load({ name: 'a.dxf', format: 'dxf', bytes })).resolves.toBe(
      database
    )
  })
  it('openDocument false ou sem base → erro explícito', async () => {
    await expect(
      createDocManagerLoader({ openDocument: async () => false })({
        name: 'a.dxf',
        format: 'dxf',
        bytes
      })
    ).rejects.toThrow('recusou')
    await expect(
      createDocManagerLoader({
        openDocument: async () => true,
        curDocument: null
      })({ name: 'a.dxf', format: 'dxf', bytes })
    ).rejects.toThrow('sem base')
  })
  it('abortado antes não abre', async () => {
    const openDocument = jest.fn(async () => true)
    const c = new AbortController()
    c.abort()
    await expect(
      createDocManagerLoader({ openDocument })({
        name: 'a.dxf',
        format: 'dxf',
        bytes,
        signal: c.signal
      })
    ).rejects.toThrow()
    expect(openDocument).not.toHaveBeenCalled()
  })
})
