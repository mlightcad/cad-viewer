import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ToolResult, ToolResultSavedFile } from '@mlightcad/cad-agent-core'
import { CAD_MCP_DXF_OUTBOX_KEY } from '@mlightcad/cad-agent-core/script-api'
import { type Browser, type Page } from 'playwright'

import { launchHeadlessChromium } from './headlessGpu.js'

export type CadMcpOpenMode = 'read' | 'write'

const DEFAULT_IDLE_CLOSE_MS = 30_000

export interface CadMcpSessionCreateOptions {
  /** Prefer hardware GPU WebGL. Default `true`. */
  useGpu?: boolean
  /**
   * Show a Chromium window so the user can watch the drawing.
   * Default `false` (headless).
   */
  headed?: boolean
  /**
   * Headless-only: close the browser after this many ms of idle time
   * since the last tool call. Default `30000`. Ignored when headed.
   */
  idleCloseMs?: number
}

interface McpStaticServer {
  url: string
  close: () => Promise<void>
  mountInput: (absolutePath: string, fileName: string) => string
}

async function writeDxfOutbox(page: Page): Promise<ToolResultSavedFile[]> {
  const items = await page.evaluate((key: string) => {
    const host = window as unknown as Record<string, unknown>
    const queued =
      (host[key] as
        | Array<{ path?: string; fileName: string; text: string }>
        | undefined) ?? []
    host[key] = []
    return queued
  }, CAD_MCP_DXF_OUTBOX_KEY)

  const saved: ToolResultSavedFile[] = []
  for (const item of items) {
    const fileName = item.fileName.toLowerCase().endsWith('.dxf')
      ? item.fileName
      : `${item.fileName}.dxf`
    const requested = item.path?.trim() || fileName
    const absolute = path.resolve(requested)
    const target = absolute.toLowerCase().endsWith('.dxf')
      ? absolute
      : `${absolute}.dxf`
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, item.text, 'utf8')
    saved.push({
      path: target,
      fileName: path.basename(target),
      bytes: Buffer.byteLength(item.text),
      delivery: 'file'
    })
  }
  return saved
}

function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

function runnerDistDir(): string {
  return path.join(packageRoot(), 'dist-runner')
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function drawingNameFromUrl(urlString: string): string {
  try {
    const pathname = new URL(urlString).pathname
    const base = path.basename(pathname)
    if (base && path.extname(base)) {
      return base
    }
  } catch {
    // fall through
  }
  return 'drawing.dwg'
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.dwg': 'application/octet-stream',
    '.dxf': 'application/octet-stream'
  }
  return types[ext] ?? 'application/octet-stream'
}

function resolveIdleCloseMs(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return override
  }
  const fromEnv = process.env.CAD_MCP_IDLE_CLOSE_MS
  if (fromEnv !== undefined && fromEnv !== '') {
    const parsed = Number(fromEnv)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return DEFAULT_IDLE_CLOSE_MS
}

function startStaticServer(root: string): Promise<McpStaticServer> {
  return new Promise((resolve, reject) => {
    const mountedInputs = new Map<string, string>()
    let mountSeq = 0

    const server = createServer((req, res) => {
      void handleRequest(req, res)
    })

    async function handleRequest(req: IncomingMessage, res: ServerResponse) {
      try {
        const urlPath = decodeURIComponent(
          (req.url ?? '/').split('?')[0] ?? '/'
        )

        if (urlPath.startsWith('/__mcp_input__/')) {
          const absolute = mountedInputs.get(urlPath)
          if (!absolute || !existsSync(absolute)) {
            res.writeHead(404)
            res.end()
            return
          }
          const body = await readFile(absolute)
          res.setHeader('Content-Type', contentTypeFor(absolute))
          res.setHeader('Content-Length', String(body.byteLength))
          res.writeHead(200)
          res.end(body)
          return
        }

        const relative =
          urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '')
        const filePath = path.join(root, relative)

        if (!filePath.startsWith(root)) {
          res.writeHead(403)
          res.end()
          return
        }

        if (!existsSync(filePath)) {
          res.writeHead(404)
          res.end()
          return
        }

        res.setHeader('Content-Type', contentTypeFor(filePath))
        const body = await readFile(filePath)
        res.writeHead(200)
        res.end(body)
      } catch (error) {
        res.writeHead(500)
        res.end(String(error))
      }
    }

    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start static server for MCP runner.'))
        return
      }
      const baseUrl = `http://127.0.0.1:${address.port}`
      resolve({
        url: baseUrl,
        mountInput: (absolutePath, _fileName) => {
          const token = String(++mountSeq)
          const urlPath = `/__mcp_input__/${token}`
          mountedInputs.set(urlPath, absolutePath)
          return `${baseUrl}${urlPath}`
        },
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close(err => (err ? closeReject(err) : closeResolve()))
          })
      })
    })
  })
}

