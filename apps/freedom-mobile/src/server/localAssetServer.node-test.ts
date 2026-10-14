// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ciclo de vida do LocalAssetServer (M3-I5, spec §4.2): arranque, paragem,
// concorrência de start/stop, reinício com token novo, perda do listener,
// escuta só em loopback e erros determinísticos. Listener falso (sem sockets).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  bodyText,
  BUNDLE_FILES,
  deferred,
  FAKE_HOST,
  FAKE_ORIGIN,
  FAKE_PORT,
  makeRig,
  req,
  SECRET_PATH
} from '../fixtures/fakeServer.ts'
import { createMemoryBundle } from './bundle.ts'
import { LocalServerError } from './errors.ts'
import { LocalAssetServer } from './localAssetServer.ts'
import { defaultRandomBytes, TOKEN_PATTERN } from './security.ts'

const isErr = (code: string) => (e: unknown) =>
  e instanceof LocalServerError && e.code === code

const states = (events: { kind: string; state?: string }[]): string[] =>
  events.flatMap(e => (e.kind === 'state' ? [String(e.state)] : []))

describe('arranque', () => {
  it('start → running: origem 127.0.0.1, URL do viewer com token de 256 bits', async () => {
    const t = makeRig()
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.server.available(), false)
    assert.equal(t.server.info, null)
    const info = await t.start()
    assert.equal(t.server.state, 'running')
    assert.equal(t.server.available(), true)
    assert.equal(info.origin, FAKE_ORIGIN)
    const m = /^http:\/\/127\.0\.0\.1:(\d+)\/s\/([^/]+)\/$/.exec(info.viewerUrl)
    assert.ok(m, info.viewerUrl)
    assert.equal(Number(m[1]), FAKE_PORT)
    assert.match(m[2], TOKEN_PATTERN)
    assert.deepEqual(states(t.events), ['starting', 'running'])
  })

  it('start concorrente: um só listen e a mesma informação', async () => {
    const t = makeRig()
    const gate = deferred()
    t.listener.listenGate = gate.promise
    const a = t.start()
    const b = t.start()
    assert.equal(t.server.state, 'starting')
    gate.resolve()
    const [ia, ib] = await Promise.all([a, b])
    assert.equal(t.listener.listenCalls, 1)
    assert.deepEqual(ia, ib)
  })

  it('start com o servidor a correr é idempotente (sem novo listener nem novo token)', async () => {
    const t = makeRig()
    const a = await t.start()
    const b = await t.start()
    assert.equal(t.listener.listenCalls, 1)
    assert.equal(a.viewerUrl, b.viewerUrl)
  })

  it('o listener recebe o handler e o aviso de fecho; nada mais', async () => {
    const t = makeRig()
    await t.start()
    assert.equal(typeof t.listener.handler, 'function')
    assert.equal(typeof t.listener.onClosed, 'function')
  })
})

