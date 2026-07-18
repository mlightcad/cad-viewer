import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { type Browser, chromium, type Page } from 'playwright'

/** Result shape mirroring `@mlightcad/cad-agent-plugin`'s `ToolResult`. */
export interface ToolResult {
  success: boolean
  message: string
  entityIds?: string[]
  error?: string
}

interface Point2dInput {
  x: number
  y: number
}

function runnerDistDir(): string {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )
  return path.join(packageRoot, 'dist-runner')
}

function startStaticServer(root: string): Promise<{
  url: string
  close: () => Promise<void>
}> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
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

        const ext = path.extname(filePath).toLowerCase()
        const types: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.wasm': 'application/wasm'
        }
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
        void readFile(filePath).then(body => {
          res.writeHead(200)
          res.end(body)
        })
      } catch (error) {
        res.writeHead(500)
        res.end(String(error))
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start static server for MCP runner.'))
        return
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close(err => (err ? closeReject(err) : closeResolve()))
          })
      })
    })
  })
}

/**
 * Owns a single headless-Chromium session running the cad-mcp-server runner page,
 * which boots `@mlightcad/cad-simple-viewer` and executes drawing tool calls via
 * `@mlightcad/cad-agent-plugin`'s {@link cadActionExecutor}.
 *
 * Lazily started on first tool call and kept alive for the lifetime of the MCP
 * server process so that drawing state persists across tool calls in one session.
 */
export class CadBrowserSession {
  private browser?: Browser
  private page?: Page
  private closeServer?: () => Promise<void>
  private startPromise?: Promise<void>

  private async ensureStarted(): Promise<void> {
    if (this.page) {
      return
    }
    if (!this.startPromise) {
      this.startPromise = this.start()
    }
    await this.startPromise
  }

  private async start(): Promise<void> {
    const runnerDir = runnerDistDir()
    if (!existsSync(path.join(runnerDir, 'index.html'))) {
      throw new Error(
        'cad-mcp-server runner is not built. Run "pnpm --filter @mlightcad/cad-mcp-server build".'
      )
    }

    const server = await startStaticServer(runnerDir)
    this.closeServer = server.close

    this.browser = await chromium.launch({
      headless: process.env.CAD_MCP_HEADLESS !== 'false'
    })
    this.page = await this.browser.newPage()
    await this.page.goto(`${server.url}/index.html`, {
      waitUntil: 'networkidle'
    })
    await this.page.evaluate(() => window.__cadMcp.ensure())
  }

  /** Closes the browser and static server. Safe to call multiple times. */
  async stop(): Promise<void> {
    await this.page?.close().catch(() => undefined)
    await this.browser?.close().catch(() => undefined)
    await this.closeServer?.().catch(() => undefined)
    this.page = undefined
    this.browser = undefined
    this.closeServer = undefined
    this.startPromise = undefined
  }

  async openDrawing(fileName: string, filePath: string): Promise<ToolResult> {
    await this.ensureStarted()
    const absolute = path.resolve(filePath)
    const bytes = await readFile(absolute)
    return this.page!.evaluate(
      ({ fileName, base64 }) => window.__cadMcp.openDrawing(fileName, base64),
      { fileName, base64: bytes.toString('base64') }
    )
  }

  async getDrawingContext(): Promise<unknown> {
    await this.ensureStarted()
    return this.page!.evaluate(() => window.__cadMcp.getDrawingContext())
  }

  async drawLine(input: {
    start: Point2dInput
    end: Point2dInput
    layer?: string
  }): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      input => window.__cadMcp.drawLine(input),
      input
    )
  }

  async drawCircle(input: {
    center: Point2dInput
    radius: number
    layer?: string
  }): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      input => window.__cadMcp.drawCircle(input),
      input
    )
  }

  async drawArc(input: {
    center: Point2dInput
    radius: number
    startAngleDeg: number
    endAngleDeg: number
    layer?: string
  }): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(input => window.__cadMcp.drawArc(input), input)
  }

  async drawRectangle(input: {
    corner1: Point2dInput
    corner2: Point2dInput
    layer?: string
  }): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      input => window.__cadMcp.drawRectangle(input),
      input
    )
  }

  async drawPolyline(input: {
    points: Point2dInput[]
    closed?: boolean
    layer?: string
  }): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      input => window.__cadMcp.drawPolyline(input),
      input
    )
  }

  async drawText(input: {
    position: Point2dInput
    text: string
    height?: number
    layer?: string
  }): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      input => window.__cadMcp.drawText(input),
      input
    )
  }

  async setCurrentLayer(layerName: string): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      layerName => window.__cadMcp.setCurrentLayer(layerName),
      layerName
    )
  }

  async createLayer(layerName: string): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(
      layerName => window.__cadMcp.createLayer(layerName),
      layerName
    )
  }

  async zoomExtents(): Promise<ToolResult> {
    await this.ensureStarted()
    return this.page!.evaluate(() => window.__cadMcp.zoomExtents())
  }
}
