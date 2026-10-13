// SPDX-License-Identifier: GPL-3.0-or-later
//
// LocalAssetServer com SOCKETS REAIS de 127.0.0.1 (M3-I5, spec §3 A1–A7, §6):
// loopback-only (incl. sondas a partir de outros endereços), pedidos hostis
// crus, concorrência, paragem/reinício e isolamento entre instâncias. O listener
// é o `node:http` de teste (`nodeListener.node-test.ts`); a pilha HTTP do
// WebView/Android/iOS NÃO é exercitada aqui (limitação declarada, spec §6).
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import { describe, it, type TestContext } from 'node:test'

import {
  BUNDLE_FILES,
  deferred,
  FakeAssetBytes
} from '../fixtures/fakeServer.ts'
import { createMemoryBundle } from './bundle.ts'
import { LocalServerError } from './errors.ts'
import {
  LocalAssetServer,
  type LocalAssetServerDeps
} from './localAssetServer.ts'
import {
  createNodeListener,
  type NodeListener,
  type NodeListenerOptions,
  type RawOutcome
} from './nodeListener.node-test.ts'
import type { ServerEvent } from './types.ts'

const ID = 'f1-aaaaaaaa'
const ID2 = 'f2-bbbbbbbb'

interface Live {
  server: LocalAssetServer
  listener: NodeListener
  assets: FakeAssetBytes
  events: ServerEvent[]
  port: number
  token: string
  base: string
  path: (rest: string) => string
  assetPath: (id: string, format?: 'dwg' | 'dxf') => string
}

async function live(
  t: TestContext,
  overrides: Partial<LocalAssetServerDeps> = {},
  listenerOptions: NodeListenerOptions = {}
): Promise<Live> {
  const listener = createNodeListener(listenerOptions)
  const assets = new FakeAssetBytes()
  const events: ServerEvent[] = []
  const server = new LocalAssetServer({
    listener,
    bundle: createMemoryBundle(BUNDLE_FILES),
    assets,
    onEvent: e => events.push(e),
    ...overrides
  })
  t.after(() => server.dispose())
  const info = await server.start()
  const port = Number(new URL(info.origin).port)
  const token = /\/s\/([^/]+)\//.exec(info.viewerUrl)![1]
  const rig: Live = {
    server,
    listener,
    assets,
    events,
    port,
    token,
    base: info.origin,
    path: rest => `/s/${token}/${rest}`,
    assetPath: (id, format = 'dxf') => {
      const url = server.urlFor(id, format)
      assert.ok(url, 'urlFor devolveu null')
      return new URL(url).pathname
    }
  }
  return rig
}

interface Got {
  status: number
  headers: http.IncomingHttpHeaders
  body: Buffer
}

function get(
  port: number,
  path: string,
  init: { method?: string; headers?: http.OutgoingHttpHeaders } = {}
): Promise<Got> {
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: init.method ?? 'GET',
        agent: false,
        headers: { connection: 'close', ...init.headers }
      },
      res => {
        const chunks: Buffer[] = []
        res.on('data', c => chunks.push(c as Buffer))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks)
          })
        )
        res.on('error', reject)
      }
    )
    r.on('error', reject)
    r.end()
  })
}

function parseRaw(received: string): RawOutcome {
  const m = /^HTTP\/1\.[01] (\d{3}) /.exec(received)
  if (!m) return { kind: 'closed', received }
  const split = received.indexOf('\r\n\r\n')
  return {
    kind: 'response',
    status: Number(m[1]),
    head: split < 0 ? received : received.slice(0, split),
    body: split < 0 ? '' : received.slice(split + 4)
  }
}

/** Envia bytes crus e devolve o que o servidor respondeu (ou o erro de ligação). */
function raw(
  port: number,
  payload: string | Buffer,
  waitMs = 500,
  host = '127.0.0.1'
): Promise<RawOutcome> {
  return new Promise(resolve => {
    const socket = net.connect({ host, port })
    let received = ''
    let settled = false
    const done = (o: RawOutcome): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(o)
    }
    const timer = setTimeout(() => done(parseRaw(received)), waitMs)
    socket.on('connect', () => socket.write(payload))
    socket.on('data', d => {
      received += d.toString('latin1')
    })
    socket.on('error', e =>
      done({ kind: 'error', code: (e as NodeJS.ErrnoException).code ?? 'ERR' })
    )
    socket.on('close', () => done(parseRaw(received)))
  })
}