/**
 * Long-lived Chromium session hosting cad-simple-viewer + agent-core.
 *
 * Started lazily on the first tool call. Headless sessions auto-close after
 * idle time; headed sessions stay open so the user can watch the drawing.
 */
export class CadMcpSession {
  private idleTimer: ReturnType<typeof setTimeout> | undefined

  private constructor(
    private readonly browser: Browser,
    private readonly page: Page,
    private readonly server: McpStaticServer,
    readonly headed: boolean,
    private readonly idleCloseMs: number
  ) {}

  private static instance: Promise<CadMcpSession> | undefined
  /** Resolved session used to detect headed mismatches before await. */
  private static resolved: CadMcpSession | undefined

  /**
   * Returns the shared session, creating it on first call.
   *
   * If an existing session has a different `headed` flag, it is closed and
   * rebuilt (drawing state is lost).
   */
  static async shared(
    options: CadMcpSessionCreateOptions = {}
  ): Promise<CadMcpSession> {
    const headed = options.headed === true

    if (this.instance) {
      const existing = await this.instance.catch(() => undefined)
      if (existing) {
        if (existing.headed === headed) {
          return existing
        }
        console.error(
          `[cad-mcp-server] switching to ${headed ? 'headed' : 'headless'}; rebuilding session (drawing state reset)`
        )
        await existing.close()
      }
    }

    if (!this.instance) {
      this.instance = this.create(options)
        .then(session => {
          this.resolved = session
          return session
        })
        .catch(error => {
          this.instance = undefined
          this.resolved = undefined
          throw error
        })
    }
    return this.instance
  }

