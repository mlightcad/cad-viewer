// SPDX-License-Identifier: GPL-3.0-or-later
//
// Rotas, token, cabeçalhos e pedidos hostis do LocalAssetServer (M3-I5, spec §3
// A1–A4, A9 e §4.1). Listener falso: o que se prova aqui é a decisão do núcleo.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  bodyText,
  BUNDLE_FILES,
  deferred,
  FAKE_HOST,
  makeRig,
  req,
  SECRET_PATH
} from '../fixtures/fakeServer.ts'
import { createMemoryBundle } from './bundle.ts'
import { DEFAULT_CSP, ERROR_TEXT } from './security.ts'
import type { ServerResponse } from './types.ts'

async function running(overrides: Parameters<typeof makeRig>[0] = {}) {
  const t = makeRig(overrides)
  await t.start()
  return t
}

const lower = (res: ServerResponse): Record<string, string> =>
  Object.fromEntries(
    Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), v])
  )

/** Resposta de erro «uniforme»: só estado, cabeçalhos e corpo (sem eco). */
const shape = (res: ServerResponse): string =>
  JSON.stringify([res.status, res.headers, bodyText(res)])

describe('bundle: o que se serve e com que cabeçalhos', () => {
  it('raiz /s/<token>/ serve index.html com CSP, tipo html e cabeçalhos de segurança', async () => {
    const t = await running()
    const res = await t.listener.request(req(`/s/${t.token()}/`))
    assert.equal(res.status, 200)
    const h = lower(res)
    assert.equal(h['content-type'], 'text/html; charset=utf-8')
    assert.equal(h['content-security-policy'], DEFAULT_CSP)
    assert.equal(h['cache-control'], 'no-store')
    assert.equal(h['x-content-type-options'], 'nosniff')
    assert.equal(h['referrer-policy'], 'no-referrer')
    assert.equal(h['cross-origin-resource-policy'], 'same-origin')
    assert.equal(h['accept-ranges'], 'none')
    assert.equal(h['content-length'], String(res.body!.byteLength))
    assert.equal(bodyText(res), BUNDLE_FILES['index.html'])
  })

  it('ficheiros do bundle com o tipo da tabela; só o HTML leva CSP', async () => {
    const t = await running()
    const cases: [string, string][] = [
      ['assets/app.js', 'text/javascript; charset=utf-8'],
      ['assets/style.css', 'text/css; charset=utf-8'],
      ['assets/libredwg-web.wasm', 'application/wasm'],
      ['assets/data.bin', 'application/octet-stream']
    ]
    for (const [file, type] of cases) {
      const res = await t.listener.request(req(t.path(file)))
      assert.equal(res.status, 200, file)
      const h = lower(res)
      assert.equal(h['content-type'], type, file)
      assert.equal(h['content-security-policy'], undefined, file)
    }
  })

  it('HEAD: mesmos cabeçalhos e Content-Length, sem corpo, e sem ler o ficheiro', async () => {
    let reads = 0
    const bundle = createMemoryBundle({ 'index.html': 'abcde' })
    const real = bundle.lookup.bind(bundle)
    bundle.lookup = path => {
      const e = real(path)
      return e && { size: e.size, read: () => (reads++, e.read()) }
    }
    const t = await running({ bundle })
    const get = await t.listener.request(req(`/s/${t.token()}/`))
    const head = await t.listener.request(
      req(`/s/${t.token()}/`, { method: 'HEAD' })
    )
    assert.equal(head.status, 200)
    assert.equal(head.body, null)
    assert.deepEqual(head.headers, get.headers)
    assert.equal(reads, 1, 'só o GET lê')
  })

  it('HEAD nunca leva corpo, também nos erros (404, 403, 405, 400), com o mesmo estado e cabeçalhos do GET', async () => {
    const t = await running()
    const cases = [
      { target: t.path('nao-existe.js') },
      { target: t.path('index.html'), host: 'evil.example' },
      { target: `/s/${t.token()}/../x` },
      { target: t.path('index.html'), headers: { 'content-length': '3' } }
    ]
    for (const c of cases) {
      const base = { host: c.host, headers: c.headers }
      const get = await t.listener.request(req(c.target, base))
      const head = await t.listener.request(
        req(c.target, { ...base, method: 'HEAD' })
      )
      assert.ok(get.status >= 400, String(get.status))
      assert.equal(head.status, get.status)
      assert.equal(head.body, null)
      assert.deepEqual(head.headers, get.headers)
      assert.ok(get.body && get.body.byteLength > 0)
    }
  })

  it('CSP configurável: null desliga-a; texto próprio substitui a omissão', async () => {
    const off = await running({ contentSecurityPolicy: null })
    const a = await off.listener.request(req(`/s/${off.token()}/`))
    assert.equal(lower(a)['content-security-policy'], undefined)
    const own = 'default-src self'
    const custom = await running({ contentSecurityPolicy: own })
    const b = await custom.listener.request(req(`/s/${custom.token()}/`))
    assert.equal(lower(b)['content-security-policy'], own)
  })

  it('Range, If-None-Match e If-Modified-Since são ignorados (200 completo)', async () => {
    const t = await running()
    const res = await t.listener.request(
      req(t.path('assets/app.js'), {
        headers: {
          range: 'bytes=0-3',
          'if-none-match': '*',
          'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT'
        }
      })
    )
    assert.equal(res.status, 200)
    assert.equal(bodyText(res), BUNDLE_FILES['assets/app.js'])
  })

  it('Origin e Sec-Fetch-Site da própria origem passam; nenhum cabeçalho CORS é emitido', async () => {
    const t = await running()
    const res = await t.listener.request(
      req(t.path('index.html'), {
        headers: {
          origin: `http://${FAKE_HOST}`,
          'sec-fetch-site': 'same-origin'
        }
      })
    )
    assert.equal(res.status, 200)
    assert.ok(
      !Object.keys(res.headers).some(k => /^access-control-/i.test(k)),
      'sem CORS'
    )
  })
})

