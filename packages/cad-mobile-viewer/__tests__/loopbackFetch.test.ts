// SPDX-License-Identifier: GPL-3.0-or-later
//
// `fetchBytes` do viewer (OBJ-0104 M3-I5, spec §4.4): só a sessão da própria
// página, sem SSRF, com tectos, tempo limite e mensagens sem fugas. Duplos de
// `fetch` para as decisões; um servidor `node:http` real para os efeitos.
import { readFileSync } from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'

import { MAX_DOCUMENT_BYTES as APP_MAX_DOCUMENT_BYTES } from '../../../apps/freedom-mobile/src/contracts/protocol'
import {
  ASSET_ROUTE,
  buildAssetPath,
  ROUTE_PREFIX
} from '../../../apps/freedom-mobile/src/server/paths'
import {
  createLoopbackFetch,
  LOOPBACK_ASSET_ROUTE,
  LOOPBACK_DEFAULT_MAX_BYTES,
  LOOPBACK_FETCH_MESSAGES,
  LOOPBACK_MAX_TIMEOUT_MS,
  LOOPBACK_ROUTE_PREFIX,
  LoopbackConfigError,
  LoopbackFetchError,
  type LoopbackFetchErrorCode,
  type LoopbackFetchImpl,
  type LoopbackPage,
  type LoopbackRequestInit,
  type LoopbackResponse
} from '../src/import/loopbackFetch'

const TOKEN = 'A'.repeat(43)
const PORT = 5000
const ORIGIN = `http://127.0.0.1:${PORT}`
const ID = 'f1-aaaaaaaa'
const URL_OK = `${ORIGIN}/s/${TOKEN}/a/${ID}`
const PAGE: LoopbackPage = {
  origin: ORIGIN,
  pathname: `/s/${TOKEN}/index.html`
}

function response(
  chunks: Uint8Array[],
  init: { status?: number; length?: string | null; noBody?: boolean } = {}
): LoopbackResponse & { cancel: jest.Mock } {
  let i = 0
  const cancel = jest.fn(async () => undefined)
  const all = (): ArrayBuffer => {
    const total = chunks.reduce((n, c) => n + c.byteLength, 0)
    const out = new Uint8Array(total)
    let o = 0
    for (const c of chunks) {
      out.set(c, o)
      o += c.byteLength
    }
    return out.buffer as ArrayBuffer
  }
  return {
    status: init.status ?? 200,
    headers: {
      get: n =>
        n.toLowerCase() === 'content-length' ? (init.length ?? null) : null
    },
    body: init.noBody
      ? null
      : {
          getReader: () => ({
            read: async () =>
              i < chunks.length
                ? { done: false, value: chunks[i++] }
                : { done: true },
            cancel
          })
        },
    arrayBuffer: async () => all(),
    cancel
  }
}

const stub = (res: LoopbackResponse) =>
  jest.fn<ReturnType<LoopbackFetchImpl>, Parameters<LoopbackFetchImpl>>(
    async () => res
  )

async function code(p: Promise<unknown>): Promise<LoopbackFetchErrorCode> {
  try {
    await p
  } catch (e) {
    expect(e).toBeInstanceOf(LoopbackFetchError)
    return (e as LoopbackFetchError).code
  }
  throw new Error('devia ter lançado')
}

