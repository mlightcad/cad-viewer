// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { SendOutcome } from '../bridge/BridgeClient.ts'
import type { OpenPayload } from '../contracts/protocol.ts'
import {
  FakeAssetStore,
  FakePicker,
  FakeUrls,
  pickedFile,
  SECRET_CACHE_DIR
} from '../fixtures/fakeFiles.ts'
import {
  FILE_ERROR_MESSAGES,
  FileFlow,
  type FileFlowEvent
} from './fileFlow.ts'
import { createAssetIdGenerator } from './names.ts'
import type { BridgeOpenPort } from './ports.ts'

const MB = 1024 * 1024

class FakeBridge implements BridgeOpenPort {
  phase: BridgeOpenPort['phase'] = 'ready'
  readonly opened: OpenPayload[] = []
  outcome: SendOutcome | null = null
  private n = 0

  open(payload: OpenPayload): SendOutcome {
    this.opened.push(payload)
    return (
      this.outcome ?? {
        ok: true,
        id: `a-${++this.n}`,
        queued: this.phase === 'booting'
      }
    )
  }
}

function setup() {
  let k = 0
  const picker = new FakePicker()
  const store = new FakeAssetStore()
  const urls = new FakeUrls()
  const bridge = new FakeBridge()
  const events: FileFlowEvent[] = []
  const flow = new FileFlow({
    picker,
    store,
    urls,
    bridge,
    onEvent: e => events.push(e),
    newAssetId: createAssetIdGenerator(() => ((k += 11) % 36) / 36)
  })
  const run = (name: string, size: number | null, bytes = size ?? 1000) => {
    const file = store.addSource(pickedFile(name, size), bytes)
    return flow.openPicked(file)
  }
  const rejected = () =>
    events.filter(
      (e): e is Extract<FileFlowEvent, { kind: 'file-rejected' }> =>
        e.kind === 'file-rejected'
    )
  return { picker, store, urls, bridge, events, flow, run, rejected }
}

describe('FileFlow — entrega', () => {
  it('base64 (sem servidor): copia, consome a cópia do picker e abre com nome seguro', async () => {
    const t = setup()
    const r = await t.run('Planta final.DXF', 1000)
    assert.equal(r.status, 'handed-off')
    assert.equal(t.bridge.opened.length, 1)
    const open = t.bridge.opened[0]
    assert.equal(open.name, 'Planta final.DXF')
    assert.equal(open.size, 1000)
    assert.equal(open.source.kind, 'base64')
    assert.equal(
      Buffer.from((open.source as { data: string }).data, 'base64').length,
      1000
    )
    assert.equal(t.store.staged.size, 1)
    assert.equal(t.store.sources.size, 0, 'cópia do picker consumida')
    const handed = t.events.find(e => e.kind === 'file-handed-off')
    assert.ok(handed && handed.kind === 'file-handed-off')
    assert.equal(handed.delivery, 'base64')
    assert.equal(handed.queued, false)
    assert.deepEqual(
      t.events.map(e => e.kind),
      ['file-staging', 'file-handed-off']
    )
  })

  it('url loopback (servidor disponível): não lê base64 e o URL só leva o id opaco', async () => {
    const t = setup()
    t.urls.enabled = true
    const r = await t.run('obra.dwg', 5 * MB)
    assert.equal(r.status, 'handed-off')
    const src = t.bridge.opened[0].source
    assert.equal(src.kind, 'url')
    assert.match(
      (src as { url: string }).url,
      /^http:\/\/127\.0\.0\.1:43123\/f\/f1-[a-z0-9]{8}\.dwg$/
    )
    assert.ok(!t.store.calls.some(c => c.startsWith('read:')))
    assert.ok(!(src as { url: string }).url.includes('obra'))
  })

  it('url: aceita ficheiros acima de 8 MB até ao limite do formato', async () => {
    const t = setup()
    t.urls.enabled = true
    assert.equal((await t.run('a.dxf', 19 * MB)).status, 'handed-off')
    assert.equal((await t.run('b.dwg', 10 * MB)).status, 'handed-off')
  })

  it('open em fila (viewer a arrancar) → handed-off queued', async () => {
    const t = setup()
    t.bridge.phase = 'booting'
    await t.run('a.dxf', 100)
    const h = t.events.find(e => e.kind === 'file-handed-off')
    assert.ok(h && h.kind === 'file-handed-off' && h.queued)
  })

  it('nome com caminho/controlos vai à ponte só como basename e o uri nunca sai', async () => {
    const t = setup()
    const file = t.store.addSource(
      pickedFile('/storage/emulated/0/Obra Cliente X/../seg\u0000redo.dxf', 10),
      10
    )
    const r = await t.flow.openPicked(file)
    assert.equal(r.status, 'handed-off')
    assert.equal(t.bridge.opened[0].name, 'segredo.dxf')
    const blob = JSON.stringify([t.events, t.bridge.opened])
    assert.ok(!blob.includes(file.uri), 'uri do picker em eventos/ponte')
    assert.ok(!blob.includes('Obra Cliente'), 'pasta do utilizador')
    assert.ok(!blob.includes(SECRET_CACHE_DIR), 'pasta de cache')
  })

  it('pickAndOpen: picker → fluxo; cancelado não toca em nada', async () => {
    const t = setup()
    t.picker.queue.push({ status: 'cancelled' })
    assert.deepEqual(await t.flow.pickAndOpen(), { status: 'cancelled' })
    assert.deepEqual(
      t.events.map(e => e.kind),
      ['file-picking', 'file-cancelled']
    )
    assert.equal(t.store.calls.length, 0)
    assert.equal(t.bridge.opened.length, 0)
    t.picker.willPick(t.store.addSource(pickedFile('x.dxf', 5), 5))
    const r = await t.flow.pickAndOpen()
    assert.equal(r.status, 'handed-off')
  })

  it('picker a lançar → read-failed (stage pick) sem caminhos na causa', async () => {
    const t = setup()
    t.picker.queue.push(new Error(`EACCES file://${SECRET_CACHE_DIR}/x`))
    const r = await t.flow.pickAndOpen()
    assert.deepEqual(r, { status: 'rejected', code: 'read-failed' })
    const [rej] = t.rejected()
    assert.equal(rej.stage, 'pick')
    assert.equal(rej.message, FILE_ERROR_MESSAGES['read-failed'])
    assert.ok(!JSON.stringify(rej).includes('data/user'))
  })
})

