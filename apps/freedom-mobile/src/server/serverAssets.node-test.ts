// SPDX-License-Identifier: GPL-3.0-or-later
//
// Assets (documentos abertos) no LocalAssetServer: concessões, revogação, tectos,
// concorrência de leituras e corridas com revogação/paragem (M3-I5, spec §3 A3,
// A5, A6). Listener falso; bytes do asset falsos com portões e contadores.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { MAX_DOCUMENT_BYTES } from '../contracts/protocol.ts'
import { isLocalAssetUrl } from '../files/names.ts'
import {
  bodyText,
  deferred,
  FAKE_ORIGIN,
  makeRig,
  req,
  SECRET_PATH
} from '../fixtures/fakeServer.ts'
import { ERROR_TEXT } from './security.ts'
import type { ServerResponse } from './types.ts'

const ID = 'f1-aaaaaaaa'
const ID2 = 'f2-bbbbbbbb'
const ID3 = 'f3-cccccccc'

async function running(overrides: Parameters<typeof makeRig>[0] = {}) {
  const t = makeRig(overrides)
  await t.start()
  return t
}

const pathOf = (url: string | null): string => new URL(url as string).pathname

const lower = (res: ServerResponse): Record<string, string> =>
  Object.fromEntries(
    Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), v])
  )

describe('urlFor / concessões', () => {
  it('devolve um URL de loopback aceite por isLocalAssetUrl (o validador do FileFlow)', async () => {
    const t = await running()
    const url = t.server.urlFor(ID, 'dxf')
    assert.ok(url)
    assert.ok(url.startsWith(`${FAKE_ORIGIN}/s/${t.token()}/a/${ID}`))
    assert.equal(isLocalAssetUrl(url), true)
  })

  it('null fora de running, com id inválido ou formato desconhecido', async () => {
    const t = makeRig()
    assert.equal(t.server.urlFor(ID, 'dxf'), null)
    await t.start()
    for (const id of [
      '',
      'x',
      '../etc',
      'F1-AAAAAAAA',
      'f1-aaaa', // 7 chars: abaixo do mínimo de 8
      `f1-${'a'.repeat(70)}`,
      'f1/aaaaaaaa',
      'f1-aaaa%2e%2e',
      'f1-aaaaaaaa\n'
    ]) {
      assert.equal(t.server.urlFor(id, 'dxf'), null, JSON.stringify(id))
    }
    assert.equal(t.server.urlFor(ID, 'pdf' as never), null)
    assert.equal(t.server.urlFor(ID, undefined as never), null)
    assert.equal(t.server.stats.grants, 0)
    await t.server.stop()
    assert.equal(t.server.urlFor(ID, 'dxf'), null)
  })

  it('o mesmo asset concedido duas vezes continua a ser uma só concessão', async () => {
    const t = await running()
    t.server.urlFor(ID, 'dxf')
    t.server.urlFor(ID, 'dxf')
    assert.equal(t.server.stats.grants, 1)
  })

  it('maxGrants: a concessão mais antiga é revogada (404), as recentes servem', async () => {
    const t = await running({ limits: { maxGrants: 2 } })
    for (const id of [ID, ID2, ID3]) t.assets.add(id, id)
    const p1 = pathOf(t.server.urlFor(ID, 'dxf'))
    const p2 = pathOf(t.server.urlFor(ID2, 'dxf'))
    const p3 = pathOf(t.server.urlFor(ID3, 'dxf'))
    assert.equal(t.server.stats.grants, 2)
    assert.equal((await t.listener.request(req(p1))).status, 404)
    assert.equal((await t.listener.request(req(p2))).status, 200)
    assert.equal((await t.listener.request(req(p3))).status, 200)
  })

  it('reconceder um asset renova-o (não é o primeiro a ser expulso)', async () => {
    const t = await running({ limits: { maxGrants: 2 } })
    for (const id of [ID, ID2, ID3]) t.assets.add(id, id)
    t.server.urlFor(ID, 'dxf')
    t.server.urlFor(ID2, 'dxf')
    const p1 = pathOf(t.server.urlFor(ID, 'dxf')) // renova ID
    t.server.urlFor(ID3, 'dxf') // expulsa ID2
    assert.equal((await t.listener.request(req(p1))).status, 200)
    assert.equal(
      (await t.listener.request(req(t.path(`a/${ID2}`)))).status,
      404
    )
  })
})