describe('falhas de arranque (códigos fixos, sem fugas)', () => {
  it('listen falha → listen-failed, causa sem caminhos, estado stopped e novo start possível', async () => {
    const t = makeRig()
    t.listener.failListen = new Error(
      `EADDRINUSE: ${SECRET_PATH}/sock file:///data/x content://media/1`
    )
    await assert.rejects(t.start(), (e: unknown) => {
      assert.ok(e instanceof LocalServerError)
      assert.equal(e.code, 'listen-failed')
      assert.doesNotMatch(
        `${e.message} ${e.detail}`,
        /data\/user|file:|content:|freedom-assets/
      )
      assert.match(String(e.detail), /EADDRINUSE/)
      return true
    })
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.server.available(), false)
    assert.equal(t.listener.closeCalls, 1) // closeListener antes de relançar
    await t.server.dispose() // seguro após start falhado
    await t.server.dispose() // idempotente
    assert.equal(t.server.state, 'disposed')
    t.listener.failListen = null
  })

  it('listen falha → start seguinte (sem dispose) liga e não deixa porta presa', async () => {
    const t = makeRig()
    t.listener.failListen = new Error('EADDRINUSE')
    await assert.rejects(t.start(), isErr('listen-failed'))
    assert.equal(t.listener.closeCalls, 1)
    t.listener.failListen = null
    await t.start()
    assert.equal(t.server.state, 'running')
    await t.server.stop()
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.listener.closeCalls, 2)
  })

  for (const address of [
    { host: '0.0.0.0', port: 43210 },
    { host: '::', port: 43210 },
    { host: '::1', port: 43210 },
    { host: 'localhost', port: 43210 },
    { host: '::ffff:127.0.0.1', port: 43210 },
    { host: '192.168.1.5', port: 43210 },
    { host: '127.0.0.2', port: 43210 },
    { host: '127.0.0.1', port: 0 },
    { host: '127.0.0.1', port: 70000 },
    { host: '127.0.0.1', port: Number.NaN },
    { host: '127.0.0.1', port: 80.5 },
    { host: '', port: 43210 }
  ]) {
    it(`endereço devolvido ${JSON.stringify(address)} → not-loopback: fecha e não serve`, async () => {
      const t = makeRig()
      t.listener.address = address
      await assert.rejects(t.start(), isErr('not-loopback'))
      assert.equal(t.listener.closeCalls, 1)
      assert.equal(t.server.state, 'stopped')
      assert.equal(t.server.info, null)
      assert.equal(t.server.available(), false)
    })
  }

  it('sem aleatoriedade segura (lança, comprimento errado ou tipo errado) → no-secure-random sem abrir listener', async () => {
    const bad: ((n: number) => Uint8Array)[] = [
      () => {
        throw new Error('sem crypto')
      },
      () => new Uint8Array(16),
      () => new Uint8Array(33),
      () => [1, 2, 3] as unknown as Uint8Array
    ]
    for (const randomBytes of bad) {
      const t = makeRig({ randomBytes })
      await assert.rejects(t.start(), isErr('no-secure-random'))
      assert.equal(t.listener.listenCalls, 0)
      assert.equal(t.server.state, 'stopped')
    }
  })

  it('a omissão usa crypto real: o token difere entre sessões', async () => {
    const rig = makeRig()
    const server = new LocalAssetServer({
      listener: rig.listener,
      bundle: createMemoryBundle(BUNDLE_FILES),
      assets: rig.assets
    })
    const a = await server.start()
    await server.stop()
    const b = await server.start()
    assert.notEqual(a.viewerUrl, b.viewerUrl)
    await server.dispose()
  })
})

