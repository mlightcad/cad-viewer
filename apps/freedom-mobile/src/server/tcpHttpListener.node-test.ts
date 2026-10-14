// SPDX-License-Identifier: GPL-3.0-or-later
//
// `createTcpHttpListener` (o `HttpListenerPort` do app, card M4-I6) com o
// `LocalAssetServer` REAL e sockets REAIS de 127.0.0.1: o módulo TCP é
// `node:net`, com a mesma forma que o `react-native-tcp-socket` usado em
// dispositivo — o código HTTP é o mesmo. Repete as sondas da spec M3-I5 §8
// item 1 (loopback-only, Host falso, slowloris, stop, reinício) e prova que
// Origin/Sec-Fetch/Host chegam ao núcleo e são recusados fail-closed.
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import net from 'node:net'
import os from 'node:os'
import { describe, it, type TestContext } from 'node:test'

import { BUNDLE_FILES, FakeAssetBytes } from '../fixtures/fakeServer.ts'
import { createMemoryBundle } from './bundle.ts'
import { LocalServerError } from './errors.ts'
import { LocalAssetServer } from './localAssetServer.ts'
import { DEFAULT_CSP } from './security.ts'
import {
  createTcpHttpListener,
  parseRequestHead,
  serializeHead,
  type TcpHttpListener,
  type TcpHttpListenerOptions,
  type TcpModuleLike,
  type TcpServerLike,
  type TcpSocketLike
} from './tcpHttpListener.ts'
import type { ServerEvent } from './types.ts'

const ID = 'f1-aaaaaaaa'

interface Rig {
  server: LocalAssetServer
  listener: TcpHttpListener
  assets: FakeAssetBytes
  events: ServerEvent[]
  port: number
  token: string
  origin: string
  path: (rest: string) => string
}

async function rig(
  t: TestContext,
  options: TcpHttpListenerOptions = {}
): Promise<Rig> {
  const listener = createTcpHttpListener(net, options)
  const assets = new FakeAssetBytes()
  const events: ServerEvent[] = []
  const server = new LocalAssetServer({
    listener,
    bundle: createMemoryBundle(BUNDLE_FILES),
    assets,
    onEvent: e => events.push(e)
  })
  t.after(() => server.dispose())
  const info = await server.start()
  const token = /\/s\/([^/]+)\//.exec(info.viewerUrl)![1]
  return {
    server,
    listener,
    assets,
    events,
    port: Number(new URL(info.origin).port),
    token,
    origin: info.origin,
    path: rest => `/s/${token}/${rest}`
  }
}

interface Raw {
  status: number | 'closed' | string
  head: string
  body: Buffer
}

/** Bytes crus → resposta (ou `closed`/código de erro). */
function raw(
  port: number,
  payload: string | Buffer,
  waitMs = 2000,
  host = '127.0.0.1'
): Promise<Raw> {
  return new Promise(resolve => {
    const socket = net.connect({ host, port })
    const chunks: Buffer[] = []
    let settled = false
    const done = (r: Raw): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(r)
    }
    const parse = (): Raw => {
      const all = Buffer.concat(chunks)
      const split = all.indexOf('\r\n\r\n')
      const head = all.subarray(0, split < 0 ? all.length : split)
      const m = /^HTTP\/1\.1 (\d{3}) /.exec(head.toString('latin1'))
      return {
        status: m ? Number(m[1]) : 'closed',
        head: head.toString('latin1'),
        body: split < 0 ? Buffer.alloc(0) : all.subarray(split + 4)
      }
    }
    const timer = setTimeout(() => done(parse()), waitMs)
    socket.on('connect', () => socket.write(payload))
    socket.on('data', d => chunks.push(d as Buffer))
    socket.on('error', e =>
      done({
        status: (e as NodeJS.ErrnoException).code ?? 'ERR',
        head: '',
        body: Buffer.alloc(0)
      })
    )
    socket.on('end', () => done(parse()))
    socket.on('close', () => done(parse()))
  })
}