const statusOf = (o: RawOutcome): number | string =>
  o.kind === 'response' ? o.status : o.kind

/** Tenta ligar: `connected` ou o código do erro (ECONNREFUSED…). */
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

describe('loopback only (sockets reais)', () => {
  it('o servidor escuta em 127.0.0.1 e a origem anunciada é essa', async t => {
    const l = await live(t)
    assert.match(l.base, /^http:\/\/127\.0\.0\.1:\d+$/)
    assert.ok(l.port > 0 && l.port < 65536)
    const res = await get(l.port, l.path(''))
    assert.equal(res.status, 200)
  })

  it('um endereço de loopback diferente (127.0.0.2) recusa a ligação', async t => {
    if (process.platform !== 'linux') return t.skip('127.0.0.0/8 só no Linux')
    const l = await live(t)
    assert.equal(await probe('127.0.0.2', l.port), 'ECONNREFUSED')
  })

  it('o controlo discrimina: um listener em 0.0.0.0 aceita a ligação em 127.0.0.2', async t => {
    if (process.platform !== 'linux') return t.skip('127.0.0.0/8 só no Linux')
    const wide = createNodeListener({ bindHost: '0.0.0.0' })
    const address = await wide.listen(
      async () => ({ status: 204, headers: {}, body: null }),
      () => undefined
    )
    t.after(() => wide.close())
    assert.equal(address.host, '0.0.0.0')
    assert.equal(await probe('127.0.0.2', address.port), 'connected')
  })

  it('nenhuma interface não-loopback (IPv4) aceita ligações à porta do servidor', async t => {
    const external = Object.values(os.networkInterfaces())
      .flat()
      .filter(
        (i): i is os.NetworkInterfaceInfo =>
          !!i && i.family === 'IPv4' && !i.internal
      )
      .map(i => i.address)
      .slice(0, 3)
    if (external.length === 0) return t.skip('sem interfaces externas')
    const l = await live(t)
    for (const address of external) {
      assert.equal(
        await probe(address, l.port),
        'ECONNREFUSED',
        'interface externa aceitou'
      )
    }
  })

  it('IPv6 (::1) não escuta', async t => {
    const l = await live(t)
    const code = await probe('::1', l.port)
    assert.notEqual(code, 'connected')
  })

  it('um listener que escuta em 0.0.0.0 é recusado: fail-closed e a porta fecha', async t => {
    const listener = createNodeListener({ bindHost: '0.0.0.0' })
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
    assert.equal(server.state, 'stopped')
    assert.equal(listener.openConnections(), 0)
  })

  it('depois do stop a porta recusa ligações', async t => {
    const l = await live(t)
    assert.equal((await get(l.port, l.path(''))).status, 200)
    await l.server.stop()
    assert.equal(await probe('127.0.0.1', l.port), 'ECONNREFUSED')
  })
})