describe('FileFlow — validação local (nada chega ao viewer)', () => {
  it('extensão inválida: rejeita, apaga a cópia do picker e não copia nem abre', async () => {
    const t = setup()
    const file = t.store.addSource(pickedFile('foto.png', 100), 100)
    const r = await t.flow.openPicked(file)
    assert.deepEqual(r, { status: 'rejected', code: 'unsupported-ext' })
    assert.equal(t.store.sources.size, 0, 'cópia do picker apagada')
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.bridge.opened.length, 0)
    assert.ok(!t.store.calls.some(c => c.startsWith('stage')))
    assert.equal(t.rejected()[0].name, null)
  })

  it('ficheiro do utilizador (owned=false) rejeitado NÃO é apagado', async () => {
    const t = setup()
    const f = pickedFile('x.txt', 5, { owned: false })
    t.store.addSource(f, 5)
    await t.flow.openPicked(f)
    assert.equal(t.store.sources.size, 1)
  })

  it('too-large por formato (DXF 20 MB, DWG 10 MB), sem copiar', async () => {
    const t = setup()
    t.urls.enabled = true
    for (const [name, size] of [
      ['a.dxf', 20 * MB + 1],
      ['b.dwg', 10 * MB + 1]
    ] as const) {
      const r = await t.run(name, size)
      assert.deepEqual(r, { status: 'rejected', code: 'too-large' }, name)
    }
    assert.equal(t.store.staged.size, 0)
    assert.ok(!t.store.calls.some(c => c.startsWith('stage')))
    assert.equal(t.bridge.opened.length, 0)
  })

  it('sem servidor local o limite efectivo é 8 MB (rejeitado antes de copiar)', async () => {
    const t = setup()
    const r = await t.run('a.dxf', 9 * MB)
    assert.deepEqual(r, { status: 'rejected', code: 'too-large' })
    assert.ok(!t.store.calls.some(c => c.startsWith('stage')))
    assert.equal(t.store.sources.size, 0)
  })

  it('tamanho 0 / inválido → read-failed', async () => {
    const t = setup()
    for (const size of [0, -5, 1.5, Number.NaN]) {
      const r = await t.run('a.dxf', size)
      assert.deepEqual(
        r,
        { status: 'rejected', code: 'read-failed' },
        String(size)
      )
    }
  })

  it('size null: pergunta ao store; falha de leitura → read-failed sem caminhos', async () => {
    const t = setup()
    assert.equal((await t.run('a.dxf', null, 77)).status, 'handed-off')
    assert.equal(t.bridge.opened[0].size, 77)
    const f = t.store.addSource(pickedFile('b.dxf', null), 5)
    t.store.failSizeOf = true
    const r = await t.flow.openPicked(f)
    assert.deepEqual(r, { status: 'rejected', code: 'read-failed' })
    const rej = t.rejected().at(-1)
    assert.ok(rej)
    assert.ok(!JSON.stringify(rej).includes(f.uri))
    assert.ok(!JSON.stringify(rej).includes('data/user'))
    assert.equal(t.store.sources.size, 0)
  })

  it('viewer indisponível (failed): rejeita antes de copiar', async () => {
    const t = setup()
    t.bridge.phase = 'failed'
    const r = await t.run('a.dxf', 10)
    assert.deepEqual(r, { status: 'rejected', code: 'viewer-unavailable' })
    assert.ok(!t.store.calls.some(c => c.startsWith('stage')))
    assert.equal(t.store.sources.size, 0)
  })
})

