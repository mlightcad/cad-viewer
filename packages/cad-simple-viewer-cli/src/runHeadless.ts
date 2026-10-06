import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { type Browser, chromium, type Page } from 'playwright'

/**
 * Document open mode passed into the headless runner page.
 *
 * - `read` — open the input drawing read-only (default when `-i` is set)
 * - `write` — open for editing / blank ISO template (default when `-i` is omitted)
 */
export type CadViewerCliOpenMode = 'read' | 'write'

/**
 * How the view is framed immediately after a document opens.
 *
 * Matches {@link AcApOpenViewMode} in `@mlightcad/cad-simple-viewer`.
 *
 * - `extents` — zoom to the full drawing extents
 * - `saved` — restore AutoCAD's saved view (layout limits / VPORT `*ACTIVE`)
 */
export type CadViewerCliOpenViewMode = 'extents' | 'saved'

/**
 * Open-database options forwarded to the headless runner (excluding mode).
 *
 * Progressive rendering is always forced off in CLI mode so drawings open
 * as quickly as possible; it is not configurable here.
 */
export interface CadViewerCliOpenOptions {
  /** How to frame the view after open. */
  openViewMode?: CadViewerCliOpenViewMode
  /**
   * Whether entities on non-plottable ("no-plot") layers are drawn.
   * Default when omitted: `false` (web viewer semantics).
   */
  drawNoPlotLayers?: boolean
  /**
   * Max segments used to tessellate a full circle when drawing.
   * Default when omitted: draft quality (50).
   */
  circleSides?: number
}

/**
 * Options for {@link runHeadless} / {@link HeadlessCadSession.run}.
 */
export interface RunHeadlessOptions extends CadViewerCliOpenOptions {
  /** Path to the `.scr` command script (required). */
  scriptPath: string
  /**
   * Optional local `.dxf` / `.dwg` path, or an `http(s)` URL to a drawing.
   * Omit to start from a blank ISO template.
   */
  inputPath?: string
  /** Directory where exported files are saved. */
  outputDir?: string
  /** UI locale for command prompts / keywords (`en`, `zh`, …). */
  locale?: string
  /**
   * Resource base URL passed to {@link AcApDocManager} (`fonts/` and templates).
   * When omitted, the runner uses the default CDN `cad-data` URL.
   */
  baseUrl?: string
  /** Document open mode. Default: `read` with input, `write` without input. */
  mode?: CadViewerCliOpenMode
  /** Optional log file path (append). */
  logfile?: string
}

/**
 * Result of a successful {@link runHeadless} run.
 */
export interface RunHeadlessResult {
  /** Absolute directory where downloads were written. */
  outputDir: string
  /** Absolute paths of files captured from browser downloads. */
  savedFiles: string[]
  /** Wall-clock timings in milliseconds for this run. */
  timings?: Record<string, number>
}

declare global {
  interface Window {
    /**
     * Injected by the CLI runner page (`dist-runner`). Opens an optional drawing
     * and executes a multi-command `.scr` script, returning captured downloads.
     */
    runCadScript: (
      fileName: string | null,
      drawingUrl: string | null,
      script: string,
      options?: {
        locale?: string
        mode?: CadViewerCliOpenMode
        startBlank?: boolean
        openViewMode?: CadViewerCliOpenViewMode
        drawNoPlotLayers?: boolean
        circleSides?: number
        baseUrl?: string
        saveBaseUrl?: string
      }
    ) => Promise<{ ok: true; files: Array<{ fileName: string }> }>
  }
}

/**
 * Resolves the `@mlightcad/cad-simple-viewer-cli` package root
 * (parent of the compiled `dist/` directory).
 *
 * @returns Absolute package root path
 */
function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

/**
 * Directory that holds the built Playwright runner (`index.html`, assets, workers).
 *
 * @returns Absolute path to `dist-runner`
 */
function runnerDistDir(): string {
  return path.join(packageRoot(), 'dist-runner')
}

/**
 * Appends one line to the optional CLI logfile.
 *
 * No-ops when `logfile` is omitted. Creates parent directories as needed.
 *
 * @param logfile - Absolute or relative log path, or `undefined` to skip
 * @param line - Text line to append (without trailing newline)
 */
async function appendLog(logfile: string | undefined, line: string) {
  if (!logfile) {
    return
  }
  await mkdir(path.dirname(path.resolve(logfile)), { recursive: true })
  await writeFile(logfile, `${line}\n`, { flag: 'a', encoding: 'utf8' })
}

/**
 * Picks a non-colliding path under `outputDir` for a downloaded file name.
 *
 * If `fileName` already exists, appends `-2`, `-3`, … before the extension.
 *
 * @param outputDir - Destination directory
 * @param fileName - Suggested file name from the browser download
 * @returns Absolute unique path inside `outputDir`
 */