describe('pedido válido', () => {
  test('devolve os bytes e pede só o que pode: GET, sem credenciais, sem cache, sem redirects', async () => {
    const fetchImpl = stub(
      response([new Uint8Array([1, 2]), new Uint8Array([3])])
    )
    const bytes = await createLoopbackFetch({ page: PAGE, fetchImpl })(URL_OK)
    expect([...new Uint8Array(bytes)]).toEqual([1, 2, 3])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(URL_OK)
    const { signal, ...rest } = init as LoopbackRequestInit
    expect(rest).toEqual({
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      mode: 'same-origin'
    })
    expect(signal).toBeInstanceOf(AbortSignal)
  })

  test('resposta sem corpo em fluxo cai em arrayBuffer() com o mesmo tecto', async () => {
    const ok = stub(response([new Uint8Array([9, 9])], { noBody: true }))
    const bytes = await createLoopbackFetch({ page: PAGE, fetchImpl: ok })(
      URL_OK
    )
    expect(bytes.byteLength).toBe(2)
    const big = stub(response([new Uint8Array(11)], { noBody: true }))
    expect(
      await code(
        createLoopbackFetch({ page: PAGE, fetchImpl: big, maxBytes: 10 })(
          URL_OK
        )
      )
    ).toBe('too-large')
  })

  test('no tecto exacto serve; um byte acima recusa', async () => {
    const at = stub(response([new Uint8Array(10)]))
    expect(
      (
        await createLoopbackFetch({ page: PAGE, fetchImpl: at, maxBytes: 10 })(
          URL_OK
        )
      ).byteLength
    ).toBe(10)
    const over = stub(response([new Uint8Array(6), new Uint8Array(5)]))
    expect(
      await code(
        createLoopbackFetch({ page: PAGE, fetchImpl: over, maxBytes: 10 })(
          URL_OK
        )
      )
    ).toBe('too-large')
  })

  test('a página vem de globalThis.location quando não é injectada', async () => {
    const g = globalThis as { location?: LoopbackPage }
    const before = g.location
    g.location = PAGE
    try {
      const fetchImpl = stub(response([new Uint8Array(1)]))
      await createLoopbackFetch({ fetchImpl })(URL_OK)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    } finally {
      if (before === undefined) delete g.location
      else g.location = before
    }
  })
})

