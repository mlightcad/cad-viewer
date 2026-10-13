// SPDX-License-Identifier: GPL-3.0-or-later
//
// LocalAssetServer + FileFlow + BridgeClient reais + viewer sintético (M3-I5,
// spec §4.3 / ameaça A6): o URL de um asset só serve enquanto o asset existe no
// ciclo de vida do FileFlow; toda a libertação revoga o URL antes de apagar o
// ficheiro. Sem sockets (listener falso); o fecho com sockets está em `socket`.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { FileFlow, type FileFlowEvent } from '../files/fileFlow.ts'
import { createAssetIdGenerator } from '../files/names.ts'
import {
  FakeAssetStore,
  FakePicker,
  FakeUrls,
  pickedFile
} from '../fixtures/fakeFiles.ts'
import { FAKE_HOST, FakeListener, req } from '../fixtures/fakeServer.ts'
import { createHarness } from '../fixtures/harness.ts'
import { createMemoryBundle } from './bundle.ts'
import { LocalAssetServer } from './localAssetServer.ts'
import type { AssetBytesPort } from './types.ts'

const LAYOUTS = 'synthetic-layouts.dxf'
const BLOCKS = 'synthetic-blocks.dxf'

/** Os bytes servidos são os da pasta controlada do `FakeAssetStore`. */
function bytesOf(store: FakeAssetStore): AssetBytesPort {
  return {
    sizeOf: async id => store.staged.get(id) ?? null,
    read: async id => new Uint8Array(store.staged.get(id) ?? 0).fill(7)
  }
}

async function setup() {
  let k = 0
  const store = new FakeAssetStore()
  const listener = new FakeListener()
  const server = new LocalAssetServer({
    listener,
    bundle: createMemoryBundle({ 'index.html': '<p>v</p>' }),
    assets: bytesOf(store)
  })
  await server.start()
  const picker = new FakePicker()
  const events: FileFlowEvent[] = []
  const h = createHarness({ onEvent: e => flow.handle(e) })
  const flow = new FileFlow({
    picker,
    store,
    urls: server,
    bridge: h.client,
    onEvent: e => {
      events.push(e)
      h.dispatch(e)
    },
    newAssetId: createAssetIdGenerator(() => ((k += 11) % 36) / 36)
  })
  h.boot()
  const send = (name: string, size = 100) =>
    flow.openPicked(store.addSource(pickedFile(name, size), size))
  const urlOf = (name: string): string => {
    const e = events.find(x => x.kind === 'file-handed-off' && x.name === name)
    assert.ok(e && e.kind === 'file-handed-off', `sem handed-off de ${name}`)
    assert.equal(e.delivery, 'url')
    return `/${server.info!.viewerUrl.split('/').slice(3).join('/')}a/${e.assetId}`
  }
  const status = async (path: string): Promise<number> =>
    (await server.handle(req(path, { host: FAKE_HOST }))).status
  return { server, listener, store, flow, h, events, send, urlOf, status }
}

describe('o FileFlow entrega por URL do servidor e o URL serve enquanto o asset vive', () => {
  it('o fluxo usa o servidor: source.kind url, loopback, e o URL serve os bytes copiados', async () => {
    const t = await setup()
    const r = await t.send(LAYOUTS, 64)
    assert.equal(r.status, 'handed-off')
    const path = t.urlOf(LAYOUTS)
    const res = await t.server.handle(req(path))
    assert.equal(res.status, 200)
    assert.equal(res.body!.byteLength, 64)
    // acima de 8 MB já não cai em too-large: há servidor (limite do formato)
    const big = await t.send(BLOCKS, 12 * 1024 * 1024)
    assert.equal(big.status, 'handed-off')
  })

  it('opened mantém o asset activo (a partilha futura precisa dele) e o URL continua a servir', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    const path = t.urlOf(LAYOUTS)
    t.h.flush()
    assert.equal(t.h.state.document.current?.name, LAYOUTS)
    assert.equal(await t.status(path), 200)
  })

  it('novo documento aberto: o URL do anterior morre (replaced), o do novo serve', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    const first = t.urlOf(LAYOUTS)
    t.h.flush()
    await t.send(BLOCKS)
    const second = t.urlOf(BLOCKS)
    t.h.flush()
    assert.equal(await t.status(first), 404)
    assert.equal(await t.status(second), 200)
    assert.equal(t.server.stats.grants, 1)
  })

  it('open em curso substituído (superseded): o URL antigo morre logo', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    const first = t.urlOf(LAYOUTS)
    await t.send(BLOCKS)
    assert.equal(await t.status(first), 404)
    assert.equal(await t.status(t.urlOf(BLOCKS)), 200)
  })

  it('open-failed: o URL do documento recusado morre; o documento anterior mantém o seu', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    const good = t.urlOf(LAYOUTS)
    t.h.flush()
    // o viewer sintético recusa uma extensão que não conhece como DWG sem suporte
    await t.send('synthetic-layouts.dwg')
    const bad = t.urlOf('synthetic-layouts.dwg')
    t.h.flush()
    assert.equal(t.h.state.document.error?.code, 'read-failed')
    assert.equal(await t.status(bad), 404)
    assert.equal(await t.status(good), 200)
  })

  it('process-gone revoga tudo (o documento já não existe)', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    t.h.flush()
    const a = t.urlOf(LAYOUTS)
    await t.send(BLOCKS)
    const b = t.urlOf(BLOCKS)
    t.h.client.processGone()
    assert.equal(await t.status(a), 404)
    assert.equal(await t.status(b), 404)
    assert.equal(t.server.stats.grants, 0)
  })

  it('dispose do fluxo revoga tudo, activo incluído, e apaga os ficheiros', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    t.h.flush()
    const a = t.urlOf(LAYOUTS)
    assert.equal(await t.status(a), 200)
    await t.flow.dispose()
    assert.equal(await t.status(a), 404)
    assert.equal(t.server.stats.grants, 0)
    assert.equal(t.store.staged.size, 0)
  })

  it('a revogação precede o apagamento: com a remoção do ficheiro bloqueada, o URL já não serve', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    const path = t.urlOf(LAYOUTS)
    t.h.flush()
    const id = path.split('/').pop()!
    t.store.failRemove.add(id) // o ficheiro fica no disco
    await t.send(BLOCKS)
    t.h.flush() // LAYOUTS é substituído: URL revogado, ficheiro preso
    await t.flow.settled()
    assert.ok(t.store.staged.has(id), 'o ficheiro ficou no disco')
    assert.equal(await t.status(path), 404, 'mas o URL já não serve')
  })

  it('parar o servidor com um documento activo: o FileFlow cai no base64 (sem servidor)', async () => {
    const t = await setup()
    await t.send(LAYOUTS)
    t.h.flush()
    await t.server.stop()
    assert.equal(t.server.available(), false)
    const next = await t.send(BLOCKS, 1024)
    assert.equal(next.status, 'handed-off')
    const e = t.events.find(
      x => x.kind === 'file-handed-off' && x.name === BLOCKS
    )
    assert.ok(e && e.kind === 'file-handed-off')
    assert.equal(e.delivery, 'base64')
    // e sem servidor o limite do base64 volta a aplicar-se
    const big = await t.send('synthetic-many.dxf', 9 * 1024 * 1024)
    assert.deepEqual(big, { status: 'rejected', code: 'too-large' })
  })
})

