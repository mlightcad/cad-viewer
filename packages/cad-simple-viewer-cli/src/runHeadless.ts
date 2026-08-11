import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

/**
 * Document open mode passed into the headless runner page.
 *
 * - `read` — open the input drawing read-only (default when `-i` is set)
 * - `write` — open for editing / blank ISO template (default when `-i` is omitted)
 */
export type CadViewerCliOpenMode = 'read' | 'write'

/**
 * Options for {@link runHeadless}.
 */
export interface RunHeadlessOptions {
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
}

/**
 * One file captured from a browser `<a download>` click inside the runner page.
 *
 * @internal
 */
interface CapturedFile {
  /** Suggested download file name (from the `download` attribute). */
  fileName: string
  /** File contents encoded as base64. */
  base64: string
}

declare global {
  interface Window {
    /**
     * Injected by the CLI runner page (`dist-runner`). Opens an optional drawing
     * and executes a multi-command `.scr` script, returning captured downloads.
     *
     * @param fileName - Drawing file name used for format detection, or `null` for blank
     * @param bytes - Drawing bytes, or `null` when starting blank
     * @param script - Full `.scr` script text
     * @param options - Locale, open mode, and whether to create a blank document
     * @returns Captured download files from export commands
     */
    runCadScript: (
      fileName: string | null,
      bytes: Uint8Array | null,
      script: string,
      options?: {
        locale?: string
        mode?: CadViewerCliOpenMode
        startBlank?: boolean
      }
    ) => Promise<{ ok: true; files: CapturedFile[] }>
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

/**
 * Loads drawing bytes from a local path or remote URL.
 */
async function loadDrawingInput(inputPath: string): Promise<{
  label: string
  fileName: string
  base64: string
}> {
  if (isHttpUrl(inputPath)) {
    const fileName = drawingNameFromUrl(inputPath)
    const ext = path.extname(fileName).toLowerCase()
    if (ext !== '.dxf' && ext !== '.dwg') {
      throw new Error(
        `Unsupported remote drawing "${fileName}". URL path must end with .dxf or .dwg.`
      )
    }
    const response = await fetch(inputPath)
    if (!response.ok) {
      throw new Error(
        `Failed to download drawing (${response.status} ${response.statusText}): ${inputPath}`
      )
    }
    const bytes = Buffer.from(await response.arrayBuffer())
    return {
      label: inputPath,
      fileName,
      base64: bytes.toString('base64')
    }
  }

  const absoluteInput = path.resolve(inputPath)
  const ext = path.extname(absoluteInput).toLowerCase()
  if (ext !== '.dxf' && ext !== '.dwg') {
    throw new Error(
      `Unsupported file type "${ext}". Only .dxf and .dwg are supported.`
    )
  }
  if (!existsSync(absoluteInput)) {
    throw new Error(`Input drawing not found: ${absoluteInput}`)
  }
  const fileBytes = await readFile(absoluteInput)
  return {
    label: absoluteInput,
    fileName: path.basename(absoluteInput),
    base64: fileBytes.toString('base64')
  }
}

/**
 * Starts a loopback HTTP server that serves static files from `root`.
 *
 * Used to load the Vite-built runner page into Playwright without packing
 * assets into a `file://` URL.
 *
 * @param root - Absolute directory to serve (typically {@link runnerDistDir})
 * @returns Server base URL and a `close` function that shuts the listener down
 */
function startStaticServer(root: string): Promise<{
  url: string
  close: () => Promise<void>
}> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
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
        reject(new Error('Failed to start static server for CLI runner.'))
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
 * Runs a `.scr` command script in headless Chromium and writes captured
 * export downloads into `outputDir`.
 *
 * When `inputPath` is omitted, the runner starts from a blank ISO template
 * (write mode) so scripts can create geometry from scratch. The page waits for
 * entity convert / deferred font geometry before executing the script so
 * exports such as `pngout` include rendered text.
 *
 * @param options - Script path, optional input drawing, output dir, locale, mode, logfile
 * @returns Absolute output directory and list of saved file paths
 * @throws If the script or input file is missing, the file type is unsupported,
 *   the runner build is missing, or the in-page script fails
 */
export async function runHeadless(
  options: RunHeadlessOptions
): Promise<RunHeadlessResult> {
  const absoluteScript = path.resolve(options.scriptPath)
  if (!existsSync(absoluteScript)) {
    throw new Error(`Script not found: ${absoluteScript}`)
  }

  let absoluteInput: string | undefined
  let fileName: string | null = null
  let base64: string | null = null

  if (options.inputPath) {
    const drawing = await loadDrawingInput(options.inputPath)
    absoluteInput = drawing.label
    fileName = drawing.fileName
    base64 = drawing.base64
  }

  const outputDir = path.resolve(
    options.outputDir ??
      (absoluteInput && !isHttpUrl(absoluteInput)
        ? path.dirname(absoluteInput)
        : process.cwd())
  )
  await mkdir(outputDir, { recursive: true })

  const runnerDir = runnerDistDir()
  if (!existsSync(path.join(runnerDir, 'index.html'))) {
    throw new Error(
      'CLI runner is not built. Run "pnpm --filter @mlightcad/cad-simple-viewer-cli build".'
    )
  }

  const scriptText = await readFile(absoluteScript, 'utf8')
  const mode =
    options.mode ?? (absoluteInput ? ('read' as const) : ('write' as const))

  const logfile = options.logfile ? path.resolve(options.logfile) : undefined
  await appendLog(
    logfile,
    `[cad-simple-viewer-cli] input=${absoluteInput ?? '(blank)'} script=${absoluteScript} output=${outputDir}`
  )

  const server = await startStaticServer(runnerDir)
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL
  const browser = await chromium.launch({
    headless: true,
    ...(channel ? { channel } : {})
  })

  const savedFiles: string[] = []

  try {
    const context = await browser.newContext({ acceptDownloads: true })
    const page = await context.newPage()
    await page.goto(`${server.url}/index.html`, { waitUntil: 'networkidle' })

    let result: { ok: true; files: CapturedFile[] }
    try {
      result = await page.evaluate(
        async ({ name, data, script, locale, mode: openMode, startBlank }) => {
          if (data == null || name == null) {
            return window.runCadScript(null, null, script, {
              locale,
              mode: openMode,
              startBlank
            })
          }
          const binary = atob(data)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
          }
          return window.runCadScript(name, bytes, script, {
            locale,
            mode: openMode,
            startBlank: false
          })
        },
        {
          name: fileName,
          data: base64,
          script: scriptText,
          locale: options.locale,
          mode,
          startBlank: !absoluteInput
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

    for (const file of result.files) {
      const dest = uniqueOutputPath(outputDir, file.fileName)
      await writeFile(dest, Buffer.from(file.base64, 'base64'))
      savedFiles.push(dest)
      await appendLog(logfile, `[cad-simple-viewer-cli] saved ${dest}`)
    }

    await appendLog(
      logfile,
      `[cad-simple-viewer-cli] done saved=${savedFiles.length}`
    )

    return { outputDir, savedFiles }
  } finally {
    await browser.close()
    await server.close()
  }
}