describe('FileFlow — cópia e entrega (falhas)', () => {
  it('TOCTOU: o tamanho real da cópia manda; excesso → too-large e asset apagado', async () => {
    const t = setup()
    t.store.options.stageSizeOverride = 30 * MB
    const r = await t.run('a.dxf', 1000)
    assert.deepEqual(r, { status: 'rejected', code: 'too-large' })
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.bridge.opened.length, 0)
    assert.ok(
      t.events.some(
        e => e.kind === 'file-asset-released' && e.reason === 'validation'
      )
    )
  })

  it('o size enviado é o real (não o declarado)', async () => {
    const t = setup()
    t.store.options.stageSizeOverride = 1000
    const f = t.store.addSource(pickedFile('a.dxf', 900), 1000)
    await t.flow.openPicked(f)
    assert.equal(t.bridge.opened[0].size, 1000)
  })

  it('stage falha → read-failed, asset não fica, causa sem caminhos', async () => {
    const t = setup()
    t.store.failStage = true
    const f = t.store.addSource(pickedFile('a.dxf', 100), 100)
    const r = await t.flow.openPicked(f)
    assert.deepEqual(r, { status: 'rejected', code: 'read-failed' })
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.flow.tracked.length, 0)
    assert.equal(t.store.sources.size, 0, 'cópia do picker apagada')
    const blob = JSON.stringify(t.events)
    assert.ok(!blob.includes('data/user') && !blob.includes(f.uri), blob)
    assert.equal(t.bridge.opened.length, 0)
  })

  it('URL externo/malformado/nulo devolvido pelo servidor → invalid-url (fail-closed)', async () => {
    for (const bad of [
      'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/x.dxf',
      'http://example.com:80/x',
      'file:///data/x.dxf',
      null
    ]) {
      const t = setup()
      t.urls.enabled = true
      t.urls.override = () => bad
      const r = await t.run('a.dxf', 100)
      assert.deepEqual(
        r,
        { status: 'rejected', code: 'invalid-url' },
        String(bad)
      )
      await t.flow.settled()
      assert.equal(t.store.staged.size, 0)
      assert.equal(t.bridge.opened.length, 0)
    }
  })

  it('leitura base64 a falhar → read-failed e asset apagado', async () => {
    const t = setup()
    t.store.failRead = true
    const r = await t.run('a.dxf', 100)
    assert.deepEqual(r, { status: 'rejected', code: 'read-failed' })
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.ok(!JSON.stringify(t.events).includes('data/user'))
  })

  it('base64 incoerente com o tamanho → read-failed', async () => {
    const t = setup()
    t.store.base64Override = 'AAAA'
    const r = await t.run('a.dxf', 100)
    assert.deepEqual(r, { status: 'rejected', code: 'read-failed' })
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
  })

  it('open rejeitado pela ponte → asset apagado e código mapeado', async () => {
    const t = setup()
    t.bridge.outcome = {
      ok: false,
      error: {
        code: 'not-ready',
        message: 'o viewer ainda não está pronto (open)'
      }
    }
    const r = await t.run('a.dxf', 100)
    assert.deepEqual(r, { status: 'rejected', code: 'not-ready' })
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.rejected()[0].stage, 'open')
    // código desconhecido → send-failed (nunca silencioso)
    t.bridge.outcome = {
      ok: false,
      error: { code: 'weird' as never, message: 'x' }
    }
    const r2 = await t.run('b.dxf', 100)
    assert.deepEqual(r2, { status: 'rejected', code: 'send-failed' })
  })

  it('id de asset inválido do gerador → invalid-payload sem copiar', async () => {
    const t = setup()
    const flow = new FileFlow({
      picker: t.picker,
      store: t.store,
      urls: t.urls,
      bridge: t.bridge,
      onEvent: e => t.events.push(e),
      newAssetId: () => '../evil'
    })
    const f = t.store.addSource(pickedFile('a.dxf', 10), 10)
    assert.deepEqual(await flow.openPicked(f), {
      status: 'rejected',
      code: 'invalid-payload'
    })
    assert.ok(!t.store.calls.some(c => c.startsWith('stage')))
  })
})