describe('paragem', () => {
  it('stop revoga tudo no instante da chamada e fecha o listener', async () => {
    const t = makeRig()
    await t.start()
    t.assets.add('f1-aaaaaaaa', 'dxf')
    const url = t.server.urlFor('f1-aaaaaaaa', 'dxf')!
    const path = new URL(url).pathname
    assert.equal((await t.listener.request(req(path))).status, 200)
    const gate = deferred()
    t.listener.closeGate = gate.promise
    const stopping = t.server.stop()
    // síncrono: antes de o listener fechar já nada serve
    assert.equal(t.server.state, 'stopping')
    assert.equal(t.server.available(), false)
    assert.equal(t.server.urlFor('f1-aaaaaaaa', 'dxf'), null)
    assert.equal(t.server.info, null)
    assert.equal((await t.listener.request(req(path))).status, 503)
    gate.resolve()
    await stopping
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.listener.closeCalls, 1)
  })

  it('stop sem arranque, repetido e concorrente é idempotente', async () => {
    const t = makeRig()
    await t.server.stop()
    assert.equal(t.listener.closeCalls, 0)
    await t.start()
    await Promise.all([t.server.stop(), t.server.stop(), t.server.stop()])
    await t.server.stop()
    assert.equal(t.listener.closeCalls, 1)
    assert.deepEqual(states(t.events), [
      'starting',
      'running',
      'stopping',
      'stopped'
    ])
  })

  it('falha ao fechar o listener não impede a paragem (evento close-failed)', async () => {
    const t = makeRig()
    await t.start()
    t.listener.failClose = new Error(`EBADF ${SECRET_PATH}`)
    await t.server.stop()
    assert.equal(t.server.state, 'stopped')
    assert.ok(t.events.some(e => e.kind === 'close-failed'))
    assert.doesNotMatch(JSON.stringify(t.events), /data\/user|freedom-assets/)
  })

  it('stop espera pelos pedidos em curso, que respondem 503 e nunca enviam dados', async () => {
    const t = makeRig()
    await t.start()
    t.assets.add('f1-aaaaaaaa', 'conteudo')
    const path = new URL(t.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    const gate = deferred()
    t.assets.readGate = gate.promise
    const inflight = t.listener.request(req(path))
    await new Promise(r => setImmediate(r))
    assert.equal(t.server.stats.inFlight, 1)
    let stopped = false
    const stopping = t.server.stop().then(() => {
      stopped = true
    })
    await new Promise(r => setImmediate(r))
    assert.equal(stopped, false, 'tem de esperar o pedido em curso')
    gate.resolve()
    const res = await inflight
    assert.equal(res.status, 503)
    assert.doesNotMatch(bodyText(res), /conteudo/)
    await stopping
    assert.equal(stopped, true)
    assert.equal(t.server.stats.inFlight, 0)
  })

  it('pedido que nunca termina: stop resolve ao fim de drainTimeoutMs (drain-timeout)', async () => {
    const t = makeRig({ limits: { drainTimeoutMs: 20, requestTimeoutMs: 80 } })
    await t.start()
    t.assets.add('f1-aaaaaaaa', 'x')
    const path = new URL(t.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    t.assets.readGate = new Promise<void>(() => undefined)
    const inflight = t.listener.request(req(path))
    await new Promise(r => setImmediate(r))
    await t.server.stop()
    assert.equal(t.server.state, 'stopped')
    const drain = t.events.find(e => e.kind === 'drain-timeout')
    assert.ok(drain && drain.kind === 'drain-timeout' && drain.pending === 1)
    // o pedido pendurado acaba por responder 503 (nunca 200)
    assert.equal((await inflight).status, 503)
  })

  it('stop durante o arranque cancela-o: fecha o listener e o start falha', async () => {
    const t = makeRig()
    const gate = deferred()
    t.listener.listenGate = gate.promise
    const starting = t.start()
    const failure = assert.rejects(starting, isErr('stopped-during-start'))
    const stopping = t.server.stop()
    gate.resolve()
    await failure
    await stopping
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.listener.closeCalls, 1)
    assert.equal(t.server.available(), false)
  })

  it('stop() e start() seguidos durante um arranque: a sessão final é limpa e funciona', async () => {
    const t = makeRig()
    const gate = deferred()
    t.listener.listenGate = gate.promise
    const first = t.start().catch((e: unknown) => e)
    const stopping = t.server.stop()
    const second = t.start()
    gate.resolve()
    assert.ok((await first) instanceof LocalServerError)
    await stopping
    const info = await second
    assert.equal(t.server.state, 'running')
    assert.equal(t.listener.listenCalls, 2)
    assert.match(info.viewerUrl, /^http:\/\/127\.0\.0\.1:\d+\/s\//)
  })

  it('start durante uma paragem espera por ela e arranca uma sessão nova', async () => {
    const t = makeRig()
    const a = await t.start()
    const gate = deferred()
    t.listener.closeGate = gate.promise
    const stopping = t.server.stop()
    const restarted = t.start()
    assert.equal(t.server.state, 'stopping')
    assert.equal(t.listener.listenCalls, 1, 'não arranca antes de fechar')
    gate.resolve()
    await stopping
    const b = await restarted
    assert.notEqual(a.viewerUrl, b.viewerUrl)
    assert.equal(t.listener.listenCalls, 2)
    assert.equal(t.server.state, 'running')
  })
})

describe('reinício e isolamento entre sessões', () => {
  it('cada start gera um token novo; o URL antigo morre', async () => {
    const t = makeRig()
    const a = await t.start()
    const oldToken = t.token()
    t.assets.add('f1-aaaaaaaa', 'x')
    const oldAsset = new URL(t.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    const oldHandler = t.listener.handler!
    await t.server.stop()
    const b = await t.start()
    assert.notEqual(a.viewerUrl, b.viewerUrl)
    assert.notEqual(oldToken, t.token())
    // o handler da sessão antiga já não serve a nova (epoch)
    assert.equal((await oldHandler(req(`/s/${t.token()}/`))).status, 503)
    // o token e o asset antigos não valem na sessão nova
    assert.equal((await t.listener.request(req(`/s/${oldToken}/`))).status, 404)
    assert.equal((await t.listener.request(req(oldAsset))).status, 404)
    // e o asset só volta a servir quando é de novo concedido
    assert.equal(t.server.stats.grants, 0)
    const fresh = new URL(t.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    assert.equal((await t.listener.request(req(fresh))).status, 200)
  })

  it('duas instâncias têm tokens independentes e não se servem uma à outra', async () => {
    // aleatoriedade real em ambas: os tokens determinísticos do rig coincidiriam
    const a = makeRig({ randomBytes: defaultRandomBytes })
    const b = makeRig({ randomBytes: defaultRandomBytes })
    await a.start()
    await b.start()
    assert.notEqual(a.token(), b.token())
    a.assets.add('f1-aaaaaaaa', 'a')
    b.assets.add('f1-aaaaaaaa', 'b')
    const pa = new URL(a.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    assert.equal((await a.listener.request(req(pa))).status, 200)
    // o caminho (e o token) da A não vale na B, mesmo com o mesmo asset id
    assert.equal((await b.listener.request(req(pa))).status, 404)
    // na B o asset existe no store mas não foi concedido: nem o seu token serve
    assert.equal(
      (await b.listener.request(req(b.path('a/f1-aaaaaaaa')))).status,
      404
    )
    assert.equal(a.server.stats.grants, 1)
    assert.equal(b.server.stats.grants, 0)
  })

  it('um onClosed tardio de um listener antigo não derruba a sessão nova', async () => {
    const t = makeRig()
    await t.start()
    const oldClosed = t.listener.onClosed!
    await t.server.stop()
    await t.start()
    oldClosed()
    assert.equal(t.server.state, 'running')
    assert.equal(t.server.available(), true)
    assert.ok(!t.events.some(e => e.kind === 'listener-lost'))
  })
})

describe('perda do listener (o SO fecha o socket)', () => {
  it('running → stopped com evento; deixa de estar disponível; reiniciar dá token novo', async () => {
    const t = makeRig()
    const a = await t.start()
    t.assets.add('f1-aaaaaaaa', 'x')
    const path = new URL(t.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    const handler = t.listener.handler!
    t.listener.lose()
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.server.available(), false)
    assert.equal(t.server.urlFor('f1-aaaaaaaa', 'dxf'), null)
    assert.ok(t.events.some(e => e.kind === 'listener-lost'))
    assert.equal((await handler(req(path))).status, 503)
    assert.equal(t.listener.closeCalls, 1, 'fecha o que sobrou')
    const b = await t.start()
    assert.notEqual(a.viewerUrl, b.viewerUrl)
  })

  it('um listener que fecha antes de o listen resolver nunca fica «running» com um socket morto', async () => {
    const t = makeRig()
    const original = t.listener.listen.bind(t.listener)
    t.listener.listen = async (handler, onClosed) => {
      const address = await original(handler, onClosed)
      onClosed() // morreu durante o arranque
      return address
    }
    await assert.rejects(t.start(), isErr('listen-failed'))
    assert.equal(t.server.state, 'stopped')
    assert.equal(t.server.available(), false)
    assert.equal(t.listener.closeCalls, 1)
    // uma tentativa seguinte, com listener são, funciona
    t.listener.listen = original
    await t.start()
    assert.equal(t.server.state, 'running')
  })
})

describe('dispose', () => {
  it('pára, fica terminal e start() passa a falhar com disposed', async () => {
    const t = makeRig()
    await t.start()
    await t.server.dispose()
    assert.equal(t.server.state, 'disposed')
    assert.equal(t.listener.closeCalls, 1)
    assert.equal(t.server.available(), false)
    await assert.rejects(t.server.start(), isErr('disposed'))
    await t.server.dispose()
    await t.server.stop()
    assert.equal(t.server.state, 'disposed')
    assert.equal(t.listener.listenCalls, 1)
  })

  it('dispose sem arranque; dispose durante o arranque cancela-o', async () => {
    const a = makeRig()
    await a.server.dispose()
    assert.equal(a.server.state, 'disposed')
    await assert.rejects(a.start(), isErr('disposed'))

    const b = makeRig()
    const gate = deferred()
    b.listener.listenGate = gate.promise
    const starting = b.start()
    const failure = assert.rejects(starting, isErr('stopped-during-start'))
    const disposing = b.server.dispose()
    gate.resolve()
    await failure
    await disposing
    assert.equal(b.server.state, 'disposed')
    assert.equal(b.listener.closeCalls, 1)
  })
})

describe('configuração dos limites (fail-closed)', () => {
  const build = (limits: Record<string, unknown>) =>
    new LocalAssetServer({
      listener: makeRig().listener,
      bundle: createMemoryBundle(BUNDLE_FILES),
      assets: makeRig().assets,
      limits: limits as never
    })

  for (const key of [
    'maxInFlight',
    'maxAssetReads',
    'maxGrants',
    'requestTimeoutMs',
    'drainTimeoutMs',
    'maxBundleFileBytes'
  ]) {
    for (const bad of [
      0,
      -1,
      1.5,
      Number.NaN,
      Infinity,
      -Infinity,
      '16',
      null,
      {}
    ]) {
      it(`${key} = ${String(bad)} (${typeof bad}) é recusado à construção`, () => {
        assert.throws(
          () => build({ [key]: bad }),
          (e: unknown) =>
            e instanceof LocalServerError &&
            e.code === 'invalid-config' &&
            String(e.detail).includes(key) &&
            !String(e.detail).includes(String(bad))
        )
      })
    }
  }

  for (const key of [
    'maxInFlight',
    'maxAssetReads',
    'maxGrants',
    'requestTimeoutMs',
    'drainTimeoutMs',
    'maxBundleFileBytes'
  ]) {
    it(`${key}: 2^31-1 é aceite e 2^31 é recusado (tecto de setTimeout)`, () => {
      assert.doesNotThrow(() => build({ [key]: 2 ** 31 - 1 }))
      assert.throws(
        () => build({ [key]: 2 ** 31 }),
        (e: unknown) =>
          e instanceof LocalServerError && e.code === 'invalid-config'
      )
    })
  }

  it('undefined usa a omissão e valores válidos são aceites', async () => {
    const t = makeRig({
      limits: { maxInFlight: undefined, maxGrants: 1 } as never
    })
    await t.start()
    t.assets.add('f1-aaaaaaaa', 'x')
    t.assets.add('f2-bbbbbbbb', 'y')
    const first = new URL(t.server.urlFor('f1-aaaaaaaa', 'dxf')!).pathname
    t.server.urlFor('f2-bbbbbbbb', 'dxf')
    assert.equal(t.server.stats.grants, 1)
    assert.equal((await t.listener.request(req(first))).status, 404)
  })
})

describe('observadores', () => {
  it('um onEvent que lança nunca derruba o servidor', async () => {
    const t = makeRig({
      onEvent: () => {
        throw new Error('observador com defeito')
      }
    })
    await t.start()
    assert.equal(
      (await t.listener.request(req(t.path('index.html')))).status,
      200
    )
    await t.server.stop()
    assert.equal(t.server.state, 'stopped')
  })

  it('um onEvent reentrante (start/stop durante os eventos de estado) não corrompe o estado', async () => {
    let server: LocalAssetServer | null = null
    const seen: string[] = []
    const t = makeRig({
      onEvent: e => {
        if (e.kind !== 'state' || !server) return
        seen.push(e.state)
        if (e.state === 'starting') void server.start().catch(() => undefined)
        if (e.state === 'stopping') void server.stop()
      }
    })
    server = t.server
    await t.start()
    assert.equal(t.listener.listenCalls, 1)
    await t.server.stop()
    assert.equal(t.server.state, 'stopped')
    assert.deepEqual(seen, ['starting', 'running', 'stopping', 'stopped'])
  })

  it('o Host esperado corresponde à porta devolvida pelo listener', async () => {
    const t = makeRig()
    t.listener.address = { host: '127.0.0.1', port: 50001 }
    const info = await t.start()
    assert.equal(info.origin, 'http://127.0.0.1:50001')
    const ok = await t.listener.request(
      req(t.path('index.html'), { host: '127.0.0.1:50001' })
    )
    assert.equal(ok.status, 200)
    const bad = await t.listener.request(
      req(t.path('index.html'), { host: FAKE_HOST })
    )
    assert.equal(bad.status, 403)
  })
})