describe('serve só o concedido', () => {
  it('200 com os bytes exactos, octet-stream, attachment e cabeçalhos de segurança', async () => {
    const t = await running()
    t.assets.add(ID, new Uint8Array([9, 8, 7, 6, 5]))
    const res = await t.listener.request(
      req(pathOf(t.server.urlFor(ID, 'dxf')))
    )
    assert.equal(res.status, 200)
    assert.deepEqual([...res.body!], [9, 8, 7, 6, 5])
    const h = lower(res)
    assert.equal(h['content-type'], 'application/octet-stream')
    assert.equal(h['content-disposition'], 'attachment')
    assert.equal(h['content-length'], '5')
    assert.equal(h['cache-control'], 'no-store')
    assert.equal(h['x-content-type-options'], 'nosniff')
    assert.equal(h['content-security-policy'], undefined)
  })

  it('HEAD: tamanho sem ler o ficheiro', async () => {
    const t = await running()
    t.assets.add(ID, new Uint8Array(7))
    const res = await t.listener.request(
      req(pathOf(t.server.urlFor(ID, 'dxf')), { method: 'HEAD' })
    )
    assert.equal(res.status, 200)
    assert.equal(res.body, null)
    assert.equal(lower(res)['content-length'], '7')
    assert.equal(t.assets.readCalls, 0)
  })

  it('o ficheiro existe no store mas não foi concedido → 404 e nem consulta o store', async () => {
    const t = await running()
    t.assets.add(ID, 'segredo')
    const res = await t.listener.request(req(t.path(`a/${ID}`)))
    assert.equal(res.status, 404)
    assert.equal(t.assets.sizeCalls, 0)
    assert.equal(t.assets.readCalls, 0)
    assert.doesNotMatch(bodyText(res), /segredo/)
  })

  it('id com forma inválida → 404 sem consultar o store', async () => {
    const t = await running()
    for (const id of ['..', 'F1-AAAAAAAA', 'f1', 'a'.repeat(200), '%2e%2e']) {
      const res = await t.listener.request(req(t.path(`a/${id}`)))
      assert.ok([400, 404].includes(res.status), id)
    }
    assert.equal(t.assets.sizeCalls, 0)
  })

  it('release revoga: o mesmo URL passa a 404 (e idempotente)', async () => {
    const t = await running()
    t.assets.add(ID, 'x')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    assert.equal((await t.listener.request(req(p))).status, 200)
    t.server.release(ID)
    t.server.release(ID)
    t.server.release('nao-concedido')
    assert.equal((await t.listener.request(req(p))).status, 404)
    assert.equal(t.server.stats.grants, 0)
  })

  it('asset apagado do store (sizeOf null) → 404 mesmo concedido', async () => {
    const t = await running()
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    assert.equal((await t.listener.request(req(p))).status, 404)
  })
})

describe('tectos e coerência', () => {
  it('acima do tecto do formato → 413 sem ler (dwg 10 MB, dxf 20 MB)', async () => {
    for (const [format, max] of [
      ['dwg', MAX_DOCUMENT_BYTES.dwg],
      ['dxf', MAX_DOCUMENT_BYTES.dxf]
    ] as const) {
      const t = await running()
      t.assets.add(ID, 'x')
      t.assets.sizeOverride = max + 1
      const res = await t.listener.request(
        req(pathOf(t.server.urlFor(ID, format)))
      )
      assert.equal(res.status, 413, format)
      assert.equal(bodyText(res), ERROR_TEXT[413])
      assert.equal(t.assets.readCalls, 0)
    }
  })

  it('no tecto exacto serve; tamanho 0, negativo ou não inteiro → 500', async () => {
    const t = await running()
    t.assets.add(ID, new Uint8Array(4))
    const p = pathOf(t.server.urlFor(ID, 'dwg'))
    t.assets.sizeOverride = MAX_DOCUMENT_BYTES.dwg
    // read devolve 4 bytes ≠ tamanho anunciado → incoerente
    assert.equal((await t.listener.request(req(p))).status, 500)
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      t.assets.sizeOverride = bad
      assert.equal((await t.listener.request(req(p))).status, 500, String(bad))
    }
    assert.equal(t.assets.readCalls, 1, 'só a primeira chegou a ler')
  })

  it('o tecto depende do formato concedido (dwg ≤ 10 MB mesmo que dxf aceite 20 MB)', async () => {
    const t = await running()
    t.assets.add(ID, 'x')
    t.assets.add(ID2, 'y')
    t.assets.sizeOverride = MAX_DOCUMENT_BYTES.dwg + 1
    assert.equal(
      (await t.listener.request(req(pathOf(t.server.urlFor(ID, 'dwg')))))
        .status,
      413
    )
    // dxf com o mesmo tamanho passa o tecto e só falha por incoerência de leitura
    assert.equal(
      (await t.listener.request(req(pathOf(t.server.urlFor(ID2, 'dxf')))))
        .status,
      500
    )
  })

  it('bytes lidos ≠ tamanho (ficheiro mudou entre sizeOf e read) → 500, nunca serve', async () => {
    const t = await running()
    t.assets.add(ID, new Uint8Array(10))
    t.assets.sizeOverride = 9
    const res = await t.listener.request(
      req(pathOf(t.server.urlFor(ID, 'dxf')))
    )
    assert.equal(res.status, 500)
    assert.equal(res.body && res.body.byteLength !== 10, true)
  })
})