describe('token e rotas: 404 uniforme', () => {
  it('token errado, em falta, prefixo errado e rotas desconhecidas dão a mesma resposta', async () => {
    const t = await running()
    const token = t.token()
    const wrongToken = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`
    const targets = [
      `/s/${wrongToken}/index.html`,
      `/s/${wrongToken}/`,
      `/s/${token.toLowerCase() === token ? token.toUpperCase() : token.toLowerCase()}/`,
      `/s/${token.slice(1)}/`,
      `/s/${token}x/`,
      '/s/',
      '/s',
      '/',
      `/x/${token}/`,
      `/S/${token}/`,
      `/s/${token}/nao-existe.js`,
      `/s/${token}/assets/nao-existe.js`,
      `/s/${token}/assets`,
      `/s/${token}`, // sem barra final: os URLs relativos do HTML falhariam
      `/s/${token}/a`,
      `/s/${token}/a/`,
      `/s/${token}/a/f1-aaaaaaaa`, // existe no store? não concedido
      `/s/${token}/a/x/y`,
      `/s/${token}/index.html/`,
      `/s/${token}/assets/`
    ]
    const shapes = new Set<string>()
    for (const target of targets) {
      const res = await t.listener.request(req(target))
      assert.equal(res.status, 404, target)
      shapes.add(shape(res))
    }
    assert.equal(shapes.size, 1, 'o corpo/cabeçalhos não distinguem o motivo')
    assert.equal([...shapes][0].includes(token), false)
  })

  it('o corpo de erro é fixo e nunca ecoa o pedido', async () => {
    const t = await running()
    const res = await t.listener.request(
      req(`/s/${t.token()}/segredo-ecoado.js`)
    )
    assert.equal(bodyText(res), ERROR_TEXT[404])
    assert.doesNotMatch(JSON.stringify(res), /segredo|ecoado/)
  })

  it('nomes de protótipo são ficheiros inexistentes', async () => {
    const t = await running()
    for (const f of [
      '__proto__',
      'constructor',
      'toString',
      'hasOwnProperty'
    ]) {
      assert.equal((await t.listener.request(req(t.path(f)))).status, 404, f)
    }
  })

  it('um bundle com a rota reservada «a» não existe: nem por construção', () => {
    assert.throws(() => createMemoryBundle({ 'a/x.js': 'x' }))
  })
})

describe('pedidos hostis (nunca servem, nunca lançam, corpo fixo)', () => {
  const hostile = (token: string): [string, string][] => [
    ['traversal', `/s/${token}/../index.html`],
    ['traversal a meio', `/s/${token}/assets/../index.html`],
    ['traversal final', `/s/${token}/assets/..`],
    ['ponto', `/s/${token}/./index.html`],
    ['%2e%2e', `/s/${token}/%2e%2e/index.html`],
    ['%2f', `/s/${token}/assets%2fapp.js`],
    ['%5c', `/s/${token}/assets%5capp.js`],
    ['%00', `/s/${token}/index.html%00.png`],
    ['barra dupla', `/s/${token}//index.html`],
    ['backslash', `/s/${token}/assets\\app.js`],
    ['NUL', `/s/${token}/index.html\u0000`],
    ['query', `/s/${token}/index.html?x=1`],
    ['fragmento', `/s/${token}/index.html#x`],
    ['unicode', `/s/${token}/índex.html`],
    ['absoluta', `http://evil.example/s/${token}/index.html`],
    ['sem esquema', `//evil.example/s/${token}/`],
    ['asterisco', '*'],
    ['vazio', ''],
    ['só duas barras', '//'],
    ['segmento enorme', `/s/${token}/${'a'.repeat(300)}`],
    ['profundidade', `/s/${token}/${Array(20).fill('a1').join('/')}`]
  ]

  it('400/404/414 determinísticos; nunca 2xx; corpo é um texto fixo', async () => {
    const t = await running()
    const allowed = new Set(Object.values(ERROR_TEXT))
    for (const [label, target] of hostile(t.token())) {
      const res = await t.listener.request(req(target))
      assert.ok([400, 404, 414].includes(res.status), `${label}: ${res.status}`)
      assert.ok(allowed.has(bodyText(res)), label)
      assert.doesNotMatch(
        JSON.stringify(res.headers),
        /index\.html|evil/,
        label
      )
    }
  })

  it('alvo acima de 256 → 414', async () => {
    const t = await running()
    const res = await t.listener.request(req(`/${'a'.repeat(400)}`))
    assert.equal(res.status, 414)
  })

  for (const method of [
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS',
    'TRACE',
    'CONNECT',
    'get',
    'Get',
    'PROPFIND',
    '',
    'GET '
  ]) {
    it(`método ${JSON.stringify(method)} → 405 com Allow: GET, HEAD`, async () => {
      const t = await running()
      const res = await t.listener.request(
        req(t.path('index.html'), { method })
      )
      assert.equal(res.status, 405)
      assert.equal(lower(res).allow, 'GET, HEAD')
      assert.equal(bodyText(res), ERROR_TEXT[405])
    })
  }

  it('o pedido sem objecto/forma válida não lança', async () => {
    const t = await running()
    for (const bad of [null, undefined, 1, 'GET /', [], {}]) {
      const res = await t.server.handle(bad as never)
      assert.ok(res.status >= 400 && res.status < 600, String(bad))
    }
    const noHeaders = await t.server.handle({
      method: 'GET',
      target: t.path('index.html')
    } as never)
    assert.equal(noHeaders.status, 400)
  })

  it('corpo no pedido (content-length > 0, transfer-encoding) → 400', async () => {
    const t = await running()
    for (const headers of [
      { 'content-length': '5' },
      { 'transfer-encoding': 'chunked' }
    ]) {
      const res = await t.listener.request(
        req(t.path('index.html'), { headers })
      )
      assert.equal(res.status, 400)
    }
  })
})

describe('Host, Origin e Sec-Fetch-Site (rebinding e cross-origin)', () => {
  it('Host que não é 127.0.0.1:<porta> → 403 mesmo com token certo', async () => {
    const t = await running()
    for (const host of [
      'evil.example',
      'evil.example:43210',
      'localhost:43210',
      '127.0.0.1',
      '127.0.0.1:1'
    ]) {
      const res = await t.listener.request(req(t.path('index.html'), { host }))
      assert.equal(res.status, 403, host)
      assert.equal(bodyText(res), ERROR_TEXT[403])
    }
  })

  it('Host em falta ou repetido → 400', async () => {
    const t = await running()
    assert.equal(
      (await t.listener.request(req(t.path('index.html'), { host: null })))
        .status,
      400
    )
    assert.equal(
      (
        await t.listener.request(
          req(t.path('index.html'), {
            host: null,
            headers: { host: [FAKE_HOST, FAKE_HOST] }
          })
        )
      ).status,
      400
    )
  })

  it('Origin de outra origem, `null`, e Sec-Fetch-Site cross-site/same-site → 403', async () => {
    const t = await running()
    for (const headers of [
      { origin: 'http://evil.example' },
      { origin: 'null' },
      { origin: 'http://127.0.0.1:1' },
      { 'sec-fetch-site': 'cross-site' },
      { 'sec-fetch-site': 'same-site' }
    ]) {
      const res = await t.listener.request(
        req(t.path('index.html'), { headers })
      )
      assert.equal(res.status, 403, JSON.stringify(headers))
    }
  })

  it('a verificação de cabeçalhos precede o token: um Host falso nunca aprende se o token vale', async () => {
    const t = await running()
    const right = await t.listener.request(
      req(t.path('index.html'), { host: 'evil.example' })
    )
    const wrong = await t.listener.request(
      req('/s/tokenerrado/index.html', { host: 'evil.example' })
    )
    assert.equal(shape(right), shape(wrong))
  })
})

describe('falhas de leitura do bundle (códigos fixos, sem fugas)', () => {
  it('leitura que lança → 500 sem a mensagem (que traz caminhos)', async () => {
    const bundle = createMemoryBundle({ 'index.html': 'x' })
    bundle.lookup = () => ({
      size: 1,
      read: async () => {
        throw new Error(`EIO ${SECRET_PATH}/viewer-bundle/index.html`)
      }
    })
    const t = await running({ bundle })
    const res = await t.listener.request(req(`/s/${t.token()}/`))
    assert.equal(res.status, 500)
    assert.equal(bodyText(res), ERROR_TEXT[500])
    assert.doesNotMatch(JSON.stringify(res), /EIO|data\/user|viewer-bundle/)
  })

  it('tamanho lido diferente do declarado → 500 (nunca serve dados incoerentes)', async () => {
    const bundle = createMemoryBundle({ 'index.html': 'x' })
    bundle.lookup = () => ({ size: 5, read: async () => new Uint8Array(4) })
    const t = await running({ bundle })
    assert.equal(
      (await t.listener.request(req(`/s/${t.token()}/`))).status,
      500
    )
  })

  it('tamanho declarado acima do tecto do servidor → 500 sem ler', async () => {
    let read = false
    const bundle = createMemoryBundle({ 'index.html': 'x' })
    bundle.lookup = () => ({
      size: 100,
      read: async () => ((read = true), new Uint8Array(100))
    })
    const t = await running({ bundle, limits: { maxBundleFileBytes: 10 } })
    assert.equal(
      (await t.listener.request(req(`/s/${t.token()}/`))).status,
      500
    )
    assert.equal(read, false)
  })

  it('lookup que lança → 500 (defeito interno nunca chega ao transporte)', async () => {
    const bundle = createMemoryBundle({ 'index.html': 'x' })
    bundle.lookup = () => {
      throw new Error(SECRET_PATH)
    }
    const t = await running({ bundle })
    const res = await t.listener.request(req(`/s/${t.token()}/`))
    assert.equal(res.status, 500)
    assert.doesNotMatch(JSON.stringify(res), /data\/user/)
  })

  it('leitura acima de requestTimeoutMs → 504', async () => {
    const bundle = createMemoryBundle({ 'index.html': 'x' })
    bundle.lookup = () => ({
      size: 1,
      read: () => new Promise(() => undefined)
    })
    const t = await running({ bundle, limits: { requestTimeoutMs: 20 } })
    const res = await t.listener.request(req(`/s/${t.token()}/`))
    assert.equal(res.status, 504)
    assert.equal(bodyText(res), ERROR_TEXT[504])
    assert.equal(t.server.stats.inFlight, 0)
  })
})

describe('capacidade: maxInFlight', () => {
  it('acima do limite → 503 busy com Retry-After; liberta quando os pedidos terminam', async () => {
    const gate = deferred()
    const bundle = createMemoryBundle({ 'index.html': 'x' })
    bundle.lookup = () => ({
      size: 1,
      read: async () => {
        await gate.promise
        return new Uint8Array(1)
      }
    })
    const slow = await running({ bundle, limits: { maxInFlight: 2 } })
    const path = `/s/${slow.token()}/`
    const a = slow.listener.request(req(path))
    const b = slow.listener.request(req(path))
    await new Promise(r => setImmediate(r))
    assert.equal(slow.server.stats.inFlight, 2)
    const c = await slow.listener.request(req(path))
    assert.equal(c.status, 503)
    assert.equal(lower(c)['retry-after'], '1')
    assert.equal(bodyText(c), ERROR_TEXT[503])
    gate.resolve()
    assert.deepEqual(
      (await Promise.all([a, b])).map(r => r.status),
      [200, 200]
    )
    assert.equal(slow.server.stats.inFlight, 0)
    assert.equal((await slow.listener.request(req(path))).status, 200)
  })

  it('só os pedidos admitidos ocupam lugar: 404/405 em série nunca esgotam a capacidade', async () => {
    const t = await running({ limits: { maxInFlight: 1 } })
    // vários 404/405 sequenciais nunca esgotam a capacidade
    for (let i = 0; i < 50; i++) {
      await t.listener.request(req('/x'))
      await t.listener.request(req(t.path('index.html'), { method: 'POST' }))
    }
    assert.equal(t.server.stats.inFlight, 0)
    assert.equal(
      (await t.listener.request(req(t.path('index.html')))).status,
      200
    )
  })
})
