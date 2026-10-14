// SPDX-License-Identifier: GPL-3.0-or-later
//
// Higiene do servidor (M3-I5, spec §3 A4, aceitação 2): nada de segredos, de
// caminhos internos ou de dados desnecessários em respostas, eventos, erros ou
// no código-fonte do módulo.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  BUNDLE_FILES,
  FAKE_HOST,
  makeRig,
  req,
  SECRET_PATH
} from '../fixtures/fakeServer.ts'
import { LOCAL_SERVER_MESSAGES, LocalServerError } from './errors.ts'
import type { ServerEvent, ServerResponse } from './types.ts'

const ID = 'f1-aaaaaaaa'
const ID_SECRET = 'f9-segredo99'

/** Cabeçalhos que uma resposta pode ter (lista fechada, minúsculas). */
const ALLOWED_HEADERS = new Set([
  'cache-control',
  'x-content-type-options',
  'referrer-policy',
  'cross-origin-resource-policy',
  'accept-ranges',
  'content-type',
  'content-length',
  'content-security-policy',
  'content-disposition',
  'allow',
  'retry-after'
])

async function scenario() {
  const t = makeRig()
  await t.start()
  const token = t.token()
  t.assets.add(ID, new Uint8Array(16))
  t.assets.add(ID_SECRET, new Uint8Array(16))
  const good = new URL(t.server.urlFor(ID, 'dxf')!).pathname
  const responses: ServerResponse[] = []
  const send = async (r: ReturnType<typeof req>) => {
    responses.push(await t.listener.request(r))
  }
  await send(req(`/s/${token}/`))
  await send(req(`/s/${token}/assets/app.js`))
  await send(req(good))
  await send(req(good, { method: 'HEAD' }))
  await send(req(`/s/${token}/a/${ID_SECRET}`)) // não concedido
  await send(req('/s/errado/index.html'))
  await send(req(`/s/${token}/../x`))
  await send(req(`/s/${token}/index.html`, { method: 'POST' }))
  await send(req(`/s/${token}/index.html`, { host: 'evil.example' }))
  await send(req(`/s/${token}/index.html`, { host: null }))
  await send(req(`/${'a'.repeat(400)}`))
  t.assets.failRead = new Error(`EIO ${SECRET_PATH}/${ID}`)
  await send(req(good))
  t.assets.failRead = null
  t.server.release(ID)
  await send(req(good))
  await t.server.stop()
  // depois do stop o listener já não entrega nada; o núcleo responde 503
  responses.push(await t.server.handle(req(`/s/${token}/`)))
  return { t, token, responses }
}

describe('respostas', () => {
  it('só cabeçalhos da lista fechada; nunca Server/ETag/Last-Modified/CORS/Set-Cookie', async () => {
    const { responses } = await scenario()
    assert.ok(responses.length >= 10)
    for (const res of responses) {
      for (const name of Object.keys(res.headers)) {
        assert.ok(
          ALLOWED_HEADERS.has(name.toLowerCase()),
          `cabeçalho inesperado: ${name}`
        )
      }
      assert.ok(
        !Object.keys(res.headers).some(n =>
          /^(server|etag|last-modified|set-cookie|content-location|x-powered-by|access-control-.*)$/i.test(
            n
          )
        )
      )
    }
  })

  it('nenhum cabeçalho ou corpo de ERRO contém token, ids, caminhos ou o pedido', async () => {
    const { token, responses } = await scenario()
    for (const res of responses.filter(r => r.status >= 400)) {
      const text = JSON.stringify([
        res.headers,
        res.body ? new TextDecoder().decode(res.body) : ''
      ])
      for (const secret of [
        token,
        ID,
        ID_SECRET,
        SECRET_PATH,
        'data/user',
        'index.html',
        'app.js',
        'evil.example',
        FAKE_HOST,
        'EIO',
        '127.0.0.1'
      ]) {
        assert.ok(!text.includes(secret), `${secret} vazou em ${res.status}`)
      }
    }
  })

  it('Content-Length coincide com o corpo em todas as respostas com corpo', async () => {
    const { responses } = await scenario()
    for (const res of responses.filter(r => r.body)) {
      assert.equal(
        Number(res.headers['Content-Length']),
        res.body!.byteLength,
        `status ${res.status}`
      )
    }
  })

  it('o corpo de um erro é um dos textos fixos (nunca mensagem de excepção)', async () => {
    const { responses } = await scenario()
    const fixed = new Set([
      'Bad request',
      'Forbidden',
      'Not found',
      'Method not allowed',
      'Payload too large',
      'URI too long',
      'Internal error',
      'Unavailable',
      'Timeout'
    ])
    for (const res of responses.filter(r => r.status >= 400)) {
      assert.ok(
        fixed.has(new TextDecoder().decode(res.body!)),
        String(res.status)
      )
    }
  })
})

