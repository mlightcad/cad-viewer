#!/usr/bin/env node
/**
 * Local examples gallery: list `.scr` / batch examples and run them via the CLI.
 *
 *   pnpm --filter @mlightcad/cad-simple-viewer-cli examples
 *   # open http://127.0.0.1:5179
 */
import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const examplesDir = path.join(packageRoot, 'examples')
const galleryDir = path.join(packageRoot, 'gallery')
const cliJs = path.join(packageRoot, 'dist', 'cli.js')
const catalogPath = path.join(examplesDir, 'index.json')
const defaultPort = Number(process.env.CAD_CLI_EXAMPLES_PORT || 5179)

type InputKind = 'none' | 'file' | 'directory'

interface CatalogExample {
  id: string
  title: string
  description: string
  script: string
  mode?: 'read' | 'write'
  /** @deprecated use inputKind */
  requiresInput?: boolean
  inputKind?: InputKind
  kind?: 'script' | 'batch'
  runnable?: boolean
}

interface Catalog {
  fixtureDrawing?: string
  defaultOutputDir?: string
  examples: CatalogExample[]
}

interface RunOptions {
  id: string
  input?: string
  output?: string
}

/** Run a user-authored `.scr` from the gallery (not from the catalog). */
interface CustomRunOptions {
  script: string
  input?: string
  output?: string
  mode?: 'read' | 'write'
  /** Defaults to `file` when `input` is set, otherwise `none`. */
  inputKind?: 'none' | 'file'
}

function resolveInputKind(example: CatalogExample): InputKind {
  if (example.inputKind) return example.inputKind
  if (example.kind === 'batch') return 'directory'
  if (example.requiresInput) return 'file'
  return 'none'
}

function sendJson(
  res: import('node:http').ServerResponse,
  status: number,
  body: unknown
) {
  const json = JSON.stringify(body, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(json)
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.scr': 'text/plain; charset=utf-8',
    '.mjs': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml'
  }
  return types[ext] ?? 'application/octet-stream'
}