describe('FileFlow — concorrência e fecho', () => {
  it('pedido novo durante a cópia substitui o anterior (que se limpa e nunca abre)', async () => {
    const t = setup()
    let release!: () => void
    t.store.stageGate = new Promise<void>(r => (release = r))
    const first = t.run('um.dxf', 100)
    await Promise.resolve()
    const second = await t.run('dois.dxf', 200)
    assert.equal(second.status, 'handed-off')
    release()
    assert.deepEqual(await first, { status: 'superseded' })
    await t.flow.settled()
    assert.equal(t.bridge.opened.length, 1)
    assert.equal(t.bridge.opened[0].name, 'dois.dxf')
    assert.equal(t.store.staged.size, 1, 'só o asset do segundo')
    assert.ok(
      t.events.some(e => e.kind === 'file-superseded' && e.name === 'um.dxf')
    )
  })

  it('dispose durante a cópia: o asset é apagado e não há eventos depois', async () => {
    const t = setup()
    let release!: () => void
    t.store.stageGate = new Promise<void>(r => (release = r))
    const p = t.run('a.dxf', 100)
    await Promise.resolve()
    await t.flow.dispose()
    const before = t.events.length
    release()
    assert.deepEqual(await p, { status: 'superseded' })
    await t.flow.settled()
    assert.equal(t.store.staged.size, 0)
    assert.equal(t.events.length, before)
    assert.equal(t.bridge.opened.length, 0)
  })

  it('depois de dispose, pickAndOpen rejeita com viewer-unavailable', async () => {
    const t = setup()
    await t.flow.dispose()
    const r = await t.flow.pickAndOpen()
    assert.deepEqual(r, { status: 'rejected', code: 'viewer-unavailable' })
    assert.equal(t.picker.calls, 0)
  })
})

describe('FileFlow — limpeza', () => {
  it('startup apaga as sobras da pasta controlada e informa quantas', async () => {
    const t = setup()
    t.store.staged.set('f9-leftover', 10)
    t.store.staged.set('f8-leftover', 10)
    await t.flow.startup()
    assert.equal(t.store.staged.size, 0)
    assert.deepEqual(t.events, [{ kind: 'file-sweep', removed: 2 }])
  })

  it('startup a falhar → file-cleanup-failed sem caminhos', async () => {
    const t = setup()
    t.store.failSweep = true
    await t.flow.startup()
    assert.equal(t.events.length, 1)
    assert.equal(t.events[0].kind, 'file-cleanup-failed')
    assert.ok(!JSON.stringify(t.events).includes('data/user'))
  })

  it('remoção que falha fica registada (leaked) e retryCleanup volta a tentar', async () => {
    const t = setup()
    await t.run('a.dxf', 100)
    const [{ assetId }] = t.flow.tracked
    t.store.failRemove.add(assetId)
    await t.flow.dispose()
    assert.deepEqual(t.flow.leakedIds, [assetId])
    assert.equal(t.store.staged.size, 1, 'ainda no disco')
    t.store.failRemove.clear()
    await t.flow.retryCleanup()
    assert.deepEqual(t.flow.leakedIds, [])
    assert.equal(t.store.staged.size, 0)
  })

  it('o aviso de cleanup-failed não traz o caminho nem o id do utilizador', async () => {
    const t = setup()
    await t.run('a.dxf', 100)
    const [{ assetId }] = t.flow.tracked
    t.store.failRemove.add(assetId)
    // dispose emite a libertação e a falha ANTES de se fechar
    const flow = t.flow
    await flow.dispose()
    const blob = JSON.stringify(t.events)
    assert.ok(!blob.includes('data/user'), blob)
  })
})
