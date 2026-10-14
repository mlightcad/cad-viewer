// SPDX-License-Identifier: GPL-3.0-or-later
//
// Prova de superfície real (card M4-I6/T2; decisão t_d2446cfc, arquitectura §7
// item 6): o bundle REAL do viewer (`packages/cad-mobile-viewer/dist`, vite)
// é servido pelo `LocalAssetServer` REAL em sockets de 127.0.0.1 e aberto num
// Chromium headless REAL (WebGL por software) a 1280×800 e a 390×844. As
// mensagens são construídas pelo protocolo REAL do app (`buildAppMessage` +
// `encodeInjection`, a mesma string que a `ViewerSurface` injecta) e as
// respostas validadas pelo parser REAL do app. A prova são PÍXEIS do ecrã
// (screenshot do compositor), nunca o modelo nem o `FakeView`.
//
// Opt-in (`FREEDOM_SURFACE_PROOF=1`): precisa do bundle construído e do
// Chromium do Playwright. Sem eles o teste FALHA (não salta em silêncio).
// Escreve artefactos em `docs/evidence/OBJ-0104-m4-i6/`.
import assert from 'node:assert/strict'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { join, relative } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  type AppPayloads,
  type AppToViewerType,
  buildAppMessage,
  encodeInjection,
  parseViewerMessage,
  type ViewerMessage
} from '../contracts/protocol.ts'
import { createManifestBundle } from '../server/bundle.ts'
import { LocalAssetServer } from '../server/localAssetServer.ts'
import { createNodeListener } from '../server/nodeListener.node-test.ts'
import type { HeaderValue, RequestHandler } from '../server/types.ts'

const ENABLED = process.env.FREEDOM_SURFACE_PROOF === '1'
const REPO = fileURLToPath(new URL('../../../../', import.meta.url))
const DIST = join(REPO, 'packages/cad-mobile-viewer/dist')
const FIXTURES = join(REPO, 'packages/cad-viewer-example/e2e/fixtures')
const EVIDENCE = join(REPO, 'docs/evidence/OBJ-0104-m4-i6')
/** Geometria colorida (círculos/linhas, 0,6 MB) e texto para o FIND. */
const FIXTURE = 'block-color.dxf'

// Playwright vive nas dependências do exemplo (pnpm); não é dependência do app.
const requireFromExample = createRequire(
  realpathSync(
    join(
      REPO,
      'packages/cad-viewer-example/node_modules/@playwright/test/package.json'
    )
  )
)

// O app não depende de `playwright` (nem dos seus tipos): tipos mínimos locais.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = any
type Browser = any
type Playwright = { chromium: { launch(o: object): Promise<Browser> } }

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true }
] as const

/** Pedido visto pelo servidor: só classe de rota e cabeçalhos de origem. */
interface SeenRequest {
  route: 'page' | 'bundle' | 'asset' | 'other'
  status: number
  secFetchSite?: string
  secFetchMode?: string
  secFetchDest?: string
  origin: 'none' | 'self' | 'other'
}

function header(h: Readonly<Record<string, HeaderValue>>, name: string) {
  const v = h[name]
  return Array.isArray(v) ? v.join(',') : (v as string | undefined)
}

function manifestOf(dir: string) {
  const files: { path: string; bytes: number }[] = []
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const full = join(d, e)
      if (statSync(full).isDirectory()) walk(full)
      else files.push({ path: relative(dir, full), bytes: statSync(full).size })
    }
  }
  walk(dir)
  return { files }
}

/** Píxeis desenhados (≠ fundo) de um PNG, descodificado no próprio Chromium. */
async function pixelStats(decoder: Page, png: Buffer) {
  return decoder.evaluate(async (b64: string) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
    const bmp = await createImageBitmap(blob)
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const ctx = c.getContext('2d')!
    ctx.drawImage(bmp, 0, 0)
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height)
    // fundo = cor mais frequente
    const freq = new Map<number, number>()
    for (let i = 0; i < data.length; i += 4) {
      const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
      freq.set(k, (freq.get(k) ?? 0) + 1)
    }
    let bg = 0
    let best = -1
    for (const [k, n] of freq) if (n > best) [bg, best] = [k, n]
    let drawn = 0
    let minX = Infinity
    let minY = Infinity
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < bmp.height; y++) {
      for (let x = 0; x < bmp.width; x++) {
        const i = (y * bmp.width + x) * 4
        const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
        if (k !== bg) {
          drawn++
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
        }
      }
    }
    const hash = Array.from(data.slice(0))
      .reduce((h, v) => (h * 31 + v) >>> 0, 7)
      .toString(16)
    return {
      width: bmp.width,
      height: bmp.height,
      background: `#${bg.toString(16).padStart(6, '0')}`,
      drawnPixels: drawn,
      drawnFraction: drawn / (bmp.width * bmp.height),
      distinctColors: freq.size,
      bbox: drawn ? { minX, minY, maxX, maxY } : null,
      hash
    }
  }, png.toString('base64'))
}