describe('fluxo normal sobre HTTP real', () => {
  it('página, script e wasm com os tipos e cabeçalhos certos; sem CORS nem Server', async t => {
    const l = await live(t)
    const page = await get(l.port, l.path(''))
    assert.equal(page.status, 200)
    assert.equal(page.headers['content-type'], 'text/html; charset=utf-8')
    assert.match(
      String(page.headers['content-security-policy']),
      /connect-src 'self'/
    )
    assert.equal(page.headers['cache-control'], 'no-store')
    assert.equal(page.headers['x-content-type-options'], 'nosniff')
    assert.equal(page.headers['referrer-policy'], 'no-referrer')
    assert.equal(page.headers['server'], undefined)
    assert.equal(page.headers['etag'], undefined)
    assert.equal(page.headers['access-control-allow-origin'], undefined)
    assert.equal(page.body.toString(), BUNDLE_FILES['index.html'])
    const wasm = await get(l.port, l.path('assets/libredwg-web.wasm'))
    assert.equal(wasm.headers['content-type'], 'application/wasm')
    assert.deepEqual(
      [...wasm.body],
      [...BUNDLE_FILES['assets/libredwg-web.wasm']]
    )
  })

  it('um asset de 5 MB chega íntegro (sha256) com Content-Length exacto', async t => {
    const l = await live(t)
    const bytes = randomBytes(5 * 1024 * 1024)
    l.assets.add(ID, bytes)
    const res = await get(l.port, l.assetPath(ID))
    assert.equal(res.status, 200)
    assert.equal(res.headers['content-length'], String(bytes.length))
    assert.equal(res.headers['content-disposition'], 'attachment')
    assert.equal(
      createHash('sha256').update(res.body).digest('hex'),
      createHash('sha256').update(bytes).digest('hex')
    )
  })

  it('HEAD não traz corpo e anuncia o tamanho', async t => {
    const l = await live(t)
    l.assets.add(ID, new Uint8Array(33))
    const res = await get(l.port, l.assetPath(ID), { method: 'HEAD' })
    assert.equal(res.status, 200)
    assert.equal(res.headers['content-length'], '33')
    assert.equal(res.body.length, 0)
  })

  it('fetch (undici) com o URL do servidor: o que o viewer faria', async t => {
    const l = await live(t)
    l.assets.add(ID, new Uint8Array([1, 2, 3, 4]))
    const url = l.server.urlFor(ID, 'dxf')!
    const res = await fetch(url, { redirect: 'error', cache: 'no-store' })
    assert.equal(res.status, 200)
    assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [1, 2, 3, 4])
  })
})

describe('Host, Origin e token sobre sockets reais (rebinding / outra app)', () => {
  it('Host falso (rebinding DNS) → 403 mesmo com o token certo', async t => {
    const l = await live(t)
    for (const host of [
      'evil.example',
      `evil.example:${l.port}`,
      'localhost'
    ]) {
      const res = await get(l.port, l.path(''), { headers: { Host: host } })
      assert.equal(res.status, 403, host)
      assert.doesNotMatch(res.body.toString(), /viewer|index/)
    }
  })

  it('Origin de outra origem e Sec-Fetch-Site cross-site → 403', async t => {
    const l = await live(t)
    for (const headers of [
      { Origin: 'http://evil.example' },
      { Origin: 'null' },
      { 'Sec-Fetch-Site': 'cross-site' }
    ]) {
      const res = await get(l.port, l.path(''), { headers })
      assert.equal(res.status, 403, JSON.stringify(headers))
    }
    const ok = await get(l.port, l.path(''), {
      headers: { Origin: l.base, 'Sec-Fetch-Site': 'same-origin' }
    })
    assert.equal(ok.status, 200)
  })

  it('uma «outra app» sem token só recebe 404 (500 palpites de token e de caminhos)', async t => {
    const l = await live(t)
    l.assets.add(ID, 'segredo')
    l.assetPath(ID)
    const guesses = [
      '/',
      '/s/',
      '/index.html',
      `/a/${ID}`,
      `/s/x/a/${ID}`,
      `/s/${'A'.repeat(43)}/a/${ID}`
    ]
    for (let i = 0; i < 500; i++) {
      guesses.push(`/s/${randomBytes(32).toString('base64url')}/`)
    }
    const statuses = new Set<number>()
    for (const g of guesses) {
      const res = await get(l.port, g)
      statuses.add(res.status)
      assert.doesNotMatch(res.body.toString(), /segredo|viewer/)
    }
    assert.deepEqual([...statuses], [404])
  })
})