describe('recusa ANTES de abrir a ligação (SSRF / outra sessão)', () => {
  const otherToken = 'B'.repeat(43)
  const bad: [string, string, LoopbackFetchErrorCode][] = [
    [
      'outra porta de loopback (outro serviço local)',
      `http://127.0.0.1:5037/s/${TOKEN}/a/${ID}`,
      'wrong-origin'
    ],
    [
      'porta por omissão',
      `http://127.0.0.1/s/${TOKEN}/a/${ID}`,
      'wrong-origin'
    ],
    [
      'localhost em vez de 127.0.0.1',
      `http://localhost:${PORT}/s/${TOKEN}/a/${ID}`,
      'wrong-origin'
    ],
    ['IPv6', `http://[::1]:${PORT}/s/${TOKEN}/a/${ID}`, 'wrong-origin'],
    [
      'host externo',
      `http://example.com:${PORT}/s/${TOKEN}/a/${ID}`,
      'wrong-origin'
    ],
    ['https', `https://127.0.0.1:${PORT}/s/${TOKEN}/a/${ID}`, 'invalid-url'],
    ['file:', 'file:///etc/passwd', 'invalid-url'],
    ['content:', 'content://media/external/1', 'invalid-url'],
    [
      'userinfo',
      `http://u:p@127.0.0.1:${PORT}/s/${TOKEN}/a/${ID}`,
      'invalid-url'
    ],
    ['query', `${URL_OK}?x=1`, 'invalid-url'],
    ['fragmento', `${URL_OK}#x`, 'invalid-url'],
    ['traversal', `${ORIGIN}/s/${TOKEN}/a/../x`, 'invalid-url'],
    [
      'traversal para outra sessão',
      `${ORIGIN}/s/${TOKEN}/a/${ID}/../../../${otherToken}`,
      'invalid-url'
    ],
    ['%2e%2e', `${ORIGIN}/s/${TOKEN}/a/%2e%2e/x`, 'invalid-url'],
    ['barra final', `${URL_OK}/`, 'wrong-session'],
    ['outro token', `${ORIGIN}/s/${otherToken}/a/${ID}`, 'wrong-session'],
    ['sem token', `${ORIGIN}/s/a/${ID}`, 'wrong-session'],
    [
      'bundle em vez de asset',
      `${ORIGIN}/s/${TOKEN}/index.html`,
      'wrong-session'
    ],
    ['rota raiz', `${ORIGIN}/`, 'wrong-session'],
    [
      'id inválido (maiúsculas)',
      `${ORIGIN}/s/${TOKEN}/a/F1-AAAAAAAA`,
      'wrong-session'
    ],
    ['id curto', `${ORIGIN}/s/${TOKEN}/a/f1-aaaa`, 'wrong-session'],
    ['id longo', `${ORIGIN}/s/${TOKEN}/a/${'a'.repeat(65)}`, 'wrong-session'],
    ['id com subcaminho', `${ORIGIN}/s/${TOKEN}/a/${ID}/x`, 'wrong-session'],
    ['espaço à frente', ` ${URL_OK}`, 'invalid-url'],
    ['espaço atrás', `${URL_OK} `, 'invalid-url'],
    ['nova linha', `${URL_OK}\n`, 'invalid-url'],
    [
      'tab dentro',
      `http://127.0.0.1:${PORT}\t/s/${TOKEN}/a/${ID}`,
      'invalid-url'
    ],
    ['NUL', `${URL_OK}\u0000`, 'invalid-url'],
    ['vazio', '', 'invalid-url'],
    ['não é URL', 'isto nao e um url', 'invalid-url'],
    ['demasiado longo', `${URL_OK}${'a'.repeat(600)}`, 'invalid-url'],
    [
      'porta com zeros',
      `http://127.0.0.1:0${PORT}/s/${TOKEN}/a/${ID}`,
      'invalid-url'
    ],
    [
      'host em maiúsculas',
      `http://127.0.0.1:${PORT}/S/${TOKEN}/a/${ID}`,
      'wrong-session'
    ]
  ]

  test.each(bad)('%s', async (_label, url, expected) => {
    const fetchImpl = stub(response([new Uint8Array(1)]))
    expect(
      await code(createLoopbackFetch({ page: PAGE, fetchImpl })(url))
    ).toBe(expected)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test.each([undefined, null, 1, {}, [], ['x']])(
    'URL que não é string (%p)',
    async v => {
      const fetchImpl = stub(response([]))
      expect(
        await code(createLoopbackFetch({ page: PAGE, fetchImpl })(v as never))
      ).toBe('invalid-url')
      expect(fetchImpl).not.toHaveBeenCalled()
    }
  )

  test('página sem sessão válida → no-page (nada é pedido)', async () => {
    const fetchImpl = stub(response([]))
    const pages: (LoopbackPage | undefined)[] = [
      undefined,
      { origin: 'http://example.com:5000', pathname: `/s/${TOKEN}/` },
      { origin: 'https://127.0.0.1:5000', pathname: `/s/${TOKEN}/` },
      { origin: 'http://localhost:5000', pathname: `/s/${TOKEN}/` },
      { origin: ORIGIN, pathname: '/' },
      { origin: ORIGIN, pathname: '/index.html' },
      { origin: ORIGIN, pathname: '/x/' + TOKEN + '/' },
      { origin: ORIGIN, pathname: '/s/curto/' },
      { origin: ORIGIN, pathname: '/s/' + 'é'.repeat(20) + '/' },
      { origin: 'http://127.0.0.1:99999', pathname: `/s/${TOKEN}/` },
      { origin: 'about:blank', pathname: 'blank' },
      { origin: 5 as never, pathname: 5 as never }
    ]
    const g = globalThis as { location?: unknown }
    const saved = g.location
    delete g.location
    try {
      for (const page of pages) {
        expect(
          await code(createLoopbackFetch({ page, fetchImpl })(URL_OK))
        ).toBe('no-page')
      }
    } finally {
      if (saved !== undefined) g.location = saved
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('uma sessão diferente da página não serve mesmo com origem certa', async () => {
    const other: LoopbackPage = {
      origin: ORIGIN,
      pathname: `/s/${'C'.repeat(43)}/index.html`
    }
    const fetchImpl = stub(response([new Uint8Array(1)]))
    expect(
      await code(createLoopbackFetch({ page: other, fetchImpl })(URL_OK))
    ).toBe('wrong-session')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('respostas do servidor', () => {
  test.each([301, 302, 307, 400, 403, 404, 500, 503, 204, 206])(
    'estado %i → http-status (só 200 serve)',
    async status => {
      const fetchImpl = stub(response([new Uint8Array(1)], { status }))
      expect(
        await code(createLoopbackFetch({ page: PAGE, fetchImpl })(URL_OK))
      ).toBe('http-status')
    }
  )

  test('413 → too-large', async () => {
    const fetchImpl = stub(response([], { status: 413 }))
    expect(
      await code(createLoopbackFetch({ page: PAGE, fetchImpl })(URL_OK))
    ).toBe('too-large')
  })

  test('Content-Length acima do tecto → too-large sem ler o corpo (e cancela-o)', async () => {
    const res = response([new Uint8Array(1)], { length: '11' })
    const fetchImpl = stub(res)
    expect(
      await code(
        createLoopbackFetch({ page: PAGE, fetchImpl, maxBytes: 10 })(URL_OK)
      )
    ).toBe('too-large')
    expect(res.cancel).toHaveBeenCalled()
  })

  test('um Content-Length mentiroso não ultrapassa o tecto: o fluxo é cortado e cancelado', async () => {
    const res = response(
      [new Uint8Array(6), new Uint8Array(6), new Uint8Array(6)],
      {
        length: '5'
      }
    )
    const fetchImpl = stub(res)
    expect(
      await code(
        createLoopbackFetch({ page: PAGE, fetchImpl, maxBytes: 10 })(URL_OK)
      )
    ).toBe('too-large')
    expect(res.cancel).toHaveBeenCalledTimes(1)
  })

  test('erro de rede (incluindo redirect recusado) → network, sem texto da excepção', async () => {
    const fail: LoopbackFetchImpl = async () => {
      throw new TypeError(`fetch failed ${URL_OK} ECONNREFUSED /data/user/0/x`)
    }
    let message = ''
    try {
      await createLoopbackFetch({ page: PAGE, fetchImpl: fail })(URL_OK)
    } catch (e) {
      expect((e as LoopbackFetchError).code).toBe('network')
      message = (e as Error).message
    }
    expect(message).toBe(LOOPBACK_FETCH_MESSAGES.network)
    expect(message).not.toMatch(/ECONNREFUSED|data\/user|127\.0\.0\.1|AAAA/)
  })

  test('sem fetch disponível → network', async () => {
    const g = globalThis as { fetch?: unknown }
    const saved = g.fetch
    g.fetch = undefined
    try {
      expect(await code(createLoopbackFetch({ page: PAGE })(URL_OK))).toBe(
        'network'
      )
    } finally {
      g.fetch = saved
    }
  })
})

describe('opções maxBytes/timeoutMs (fail-closed)', () => {
  const BAD: unknown[] = [
    0,
    -1,
    1.5,
    Number.NaN,
    Infinity,
    -Infinity,
    '10',
    null,
    {},
    true
  ]
  for (const key of ['maxBytes', 'timeoutMs'] as const) {
    test.each(BAD)(`${key} = %p é recusado à construção`, bad => {
      expect(() =>
        createLoopbackFetch({ page: PAGE, [key]: bad } as never)
      ).toThrow(LoopbackConfigError)
    })
    test(`${key}: undefined usa a omissão; 1 é aceite`, () => {
      expect(() =>
        createLoopbackFetch({ page: PAGE, [key]: undefined })
      ).not.toThrow()
      expect(() => createLoopbackFetch({ page: PAGE, [key]: 1 })).not.toThrow()
    })
  }
  test('timeoutMs: 2^31-1 aceite, 2^31 recusado', () => {
    expect(() =>
      createLoopbackFetch({ timeoutMs: LOOPBACK_MAX_TIMEOUT_MS })
    ).not.toThrow()
    expect(() =>
      createLoopbackFetch({ timeoutMs: LOOPBACK_MAX_TIMEOUT_MS + 1 })
    ).toThrow(LoopbackConfigError)
  })
  test('maxBytes: tecto seguro aceite, acima recusado', () => {
    expect(() =>
      createLoopbackFetch({ maxBytes: Number.MAX_SAFE_INTEGER })
    ).not.toThrow()
    expect(() =>
      createLoopbackFetch({ maxBytes: Number.MAX_SAFE_INTEGER + 2 })
    ).toThrow(LoopbackConfigError)
  })
  test('a mensagem do erro não ecoa o valor', () => {
    expect.assertions(1)
    try {
      createLoopbackFetch({ maxBytes: Number.NaN })
    } catch (e) {
      expect((e as Error).message).toBe('opção inválida: maxBytes')
    }
  })
  test('maxBytes = 1: 1 byte passa, 2 bytes → too-large', async () => {
    const one = response([new Uint8Array([1])], { length: null })
    expect(
      (
        await createLoopbackFetch({
          page: PAGE,
          fetchImpl: async () => one,
          maxBytes: 1
        })(URL_OK)
      ).byteLength
    ).toBe(1)
    const two = response([new Uint8Array([1, 2])], { length: null })
    expect(
      await code(
        createLoopbackFetch({
          page: PAGE,
          fetchImpl: async () => two,
          maxBytes: 1
        })(URL_OK)
      )
    ).toBe('too-large')
  })
})

describe('tempo limite', () => {
  test('um pedido que nunca responde é abortado → timeout', async () => {
    let aborted = false
    const hang: LoopbackFetchImpl = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          aborted = true
          reject(new Error('abortado'))
        })
      })
    expect(
      await code(
        createLoopbackFetch({ page: PAGE, fetchImpl: hang, timeoutMs: 30 })(
          URL_OK
        )
      )
    ).toBe('timeout')
    expect(aborted).toBe(true)
  })

  test('um corpo que pára a meio também é abortado → timeout', async () => {
    const stall: LoopbackFetchImpl = async (_url, init) => ({
      status: 200,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: () =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener('abort', () =>
                reject(new Error('x'))
              )
            }),
          cancel: async () => undefined
        })
      },
      arrayBuffer: async () => new ArrayBuffer(0)
    })
    expect(
      await code(
        createLoopbackFetch({ page: PAGE, fetchImpl: stall, timeoutMs: 30 })(
          URL_OK
        )
      )
    ).toBe('timeout')
  })

  test('o temporizador é sempre limpo (sucesso, erro e recusa)', async () => {
    jest.useFakeTimers()
    try {
      const ok = stub(response([new Uint8Array(1)]))
      await createLoopbackFetch({ page: PAGE, fetchImpl: ok })(URL_OK)
      expect(jest.getTimerCount()).toBe(0)
      const err = stub(response([], { status: 500 }))
      await code(createLoopbackFetch({ page: PAGE, fetchImpl: err })(URL_OK))
      expect(jest.getTimerCount()).toBe(0)
      await code(createLoopbackFetch({ page: PAGE, fetchImpl: ok })('x'))
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('mensagens fixas', () => {
  test('cada código tem texto PT-PT fixo sem URL, token, porta nem caminhos', () => {
    for (const [c, message] of Object.entries(LOOPBACK_FETCH_MESSAGES)) {
      const e = new LoopbackFetchError(c as LoopbackFetchErrorCode)
      expect(e.message).toBe(message)
      expect(e.name).toBe('LoopbackFetchError')
      expect(message).not.toMatch(/https?:|\d{3,}|[/\\]|token/i)
    }
  })

  test.each(Object.keys(LOOPBACK_FETCH_MESSAGES))(
    '%s nunca ecoa o pedido',
    async c => {
      const fetchImpl: LoopbackFetchImpl = async () => {
        throw new Error(`${URL_OK} ${TOKEN}`)
      }
      const triggers: Record<string, () => Promise<unknown>> = {
        'no-page': () => createLoopbackFetch({ page: undefined })(URL_OK),
        'invalid-url': () => createLoopbackFetch({ page: PAGE })('x'),
        'wrong-origin': () =>
          createLoopbackFetch({ page: PAGE })(
            `http://127.0.0.1:1/s/${TOKEN}/a/${ID}`
          ),
        'wrong-session': () =>
          createLoopbackFetch({ page: PAGE })(
            `${ORIGIN}/s/${'B'.repeat(43)}/a/${ID}`
          ),
        'http-status': () =>
          createLoopbackFetch({
            page: PAGE,
            fetchImpl: stub(response([], { status: 500 }))
          })(URL_OK),
        'too-large': () =>
          createLoopbackFetch({
            page: PAGE,
            fetchImpl: stub(response([], { status: 413 }))
          })(URL_OK),
        timeout: () =>
          createLoopbackFetch({
            page: PAGE,
            timeoutMs: 10,
            fetchImpl: (_u, init) =>
              new Promise((_r, rej) =>
                init.signal.addEventListener('abort', () =>
                  rej(new Error(URL_OK))
                )
              )
          })(URL_OK),
        network: () => createLoopbackFetch({ page: PAGE, fetchImpl })(URL_OK)
      }
      let text = ''
      const g = globalThis as { location?: unknown }
      const saved = g.location
      delete g.location
      try {
        await triggers[c]()
      } catch (e) {
        text = (e as Error).message + JSON.stringify(e)
      } finally {
        if (saved !== undefined) g.location = saved
      }
      expect(text).not.toBe('')
      expect(text).not.toContain(TOKEN)
      expect(text).not.toContain('127.0.0.1')
      expect(text).not.toContain(String(PORT))
    }
  )
})

describe('contra um servidor HTTP real (node:http)', () => {
  interface Fixture {
    server: http.Server
    port: number
    hits: string[]
    close(): Promise<void>
  }

  async function serve(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ): Promise<Fixture> {
    const hits: string[] = []
    const server = http.createServer((req, res) => {
      hits.push(req.url ?? '')
      handler(req, res)
    })
    await new Promise<void>(r =>
      server.listen({ host: '127.0.0.1', port: 0 }, r)
    )
    return {
      server,
      hits,
      port: (server.address() as AddressInfo).port,
      close: () =>
        new Promise<void>(r => {
          server.close(() => r())
          server.closeAllConnections()
        })
    }
  }

  const pageFor = (port: number): LoopbackPage => ({
    origin: `http://127.0.0.1:${port}`,
    pathname: `/s/${TOKEN}/index.html`
  })
  const assetUrl = (port: number): string =>
    `http://127.0.0.1:${port}/s/${TOKEN}/a/${ID}`

  test('descarrega bytes íntegros e o pedido chega só com o que se espera', async () => {
    const payload = Buffer.from(
      Array.from({ length: 300000 }, (_, i) => i % 251)
    )
    let seen: http.IncomingHttpHeaders = {}
    const f = await serve((req, res) => {
      seen = req.headers
      res.writeHead(200, { 'Content-Length': payload.length })
      res.end(payload)
    })
    try {
      const bytes = await createLoopbackFetch({ page: pageFor(f.port) })(
        assetUrl(f.port)
      )
      expect(Buffer.from(bytes).equals(payload)).toBe(true)
      expect(f.hits).toEqual([`/s/${TOKEN}/a/${ID}`])
      expect(seen.cookie).toBeUndefined()
      expect(seen.authorization).toBeUndefined()
      expect(seen.host).toBe(`127.0.0.1:${f.port}`)
    } finally {
      await f.close()
    }
  })

  test('um redirect para outro serviço é recusado (redirect: error) sem o seguir', async () => {
    const victim = await serve((_req, res) => {
      res.writeHead(200)
      res.end('segredo')
    })
    const f = await serve((_req, res) => {
      res.writeHead(302, { Location: `http://127.0.0.1:${victim.port}/` })
      res.end()
    })
    try {
      expect(
        await code(
          createLoopbackFetch({ page: pageFor(f.port) })(assetUrl(f.port))
        )
      ).toBe('network')
      expect(victim.hits).toEqual([])
    } finally {
      await f.close()
      await victim.close()
    }
  })

  test('URL de OUTRO serviço local (outra porta) nunca é contactado', async () => {
    const other = await serve((_req, res) => {
      res.writeHead(200)
      res.end('adb-ou-outro-servico')
    })
    const mine = await serve((_req, res) => {
      res.writeHead(200)
      res.end('ok')
    })
    try {
      const fetchBytes = createLoopbackFetch({ page: pageFor(mine.port) })
      expect(await code(fetchBytes(assetUrl(other.port)))).toBe('wrong-origin')
      expect(other.hits).toEqual([])
      expect(mine.hits).toEqual([])
    } finally {
      await mine.close()
      await other.close()
    }
  })

  test('ficheiro acima do tecto → too-large (Content-Length) e corpo em fluxo (chunked)', async () => {
    const f = await serve((req, res) => {
      if (req.url?.endsWith(ID)) {
        // chunked, sem Content-Length: só o corte durante a leitura apanha
        res.writeHead(200)
        res.write(Buffer.alloc(8))
        res.end(Buffer.alloc(8))
      }
    })
    const declared = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Length': 16 })
      res.end(Buffer.alloc(16))
    })
    try {
      expect(
        await code(
          createLoopbackFetch({ page: pageFor(f.port), maxBytes: 10 })(
            assetUrl(f.port)
          )
        )
      ).toBe('too-large')
      expect(
        await code(
          createLoopbackFetch({ page: pageFor(declared.port), maxBytes: 10 })(
            assetUrl(declared.port)
          )
        )
      ).toBe('too-large')
    } finally {
      await f.close()
      await declared.close()
    }
  })

  test('servidor que nunca responde → timeout; servidor que corta a ligação → network', async () => {
    const hang = await serve(() => undefined)
    const cut = await serve((req, _res) => {
      req.socket.destroy()
    })
    try {
      expect(
        await code(
          createLoopbackFetch({ page: pageFor(hang.port), timeoutMs: 50 })(
            assetUrl(hang.port)
          )
        )
      ).toBe('timeout')
      expect(
        await code(
          createLoopbackFetch({ page: pageFor(cut.port) })(assetUrl(cut.port))
        )
      ).toBe('network')
    } finally {
      await hang.close()
      await cut.close()
    }
  })

  test('porta fechada → network (não timeout)', async () => {
    const f = await serve(() => undefined)
    const port = f.port
    await f.close()
    expect(
      await code(createLoopbackFetch({ page: pageFor(port) })(assetUrl(port)))
    ).toBe('network')
  })
})

describe('deriva das constantes face ao servidor do app (só leitura)', () => {
  const appDir = join(__dirname, '../../../apps/freedom-mobile/src')
  const read = (rel: string): string => readFileSync(join(appDir, rel), 'utf8')

  test('prefixo e rota de assets iguais aos do servidor', () => {
    expect(LOOPBACK_ROUTE_PREFIX).toBe(ROUTE_PREFIX)
    expect(LOOPBACK_ASSET_ROUTE).toBe(ASSET_ROUTE)
    expect(buildAssetPath(TOKEN, ID)).toBe(
      `/${LOOPBACK_ROUTE_PREFIX}/${TOKEN}/${LOOPBACK_ASSET_ROUTE}/${ID}`
    )
  })

  test('o tecto por omissão é o do maior documento do app', () => {
    expect(LOOPBACK_DEFAULT_MAX_BYTES).toBe(
      Math.max(...Object.values(APP_MAX_DOCUMENT_BYTES))
    )
  })

  test('o padrão de assetId do viewer é igual ao do app', async () => {
    const app = /ASSET_ID_PATTERN = (\/.+\/)\n/.exec(read('files/names.ts'))
    expect(app).not.toBeNull()
    const appPattern = new RegExp((app as RegExpExecArray)[1].slice(1, -1))
    for (const id of ['f1-aaaaaaaa', 'f12-abcd1234', 'a'.repeat(64)]) {
      expect(appPattern.test(id)).toBe(true)
      await expect(
        createLoopbackFetch({
          page: PAGE,
          fetchImpl: stub(response([new Uint8Array(1)]))
        })(`${ORIGIN}/s/${TOKEN}/a/${id}`)
      ).resolves.toBeDefined()
    }
    for (const id of [
      'F1-AAAAAAAA',
      'f1-aaaa',
      'a'.repeat(65),
      'f1_aaaaaaaa'
    ]) {
      expect(appPattern.test(id)).toBe(false)
    }
  })

  test('um token do servidor (43 chars base64url) é aceite como sessão da página', async () => {
    const app = /TOKEN_PATTERN = (\/.+\/)\n/.exec(read('server/security.ts'))
    expect(app).not.toBeNull()
    const appPattern = new RegExp((app as RegExpExecArray)[1].slice(1, -1))
    const token = Buffer.from(
      Uint8Array.from({ length: 32 }, (_, i) => 255 - i * 7)
    ).toString('base64url')
    expect(appPattern.test(token)).toBe(true)
    const fetchImpl = stub(response([new Uint8Array(1)]))
    await createLoopbackFetch({
      page: { origin: ORIGIN, pathname: `/s/${token}/` },
      fetchImpl
    })(`${ORIGIN}/s/${token}/a/${ID}`)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