describe(
  'prova de superfície real: bundle + LocalAssetServer + Chromium',
  {
    skip:
      !ENABLED &&
      'defina FREEDOM_SURFACE_PROOF=1 (precisa de dist/ e do Chromium do Playwright)'
  },
  () => {
    let browser: Browser
    let server: LocalAssetServer
    const assets = new Map<string, Uint8Array>()
    const seen: SeenRequest[] = []
    const metrics: Record<string, unknown> = {}

    before(async () => {
      assert.ok(
        statSync(join(DIST, 'index.html'), { throwIfNoEntry: false }),
        'bundle em falta: correr `vite build -c packages/cad-mobile-viewer/vite.config.ts`'
      )
      mkdirSync(EVIDENCE, { recursive: true })
      const base = createNodeListener()
      // regista só a classe de rota e os cabeçalhos de origem (nunca o URL/token)
      const listener = {
        listen: (handler: RequestHandler, onClosed: () => void) =>
          base.listen(async req => {
            const res = await handler(req)
            const path = req.target.split('/')
            const route: SeenRequest['route'] =
              path[1] !== 's'
                ? 'other'
                : path[3] === 'a'
                  ? 'asset'
                  : path.length <= 4 && (path[3] ?? '') === ''
                    ? 'page'
                    : 'bundle'
            const origin = header(req.headers, 'origin')
            seen.push({
              route,
              status: res.status,
              secFetchSite: header(req.headers, 'sec-fetch-site'),
              secFetchMode: header(req.headers, 'sec-fetch-mode'),
              secFetchDest: header(req.headers, 'sec-fetch-dest'),
              origin:
                origin === undefined
                  ? 'none'
                  : origin === server.info?.origin
                    ? 'self'
                    : 'other'
            })
            return res
          }, onClosed),
        close: () => base.close()
      }
      server = new LocalAssetServer({
        listener,
        bundle: createManifestBundle(manifestOf(DIST), async p =>
          readFileSync(join(DIST, p))
        ),
        assets: {
          sizeOf: async id => assets.get(id)?.byteLength ?? null,
          read: async id => {
            const b = assets.get(id)
            if (!b) throw new Error('asset em falta')
            return b
          }
        }
      })
      await server.start()
      const { chromium } = requireFromExample('playwright') as Playwright
      // `channel: 'chromium'` = Chromium completo (novo headless), não o headless-shell
      browser = await chromium.launch({
        channel: 'chromium',
        args: [
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--enable-unsafe-swiftshader'
        ]
      })
    })

    after(async () => {
      await browser?.close()
      await server?.dispose()
      writeFileSync(
        join(EVIDENCE, 'metrics.json'),
        JSON.stringify(
          { ...metrics, serverRequests: summarize(seen) },
          null,
          2
        ) + '\n'
      )
    })

    for (const vp of VIEWPORTS) {
      it(`${vp.name} (${vp.width}px): abre, desenha píxeis, FIND/zoom/falhas visíveis, zero rede externa, CSP sem violações`, async () => {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.mobile ? 3 : 1,
          isMobile: vp.mobile,
          hasTouch: vp.mobile
        })
        const external: string[] = []
        ctx.on('request', (r: { url(): string }) => {
          const u = r.url()
          if (
            !u.startsWith(server.info!.origin) &&
            !u.startsWith('data:') &&
            !u.startsWith('blob:')
          ) {
            external.push(new URL(u).origin)
          }
        })
        await ctx.addInitScript(() => {
          const w = window as unknown as Record<string, unknown>
          w.__out = [] as string[]
          w.__csp = [] as string[]
          w.ReactNativeWebView = {
            postMessage: (m: string) => (w.__out as string[]).push(m)
          }
          document.addEventListener('securitypolicyviolation', e =>
            (w.__csp as string[]).push(`${e.violatedDirective} ${e.blockedURI}`)
          )
        })
        const page = await ctx.newPage()
        const consoleErrors: string[] = []
        page.on('pageerror', (e: Error) =>
          consoleErrors.push(String(e.message).slice(0, 200))
        )
        const decoder = await browser.newPage()

        let n = 0
        let read = 0
        const drain = async (): Promise<ViewerMessage[]> => {
          const out = (await page.evaluate(() =>
            (window as unknown as { __out: string[] }).__out.slice()
          )) as string[]
          const fresh = out.slice(read)
          read = out.length
          return fresh.map(raw => {
            const p = parseViewerMessage(raw)
            assert.ok(p.ok, `app rejeitou ${raw}`)
            return p.message
          })
        }
        const waitFor = async <T extends ViewerMessage['type']>(
          type: T,
          ms = 60_000
        ) => {
          const end = Date.now() + ms
          const got: ViewerMessage[] = []
          while (Date.now() < end) {
            got.push(...(await drain()))
            const m = got.find(x => x.type === type)
            if (m)
              return { msg: m as Extract<ViewerMessage, { type: T }>, all: got }
            await page.waitForTimeout(100)
          }
          throw new Error(
            `sem «${type}»; recebido: ${got.map(m => m.type).join(',')}`
          )
        }
        const send = async <T extends AppToViewerType>(
          type: T,
          payload: AppPayloads[T]
        ) => {
          const built = buildAppMessage(`a-${++n}`, type, payload)
          assert.ok(built.ok)
          await page.evaluate((s: string) => {
            // a mesma string que `ViewerSurface.injectJavaScript` executa
            ;(0, eval)(s)
          }, encodeInjection(built.message))
        }
        const settle = () => page.waitForTimeout(1500)
        const shot = async (label: string) => {
          const png = await page.screenshot()
          writeFileSync(join(EVIDENCE, `${vp.name}-${label}.png`), png)
          return pixelStats(decoder, png)
        }

        // 1. página do viewer (URL com token só em memória)
        await page.goto(server.info!.viewerUrl)
        const ready = await waitFor('ready')
        assert.equal(ready.msg.payload.protocol, 1)
        const blank = await shot('0-ready')

        // 2. ficheiro entregue por URL do servidor (concessão + createLoopbackFetch)
        const bytes = readFileSync(join(FIXTURES, FIXTURE))
        assets.set('fixture-block-color', bytes)
        const url = server.urlFor('fixture-block-color', 'dxf')
        assert.ok(url)
        const t0 = Date.now()
        await send('open', {
          name: FIXTURE,
          size: bytes.byteLength,
          source: { kind: 'url', url }
        })
        const opened = await waitFor('opened', 90_000)
        const openMs = Date.now() - t0
        assert.ok(opened.msg.payload.layouts.length >= 1)
        await settle()
        const drawn = await shot('1-opened')
        assert.ok(
          drawn.drawnPixels > 200,
          `desenho não apareceu: ${JSON.stringify(drawn)}`
        )
        assert.ok(drawn.drawnPixels > blank.drawnPixels * 2 + 100)

        // 3. zoom in muda os píxeis; extents repõe-nos
        await send('zoom', { op: 'in' })
        await settle()
        const zoomed = await shot('2-zoom-in')
        assert.notEqual(zoomed.hash, drawn.hash, 'zoom in não mudou o ecrã')
        await send('zoom', { op: 'extents' })
        await settle()
        const extents = await shot('3-zoom-extents')

        // 4. FIND real + navegação para o hit (vista muda)
        await send('find', { query: 'A', matchCase: false, scope: 'drawing' })
        const found = await waitFor('findResult')
        assert.ok(found.msg.payload.total > 0, 'FIND sem resultados')
        await send('goto', { findId: found.msg.payload.findId, index: 0 })
        const active = await waitFor('findActive')
        assert.equal(active.msg.payload.outcome, 'navigated')
        await settle()
        const hit = await shot('4-find-goto')
        assert.notEqual(
          hit.hash,
          extents.hash,
          'navegação FIND não mudou o ecrã'
        )

        // 5. falha visível e documento anterior preservado
        assets.set(
          'broken-file-0001',
          new TextEncoder().encode('0\nSECTION\nlixo')
        )
        const bad = server.urlFor('broken-file-0001', 'dxf')!
        await send('open', {
          name: 'broken.dxf',
          size: 13,
          source: { kind: 'url', url: bad }
        })
        const failed = await waitFor('openFailed', 60_000)
        await settle()
        const afterFail = await shot('5-open-failed')
        assert.ok(
          afterFail.drawnPixels > 200,
          'falha apagou o documento anterior'
        )

        // 6. revogação: o URL morre (fetch real → 404 uniforme)
        server.release('fixture-block-color')
        const revoked = await page.evaluate(
          async (u: string) => (await fetch(u)).status,
          url
        )
        assert.equal(revoked, 404)

        // 7. CSP fail-closed: pedido externo bloqueado ANTES da rede
        const blocked = await page.evaluate(async () => {
          try {
            await fetch('https://cdn.jsdelivr.net/npm/x')
            return 'passou'
          } catch {
            return 'bloqueado'
          }
        })
        assert.equal(blocked, 'bloqueado')
        await page.waitForTimeout(200)
        const csp = (await page.evaluate(
          () => (window as unknown as { __csp: string[] }).__csp
        )) as string[]
        const unexpected = csp.filter(v => !v.includes('cdn.jsdelivr.net'))
        assert.deepEqual(unexpected, [], 'violações de CSP do próprio viewer')
        assert.ok(
          csp.some(v => v.startsWith('connect-src')),
          'CSP não registou o bloqueio'
        )
        assert.deepEqual(external, [], 'pedidos de rede externos')

        metrics[vp.name] = {
          viewport: {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: vp.mobile ? 3 : 1
          },
          openMs,
          layouts: opened.msg.payload.layouts.map(l => l.name),
          findTotal: found.msg.payload.total,
          openFailedCode: failed.msg.payload.code,
          revokedStatus: revoked,
          externalRequests: external.length,
          cspViolationsOwn: unexpected.length,
          cspBlockedExternal: csp.length,
          pageErrors: consoleErrors,
          pixels: { blank, drawn, zoomed, extents, hit, afterFail }
        }
        await ctx.close()
        await decoder.close()
      })
    }

    it('Sec-Fetch/Origin reais do Chromium: página e assets same-origin aceites; outra origem → 403', async () => {
      assets.set('cross-site-0001', new TextEncoder().encode('0\nEOF\n'))
      const url = server.urlFor('cross-site-0001', 'dxf')!
      // outra origem real em loopback (outra porta ⇒ «same-site», não «same-origin»)
      const other = http.createServer((_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end('<p>outra app</p>')
      })
      await new Promise<void>(r => other.listen(0, '127.0.0.1', r))
      const otherOrigin = `http://127.0.0.1:${(other.address() as AddressInfo).port}`
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await page.goto(otherOrigin)
      const before = seen.length
      const outcome = await page.evaluate(async (u: string) => {
        const r: string[] = []
        try {
          r.push((await fetch(u)).status.toString())
        } catch {
          r.push('cors-erro')
        }
        try {
          r.push((await fetch(u, { mode: 'no-cors' })).type)
        } catch {
          r.push('erro')
        }
        return r
      }, url)
      await ctx.close()
      await new Promise(r => other.close(r))
      const cross = seen.slice(before).filter(s => s.route === 'asset')
      metrics.crossOrigin = { outcome, serverSaw: cross }
      assert.ok(
        cross.length > 0,
        `pedido de outra origem não chegou (${outcome})`
      )
      assert.ok(
        cross.every(s => s.status === 403 && s.secFetchSite !== 'same-origin'),
        `outra origem aceite: ${JSON.stringify(cross)}`
      )
      // tudo o que foi servido (200) veio da própria origem ou de navegação directa
      const accepted = seen.filter(s => s.status === 200)
      assert.ok(
        accepted.every(
          s => s.secFetchSite === 'same-origin' || s.secFetchSite === 'none'
        ),
        JSON.stringify(summarize(accepted))
      )
      assert.ok(
        seen.some(
          s =>
            s.route === 'page' &&
            s.secFetchSite === 'none' &&
            s.secFetchDest === 'document'
        )
      )
      assert.ok(
        seen.some(
          s =>
            s.route === 'asset' &&
            s.status === 200 &&
            s.secFetchSite === 'same-origin'
        )
      )
    })
  }
)

function summarize(list: SeenRequest[]) {
  const out: Record<string, number> = {}
  for (const s of list) {
    const k = `${s.route} ${s.status} site=${s.secFetchSite ?? '-'} mode=${s.secFetchMode ?? '-'} dest=${s.secFetchDest ?? '-'} origin=${s.origin}`
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}