async function readCatalog(): Promise<Catalog> {
  const raw = await readFile(catalogPath, 'utf8')
  return JSON.parse(raw) as Catalog
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function resolveFixture(catalog: Catalog): string | undefined {
  if (!catalog.fixtureDrawing) return undefined
  if (isHttpUrl(catalog.fixtureDrawing)) {
    return catalog.fixtureDrawing.trim()
  }
  return path.resolve(examplesDir, catalog.fixtureDrawing)
}

function resolveDefaultOutput(catalog: Catalog, exampleId: string): string {
  const base = catalog.defaultOutputDir
    ? path.resolve(packageRoot, catalog.defaultOutputDir)
    : path.join(packageRoot, 'tmp', 'examples-gallery')
  return path.join(base, exampleId)
}

function resolveUserPath(raw: string | undefined): string | undefined {
  if (!raw || !raw.trim()) return undefined
  const trimmed = raw.trim()
  if (isHttpUrl(trimmed)) {
    return trimmed
  }
  return path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.resolve(packageRoot, trimmed)
}

async function readBody(
  req: import('node:http').IncomingMessage
): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function runProcess(
  command: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      env: process.env
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => {
      stdout += String(d)
    })
    child.stderr.on('data', d => {
      stderr += String(d)
    })
    child.on('error', reject)
    child.on('exit', code => {
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

function assertPathExists(filePath: string, label: string) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`)
  }
}

function assertIsFile(filePath: string, label: string) {
  if (isHttpUrl(filePath)) {
    let pathname: string
    try {
      pathname = new URL(filePath).pathname
    } catch {
      throw new Error(`${label} is not a valid URL: ${filePath}`)
    }
    const ext = path.extname(pathname).toLowerCase()
    if (ext !== '.dxf' && ext !== '.dwg') {
      throw new Error(
        `${label} URL must end with .dxf or .dwg: ${filePath}`
      )
    }
    return
  }
  assertPathExists(filePath, label)
  if (!statSync(filePath).isFile()) {
    throw new Error(`${label} must be a file: ${filePath}`)
  }
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== '.dxf' && ext !== '.dwg') {
    throw new Error(`${label} must be a .dxf or .dwg file: ${filePath}`)
  }
}

function assertIsDirectory(dirPath: string, label: string) {
  assertPathExists(dirPath, label)
  if (!statSync(dirPath).isDirectory()) {
    throw new Error(`${label} must be a directory: ${dirPath}`)
  }
}

async function handleRun(options: RunOptions): Promise<{
  ok: boolean
  exampleId: string
  command: string[]
  outputDir: string
  inputPath?: string
  savedFiles: string[]
  stdout: string
  stderr: string
  exitCode: number
}> {
  if (!existsSync(cliJs)) {
    throw new Error(
      'CLI not built. Run: pnpm --filter @mlightcad/cad-simple-viewer-cli build'
    )
  }

  const catalog = await readCatalog()
  const example = catalog.examples.find(item => item.id === options.id)
  if (!example) {
    throw new Error(`Unknown example id: ${options.id}`)
  }
  if (example.runnable === false) {
    throw new Error(`Example "${options.id}" is not runnable from the gallery.`)
  }

  const scriptPath = path.join(examplesDir, example.script)
  if (!existsSync(scriptPath)) {
    throw new Error(`Script missing: ${scriptPath}`)
  }

  const inputKind = resolveInputKind(example)
  const outputDir =
    resolveUserPath(options.output) ??
    resolveDefaultOutput(catalog, example.id)
  await mkdir(outputDir, { recursive: true })

  let inputPath = resolveUserPath(options.input)
  if (inputKind === 'file') {
    inputPath = inputPath ?? resolveFixture(catalog)
    if (!inputPath) {
      throw new Error('This example requires an input .dxf / .dwg path.')
    }
    assertIsFile(inputPath, 'Input drawing')
  } else if (inputKind === 'directory') {
    if (!inputPath) {
      throw new Error('This example requires an input directory path.')
    }
    assertIsDirectory(inputPath, 'Input directory')
  }

  let command: string[]
  let result: { code: number; stdout: string; stderr: string }

  if (example.kind === 'batch' || scriptPath.endsWith('.mjs')) {
    command = [
      'node',
      path.relative(packageRoot, scriptPath),
      inputPath!,
      outputDir
    ]
    result = await runProcess(process.execPath, [
      scriptPath,
      inputPath!,
      outputDir
    ])
  } else {
    const args = ['-s', scriptPath, '-o', outputDir]
    if (example.mode) {
      args.push('--mode', example.mode)
    }
    if (inputKind === 'file' && inputPath) {
      args.unshift('-i', inputPath)
    }
    command = ['node', 'dist/cli.js', ...args]
    result = await runProcess(process.execPath, [cliJs, ...args])
  }

  const savedFiles = (result.stdout.match(/^Wrote (.+)$/gm) ?? []).map(line =>
    line.replace(/^Wrote /, '')
  )

  return {
    ok: result.code === 0,
    exampleId: options.id,
    command,
    outputDir,
    inputPath,
    savedFiles,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.code
  }
}

/**
 * Writes a temporary `.scr` and runs it through the CLI (custom gallery scripts).
 */
async function handleCustomRun(options: CustomRunOptions): Promise<{
  ok: boolean
  exampleId: string
  command: string[]
  outputDir: string
  inputPath?: string
  savedFiles: string[]
  stdout: string
  stderr: string
  exitCode: number
}> {
  if (!existsSync(cliJs)) {
    throw new Error(
      'CLI not built. Run: pnpm --filter @mlightcad/cad-simple-viewer-cli build'
    )
  }

  const scriptText = options.script.replace(/\r\n/g, '\n').trimEnd()
  if (!scriptText.trim()) {
    throw new Error('Script is empty.')
  }

  const customRoot = path.join(packageRoot, 'tmp', 'examples-gallery', 'custom')
  await mkdir(customRoot, { recursive: true })
  const scriptPath = path.join(customRoot, 'custom.scr')
  await writeFile(scriptPath, `${scriptText}\n`, 'utf8')

  const outputDir =
    resolveUserPath(options.output) ?? path.join(customRoot, 'out')
  await mkdir(outputDir, { recursive: true })

  const inputKind: 'none' | 'file' =
    options.inputKind ??
    (options.input && options.input.trim() ? 'file' : 'none')

  let inputPath = resolveUserPath(options.input)
  if (inputKind === 'file') {
    const catalog = await readCatalog()
    inputPath = inputPath ?? resolveFixture(catalog)
    if (!inputPath) {
      throw new Error('Custom script with input requires a .dxf / .dwg path.')
    }
    assertIsFile(inputPath, 'Input drawing')
  }

  const mode = options.mode ?? (inputKind === 'file' ? 'read' : 'write')
  const args = ['-s', scriptPath, '-o', outputDir, '--mode', mode]
  if (inputKind === 'file' && inputPath) {
    args.unshift('-i', inputPath)
  }

  const command = ['node', 'dist/cli.js', ...args]
  const result = await runProcess(process.execPath, [cliJs, ...args])
  const savedFiles = (result.stdout.match(/^Wrote (.+)$/gm) ?? []).map(line =>
    line.replace(/^Wrote /, '')
  )

  return {
    ok: result.code === 0,
    exampleId: 'custom',
    command,
    outputDir,
    inputPath,
    savedFiles,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.code
  }
}

async function serveStatic(
  res: import('node:http').ServerResponse,
  filePath: string
) {
  if (!existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  const body = await readFile(filePath)
  res.writeHead(200, { 'Content-Type': contentType(filePath) })
  res.end(body)
}

async function main() {
  if (!existsSync(catalogPath)) {
    throw new Error(`Missing examples catalog: ${catalogPath}`)
  }
  if (!existsSync(path.join(galleryDir, 'index.html'))) {
    throw new Error(`Missing gallery page: ${galleryDir}/index.html`)
  }

  const server = createServer((req, res) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${defaultPort}`)
        const method = req.method ?? 'GET'

        if (method === 'GET' && url.pathname === '/api/examples') {
          const catalog = await readCatalog()
          const fixture = resolveFixture(catalog)
          const examples = catalog.examples.map(example => ({
            ...example,
            inputKind: resolveInputKind(example)
          }))
          sendJson(res, 200, {
            ...catalog,
            examples,
            fixtureDrawingResolved: fixture,
            fixtureDrawingRelative: fixture
              ? isHttpUrl(fixture)
                ? fixture
                : path.relative(packageRoot, fixture).split(path.sep).join('/')
              : undefined,
            fixtureExists: !!(
              fixture && (isHttpUrl(fixture) || existsSync(fixture))
            ),
            defaultOutputDirResolved: path.resolve(
              packageRoot,
              catalog.defaultOutputDir ?? 'tmp/examples-gallery'
            ),
            defaultOutputDirRelative: (
              catalog.defaultOutputDir ?? 'tmp/examples-gallery'
            )
              .split(path.sep)
              .join('/'),
            packageRoot,
            cliBuilt: existsSync(cliJs)
          })
          return
        }

        if (method === 'GET' && url.pathname.startsWith('/api/script/')) {
          const id = decodeURIComponent(
            url.pathname.slice('/api/script/'.length)
          )
          const catalog = await readCatalog()
          const example = catalog.examples.find(item => item.id === id)
          if (!example) {
            sendJson(res, 404, { error: `Unknown example: ${id}` })
            return
          }
          const scriptPath = path.join(examplesDir, example.script)
          const text = await readFile(scriptPath, 'utf8')
          sendJson(res, 200, { id, script: example.script, text })
          return
        }

        if (method === 'POST' && url.pathname === '/api/run') {
          const bodyText = await readBody(req)
          const body = bodyText
            ? (JSON.parse(bodyText) as {
                id?: string
                input?: string
                output?: string
              })
            : {}
          if (!body.id) {
            sendJson(res, 400, { error: 'Missing example id' })
            return
          }
          try {
            const result = await handleRun({
              id: body.id,
              input: body.input,
              output: body.output
            })
            sendJson(res, result.ok ? 200 : 500, result)
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error)
            sendJson(res, 400, { error: message })
          }
          return
        }

        if (method === 'POST' && url.pathname === '/api/run-custom') {
          const bodyText = await readBody(req)
          const body = bodyText
            ? (JSON.parse(bodyText) as {
                script?: string
                input?: string
                output?: string
                mode?: 'read' | 'write'
                inputKind?: 'none' | 'file'
              })
            : {}
          if (typeof body.script !== 'string') {
            sendJson(res, 400, { error: 'Missing script text' })
            return
          }
          try {
            const result = await handleCustomRun({
              script: body.script,
              input: body.input,
              output: body.output,
              mode: body.mode,
              inputKind: body.inputKind
            })
            sendJson(res, result.ok ? 200 : 500, result)
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error)
            sendJson(res, 400, { error: message })
          }
          return
        }

        if (
          method === 'GET' &&
          (url.pathname === '/' || url.pathname === '/index.html')
        ) {
          await serveStatic(res, path.join(galleryDir, 'index.html'))
          return
        }

        if (method === 'GET' && url.pathname.startsWith('/gallery/')) {
          const rel = url.pathname.slice('/gallery/'.length)
          await serveStatic(res, path.join(galleryDir, rel))
          return
        }

        res.writeHead(404)
        res.end('Not found')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        sendJson(res, 500, { error: message })
      }
    })()
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${defaultPort} is already in use (another examples gallery may still be running).`
      )
      console.error(
        'Stop that process, or pick another port, e.g.:\n' +
          '  set CAD_CLI_EXAMPLES_PORT=5180&& pnpm --filter @mlightcad/cad-simple-viewer-cli examples'
      )
      process.exitCode = 1
      return
    }
    throw error
  })

  server.listen(defaultPort, '127.0.0.1', () => {
    console.log(`Examples gallery: http://127.0.0.1:${defaultPort}`)
    console.log(`Catalog: ${catalogPath}`)
    if (!existsSync(cliJs)) {
      console.warn(
        'Warning: dist/cli.js missing — build the package before running examples.'
      )
    }
  })
}

await main()