describe('falhas do store (códigos fixos, sem fugas)', () => {
  it('sizeOf ou read a lançar → 500 sem a mensagem (que traz caminhos)', async () => {
    const t = await running()
    t.assets.add(ID, 'x')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    t.assets.failSize = new Error(`EACCES ${SECRET_PATH}/${ID}`)
    let res = await t.listener.request(req(p))
    assert.equal(res.status, 500)
    t.assets.failSize = null
    t.assets.failRead = new Error(`EIO ${SECRET_PATH}/${ID}`)
    res = await t.listener.request(req(p))
    assert.equal(res.status, 500)
    assert.equal(bodyText(res), ERROR_TEXT[500])
    assert.doesNotMatch(
      JSON.stringify(res),
      /EACCES|EIO|data\/user|freedom-assets/
    )
    assert.doesNotMatch(JSON.stringify(t.events), /data\/user|freedom-assets/)
  })

  it('leitura acima de requestTimeoutMs → 504 e o lugar só é libertado quando termina', async () => {
    const t = await running({
      limits: { requestTimeoutMs: 20, maxAssetReads: 1 }
    })
    t.assets.add(ID, 'x')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const gate = deferred()
    t.assets.readGate = gate.promise
    const res = await t.listener.request(req(p))
    assert.equal(res.status, 504)
    // a leitura ainda corre em segundo plano: o único lugar continua ocupado
    assert.equal(t.server.stats.assetReads, 1)
    assert.equal((await t.listener.request(req(p))).status, 503)
    gate.resolve()
    await new Promise(r => setImmediate(r))
    await new Promise(r => setImmediate(r))
    assert.equal(t.server.stats.assetReads, 0)
    assert.equal((await t.listener.request(req(p))).status, 200)
  })
})

describe('concorrência de leituras (maxAssetReads / maxInFlight)', () => {
  it('3.ª leitura simultânea → 503 busy com Retry-After; depois dos portões abrem todas', async () => {
    const t = await running({ limits: { maxAssetReads: 2 } })
    for (const id of [ID, ID2, ID3]) t.assets.add(id, id)
    const paths = [ID, ID2, ID3].map(id => pathOf(t.server.urlFor(id, 'dxf')))
    const gate = deferred()
    // o mesmo portão para as duas primeiras leituras
    t.assets.readGate = gate.promise
    const first = t.listener.request(req(paths[0]))
    await new Promise(r => setImmediate(r))
    const gate2 = deferred()
    t.assets.readGate = gate2.promise
    const second = t.listener.request(req(paths[1]))
    await new Promise(r => setImmediate(r))
    assert.equal(t.server.stats.assetReads, 2)
    const third = await t.listener.request(req(paths[2]))
    assert.equal(third.status, 503)
    assert.equal(lower(third)['retry-after'], '1')
    gate.resolve()
    gate2.resolve()
    assert.deepEqual(
      (await Promise.all([first, second])).map(r => r.status),
      [200, 200]
    )
    assert.equal(t.server.stats.assetReads, 0)
    assert.equal((await t.listener.request(req(paths[2]))).status, 200)
  })

  it('rajada de 40 pedidos ao mesmo asset: nunca mais de maxAssetReads leituras em simultâneo, só 200/503', async () => {
    const t = await running({ limits: { maxAssetReads: 2, maxInFlight: 64 } })
    t.assets.add(ID, new Uint8Array(1024))
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const origRead = t.assets.read.bind(t.assets)
    t.assets.read = async id => {
      await new Promise(r => setImmediate(r)) // dá tempo a sobrepor
      return origRead(id)
    }
    const results = await Promise.all(
      Array.from({ length: 40 }, () => t.listener.request(req(p)))
    )
    const statuses = new Set(results.map(r => r.status))
    for (const s of statuses) assert.ok(s === 200 || s === 503, String(s))
    assert.ok(results.some(r => r.status === 200))
    assert.ok(t.assets.maxReading <= 2, `maxReading=${t.assets.maxReading}`)
    assert.equal(t.server.stats.assetReads, 0)
    assert.equal(t.server.stats.inFlight, 0)
    for (const r of results.filter(r => r.status === 200)) {
      assert.equal(r.body!.byteLength, 1024)
    }
  })

  it('maxInFlight também limita os pedidos de assets', async () => {
    const t = await running({ limits: { maxInFlight: 1, maxAssetReads: 5 } })
    t.assets.add(ID, 'x')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const gate = deferred()
    t.assets.readGate = gate.promise
    const a = t.listener.request(req(p))
    await new Promise(r => setImmediate(r))
    assert.equal((await t.listener.request(req(p))).status, 503)
    gate.resolve()
    assert.equal((await a).status, 200)
  })

  it('pedidos a assets diferentes em simultâneo recebem cada um os seus bytes', async () => {
    const t = await running({ limits: { maxAssetReads: 8, maxGrants: 8 } })
    const ids = Array.from({ length: 6 }, (_, i) => `f${i + 1}-aaaa000${i}`)
    ids.forEach((id, i) => t.assets.add(id, new Uint8Array(i + 1).fill(i + 1)))
    const paths = ids.map(id => pathOf(t.server.urlFor(id, 'dxf')))
    const out = await Promise.all(paths.map(p => t.listener.request(req(p))))
    out.forEach((r, i) => {
      assert.equal(r.status, 200)
      assert.deepEqual([...r.body!], Array(i + 1).fill(i + 1))
    })
  })
})