function uniqueOutputPath(outputDir: string, fileName: string): string {
  const base = path.basename(fileName)
  let candidate = path.join(outputDir, base)
  if (!existsSync(candidate)) {
    return candidate
  }
  const ext = path.extname(base)
  const stem = path.basename(base, ext)
  let index = 2
  while (existsSync(candidate)) {
    candidate = path.join(outputDir, `${stem}-${index}${ext}`)
    index++
  }
  return candidate
}

/**
 * Returns whether `value` looks like an `http:` / `https:` drawing URL.
 */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

/**
 * File name used for format detection when opening a remote drawing.
 */
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

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

interface CliStaticServer {
  url: string
  close: () => Promise<void>
  /**
   * Registers a local drawing file under `/__cli_input__/<token>/<fileName>`
   * and returns the absolute URL the page can fetch.
   */
  mountInput: (absolutePath: string, fileName: string) => string
  /**
   * Sets the directory that `/__cli_save__/<fileName>` POST bodies write into.
   */
  setSaveDir: (dir: string) => void
  /**
   * Absolute paths written via `/__cli_save__` since the last
   * {@link resetSavedFiles} call.
   */
  takeSavedFiles: () => string[]
  resetSavedFiles: () => void
}

/**
 * Starts a loopback HTTP server for the CLI runner, drawing inputs, and
 * binary download saves (avoids base64 over CDP).
 */