describe('eventos e consola', () => {
  it('os eventos só têm estado, classe de rota, estado HTTP, tempo e contagens', async () => {
    const { t } = await scenario()
    const kinds = new Set([
      'state',
      'request',
      'grant',
      'revoke',
      'drain-timeout',
      'listener-lost',
      'close-failed'
    ])
    const keys: Record<string, string[]> = {
      state: ['kind', 'state'],
      request: ['kind', 'route', 'status', 'ms'],
      grant: ['kind', 'active'],
      revoke: ['kind', 'active'],
      'drain-timeout': ['kind', 'pending'],
      'listener-lost': ['kind'],
      'close-failed': ['kind']
    }
    assert.ok(t.events.length > 10)
    for (const e of t.events) {
      assert.ok(kinds.has(e.kind), e.kind)
      assert.deepEqual(Object.keys(e).sort(), keys[e.kind].sort(), e.kind)
    }
  })

  it('nenhum evento contém o token, ids, nomes de ficheiros, URLs ou caminhos', async () => {
    const { t, token } = await scenario()
    const text = JSON.stringify(t.events)
    for (const secret of [
      token,
      ID,
      ID_SECRET,
      SECRET_PATH,
      'index.html',
      'app.js',
      'http',
      '127.0.0.1',
      '/s/',
      'EIO',
      'evil'
    ]) {
      assert.ok(!text.includes(secret), `${secret} está num evento`)
    }
    for (const e of t.events as ServerEvent[]) {
      if (e.kind === 'request') {
        assert.ok(['bundle', 'asset', 'rejected'].includes(e.route))
        assert.ok(Number.isInteger(e.status) && e.ms >= 0)
      }
    }
  })

  it('o servidor nunca escreve na consola (log/info/warn/error/debug/trace)', async () => {
    const methods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const
    const calls: string[] = []
    const saved = methods.map(m => [m, console[m]] as const)
    for (const m of methods) {
      console[m] = (() => {
        calls.push(m)
      }) as never
    }
    try {
      await scenario()
      const bad = makeRig()
      bad.listener.failListen = new Error(`EADDRINUSE ${SECRET_PATH}`)
      await bad.start().catch(() => undefined)
    } finally {
      for (const [m, fn] of saved) console[m] = fn as never
    }
    assert.deepEqual(calls, [])
  })
})

describe('erros do servidor', () => {
  it('mensagens fixas por código, sem caminhos, números de porta nem tokens', () => {
    for (const [code, message] of Object.entries(LOCAL_SERVER_MESSAGES)) {
      const e = new LocalServerError(code as keyof typeof LOCAL_SERVER_MESSAGES)
      assert.equal(e.message, message)
      assert.equal(e.name, 'LocalServerError')
      assert.doesNotMatch(message, /[/\\]|\d{3,}|token/i)
    }
  })

  it('a causa técnica é redigida e truncada', () => {
    const e = new LocalServerError(
      'listen-failed',
      new Error(
        `EACCES ${SECRET_PATH} file:///x content://y ${'z'.repeat(500)}`
      )
    )
    assert.ok(e.detail && e.detail.length <= 160)
    assert.doesNotMatch(e.detail, /data\/user|file:|content:/)
  })
})

describe('código-fonte do módulo (varrimento)', () => {
  const dir = fileURLToPath(new URL('.', import.meta.url))
  const sources = readdirSync(dir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.node-test.ts'))
    .map(f => [f, readFileSync(`${dir}${f}`, 'utf8')] as const)

  it('há ficheiros de produção a varrer', () => {
    assert.ok(sources.length >= 7, `só ${sources.length}`)
  })

  it('sem consola, aleatoriedade fraca, eval/Function, require, rede ou caminhos de máquina', () => {
    for (const [file, text] of sources) {
      // os comentários não contam: a regra é sobre código executável
      let code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      // única excepção: o módulo nativo do listener é carregado só depois de
      // confirmar que existe (no iOS a biblioteca lança à importação sem ele)
      if (file === 'nativeListener.ts') {
        code = code.replace(/require\('react-native-tcp-socket'\)/, '')
      }
      assert.doesNotMatch(code, /\bconsole\./, `${file}: consola`)
      assert.doesNotMatch(code, /Math\.random/, `${file}: Math.random`)
      assert.doesNotMatch(
        code,
        /\beval\s*\(|new Function\s*\(/,
        `${file}: eval`
      )
      assert.doesNotMatch(code, /\brequire\s*\(/, `${file}: require`)
      assert.doesNotMatch(
        code,
        /\bfetch\s*\(|XMLHttpRequest|WebSocket|node:(http|https|net|dns|tls|dgram|fs|child_process)/,
        `${file}: rede/fs`
      )
      assert.doesNotMatch(
        code,
        /\/(home|mnt|Users)\/|[A-Z]:\\\\/,
        `${file}: caminho`
      )
      assert.doesNotMatch(code, /0\.0\.0\.0|INADDR_ANY/, `${file}: bind amplo`)
    }
  })

  it('o único endereço de escuta pedido é 127.0.0.1', () => {
    const text = sources.find(([f]) => f === 'localAssetServer.ts')![1]
    assert.match(text, /LOOPBACK_HOST = '127\.0\.0\.1'/)
    assert.doesNotMatch(text, /localhost|\[::1\]/)
  })

  it('os ficheiros do bundle de teste não escondem um segredo no conteúdo servido', () => {
    for (const content of Object.values(BUNDLE_FILES)) {
      assert.doesNotMatch(
        typeof content === 'string' ? content : '',
        /\/(home|data)\//
      )
    }
  })
})