describe('pedidos crus hostis (nunca servem, o servidor continua de pé)', () => {
  it('traversal, %2e%2e, barras duplas e query → 400 (nunca 2xx)', async t => {
    const l = await live(t)
    const host = `127.0.0.1:${l.port}`
    const send = (target: string) =>
      raw(
        l.port,
        `GET ${target} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`
      )
    for (const target of [
      l.path('../index.html'),
      l.path('assets/../index.html'),
      l.path('%2e%2e/index.html'),
      l.path('assets%2fapp.js'),
      `/s/${l.token}//index.html`,
      l.path('index.html?x=1'),
      `http://evil.example${l.path('')}`,
      '*'
    ]) {
      const out = await send(target)
      // ou um erro 4xx nosso, ou o listener corta a ligação: nunca 2xx
      assert.ok(
        out.kind !== 'response' || out.status >= 400,
        `${target} → ${statusOf(out)}`
      )
      if (out.kind === 'response') {
        assert.doesNotMatch(out.body, /viewer|<title>/)
      }
    }
    assert.equal((await get(l.port, l.path(''))).status, 200)
  })

  it('métodos não permitidos → 405 com Allow', async t => {
    const l = await live(t)
    const host = `127.0.0.1:${l.port}`
    for (const method of [
      'POST',
      'PUT',
      'DELETE',
      'OPTIONS',
      'TRACE',
      'PATCH'
    ]) {
      const out = await raw(
        l.port,
        `${method} ${l.path('')} HTTP/1.1\r\nHost: ${host}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`
      )
      assert.equal(statusOf(out), 405, method)
      assert.match(out.kind === 'response' ? out.head : '', /allow: GET, HEAD/i)
    }
  })

  it('alvo acima de 256 → 414; cabeçalhos gigantes não derrubam o servidor', async t => {
    const l = await live(t)
    const host = `127.0.0.1:${l.port}`
    const long = await raw(
      l.port,
      `GET /${'a'.repeat(400)} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`
    )
    assert.equal(statusOf(long), 414)
    const huge = await raw(
      l.port,
      `GET /s/x/ HTTP/1.1\r\nHost: ${host}\r\nX-Junk: ${'j'.repeat(64 * 1024)}\r\nConnection: close\r\n\r\n`
    )
    assert.ok(huge.kind !== 'response' || huge.status >= 400)
    assert.equal((await get(l.port, l.path(''))).status, 200)
  })

  it('corpo no GET (Content-Length > 0) → 400 e a ligação não é reutilizada para servir', async t => {
    const l = await live(t)
    const host = `127.0.0.1:${l.port}`
    const out = await raw(
      l.port,
      `GET ${l.path('')} HTTP/1.1\r\nHost: ${host}\r\nContent-Length: 5\r\n\r\nhello`,
      400
    )
    assert.equal(statusOf(out), 400)
    assert.doesNotMatch(out.kind === 'response' ? out.body : '', /viewer/)
  })

  it('HTTP/1.0 sem Host → 400 (sem Host não há origem validada)', async t => {
    const l = await live(t)
    const out = await raw(l.port, `GET ${l.path('')} HTTP/1.0\r\n\r\n`)
    // ou o nosso 400, ou o listener corta a ligação: nunca uma resposta 2xx
    assert.ok(
      out.kind !== 'response' || out.status === 400,
      String(statusOf(out))
    )
  })

  it('pipelining: dois pedidos no mesmo write recebem cada um a sua resposta, por ordem', async t => {
    const l = await live(t)
    const host = `127.0.0.1:${l.port}`
    const one = `GET ${l.path('assets/app.js')} HTTP/1.1\r\nHost: ${host}\r\n\r\n`
    const two = `GET /s/errado/ HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`
    const out = await raw(l.port, one + two, 600)
    assert.equal(out.kind, 'response')
    const text = out.kind === 'response' ? `${out.head}\r\n\r\n${out.body}` : ''
    const statuses = [...text.matchAll(/HTTP\/1\.1 (\d{3}) /g)].map(m => m[1])
    assert.deepEqual(statuses, ['200', '404'])
    assert.ok(
      text.indexOf(BUNDLE_FILES['assets/app.js']) < text.indexOf('Not found')
    )
  })

  it('slowloris: a ligação lenta é cortada pelo listener e não bloqueia os outros pedidos', async t => {
    const l = await live(
      t,
      {},
      { headersTimeoutMs: 150, requestTimeoutMs: 300 }
    )
    const slow = net.connect({ host: '127.0.0.1', port: l.port })
    let closed = false
    slow.on('close', () => {
      closed = true
    })
    slow.on('error', () => undefined)
    await new Promise(r => slow.on('connect', r))
    slow.write('GET /s/')
    // enquanto a lenta está pendurada, um pedido normal serve
    assert.equal((await get(l.port, l.path(''))).status, 200)
    for (let i = 0; i < 40 && !closed; i++) await tick(50)
    assert.equal(closed, true, 'a ligação lenta devia ter sido cortada')
    slow.destroy()
  })
})