describe('FileFlow chama urls.release em TODA a libertação (contrato da porta)', () => {
  function flowWith(urls: FakeUrls) {
    let k = 0
    const store = new FakeAssetStore()
    const events: FileFlowEvent[] = []
    const h = createHarness({ onEvent: e => flow.handle(e) })
    const flow = new FileFlow({
      picker: new FakePicker(),
      store,
      urls,
      bridge: h.client,
      onEvent: e => {
        events.push(e)
        h.dispatch(e)
      },
      newAssetId: createAssetIdGenerator(() => ((k += 11) % 36) / 36)
    })
    h.boot()
    urls.enabled = true
    const send = (name: string, size = 100) =>
      flow.openPicked(store.addSource(pickedFile(name, size), size))
    const released = () =>
      events.flatMap(e => (e.kind === 'file-asset-released' ? [e.assetId] : []))
    return { store, h, flow, events, send, released }
  }

  it('cada file-asset-released tem a sua revogação, pela mesma ordem (vários motivos)', async () => {
    const urls = new FakeUrls()
    const t = flowWith(urls)
    await t.send(LAYOUTS) // pendente
    await t.send(BLOCKS) // superseded
    t.h.flush() // opened → activo
    await t.send('synthetic-empty.dxf')
    t.h.flush() // replaced
    await t.send('synthetic-layouts.dwg')
    t.h.flush() // open-failed
    t.h.client.processGone() // process-gone
    await t.flow.dispose() // disposed
    const released = t.released()
    assert.ok(released.length >= 4, `só ${released.length} libertações`)
    assert.deepEqual(urls.released, released)
  })

  it('motivo validation (URL inválido do servidor) também revoga', async () => {
    const urls = new FakeUrls()
    urls.override = () => 'https://evil.example/x'
    const t = flowWith(urls)
    const r = await t.send(LAYOUTS)
    assert.deepEqual(r, { status: 'rejected', code: 'invalid-url' })
    assert.equal(urls.released.length, 1)
    assert.deepEqual(urls.released, t.released())
  })

  it('um release que lança não impede apagar o ficheiro nem emitir o evento', async () => {
    const urls = new FakeUrls()
    urls.failRelease = true
    const t = flowWith(urls)
    await t.send(LAYOUTS)
    t.h.flush()
    await t.flow.dispose()
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.released().length, 1)
    assert.equal(urls.released.length, 1)
  })

  it('um AssetUrlPort sem release (NO_LOCAL_SERVER) continua a funcionar', async () => {
    const { NO_LOCAL_SERVER } = await import('../files/ports.ts')
    assert.equal('release' in NO_LOCAL_SERVER, false)
    let k = 0
    const store = new FakeAssetStore()
    const h = createHarness({ onEvent: e => flow.handle(e) })
    const flow = new FileFlow({
      picker: new FakePicker(),
      store,
      urls: NO_LOCAL_SERVER,
      bridge: h.client,
      onEvent: e => h.dispatch(e),
      newAssetId: createAssetIdGenerator(() => ((k += 11) % 36) / 36)
    })
    h.boot()
    const r = await flow.openPicked(
      store.addSource(pickedFile(LAYOUTS, 10), 10)
    )
    assert.equal(r.status, 'handed-off')
    await flow.dispose()
    assert.equal(store.staged.size, 0)
  })
})
