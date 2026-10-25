import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ToolResult } from '@mlightcad/cad-agent-core'
import { type Browser, type Page } from 'playwright'

import { launchHeadlessChromium } from './headlessGpu.js'

export type CadMcpOpenMode = 'read' | 'write'

export interface CadMcpSessionCreateOptions {
  /** Prefer hardware GPU WebGL. Default `true`. */
  useGpu?: boolean
}

interface McpStaticServer {
  url: string
  close: () => Promise<void>
  mountInput: (absolutePath: string, fileName: string) => string
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
 * Long-lived headless Chromium session hosting cad-simple-viewer + agent-core.
 *
 * Started lazily on the first tool call and kept for the process lifetime so
 * drawing state persists across MCP tool invocations.
 */
export class CadMcpSession {
  private constructor(
    private readonly browser: Browser,
    private readonly page: Page,
    private readonly server: McpStaticServer
  ) {}

  private static instance: Promise<CadMcpSession> | undefined

  /**
   * Returns the shared session, creating it on first call.
   */
  static shared(
    options: CadMcpSessionCreateOptions = {}
  ): Promise<CadMcpSession> {
    if (!this.instance) {
      this.instance = this.create(options).catch(error => {
        this.instance = undefined
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

    const server = await startStaticServer(runnerDir)
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL
    const gpu = await launchHeadlessChromium({
      channel,
      useGpu: options.useGpu
    })
    const browser = gpu.browser
    console.error(
      `[cad-mcp-server] webgl: ${gpu.renderer} (${gpu.backend})`
    )
    const context = await browser.newContext()
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
    return new CadMcpSession(browser, page, server)
  }

  async openDrawing(input: {
    path?: string
    mode?: CadMcpOpenMode
  }): Promise<{ ok: true; title: string; mode: CadMcpOpenMode }> {
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

    return this.page.evaluate(
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
  }

  async executeCadScript(input: {
    code: string
    intent?: string
  }): Promise<ToolResult> {
    return this.page.evaluate(async args => {
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
  }

  async close(): Promise<void> {
    await this.browser.close().catch(() => undefined)
    await this.server.close().catch(() => undefined)
  }
}