describe('concorrência sobre HTTP real', () => {
  it('50 pedidos simultâneos ao mesmo asset: só 200/503, corpos íntegros, contadores a zero', async t => {
    const l = await live(t, { limits: { maxAssetReads: 2, maxInFlight: 64 } })
    const bytes = randomBytes(256 * 1024)
    l.assets.add(ID, bytes)
    const path = l.assetPath(ID)
    const orig = l.assets.read.bind(l.assets)
    l.assets.read = async id => {
      await tick(5)
      return orig(id)
    }
    const results = await Promise.all(
      Array.from({ length: 50 }, () => get(l.port, path))
    )
    const statuses = new Set(results.map(r => r.status))
    for (const s of statuses) assert.ok(s === 200 || s === 503, String(s))
    assert.ok(results.some(r => r.status === 200))
    assert.ok(l.assets.maxReading <= 2, `maxReading=${l.assets.maxReading}`)
    for (const r of results) {
      if (r.status === 200) assert.ok(r.body.equals(bytes))
      else assert.equal(r.headers['retry-after'], '1')
    }
    assert.deepEqual(l.server.stats, { inFlight: 0, assetReads: 0, grants: 1 })
  })

  it('300 pedidos ao bundle com maxInFlight 16: só 200/503 e o servidor recupera', async t => {
    const l = await live(t, { limits: { maxInFlight: 16 } })
    const results = await Promise.all(
      Array.from({ length: 300 }, () => get(l.port, l.path('assets/app.js')))
    )
    for (const r of results) assert.ok(r.status === 200 || r.status === 503)
    assert.ok(results.some(r => r.status === 200))
    assert.equal(l.server.stats.inFlight, 0)
    await tick(50)
    assert.equal(l.listener.openConnections(), 0, 'sem ligações penduradas')
    assert.equal((await get(l.port, l.path('assets/app.js'))).status, 200)
  })

  it('assets diferentes em paralelo não se misturam', async t => {
    const l = await live(t, { limits: { maxAssetReads: 8, maxGrants: 8 } })
    const ids = Array.from({ length: 6 }, (_, i) => `f${i + 1}-bbbb000${i}`)
    const payloads = ids.map(() => randomBytes(4096))
    ids.forEach((id, i) => l.assets.add(id, payloads[i]))
    const paths = ids.map(id => l.assetPath(id))
    const out = await Promise.all(paths.map(p => get(l.port, p)))
    out.forEach((r, i) => {
      assert.equal(r.status, 200)
      assert.ok(r.body.equals(payloads[i]))
    })
  })
})

