// SPDX-License-Identifier: GPL-3.0-or-later
//
// Prova de superfície real (card M4-I6 rework; decisão t_d2446cfc, arquitectura
// §7 item 6), pelo CAMINHO DA APP: `startViewerSession` (o mesmo ciclo de vida
// do `ViewerScreen`) cria o `LocalAssetServer` sobre o listener HTTP do app
// (`createTcpHttpListener`, aqui com o `net` do Node em 127.0.0.1; no
// dispositivo com `react-native-tcp-socket`), serve o bundle REAL do viewer
// (`packages/cad-mobile-viewer/dist`), e um Chromium headless REAL (WebGL por
// software) carrega o `viewerUrl` a 1280×800 e a 390×844. O ficheiro é
// escolhido pelo `FileFlow` (picker → cópia → concessão → URL), as ordens
// FIND/zoom saem do `BridgeClient` (`encodeInjection`, a mesma string que a
// `ViewerSurface` injecta) e as respostas voltam por `session.receive` ao
// `sessionReducer` real. A prova são PÍXEIS do compositor, nunca o modelo nem
// o `FakeView`.
//
// Opt-in (`FREEDOM_SURFACE_PROOF=1`): precisa do bundle construído e do
// Chromium do Playwright. Sem eles o teste FALHA (não salta em silêncio).
// Artefactos (PNG + `metrics.json`): por omissão numa pasta temporária (a
// execução do gate G7 NÃO suja o repo); `FREEDOM_SURFACE_PROOF_OUT=<dir>` escolhe
// a pasta e `FREEDOM_SURFACE_PROOF_EVIDENCE=1` regrava a evidência versionada
// em `docs/evidence/OBJ-0104-m4-i6/chromium/`.
import assert from 'node:assert/strict'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import net, { type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import type {
  AssetStorePort,
  DocumentPickerPort,
  PickedFile
} from '../files/ports.ts'
import {
  startViewerSession,
  type ViewerSession
} from '../screens/viewerSession.ts'
import { createManifestBundle } from '../server/bundle.ts'
import { LocalAssetServer } from '../server/localAssetServer.ts'
import { createTcpHttpListener } from '../server/tcpHttpListener.ts'
import type {
  AssetBytesPort,
  HeaderValue,
  RequestHandler,
  ServerEvent
} from '../server/types.ts'
import {
  initialSessionState,
  sessionReducer,
  type SessionState
} from '../state/session.ts'
import { proofOutDir } from './outDir.ts'
import { isAllowedNavigation, isViewerUrl } from '../viewer/navigation.ts'

const ENABLED = process.env.FREEDOM_SURFACE_PROOF === '1'
const REPO = fileURLToPath(new URL('../../../../', import.meta.url))
const DIST = join(REPO, 'packages/cad-mobile-viewer/dist')
const FIXTURES = join(REPO, 'packages/cad-viewer-example/e2e/fixtures')
const EVIDENCE_DIR = join(REPO, 'docs/evidence/OBJ-0104-m4-i6/chromium')
const EVIDENCE = ENABLED
  ? proofOutDir(process.env, EVIDENCE_DIR, () =>
      mkdtempSync(join(tmpdir(), 'surface-proof-out-'))
    )
  : EVIDENCE_DIR
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

/** Pasta controlada da app, em disco (o equivalente Node de `expoFileAdapters`). */
function diskStore(dir: string): AssetStorePort & AssetBytesPort {
  const at = (id: string) => join(dir, id)
  return {
    sizeOf: async (uriOrId: string) =>
      uriOrId.startsWith('file://')
        ? statSync(fileURLToPath(uriOrId)).size
        : (statSync(at(uriOrId), { throwIfNoEntry: false })?.size ?? null),
    stage: async (source, assetId) => {
      copyFileSync(fileURLToPath(source.uri), at(assetId))
      return { size: statSync(at(assetId)).size }
    },
    readBase64: async id => readFileSync(at(id)).toString('base64'),
    read: async id => new Uint8Array(readFileSync(at(id))),
    remove: async id => {
      rmSync(at(id), { force: true })
    },
    discardSource: async () => undefined,
    sweep: async () => {
      const all = readdirSync(dir)
      for (const f of all) unlinkSync(at(f))
      return all.length
    }
  } as AssetStorePort & AssetBytesPort
}

class QueuePicker implements DocumentPickerPort {
  next: PickedFile | null = null
  async pick() {
    const file = this.next
    this.next = null
    return file
      ? { status: 'picked' as const, file }
      : { status: 'cancelled' as const }
  }
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
  'prova de superfície real pelo caminho da app: startViewerSession + listener TCP + bundle real + Chromium',
  {
    skip:
      !ENABLED &&
      'defina FREEDOM_SURFACE_PROOF=1 (precisa de dist/ e do Chromium do Playwright)'
  },
  () => {
    let browser: Browser
    const seen: SeenRequest[] = []
    const metrics: Record<string, unknown> = {}
    const work = mkdtempSync(join(tmpdir(), 'surface-proof-'))

    before(async () => {
      assert.ok(
        statSync(join(DIST, 'index.html'), { throwIfNoEntry: false }),
        'bundle em falta: correr `vite build -c packages/cad-mobile-viewer/vite.config.ts`'
      )
      mkdirSync(EVIDENCE, { recursive: true })
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
      rmSync(work, { recursive: true, force: true })
      console.log(`# surfaceProof: artefactos em ${EVIDENCE}`)
      writeFileSync(
        join(EVIDENCE, 'metrics.json'),
        JSON.stringify(
          {
            method:
              'startViewerSession + LocalAssetServer + createTcpHttpListener(node:net, 127.0.0.1) + bundle real (dist) + Chromium headless (ANGLE/SwiftShader); píxeis de page.screenshot()',
            ...metrics,
            serverRequests: summarize(seen)
          },
          null,
          2
        ) + '\n'
      )
    })

    /** Servidor do app com registo só de classe de rota/cabeçalhos de origem. */
    const createServer =
      (assets: AssetBytesPort, originOf: () => string | undefined) =>
      (onEvent: (e: ServerEvent) => void) => {
        const base = createTcpHttpListener(net)
        return new LocalAssetServer({
          listener: {
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
                      : origin === originOf()
                        ? 'self'
                        : 'other'
                })
                return res
              }, onClosed),
            close: () => base.close()
          },
          bundle: createManifestBundle(manifestOf(DIST), async p =>
            readFileSync(join(DIST, p))
          ),
          assets,
          onEvent
        })
      }

    for (const vp of VIEWPORTS) {
      it(`${vp.name} (${vp.width}px): app abre o viewer, entrega o ficheiro, desenha píxeis, FIND/zoom, erro visível, limpeza; zero rede externa, CSP sem violações`, async () => {
        const dir = join(work, vp.name)
        mkdirSync(dir)
        const store = diskStore(dir)
        const picker = new QueuePicker()
        let state: SessionState = initialSessionState
        let viewerUrl: string | null = null
        let page: Page = null
        let injected = Promise.resolve()
        const injectErrors: string[] = []
        const session: ViewerSession = startViewerSession({
          createServer: createServer(store, () =>
            viewerUrl ? new URL(viewerUrl).origin : undefined
          ),
          // `webview.injectJavaScript`: síncrono para a ponte, por ordem
          inject: script => {
            if (!page) throw new Error('superfície do viewer indisponível')
            const p = page
            injected = injected.then(() =>
              p
                .evaluate((s: string) => {
                  ;(0, eval)(s)
                }, script)
                .catch((e: Error) => {
                  injectErrors.push(String(e.message).slice(0, 120))
                })
            )
          },
          picker,
          store,
          appState: { addEventListener: () => ({ remove: () => undefined }) },
          dispatch: a => {
            state = sessionReducer(state, a)
          },
          onViewerUrl: u => {
            viewerUrl = u
          },
          onServerIssue: issue => assert.equal(issue, null, String(issue))
        })

        try {
          const ctx = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: vp.mobile ? 3 : 1,
            isMobile: vp.mobile,
            hasTouch: vp.mobile
          })
          const external: string[] = []
          const navigations: { url: string; allowed: boolean }[] = []
          ctx.on(
            'request',
            (r: { url(): string; isNavigationRequest(): boolean }) => {
              const u = r.url()
              if (r.isNavigationRequest()) {
                navigations.push({
                  url: u.replace(/\/s\/[^/]+\//, '/s/<token>/'),
                  allowed: isAllowedNavigation(u, viewerUrl)
                })
              }
              if (
                !(viewerUrl && u.startsWith(new URL(viewerUrl).origin)) &&
                !u.startsWith('data:') &&
                !u.startsWith('blob:')
              ) {
                external.push(new URL(u).origin)
              }
            }
          )
          await ctx.addInitScript(() => {
            const w = window as unknown as Record<string, unknown>
            w.__out = [] as string[]
            w.__csp = [] as string[]
            w.ReactNativeWebView = {
              postMessage: (m: string) => (w.__out as string[]).push(m)
            }
            document.addEventListener('securitypolicyviolation', e =>
              (w.__csp as string[]).push(
                `${e.violatedDirective} ${e.blockedURI}`
              )
            )
          })
          page = await ctx.newPage()
          const consoleErrors: string[] = []
          page.on('pageerror', (e: Error) =>
            consoleErrors.push(String(e.message).slice(0, 200))
          )
          const decoder = await browser.newPage()

          // viewer → app: `onMessage` da WebView → `session.receive`
          let read = 0
          const pump = async () => {
            await injected
            const out = (await page.evaluate(() =>
              (window as unknown as { __out: string[] }).__out.slice()
            )) as string[]
            for (const raw of out.slice(read)) session.receive(raw)
            read = out.length
          }
          const until = async (
            what: string,
            cond: () => boolean,
            ms = 60_000
          ) => {
            const end = Date.now() + ms
            while (!cond()) {
              if (Date.now() > end) {
                throw new Error(
                  `sem «${what}»: ${JSON.stringify({ shell: state.shell, document: state.document, find: state.find, issue: state.issue })}`
                )
              }
              await pump()
              await page.waitForTimeout(100)
            }
          }
          const settle = async () => {
            await pump()
            await page.waitForTimeout(1500)
          }
          const shot = async (label: string) => {
            const png = await page.screenshot()
            writeFileSync(join(EVIDENCE, `${vp.name}-${label}.png`), png)
            return pixelStats(decoder, png)
          }
          const pick = (path: string) => {
            picker.next = {
              name: path.split('/').pop()!,
              uri: `file://${path}`,
              size: statSync(path).size,
              owned: false
            }
            return session.flow!.pickAndOpen()
          }

          // 1. o servidor da sessão arranca e dá a página real (token só em memória)
          const tStart = Date.now()
          while (!viewerUrl && Date.now() - tStart < 5000) {
            await new Promise(r => setTimeout(r, 10))
          }
          assert.ok(isViewerUrl(viewerUrl), 'viewerUrl fora do contrato')
          await page.goto(viewerUrl!)
          await until('ready', () => state.shell.viewer === 'ready')
          const bootMs = Date.now() - tStart
          const blank = await shot('0-ready')

          // 2. FileFlow: picker → cópia → concessão → open{url} → opened
          const t0 = Date.now()
          const handed = await pick(join(FIXTURES, FIXTURE))
          assert.equal(handed.status, 'handed-off')
          await until('opened', () => state.document.current !== null, 90_000)
          const openMs = Date.now() - t0
          assert.ok(state.document.current!.layouts.length >= 1)
          await settle()
          const drawn = await shot('1-opened')
          assert.ok(
            drawn.drawnPixels > 200,
            `desenho não apareceu: ${JSON.stringify(drawn)}`
          )
          assert.ok(drawn.drawnPixels > blank.drawnPixels * 2 + 100)

          // 3. zoom in muda os píxeis; extents repõe-nos (pela ponte da app)
          assert.equal(session.client!.zoom({ op: 'in' }).ok, true)
          await settle()
          const zoomed = await shot('2-zoom-in')
          assert.notEqual(zoomed.hash, drawn.hash, 'zoom in não mudou o ecrã')
          assert.equal(session.client!.zoom({ op: 'extents' }).ok, true)
          await settle()
          const extents = await shot('3-zoom-extents')
          assert.equal(state.zoom.error, null)

          // 4. FIND real + navegação para o hit (vista muda)
          session.client!.find({
            query: 'A',
            matchCase: false,
            scope: 'drawing'
          })
          await until('findResult', () => state.find.status === 'results')
          assert.ok(state.find.total > 0, 'FIND sem resultados')
          session.client!.goto({ findId: state.find.findId!, index: 0 })
          await until('findActive', () => state.find.activeIndex === 0)
          assert.equal(state.find.lastOutcome, 'navigated')
          await settle()
          const hit = await shot('4-find-goto')
          assert.notEqual(
            hit.hash,
            extents.hash,
            'navegação FIND não mudou o ecrã'
          )

          // 5. falha visível e documento anterior preservado
          // «.dxf» que não é DXF (bytes binários): o importador recusa-o no sniff
          const broken = join(work, `${vp.name}-broken.dxf`)
          writeFileSync(
            broken,
            Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 37) & 0xff))
          )
          const grantUrl = (() => {
            const ids = readdirSync(dir)
            return ids.length === 1
              ? session.server!.urlFor(ids[0], 'dxf')
              : null
          })()
          await pick(broken)
          await until('openFailed', () => state.document.error !== null, 60_000)
          assert.match(state.document.error!.code, /^[a-z-]+$/)
          assert.ok(state.document.current, 'falha apagou o documento anterior')
          await settle()
          const afterFail = await shot('5-open-failed')
          assert.ok(
            afterFail.drawnPixels > 200,
            'falha apagou o desenho anterior'
          )

          // 6. CSP fail-closed: pedido externo bloqueado ANTES da rede
          const blocked = await page.evaluate(async () => {
            try {
              await fetch('https://cdn.jsdelivr.net/npm/x')
              return 'passou'
            } catch {
              return 'bloqueado'
            }
          })
          assert.equal(blocked, 'bloqueado')
          // navegação para fora da sessão: a política da ViewerSurface recusa-a
          assert.equal(
            isAllowedNavigation('https://example.org/', viewerUrl),
            false
          )
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
          assert.ok(
            navigations.every(n => n.allowed),
            JSON.stringify(navigations)
          )
          assert.deepEqual(injectErrors, [])

          // 7. limpeza determinística: assets apagados, servidor fechado
          const origin = new URL(viewerUrl!).origin
          await session.dispose()
          assert.deepEqual(readdirSync(dir), [], 'assets por apagar')
          assert.equal(session.server!.state, 'disposed')
          const afterDispose = await page.evaluate(
            async (u: string) => {
              try {
                return String((await fetch(u)).status)
              } catch {
                return 'recusado'
              }
            },
            grantUrl ?? `${origin}/`
          )
          assert.equal(afterDispose, 'recusado')

          metrics[vp.name] = {
            viewport: {
              width: vp.width,
              height: vp.height,
              deviceScaleFactor: vp.mobile ? 3 : 1
            },
            bootMs,
            openMs,
            layouts: state.document.current!.layouts.map(l => l.name),
            findTotal: state.find.total,
            findOutcome: state.find.lastOutcome,
            openFailedCode: state.document.error!.code,
            afterDisposeFetch: afterDispose,
            externalRequests: external.length,
            navigations,
            cspViolationsOwn: unexpected.length,
            cspBlockedExternal: csp.length,
            pageErrors: consoleErrors,
            pixels: { blank, drawn, zoomed, extents, hit, afterFail }
          }
          await ctx.close()
          await decoder.close()
        } finally {
          await session.dispose()
        }
      })
    }

    it('Sec-Fetch/Origin reais do Chromium: página e assets same-origin aceites; outra origem → 403', async () => {
      const dir = join(work, 'cross')
      mkdirSync(dir)
      const store = diskStore(dir)
      const picker = new QueuePicker()
      let viewerUrl: string | null = null
      const session = startViewerSession({
        createServer: createServer(store, () =>
          viewerUrl ? new URL(viewerUrl).origin : undefined
        ),
        inject: () => undefined,
        picker,
        store,
        appState: { addEventListener: () => ({ remove: () => undefined }) },
        dispatch: () => undefined,
        onViewerUrl: u => {
          viewerUrl = u
        },
        onServerIssue: () => undefined
      })
      try {
        while (!viewerUrl) await new Promise(r => setTimeout(r, 10))
        const doc = join(work, 'cross.dxf')
        writeFileSync(doc, '0\nEOF\n')
        // concessão real do FileFlow (o viewer não está de pé: a entrega fica
        // em fila, mas o URL do asset já existe no servidor)
        await store.stage(
          { uri: `file://${doc}`, consume: false },
          'f1-cross0001',
          'dxf'
        )
        const url = session.server!.urlFor('f1-cross0001', 'dxf')!
        // outra origem real em loopback (outra porta ⇒ «same-site», não «same-origin»)
        const other = http.createServer((_req, res) => {
          res.setHeader('Content-Type', 'text/html')
          res.end('<p>outra app</p>')
        })
        await new Promise<void>(r => other.listen(0, '127.0.0.1', r))
        const otherOrigin = `http://127.0.0.1:${(other.address() as AddressInfo).port}`
        const ctx = await browser.newContext()
        const page = await ctx.newPage()
        // a página real do viewer (navegação de topo, `none`) e o asset same-origin
        await page.goto(viewerUrl)
        const same = await page.evaluate(
          async (u: string) => (await fetch(u)).status,
          url
        )
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
        metrics.crossOrigin = {
          sameOriginStatus: same,
          outcome,
          serverSaw: cross
        }
        assert.equal(same, 200)
        assert.ok(
          cross.length > 0,
          `pedido de outra origem não chegou (${outcome})`
        )
        assert.ok(
          cross.every(
            s => s.status === 403 && s.secFetchSite !== 'same-origin'
          ),
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
      } finally {
        await session.dispose()
      }
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