  static async create(
    options: CadMcpSessionCreateOptions = {}
  ): Promise<CadMcpSession> {
    const runnerDir = runnerDistDir()
    if (!existsSync(path.join(runnerDir, 'index.html'))) {
      throw new Error(
        'MCP runner is not built. Run "pnpm --filter @mlightcad/cad-mcp-server build".'
      )
    }

    const headed = options.headed === true
    const idleCloseMs = resolveIdleCloseMs(options.idleCloseMs)
    const server = await startStaticServer(runnerDir)
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL
    const gpu = await launchHeadlessChromium({
      channel,
      useGpu: options.useGpu,
      headed
    })
    const browser = gpu.browser
    console.error(
      `[cad-mcp-server] webgl: ${gpu.renderer} (${gpu.backend}); ${headed ? 'headed' : 'headless'}`
    )
    // Headed: match the real window so resizing updates layout / canvas.
    // Headless: keep Playwright's default fixed viewport for stable capture.
    const context = await browser.newContext(
      headed ? { viewport: null } : undefined
    )
    const page = await context.newPage()
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('GL Driver Message')) {
        return
      }
      if (
        text.startsWith('[cad-mcp-server]') ||
        msg.type() === 'error' ||
        msg.type() === 'warning'
      ) {
        console.error(text)
      }
    })
    page.on('pageerror', error => {
      console.error('[cad-mcp-server] page error:', error.message)
    })
    await page.goto(`${server.url}/index.html`, { waitUntil: 'networkidle' })
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __cadMcp?: unknown }).__cadMcp !==
        'undefined'
    )
    console.error('[cad-mcp-server] browser ready')
    return new CadMcpSession(browser, page, server, headed, idleCloseMs)
  }

  private clearIdleClose(): void {
    if (this.idleTimer !== undefined) {
      clearTimeout(this.idleTimer)
      this.idleTimer = undefined
    }
  }

  private scheduleIdleClose(): void {
    this.clearIdleClose()
    if (this.headed || this.idleCloseMs <= 0) {
      return
    }
    this.idleTimer = setTimeout(() => {
      console.error(
        `[cad-mcp-server] headless idle ${this.idleCloseMs}ms; closing browser`
      )
      void this.close()
    }, this.idleCloseMs)
    // Allow the Node process to exit if only the idle timer remains.
    this.idleTimer.unref?.()
  }

  private touchActivity(): void {
    if (this.headed) {
      this.clearIdleClose()
      return
    }
    this.scheduleIdleClose()
  }

  async openDrawing(input: {
    path?: string
    mode?: CadMcpOpenMode
  }): Promise<{ ok: true; title: string; mode: CadMcpOpenMode }> {
    // Pause idle close for the whole tool call — a prior 30s timer must not
    // kill Chromium while open/load (or a long script) is still running.
    this.clearIdleClose()

    let fileName: string | null = null
    let drawingUrl: string | null = null
    const pathArg = input.path?.trim()

    if (pathArg) {
      if (isHttpUrl(pathArg)) {
        drawingUrl = pathArg
        fileName = drawingNameFromUrl(pathArg)
      } else {
        const absolute = path.resolve(pathArg)
        if (!existsSync(absolute)) {
          throw new Error(`Drawing not found: ${absolute}`)
        }
        fileName = path.basename(absolute)
        drawingUrl = this.server.mountInput(absolute, fileName)
      }
    }

    const mode: CadMcpOpenMode =
      input.mode ?? (pathArg ? 'read' : 'write')

    try {
      return await this.page.evaluate(
        async ({ fileName: name, drawingUrl: url, mode: openMode }) => {
          const api = (
            window as unknown as {
              __cadMcp: {
                openDrawing: (a: {
                  fileName: string | null
                  drawingUrl: string | null
                  mode: CadMcpOpenMode
                  startBlank: boolean
                }) => Promise<{ ok: true; title: string; mode: CadMcpOpenMode }>
              }
            }
          ).__cadMcp
          return api.openDrawing({
            fileName: name,
            drawingUrl: url,
            mode: openMode,
            startBlank: !url
          })
        },
        { fileName, drawingUrl, mode }
      )
    } finally {
      this.touchActivity()
    }
  }

  async executeCadScript(input: {
    code: string
    intent?: string
  }): Promise<ToolResult> {
    // Scripts can exceed the idle window (MCP raises tick/ms limits for large
    // drawings). Clear before evaluate so the prior idle timer cannot close us.
    this.clearIdleClose()

    try {
      const result = await this.page.evaluate(async args => {
        const api = (
          window as unknown as {
            __cadMcp: {
              executeCadScript: (a: {
                code: string
                intent?: string
              }) => Promise<ToolResult>
            }
          }
        ).__cadMcp
        return api.executeCadScript(args)
      }, input)
      const written = await writeDxfOutbox(this.page)
      if (written.length) {
        result.savedFiles = written
      }
      return result
    } finally {
      this.touchActivity()
    }
  }

  async close(): Promise<void> {
    this.clearIdleClose()
    if (CadMcpSession.resolved === this) {
      CadMcpSession.resolved = undefined
    }
    CadMcpSession.instance = undefined
    await this.browser.close().catch(() => undefined)
    await this.server.close().catch(() => undefined)
  }
}