describe('paragem, reinício e isolamento sobre sockets reais', () => {
  it('stop com ligações keep-alive abertas termina e fecha-as todas', async t => {
    const l = await live(t)
    const sockets = await Promise.all(
      Array.from({ length: 5 }, async () => {
        const s = net.connect({ host: '127.0.0.1', port: l.port })
        s.on('error', () => undefined)
        s.resume() // sem consumir, o FIN do servidor nunca seria lido
        await new Promise(r => s.on('connect', r))
        s.write(
          `GET ${l.path('assets/app.js')} HTTP/1.1\r\nHost: 127.0.0.1:${l.port}\r\n\r\n`
        )
        return s
      })
    )
    await tick(50)
    await l.server.stop()
    assert.equal(l.server.state, 'stopped')
    await tick(50)
    assert.ok(
      sockets.every(s => s.destroyed),
      'sobrou uma ligação aberta'
    )
    assert.equal(l.listener.openConnections(), 0)
  })

  it('stop com um pedido a ler: o cliente nunca recebe os bytes (503 ou ligação cortada)', async t => {
    const l = await live(t)
    l.assets.add(ID, Buffer.from('conteudo-secreto'))
    const path = l.assetPath(ID)
    const gate = deferred()
    l.assets.readGate = gate.promise
    const client = get(l.port, path).then(
      r => ({ ok: true as const, r }),
      (e: Error) => ({ ok: false as const, e })
    )
    await tick(50)
    const stopping = l.server.stop()
    gate.resolve()
    await stopping
    const outcome = await client
    if (outcome.ok) {
      assert.equal(outcome.r.status, 503)
      assert.doesNotMatch(outcome.r.body.toString(), /conteudo/)
    }
    assert.equal(l.server.stats.inFlight, 0)
  })

  it('reinício: porta/token novos, o URL antigo é recusado e o asset exige nova concessão', async t => {
    const l = await live(t)
    l.assets.add(ID, 'x')
    const oldPath = l.assetPath(ID)
    const oldPort = l.port
    assert.equal((await get(oldPort, oldPath)).status, 200)
    await l.server.stop()
    const info = await l.server.start()
    const newPort = Number(new URL(info.origin).port)
    const newToken = /\/s\/([^/]+)\//.exec(info.viewerUrl)![1]
    assert.notEqual(newToken, l.token)
    // o caminho antigo (token antigo) não vale na instância nova
    assert.equal((await get(newPort, oldPath)).status, 404)
    // sem nova concessão o asset também não serve com o token novo
    assert.equal((await get(newPort, `/s/${newToken}/a/${ID}`)).status, 404)
    const fresh = new URL(l.server.urlFor(ID, 'dxf')!).pathname
    assert.equal((await get(newPort, fresh)).status, 200)
  })

  it('duas instâncias: tokens independentes; o caminho de uma não serve na outra', async t => {
    const a = await live(t)
    const b = await live(t)
    assert.notEqual(a.port, b.port)
    assert.notEqual(a.token, b.token)
    a.assets.add(ID, 'dados-de-A')
    b.assets.add(ID, 'dados-de-B')
    const pa = a.assetPath(ID)
    const pb = b.assetPath(ID)
    assert.equal((await get(a.port, pa)).body.toString(), 'dados-de-A')
    assert.equal((await get(b.port, pb)).body.toString(), 'dados-de-B')
    assert.equal((await get(b.port, pa)).status, 404)
    assert.equal((await get(a.port, pb)).status, 404)
    await a.server.stop()
    assert.equal((await get(b.port, pb)).status, 200, 'parar A não afecta B')
  })

  it('release revoga o URL sobre HTTP real', async t => {
    const l = await live(t)
    l.assets.add(ID2, 'x')
    const path = l.assetPath(ID2)
    assert.equal((await get(l.port, path)).status, 200)
    l.server.release(ID2)
    assert.equal((await get(l.port, path)).status, 404)
  })

  it('listener-lost: o socket morre fora do nosso controlo → stopped, evento e reinício limpo', async t => {
    const l = await live(t)
    l.assets.add(ID, 'x')
    const path = l.assetPath(ID)
    const oldPort = l.port
    assert.equal((await get(oldPort, path)).status, 200)
    await l.listener.crash()
    await tick(20)
    assert.equal(l.server.state, 'stopped')
    assert.equal(l.server.available(), false)
    assert.equal(l.server.urlFor(ID, 'dxf'), null)
    assert.ok(l.events.some(e => e.kind === 'listener-lost'))
    assert.equal(await probe('127.0.0.1', oldPort), 'ECONNREFUSED')
    // reiniciar dá sessão nova; o URL antigo não ressuscita
    const info = await l.server.start()
    const newPort = Number(new URL(info.origin).port)
    assert.equal((await get(newPort, path)).status, 404)
  })

  it('o log de eventos de uma sessão real não contém token, ids, caminhos nem URLs', async t => {
    const l = await live(t)
    l.assets.add(ID, 'x')
    await get(l.port, l.assetPath(ID))
    await get(l.port, '/s/errado/')
    await get(l.port, l.path(''))
    await l.server.stop()
    const text = JSON.stringify(l.events)
    for (const secret of [
      l.token,
      ID,
      'index.html',
      '/s/',
      'http',
      '127.0.0.1'
    ]) {
      assert.ok(!text.includes(secret), `${secret} num evento`)
    }
    assert.ok(l.events.some(e => e.kind === 'request'))
  })
})