function req(
  r: Rig,
  path: string,
  headers: Record<string, string> = {},
  method = 'GET'
): Promise<Raw> {
  const lines = [`${method} ${path} HTTP/1.1`, `Host: 127.0.0.1:${r.port}`]
  for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`)
  return raw(r.port, `${lines.join('\r\n')}\r\n\r\n`)
}

function probe(host: string, port: number): Promise<string> {
  return new Promise(resolve => {
    const s = net.connect({ host, port })
    const timer = setTimeout(() => {
      s.destroy()
      resolve('timeout')
    }, 1500)
    s.on('connect', () => {
      clearTimeout(timer)
      s.destroy()
      resolve('connected')
    })
    s.on('error', e => {
      clearTimeout(timer)
      resolve((e as NodeJS.ErrnoException).code ?? 'ERR')
    })
  })
}

const tick = (ms = 20): Promise<void> => new Promise(r => setTimeout(r, ms))

describe('parser HTTP/1.1 (puro)', () => {
  it('pedido válido: método, alvo cru e cabeçalhos em minúsculas; repetidos agrupados', () => {
    const p = parseRequestHead(
      'GET /s/x/%2e?q HTTP/1.1\r\nHost: a\r\nX-A: 1\r\nx-a:  2 \r\nOrigin: o'
    )
    assert.ok(p.ok)
    assert.equal(p.method, 'GET')
    assert.equal(p.target, '/s/x/%2e?q')
    assert.deepEqual(p.headers, { host: 'a', 'x-a': ['1', '2'], origin: 'o' })
  })

  it('HTTP/1.0 e 2.0 → 505; linha de pedido inválida → 400', () => {
    assert.deepEqual(parseRequestHead('GET / HTTP/1.0\r\nHost: a'), {
      ok: false,
      status: 505
    })
    assert.deepEqual(parseRequestHead('GET / HTTP/2.0'), {
      ok: false,
      status: 505
    })
    for (const bad of [
      'GET  / HTTP/1.1',
      'GET / HTTP/1.1 ',
      'G\x00T / HTTP/1.1',
      'GET /ã HTTP/1.1',
      '',
      'GET'
    ]) {
      assert.deepEqual(parseRequestHead(bad), { ok: false, status: 400 }, bad)
    }
  })

  it('LF/CR soltos, obs-fold, nome inválido, sem dois pontos e NUL no valor → 400', () => {
    for (const bad of [
      'GET / HTTP/1.1\nHost: a',
      'GET / HTTP/1.1\r\nHost: a\rX: b',
      'GET / HTTP/1.1\r\nHost: a\r\n folded',
      'GET / HTTP/1.1\r\nHo st: a',
      'GET / HTTP/1.1\r\nHost a',
      'GET / HTTP/1.1\r\n: a',
      'GET / HTTP/1.1\r\nHost: a\x00b',
      'GET / HTTP/1.1\r\n\r\nHost: a'
    ]) {
      assert.deepEqual(
        parseRequestHead(bad),
        { ok: false, status: 400 },
        JSON.stringify(bad)
      )
    }
  })

  it('serializeHead: força Connection: close e recusa cabeçalhos com CR/LF', () => {
    const head = serializeHead({
      status: 200,
      headers: { 'Content-Length': '3', Connection: 'keep-alive' },
      body: null
    })
    assert.ok(head)
    const text = Buffer.from(head).toString('latin1')
    assert.equal(
      text,
      'HTTP/1.1 200 OK\r\nContent-Length: 3\r\nConnection: close\r\n\r\n'
    )
    assert.equal(
      serializeHead({ status: 200, headers: { X: 'a\r\nY: b' }, body: null }),
      null
    )
    assert.equal(
      serializeHead({ status: 200, headers: { 'X Y': 'a' }, body: null }),
      null
    )
    assert.equal(serializeHead({ status: 1000, headers: {}, body: null }), null)
  })
})

describe('listener TCP + LocalAssetServer: loopback only (sockets reais)', () => {
  it('escuta em 127.0.0.1; 127.0.0.2, ::1 e interfaces não-loopback recusam', async t => {
    const r = await rig(t)
    assert.match(r.origin, /^http:\/\/127\.0\.0\.1:\d+$/)
    assert.equal(await probe('127.0.0.2', r.port), 'ECONNREFUSED')
    assert.notEqual(await probe('::1', r.port), 'connected')
    const external = Object.values(os.networkInterfaces())
      .flat()
      .filter(a => a && a.family === 'IPv4' && !a.internal)
      .map(a => a!.address)
    for (const address of external) {
      assert.notEqual(await probe(address, r.port), 'connected', address)
    }
  })

  it('um bind em 0.0.0.0 é recusado pelo núcleo (not-loopback) e a porta fecha', async t => {
    const listener = createTcpHttpListener(net, { bindHost: '0.0.0.0' })
    const server = new LocalAssetServer({
      listener,
      bundle: createMemoryBundle(BUNDLE_FILES),
      assets: new FakeAssetBytes()
    })
    t.after(() => server.dispose())
    await assert.rejects(
      server.start(),
      (e: unknown) => e instanceof LocalServerError && e.code === 'not-loopback'
    )
    assert.equal(listener.openConnections(), 0)
    assert.equal(server.state, 'stopped')
  })
})

describe('listener TCP: fluxo normal e cabeçalhos de segurança', () => {
  it('página com CSP, nosniff, no-store e Connection: close; script e wasm com o tipo certo', async t => {
    const r = await rig(t)
    const page = await req(r, r.path(''), { 'Sec-Fetch-Site': 'none' })
    assert.equal(page.status, 200)
    assert.match(page.head, /\r\nContent-Security-Policy: /i)
    assert.ok(page.head.includes(DEFAULT_CSP))
    assert.match(page.head, /\r\nX-Content-Type-Options: nosniff/i)
    assert.match(page.head, /\r\nCache-Control: no-store/i)
    assert.match(page.head, /\r\nConnection: close\r?$/im)
    assert.doesNotMatch(page.head, /Access-Control|\r\nServer:/i)
    assert.equal(page.body.toString(), BUNDLE_FILES['index.html'])
    const js = await req(r, r.path('assets/app.js'), {
      'Sec-Fetch-Site': 'same-origin',
      Origin: r.origin
    })
    assert.equal(js.status, 200)
    assert.match(js.head, /Content-Type: text\/javascript/i)
    const wasm = await req(r, r.path('assets/libredwg-web.wasm'))
    assert.match(wasm.head, /Content-Type: application\/wasm/i)
    assert.deepEqual(
      [...wasm.body],
      [...BUNDLE_FILES['assets/libredwg-web.wasm']]
    )
  })

  it('um asset de 5 MB chega íntegro (sha256), escrito em troços pequenos', async t => {
    const r = await rig(t, { writeChunkBytes: 64 * 1024 })
    const bytes = randomBytes(5 * 1024 * 1024)
    r.assets.add(ID, bytes)
    const url = r.server.urlFor(ID, 'dwg')!
    const got = await raw(
      r.port,
      `GET ${new URL(url).pathname} HTTP/1.1\r\nHost: 127.0.0.1:${r.port}\r\n\r\n`,
      10_000
    )
    assert.equal(got.status, 200)
    assert.match(got.head, new RegExp(`Content-Length: ${bytes.length}`))
    const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
    assert.equal(sha(got.body), sha(bytes))
  })

  it('HEAD anuncia o tamanho e não traz corpo', async t => {
    const r = await rig(t)
    const head = await req(r, r.path('index.html'), {}, 'HEAD')
    assert.equal(head.status, 200)
    assert.equal(head.body.length, 0)
  })
})

describe('listener TCP: Origin, Sec-Fetch e Host chegam ao núcleo (fail-closed)', () => {
  it('Host falso (rebinding) → 403 mesmo com o token certo', async t => {
    const r = await rig(t)
    const got = await raw(
      r.port,
      `GET ${r.path('')} HTTP/1.1\r\nHost: evil.example:${r.port}\r\n\r\n`
    )
    assert.equal(got.status, 403)
  })

  it('Sec-Fetch-Site cross-site/same-site e Origin de outra origem → 403; same-origin/none → 200', async t => {
    const r = await rig(t)
    r.assets.add(ID, 'x')
    const asset = new URL(r.server.urlFor(ID, 'dxf')!).pathname
    const cases: [Record<string, string>, number][] = [
      [{ 'Sec-Fetch-Site': 'cross-site' }, 403],
      [{ 'Sec-Fetch-Site': 'same-site' }, 403],
      [{ Origin: 'http://127.0.0.1:1' }, 403],
      [{ Origin: 'null' }, 403],
      [{ 'Sec-Fetch-Site': 'same-origin', Origin: r.origin }, 200],
      [{ 'Sec-Fetch-Site': 'none' }, 200]
    ]
    for (const [headers, status] of cases) {
      assert.equal(
        (await req(r, asset, headers)).status,
        status,
        JSON.stringify(headers)
      )
    }
  })

  it('cabeçalhos repetidos (dois Host, dois Sec-Fetch-Site) → 400', async t => {
    const r = await rig(t)
    const twoHosts = await raw(
      r.port,
      `GET ${r.path('')} HTTP/1.1\r\nHost: 127.0.0.1:${r.port}\r\nHost: 127.0.0.1:${r.port}\r\n\r\n`
    )
    assert.equal(twoHosts.status, 400)
    const twoSites = await req(r, r.path(''), {
      'Sec-Fetch-Site': 'same-origin',
      'sec-fetch-site': 'none'
    })
    assert.equal(twoSites.status, 400)
  })

  it('token errado → 404 uniforme; nenhuma resposta ecoa o pedido', async t => {
    const r = await rig(t)
    const got = await req(r, '/s/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/')
    assert.equal(got.status, 404)
    assert.ok(!got.head.includes('AAAA') && !got.body.includes('AAAA'))
  })
})

describe('listener TCP: pedidos hostis (o servidor continua de pé)', () => {
  it('HTTP/1.0 → 505; LF solto e obs-fold → 400; corpo no GET → 400', async t => {
    const r = await rig(t)
    const host = `Host: 127.0.0.1:${r.port}`
    assert.equal(
      (await raw(r.port, `GET ${r.path('')} HTTP/1.0\r\n${host}\r\n\r\n`))
        .status,
      505
    )
    assert.equal(
      (await raw(r.port, `GET ${r.path('')} HTTP/1.1\n${host}\r\n\r\n`)).status,
      400
    )
    assert.equal(
      (await raw(r.port, `GET ${r.path('')} HTTP/1.1\r\n${host}\r\n x\r\n\r\n`))
        .status,
      400
    )
    assert.equal(
      (
        await raw(
          r.port,
          `GET ${r.path('')} HTTP/1.1\r\n${host}\r\nContent-Length: 3\r\n\r\nabc`
        )
      ).status,
      400
    )
    assert.equal((await req(r, r.path(''))).status, 200)
  })

  it('cabeçalhos acima de 8 KiB → 431, com ou sem terminador', async t => {
    const r = await rig(t)
    const big = 'X-Big: ' + 'a'.repeat(9000)
    assert.equal(
      (
        await raw(
          r.port,
          `GET / HTTP/1.1\r\nHost: 127.0.0.1:${r.port}\r\n${big}\r\n\r\n`
        )
      ).status,
      431
    )
    assert.equal((await raw(r.port, `GET / HTTP/1.1\r\n${big}`)).status, 431)
    assert.equal((await req(r, r.path(''))).status, 200)
  })

  it('pipelining: só o primeiro pedido é servido e a ligação fecha', async t => {
    const r = await rig(t)
    const one = `GET ${r.path('')} HTTP/1.1\r\nHost: 127.0.0.1:${r.port}\r\n\r\n`
    const got = await raw(r.port, one + one)
    assert.equal(got.status, 200)
    assert.equal(
      got.body.toString().split('HTTP/1.1').length,
      1,
      'segunda resposta'
    )
  })

  it('slowloris: a ligação lenta é cortada pelo timeout de cabeçalhos e não bloqueia as outras', async t => {
    const r = await rig(t, { headersTimeoutMs: 150, requestTimeoutMs: 300 })
    const slow = net.connect({ host: '127.0.0.1', port: r.port })
    let closed = false
    slow.on('close', () => {
      closed = true
    })
    slow.on('error', () => undefined)
    slow.resume()
    await new Promise(res => slow.on('connect', res))
    slow.write('GET /s/')
    assert.equal((await req(r, r.path(''))).status, 200)
    for (let i = 0; i < 40 && !closed; i++) await tick(50)
    assert.equal(closed, true, 'a ligação lenta devia ter sido cortada')
  })

  it('tecto de ligações: acima do máximo a ligação é cortada já; abaixo serve', async t => {
    const r = await rig(t, { maxConnections: 2 })
    const idle = [0, 1].map(() =>
      net.connect({ host: '127.0.0.1', port: r.port })
    )
    for (const s of idle) {
      s.on('error', () => undefined)
      s.resume()
      await new Promise(res => s.on('connect', res))
    }
    await tick(50)
    assert.equal(r.listener.openConnections(), 2)
    assert.equal((await req(r, r.path(''))).status, 'closed')
    for (const s of idle) s.destroy()
    await tick(50)
    assert.equal((await req(r, r.path(''))).status, 200)
  })
})

describe('listener TCP: paragem, reinício e perda do socket', () => {
  it('stop fecha TODAS as ligações (incluindo as inactivas) e a porta recusa', async t => {
    const r = await rig(t)
    const idle = net.connect({ host: '127.0.0.1', port: r.port })
    let closed = false
    idle.on('close', () => {
      closed = true
    })
    idle.on('error', () => undefined)
    idle.resume()
    await new Promise(res => idle.on('connect', res))
    await tick(20)
    assert.equal(r.listener.openConnections(), 1)
    await r.server.stop()
    for (let i = 0; i < 20 && !closed; i++) await tick(20)
    assert.equal(closed, true)
    assert.equal(r.listener.openConnections(), 0)
    assert.equal(await probe('127.0.0.1', r.port), 'ECONNREFUSED')
    // `close()` idempotente
    await r.listener.close()
    await r.listener.close()
  })

  it('reinício: porta e token novos; o URL antigo deixa de servir', async t => {
    const r = await rig(t)
    r.assets.add(ID, 'x')
    const oldAsset = new URL(r.server.urlFor(ID, 'dxf')!).pathname
    await r.server.stop()
    const info = await r.server.start()
    const port = Number(new URL(info.origin).port)
    assert.notEqual(info.viewerUrl, `${r.origin}${r.path('')}`)
    const got = await raw(
      port,
      `GET ${oldAsset} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n\r\n`
    )
    assert.equal(got.status, 404)
  })

  it('o SO fecha o socket de escuta → listener-lost no núcleo, ligações cortadas', async () => {
    const fake = new FakeNet()
    const listener = createTcpHttpListener(fake)
    const events: ServerEvent[] = []
    const server = new LocalAssetServer({
      listener,
      bundle: createMemoryBundle(BUNDLE_FILES),
      assets: new FakeAssetBytes(),
      onEvent: e => events.push(e)
    })
    await server.start()
    const conn = fake.connect()
    assert.equal(listener.openConnections(), 1)
    fake.server!.emit('error', new Error('EPIPE'))
    await tick()
    assert.equal(conn.destroyed, true)
    assert.equal(listener.openConnections(), 0)
    assert.equal(server.state, 'stopped')
    assert.ok(events.some(e => e.kind === 'listener-lost'))
    await server.dispose()
  })

  it('close() resolve mesmo que o servidor nativo nunca emita «close» (timeout)', async () => {
    const fake = new FakeNet({ silentClose: true })
    const listener = createTcpHttpListener(fake, { closeTimeoutMs: 30 })
    await listener.listen(
      async () => ({ status: 200, headers: {}, body: null }),
      () => {
        throw new Error('onClosed não deve disparar num close() pedido')
      }
    )
    const t0 = Date.now()
    await listener.close()
    assert.ok(Date.now() - t0 < 1000)
  })

  it('erro de escrita destrói a ligação; um handler que rejeita dá 500', async () => {
    const fake = new FakeNet()
    const listener = createTcpHttpListener(fake)
    let calls = 0
    await listener.listen(
      async () => {
        calls++
        throw new Error('falha interna /segredo/caminho')
      },
      () => undefined
    )
    const conn = fake.connect()
    conn.emit('data', Buffer.from('GET / HTTP/1.1\r\nHost: x\r\n\r\n'))
    await tick()
    assert.equal(calls, 1)
    const out = Buffer.concat(conn.written).toString('latin1')
    assert.match(out, /^HTTP\/1\.1 500 /)
    assert.doesNotMatch(out, /segredo|caminho/)
    const broken = fake.connect({ failWrites: true })
    broken.emit('data', Buffer.from('GET / HTTP/1.1\r\nHost: x\r\n\r\n'))
    await tick()
    assert.equal(broken.destroyed, true)
    await listener.close()
  })

  it('listen falhado (porta ocupada) rejeita e permite tentar de novo', async () => {
    const fake = new FakeNet({ failListen: true })
    const listener = createTcpHttpListener(fake)
    await assert.rejects(
      listener.listen(
        async () => ({ status: 200, headers: {}, body: null }),
        () => undefined
      )
    )
    fake.failListen = false
    const a = await listener.listen(
      async () => ({ status: 200, headers: {}, body: null }),
      () => undefined
    )
    assert.equal(a.host, '127.0.0.1')
    await listener.close()
  })
})

// -- módulo TCP falso (só para falhas que o SO não deixa provocar) --------------

class FakeSocket extends EventEmitter implements TcpSocketLike {
  written: Buffer[] = []
  destroyed = false
  ended = false
  private readonly failWrites: boolean
  constructor(failWrites = false) {
    super()
    this.failWrites = failWrites
  }
  write(data: Uint8Array, _e?: undefined, cb?: (e?: Error | null) => void) {
    if (this.failWrites) {
      queueMicrotask(() => cb?.(new Error('EPIPE')))
      return false
    }
    this.written.push(Buffer.from(data))
    queueMicrotask(() => cb?.())
    return true
  }
  end() {
    this.ended = true
    queueMicrotask(() => this.emit('close'))
  }
  destroy() {
    this.destroyed = true
    queueMicrotask(() => this.emit('close'))
  }
}

class FakeServer extends EventEmitter implements TcpServerLike {
  private readonly owner: FakeNet
  readonly onConnection: (s: TcpSocketLike) => void
  constructor(owner: FakeNet, onConnection: (s: TcpSocketLike) => void) {
    super()
    this.owner = owner
    this.onConnection = onConnection
  }
  listen(_o: { port: number; host: string }, cb: () => void) {
    if (this.owner.failListen) {
      queueMicrotask(() => this.emit('error', new Error('EADDRINUSE')))
    } else queueMicrotask(cb)
  }
  address() {
    return { address: '127.0.0.1', port: 4321 }
  }
  closeCalls = 0
  close(cb?: () => void) {
    this.closeCalls++
    if (!this.owner.silentClose) queueMicrotask(() => cb?.())
  }
}

class FakeNet implements TcpModuleLike {
  server: FakeServer | null = null
  failListen: boolean
  silentClose: boolean
  constructor(o: { failListen?: boolean; silentClose?: boolean } = {}) {
    this.failListen = o.failListen ?? false
    this.silentClose = o.silentClose ?? false
  }
  createServer(onConnection: (s: TcpSocketLike) => void) {
    this.server = new FakeServer(this, onConnection)
    return this.server
  }
  connect(o: { failWrites?: boolean } = {}): FakeSocket {
    const s = new FakeSocket(o.failWrites)
    this.server!.onConnection(s)
    return s
  }
}

describe('listener TCP: falha de listen fecha o socket criado e limpa o estado', () => {
  const noop = (): void => {}
  const handler = async (): Promise<never> => {
    throw new Error('não usado')
  }

  it('erro de listen: close() chamado ANTES de rejeitar, estado limpo, novo listen funciona', async () => {
    const fake = new FakeNet({ failListen: true })
    const listener = createTcpHttpListener(fake)
    let rejected = false
    let closesAtReject = -1
    await listener.listen(handler, noop).catch(() => {
      rejected = true
      closesAtReject = fake.server!.closeCalls
    })
    assert.ok(rejected)
    assert.equal(closesAtReject, 1)
    const first = fake.server!
    await listener.close() // idempotente após falha
    assert.equal(first.closeCalls, 1)
    fake.failListen = false
    const a = await listener.listen(handler, noop)
    assert.equal(a.port, 4321)
    assert.notEqual(fake.server, first)
    await listener.close()
  })

  it('socket real: falha de bind rejeita com o socket fechado, sem porta presa e com retry', async () => {
    const created: net.Server[] = []
    const spy = {
      createServer(cb: (s: TcpSocketLike) => void) {
        const s = net.createServer(cb as never)
        created.push(s)
        return s
      },
      connect: net.connect
    } as unknown as TcpModuleLike
    const bad = createTcpHttpListener(spy, { bindHost: '203.0.113.77' })
    let listeningAtReject: boolean | null = null
    await assert.rejects(bad.listen(handler, noop), () => {
      listeningAtReject = created[0].listening
      return true
    })
    assert.equal(listeningAtReject, false)
    assert.equal(created[0].listening, false)
    await bad.close()
    assert.equal(bad.openConnections(), 0)
    await assert.rejects(bad.listen(handler, noop)) // não fica "já activo"
    assert.equal(created.length, 2)

    const ok = createTcpHttpListener(net)
    const a = await ok.listen(handler, noop)
    assert.ok(a.port > 0)
    await ok.close()
  })

  it('endereço desconhecido após listen: socket fechado antes de rejeitar', async () => {
    const fake = new FakeNet()
    const listener = createTcpHttpListener(fake)
    const orig = FakeServer.prototype.address
    FakeServer.prototype.address = (() => null) as never
    try {
      await assert.rejects(listener.listen(handler, noop))
      assert.equal(fake.server!.closeCalls, 1)
    } finally {
      FakeServer.prototype.address = orig
    }
    const a = await listener.listen(handler, noop)
    assert.equal(a.port, 4321)
    await listener.close()
  })
})

// -- limites de tempo e escritas com contrapressão (OBJ-0104 t_824fb4ae) --------

/** Relógio manual: `advance` dispara, por ordem, os temporizadores devidos. */
class ManualTimers {
  now = 0
  private seq = 0
  private readonly pending = new Map<number, { at: number; fn: () => void }>()
  set = (fn: () => void, ms: number): number => {
    const id = ++this.seq
    this.pending.set(id, { at: this.now + ms, fn })
    return id
  }
  clear = (handle: unknown): void => {
    this.pending.delete(handle as number)
  }
  get active(): number {
    return this.pending.size
  }
  advance(ms: number): void {
    const target = this.now + ms
    for (;;) {
      let next: [number, { at: number; fn: () => void }] | null = null
      for (const entry of this.pending) {
        if (entry[1].at <= target && (!next || entry[1].at < next[1].at)) {
          next = entry
        }
      }
      if (!next) break
      this.pending.delete(next[0])
      this.now = next[1].at
      next[1].fn()
    }
    this.now = target
  }
}

/** Socket cujas confirmações de escrita são libertadas à mão (como um buffer cheio). */
class StallSocket extends FakeSocket {
  readonly callbacks: ((e?: Error | null) => void)[] = []
  throwOnWrite = -1
  override write(
    data: Uint8Array,
    _e?: undefined,
    cb?: (e?: Error | null) => void
  ) {
    if (this.written.length === this.throwOnWrite) throw new Error('EBADF')
    this.written.push(Buffer.from(data))
    if (cb) this.callbacks.push(cb)
    return false // buffer interno cheio
  }
  flush(error?: Error): void {
    for (const cb of this.callbacks.splice(0)) cb(error)
  }
}

describe('listener TCP: limites de tempo exactos (relógio manual)', () => {
  const GET = Buffer.from('GET / HTTP/1.1\r\nHost: x\r\n\r\n')
  const handlerNever = (): Promise<never> => new Promise(() => undefined)

  async function connected(
    timers: ManualTimers,
    options: TcpHttpListenerOptions,
    handler: () => Promise<{
      status: number
      headers: Record<string, string>
      body: Uint8Array | null
    }>
  ) {
    const fake = new FakeNet()
    const listener = createTcpHttpListener(fake, { ...options, timers })
    await listener.listen(handler, () => undefined)
    return { fake, listener }
  }

  it('pedido sem resposta: sobrevive a 29 999 ms e é cortado aos 30 000 ms (requestTimeoutMs)', async () => {
    const timers = new ManualTimers()
    const { fake, listener } = await connected(
      timers,
      { requestTimeoutMs: 30_000 },
      handlerNever
    )
    const conn = fake.connect()
    conn.emit('data', GET)
    await tick(1)
    timers.advance(29_999)
    assert.equal(conn.destroyed, false, 'a 29 999 ms ainda vive')
    assert.equal(listener.openConnections(), 1)
    timers.advance(1)
    assert.equal(conn.destroyed, true, 'aos 30 000 ms é cortada')
    await tick(1)
    assert.equal(listener.openConnections(), 0)
    await listener.close()
  })

  it('cabeçalhos incompletos: vive a 4 999 ms, cortada aos 5 000 ms (omissão)', async () => {
    const timers = new ManualTimers()
    const { fake, listener } = await connected(timers, {}, handlerNever)
    const conn = fake.connect()
    conn.emit('data', Buffer.from('GET /s/'))
    timers.advance(4_999)
    assert.equal(conn.destroyed, false)
    timers.advance(1)
    assert.equal(conn.destroyed, true)
    await listener.close()
  })

  it('cabeçalhos completos param o relógio de cabeçalhos mas não o do pedido', async () => {
    const timers = new ManualTimers()
    const { fake, listener } = await connected(timers, {}, handlerNever)
    const conn = fake.connect()
    conn.emit('data', GET)
    await tick(1)
    timers.advance(5_000)
    assert.equal(conn.destroyed, false, 'cabeçalhos já completos')
    timers.advance(4_999)
    assert.equal(conn.destroyed, false, 'pedido ainda dentro de 10 s')
    timers.advance(1)
    assert.equal(conn.destroyed, true, 'pedido cortado aos 10 000 ms')
    await listener.close()
  })

  it('resposta a tempo: não fica nenhum temporizador a cortar a ligação depois', async () => {
    const timers = new ManualTimers()
    const { fake, listener } = await connected(timers, {}, async () => ({
      status: 200,
      headers: {},
      body: new Uint8Array(10)
    }))
    const conn = fake.connect()
    conn.emit('data', GET)
    await tick(5)
    assert.equal(conn.ended, true)
    await tick(5)
    assert.equal(timers.active, 0, 'cabeçalhos, pedido e escrita todos limpos')
    timers.advance(60_000)
    assert.equal(conn.destroyed, false)
    await listener.close()
  })
})

describe('listener TCP: escritas com contrapressão', () => {
  const GET = Buffer.from('GET / HTTP/1.1\r\nHost: x\r\n\r\n')
  const body = (n: number): Uint8Array => new Uint8Array(n).fill(7)

  async function stalled(options: TcpHttpListenerOptions, size: number) {
    const timers = new ManualTimers()
    const fake = new FakeNet()
    const listener = createTcpHttpListener(fake, {
      writeChunkBytes: 10,
      ...options,
      timers
    })
    await listener.listen(
      async () => ({ status: 200, headers: {}, body: body(size) }),
      () => undefined
    )
    const conn = new StallSocket()
    fake.server!.onConnection(conn)
    conn.emit('data', GET)
    await tick(1)
    return { timers, listener, conn }
  }

  it('write() a devolver false não perde troços: todos escritos por ordem; FIN só depois da última confirmação', async () => {
    const { listener, conn } = await stalled({}, 35)
    assert.match(
      Buffer.concat(conn.written).toString('latin1'),
      /^HTTP\/1\.1 200 /
    )
    assert.equal(conn.written.length, 5, 'cabeçalhos + 4 troços de ≤ 10 B')
    assert.equal(
      Buffer.concat(conn.written.slice(1)).length,
      35,
      'o corpo todo, sem troços perdidos'
    )
    assert.equal(conn.ended, false, 'sem confirmações não há FIN')
    conn.flush()
    assert.equal(conn.ended, true)
    assert.equal(conn.destroyed, false)
    await listener.close()
  })

  it('erro de confirmação num troço do meio destrói a ligação e nunca envia FIN', async () => {
    const { listener, conn } = await stalled({}, 35)
    conn.callbacks[2](new Error('EPIPE')) // um troço intermédio
    assert.equal(conn.destroyed, true)
    conn.flush() // as confirmações tardias não ressuscitam a ligação
    assert.equal(conn.ended, false)
    await listener.close()
  })

  it('excepção síncrona de write() a meio da resposta destrói a ligação', async () => {
    const timers = new ManualTimers()
    const fake = new FakeNet()
    const listener = createTcpHttpListener(fake, {
      writeChunkBytes: 10,
      timers
    })
    await listener.listen(
      async () => ({ status: 200, headers: {}, body: body(35) }),
      () => undefined
    )
    const conn = new StallSocket()
    conn.throwOnWrite = 3
    fake.server!.onConnection(conn)
    conn.emit('data', GET)
    await tick(1)
    assert.equal(conn.destroyed, true)
    assert.equal(conn.ended, false)
    assert.equal(timers.active, 0, 'nenhum temporizador pendurado')
    await listener.close()
  })

  it('cliente que não lê: cortado entre 9 999 ms e 10 000 ms de writeTimeoutMs e liberta o lugar', async () => {
    const { timers, listener, conn } = await stalled({ maxConnections: 1 }, 35)
    assert.equal(listener.openConnections(), 1)
    timers.advance(9_999)
    assert.equal(conn.destroyed, false)
    timers.advance(1)
    assert.equal(conn.destroyed, true)
    await tick(1)
    assert.equal(listener.openConnections(), 0, 'o lugar volta ao tecto')
    await listener.close()
  })

  it('escrita concluída a tempo cancela o corte: nada é destruído depois', async () => {
    const { timers, listener, conn } = await stalled({}, 35)
    timers.advance(9_000)
    conn.flush()
    assert.equal(conn.ended, true)
    assert.equal(timers.active, 0)
    timers.advance(60_000)
    assert.equal(conn.destroyed, false)
    await listener.close()
  })
})

describe('listener TCP: contrapressão em sockets reais', () => {
  const big = randomBytes(8 * 1024 * 1024)
  const sha = createHash('sha256').update(big).digest('hex')

  async function bigRig(t: TestContext, options: TcpHttpListenerOptions) {
    const r = await rig(t, options)
    r.assets.add(ID, big)
    const assetPath = new URL(r.server.urlFor(ID, 'dwg')!).pathname
    return { ...r, assetPath }
  }

  it('leitor lento: o corpo de 8 MB chega íntegro depois de uma pausa de leitura', async t => {
    const r = await bigRig(t, { writeTimeoutMs: 5_000 })
    const chunks: Buffer[] = []
    await new Promise<void>(resolve => {
      const s = net.connect({ host: '127.0.0.1', port: r.port }, () => {
        s.write(
          `GET ${r.assetPath} HTTP/1.1\r\nHost: 127.0.0.1:${r.port}\r\n\r\n`
        )
        s.pause()
        setTimeout(() => s.resume(), 300)
      })
      s.on('data', d => chunks.push(d as Buffer))
      s.on('close', () => resolve())
      s.on('error', () => resolve())
    })
    const all = Buffer.concat(chunks)
    const at = all.indexOf('\r\n\r\n')
    assert.match(all.subarray(0, at).toString('latin1'), /^HTTP\/1\.1 200 /)
    const payload = all.subarray(at + 4)
    assert.equal(payload.length, big.length)
    assert.equal(createHash('sha256').update(payload).digest('hex'), sha)
  })

  it('leitor parado: a ligação é cortada ao fim de writeTimeoutMs e o lugar volta ao tecto', async t => {
    const r = await bigRig(t, { writeTimeoutMs: 250, maxConnections: 2 })
    const s = net.connect({ host: '127.0.0.1', port: r.port }, () => {
      s.write(
        `GET ${r.assetPath} HTTP/1.1\r\nHost: 127.0.0.1:${r.port}\r\n\r\n`
      )
      s.pause() // nunca lê: os buffers do kernel enchem
    })
    s.on('error', () => undefined)
    t.after(() => s.destroy())
    for (let i = 0; i < 20 && r.listener.openConnections() === 0; i++) {
      await tick(25)
    }
    assert.equal(r.listener.openConnections(), 1, 'ligação presa')
    for (let i = 0; i < 40 && r.listener.openConnections() > 0; i++) {
      await tick(50)
    }
    assert.equal(r.listener.openConnections(), 0, 'cortada pelo writeTimeoutMs')
    assert.equal((await req(r, r.path(''))).status, 200, 'o servidor continua')
  })
})