function startCliStaticServer(root: string): Promise<CliStaticServer> {
  return new Promise((resolve, reject) => {
    const mountedInputs = new Map<string, string>()
    let saveDir: string | null = null
    let savedFiles: string[] = []
    let mountSeq = 0

    const server = createServer((req, res) => {
      void handleRequest(req, res)
    })

    async function handleRequest(req: IncomingMessage, res: ServerResponse) {
      try {
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
        if (req.method === 'POST' && urlPath.startsWith('/__cli_save__/')) {
          if (!saveDir) {
            res.writeHead(500)
            res.end('Save directory not configured')
            return
          }
          const fileName = path.basename(urlPath.slice('/__cli_save__/'.length))
          if (!fileName) {
            res.writeHead(400)
            res.end('Missing file name')
            return
          }
          const body = await readRequestBody(req)
          const dest = uniqueOutputPath(saveDir, fileName)
          await writeFile(dest, body)
          savedFiles.push(dest)
          res.writeHead(204)
          res.end()
          return
        }

        if (urlPath.startsWith('/__cli_input__/')) {
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
        reject(new Error('Failed to start static server for CLI runner.'))
        return
      }
      const baseUrl = `http://127.0.0.1:${address.port}`
      resolve({
        url: baseUrl,
        mountInput: (absolutePath, _fileName) => {
          const token = String(++mountSeq)
          const urlPath = `/__cli_input__/${token}`
          mountedInputs.set(urlPath, absolutePath)
          return `${baseUrl}${urlPath}`
        },
        setSaveDir: dir => {
          saveDir = dir
        },
        takeSavedFiles: () => {
          const files = savedFiles
          savedFiles = []
          return files
        },
        resetSavedFiles: () => {
          savedFiles = []
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
 * Long-lived headless Chromium session that can run many drawings without
 * relaunching the browser or reloading WASM/fonts for each file.
 */
export class HeadlessCadSession {
  private constructor(
    private readonly browser: Browser,
    private readonly page: Page,
    private readonly server: CliStaticServer,
    private readonly launchMs: number
  ) {}

  static async create(): Promise<HeadlessCadSession> {
    const runnerDir = runnerDistDir()
    if (!existsSync(path.join(runnerDir, 'index.html'))) {
      throw new Error(
        'CLI runner is not built. Run "pnpm --filter @mlightcad/cad-simple-viewer-cli build".'
      )
    }

    const t0 = performance.now()
    const server = await startCliStaticServer(runnerDir)
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL
    const browser = await chromium.launch({
      headless: true,
      ...(channel ? { channel } : {})
    })
    const context = await browser.newContext({ acceptDownloads: true })
    const page = await context.newPage()
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('GL Driver Message')) {
        return
      }
      if (
        text.startsWith('[cad-simple-viewer-cli]') ||
        text.startsWith('[chtml]') ||
        msg.type() === 'error' ||
        msg.type() === 'warning'
      ) {
        console.log(text)
      }
    })
    page.on('pageerror', error => {
      console.error('[cad-simple-viewer-cli] page error:', error.message)
    })
    await page.goto(`${server.url}/index.html`, { waitUntil: 'networkidle' })
    const launchMs = performance.now() - t0
    console.log(`[cad-simple-viewer-cli] browser ready: ${launchMs.toFixed(0)} ms`)
    return new HeadlessCadSession(browser, page, server, launchMs)
  }

  get browserLaunchMs() {
    return this.launchMs
  }

  async run(options: RunHeadlessOptions): Promise<RunHeadlessResult> {
    const absoluteScript = path.resolve(options.scriptPath)
    if (!existsSync(absoluteScript)) {
      throw new Error(`Script not found: ${absoluteScript}`)
    }

    const timings: Record<string, number> = {
      browserLaunch: this.launchMs
    }
    const runT0 = performance.now()

    let absoluteInput: string | undefined
    let fileName: string | null = null
    let drawingUrl: string | null = null

    if (options.inputPath) {
      const tLoad = performance.now()
      if (isHttpUrl(options.inputPath)) {
        absoluteInput = options.inputPath
        fileName = drawingNameFromUrl(options.inputPath)
        const ext = path.extname(fileName).toLowerCase()
        if (ext !== '.dxf' && ext !== '.dwg') {
          throw new Error(
            `Unsupported remote drawing "${fileName}". URL path must end with .dxf or .dwg.`
          )
        }
        drawingUrl = options.inputPath
      } else {
        absoluteInput = path.resolve(options.inputPath)
        const ext = path.extname(absoluteInput).toLowerCase()
        if (ext !== '.dxf' && ext !== '.dwg') {
          throw new Error(
            `Unsupported file type "${ext}". Only .dxf and .dwg are supported.`
          )
        }
        if (!existsSync(absoluteInput)) {
          throw new Error(`Input drawing not found: ${absoluteInput}`)
        }
        fileName = path.basename(absoluteInput)
        drawingUrl = this.server.mountInput(absoluteInput, fileName)
      }
      timings.mountInput = performance.now() - tLoad
    }

    const outputDir = path.resolve(
      options.outputDir ??
        (absoluteInput && !isHttpUrl(absoluteInput)
          ? path.dirname(absoluteInput)
          : process.cwd())
    )
    await mkdir(outputDir, { recursive: true })
    this.server.setSaveDir(outputDir)
    this.server.resetSavedFiles()

    const scriptText = await readFile(absoluteScript, 'utf8')
    const mode =
      options.mode ?? (absoluteInput ? ('read' as const) : ('write' as const))

    const logfile = options.logfile ? path.resolve(options.logfile) : undefined
    await appendLog(
      logfile,
      `[cad-simple-viewer-cli] input=${absoluteInput ?? '(blank)'} script=${absoluteScript} output=${outputDir}`
    )

    const openExtras = {
      openViewMode: options.openViewMode,
      drawNoPlotLayers: options.drawNoPlotLayers,
      circleSides: options.circleSides,
      baseUrl: options.baseUrl,
      saveBaseUrl: `${this.server.url}/__cli_save__/`
    }

    const tScript = performance.now()
    try {
      await this.page.evaluate(
        async ({
          name,
          drawingUrl: url,
          script,
          locale,
          mode: openMode,
          startBlank,
          openViewMode,
          drawNoPlotLayers,
          circleSides,
          baseUrl,
          saveBaseUrl
        }) => {
          return window.runCadScript(name, url, script, {
            locale,
            mode: openMode,
            startBlank,
            openViewMode,
            drawNoPlotLayers,
            circleSides,
            baseUrl,
            saveBaseUrl
          })
        },
        {
          name: fileName,
          drawingUrl,
          script: scriptText,
          locale: options.locale,
          mode,
          startBlank: !absoluteInput,
          ...openExtras
        }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await appendLog(
        logfile,
        `[cad-simple-viewer-cli] script failed: ${message}`
      )
      throw error
    }
    timings.scriptAndExport = performance.now() - tScript

    const savedFiles = this.server.takeSavedFiles()
    for (const dest of savedFiles) {
      await appendLog(logfile, `[cad-simple-viewer-cli] saved ${dest}`)
    }

    timings.total = performance.now() - runT0
    await appendLog(
      logfile,
      `[cad-simple-viewer-cli] done saved=${savedFiles.length} totalMs=${timings.total.toFixed(0)}`
    )
    console.log(
      '[cad-simple-viewer-cli] timings: ' +
        Object.entries(timings)
          .map(([k, v]) => `${k}=${v.toFixed(0)}ms`)
          .join(' ')
    )

    return { outputDir, savedFiles, timings }
  }

  async close(): Promise<void> {
    await this.browser.close()
    await this.server.close()
  }
}

/**
 * Runs a `.scr` command script in headless Chromium and writes captured
 * export downloads into `outputDir`.
 *
 * Prefer {@link HeadlessCadSession} when exporting many drawings so the
 * browser and WASM parser stay warm across files.
 */
export async function runHeadless(
  options: RunHeadlessOptions
): Promise<RunHeadlessResult> {
  const session = await HeadlessCadSession.create()
  try {
    return await session.run(options)
  } finally {
    await session.close()
  }
}

/**
 * Runs the same script against many drawings in one Chromium session.
 */
export async function runHeadlessBatch(
  jobs: RunHeadlessOptions[]
): Promise<RunHeadlessResult[]> {
  if (jobs.length === 0) {
    return []
  }
  const session = await HeadlessCadSession.create()
  const results: RunHeadlessResult[] = []
  try {
    for (const job of jobs) {
      results.push(await session.run(job))
    }
    return results
  } finally {
    await session.close()
  }
}