describe('corridas com revogação e paragem (nunca serve depois)', () => {
  it('release durante a leitura → 404 e os bytes não saem', async () => {
    const t = await running()
    t.assets.add(ID, 'conteudo-secreto')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const gate = deferred()
    t.assets.readGate = gate.promise
    const pending = t.listener.request(req(p))
    await new Promise(r => setImmediate(r))
    t.server.release(ID)
    gate.resolve()
    const res = await pending
    assert.equal(res.status, 404)
    assert.doesNotMatch(bodyText(res), /conteudo/)
  })

  it('release durante o sizeOf → 404 sem sequer ler', async () => {
    const t = await running()
    t.assets.add(ID, 'x')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const gate = deferred()
    t.assets.sizeGate = gate.promise
    const pending = t.listener.request(req(p))
    await new Promise(r => setImmediate(r))
    t.server.release(ID)
    gate.resolve()
    assert.equal((await pending).status, 404)
    assert.equal(t.assets.readCalls, 0)
  })

  it('stop durante o sizeOf → 503 sem chegar a ler o ficheiro', async () => {
    const t = await running()
    t.assets.add(ID, 'conteudo-secreto')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const gate = deferred()
    t.assets.sizeGate = gate.promise
    const pending = t.listener.request(req(p))
    await new Promise(r => setImmediate(r))
    const stopping = t.server.stop()
    gate.resolve()
    const res = await pending
    assert.equal(res.status, 503)
    assert.doesNotMatch(bodyText(res), /conteudo/)
    await stopping
    assert.equal(t.assets.readCalls, 0)
  })

  it('stop durante a leitura → 503 e os bytes não saem; depois de reiniciar, o URL antigo é 404', async () => {
    const t = await running()
    t.assets.add(ID, 'conteudo-secreto')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    const gate = deferred()
    t.assets.readGate = gate.promise
    const pending = t.listener.request(req(p))
    await new Promise(r => setImmediate(r))
    const stopping = t.server.stop()
    gate.resolve()
    const res = await pending
    assert.equal(res.status, 503)
    assert.doesNotMatch(bodyText(res), /conteudo/)
    await stopping
    await t.start()
    assert.equal((await t.listener.request(req(p))).status, 404)
  })

  it('conceder, revogar e reconceder em sequência rápida: só o último estado conta', async () => {
    const t = await running()
    t.assets.add(ID, 'x')
    const p = pathOf(t.server.urlFor(ID, 'dxf'))
    t.server.release(ID)
    assert.equal((await t.listener.request(req(p))).status, 404)
    t.server.urlFor(ID, 'dxf')
    assert.equal((await t.listener.request(req(p))).status, 200)
  })
})
