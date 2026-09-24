import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
import {
  AcApDocManager,
  AcApI18n,
  type AcApLocale,
  type AcApOpenDatabaseOptions,
  AcApOpenViewMode,
  AcEdOpenMode,
  AcTrView2d,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'
import {
  accmYieldForPaint,
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

/** Max time to wait for convert + deferred font/text geometry after open. */
const SCENE_IDLE_TIMEOUT_MS = 120_000

/**
 * Waits until the active view finishes entity conversion and glyph geometry.
 * Open resolves before lazy fonts finish; exporting too early drops text.
 */
async function waitForSceneIdle(timeoutMs = SCENE_IDLE_TIMEOUT_MS) {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return
  }
  const idle = await view.waitUntilIdle(timeoutMs)
  if (!idle) {
    console.warn(
      '[cad-simple-viewer-cli] Timed out waiting for scene idle; continuing'
    )
  }
  await accmYieldForPaint()
}

export type CadViewerCliOpenMode = 'read' | 'write'

export type CadViewerCliOpenViewMode = 'extents' | 'saved'

export interface CadViewerCliCapturedFile {
  fileName: string
  base64: string
}

export interface CadViewerCliRunResult {
  ok: true
  files: CadViewerCliCapturedFile[]
}

export interface CadViewerCliRunOptions {
  locale?: string
  mode?: CadViewerCliOpenMode
  /**
   * When true (and no drawing bytes), create a blank ISO template document
   * before running the script. Useful for create-from-scratch examples.
   */
  startBlank?: boolean
  openViewMode?: CadViewerCliOpenViewMode
  drawNoPlotLayers?: boolean
  circleSides?: number
  /**
   * Resource base URL for fonts and drawing templates.
   * Fonts load from `${baseUrl}fonts/`. When omitted, the default CDN is used.
   */
  baseUrl?: string
}

declare global {
  interface Window {
    runCadScript: (
      fileName: string | null,
      bytes: Uint8Array | null,
      script: string,
      options?: CadViewerCliRunOptions
    ) => Promise<CadViewerCliRunResult>
  }
}

let ready = false
const capturedFiles: CadViewerCliCapturedFile[] = []
const pendingCaptures: Promise<void>[] = []

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function captureDataUrl(fileName: string, href: string) {
  const comma = href.indexOf(',')
  if (comma < 0) {
    throw new Error('Invalid data URL')
  }
  const meta = href.slice(5, comma)
  const data = href.slice(comma + 1)
  const isBase64 = /;base64/i.test(meta)
  const base64 = isBase64
    ? data
    : btoa(unescape(encodeURIComponent(decodeURIComponent(data))))
  capturedFiles.push({ fileName, base64 })
}

/**
 * Blobs registered by `URL.createObjectURL`, so downloads can be read back
 * directly. Fetching huge blob URLs (hundreds of MB) returns an empty body
 * in headless Chromium, which silently produced empty export files.
 */
const blobByUrl = new Map<string, Blob>()

function installDownloadCapture() {
  const origCreateObjectURL = URL.createObjectURL.bind(URL)
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = origCreateObjectURL(obj as Blob)
    if (obj instanceof Blob) {
      blobByUrl.set(url, obj)
    }
    return url
  }
  document.addEventListener(
    'click',
    event => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }
      const anchor = target.closest('a')
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        !anchor.hasAttribute('download')
      ) {
        return
      }

      const href = anchor.getAttribute('href') || anchor.href
      const fileName = anchor.download || 'download.bin'
      if (!href) {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()

      if (href.startsWith('data:')) {
        try {
          captureDataUrl(fileName, href)
        } catch (error) {
          console.error(
            '[cad-simple-viewer-cli] Failed to capture data URL download',
            error
          )
        }
        return
      }

      const task = (async () => {
        const blob = blobByUrl.get(href)
        if (blob) {
          capturedFiles.push({
            fileName,
            base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer()))
          })
          return
        }
        const response = await fetch(href)
        if (!response.ok) {
          throw new Error(`Failed to fetch download "${fileName}"`)
        }
        const buffer = await response.arrayBuffer()
        capturedFiles.push({
          fileName,
          base64: bytesToBase64(new Uint8Array(buffer))
        })
      })().catch(error => {
        console.error(
          '[cad-simple-viewer-cli] Failed to capture download',
          error
        )
        throw error
      })
      pendingCaptures.push(task)
    },
    true
  )
}

function resolveOpenMode(mode?: CadViewerCliOpenMode): AcEdOpenMode {
  return mode === 'write' ? AcEdOpenMode.Write : AcEdOpenMode.Read
}

function resolveOpenViewMode(
  mode?: CadViewerCliOpenViewMode
): AcApOpenViewMode | undefined {
  if (mode === 'extents') {
    return AcApOpenViewMode.Extents
  }
  if (mode === 'saved') {
    return AcApOpenViewMode.Saved
  }
  return undefined
}

/**
 * Builds open-database options for the CLI runner.
 *
 * Progressive rendering is always forced off so drawings open as quickly as
 * possible — headless scripts do not need mid-open paints.
 */
function buildOpenOptions(
  options: CadViewerCliRunOptions
): AcApOpenDatabaseOptions {
  const openOptions: AcApOpenDatabaseOptions = {
    mode: resolveOpenMode(options.mode),
    progressiveRendering: false
  }
  const openViewMode = resolveOpenViewMode(options.openViewMode)
  if (openViewMode != null) {
    openOptions.openViewMode = openViewMode
  }
  if (options.drawNoPlotLayers != null) {
    openOptions.drawNoPlotLayers = options.drawNoPlotLayers
  }
  if (options.circleSides != null) {
    openOptions.circleSides = options.circleSides
  }
  return openOptions
}

function resolveLocale(locale?: string): AcApLocale | undefined {
  if (!locale) {
    return undefined
  }
  const normalized = locale.trim().toLowerCase()
  if (
    normalized === 'en' ||
    normalized === 'zh' ||
    normalized === 'tr' ||
    normalized === 'cs'
  ) {
    return normalized
  }
  return undefined
}

async function ensureViewer(options: CadViewerCliRunOptions = {}): Promise<void> {
  if (ready) {
    return
  }
  installDownloadCapture()

  const container = document.getElementById('cad-root') as HTMLDivElement
  const dwgParserUrl = `./workers/${LIBREDWG_PARSER_WORKER_FILE}`
  AcDbDatabaseConverterManager.instance.register(
    AcDbFileType.DWG,
    new AcDbLibreDwgConverter({
      convertByEntityType: false,
      useWorker: true,
      parserWorkerUrl: dwgParserUrl
    })
  )
  AcApDocManager.createInstance({
    container,
    width: 1280,
    height: 720,
    autoResize: false,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    useMainThreadDraw: true,
    webworkerFileUrls: {
      dwgParser: dwgParserUrl,
      mtextRender: `./workers/${MTEXT_RENDERER_WORKER_FILE}`
    }
  })

  const pluginManager = AcApDocManager.instance.pluginManager
  registerLazyHtmlPlugin(pluginManager, {
    viewerRuntimeUrl: './viewer-runtime.iife.js'
  })
  registerLazyPdfPlugin(pluginManager)
  registerLazySvgPlugin(pluginManager)

  ready = true
}

window.runCadScript = async (fileName, bytes, script, options = {}) => {
  await ensureViewer(options)
  capturedFiles.length = 0
  pendingCaptures.length = 0

  const locale = resolveLocale(options.locale)
  if (locale) {
    AcApI18n.setCurrentLocale(locale)
  }

  const docManager = AcApDocManager.instance
  const hasDrawing = !!(bytes && bytes.byteLength > 0 && fileName)
  const openOptions = buildOpenOptions(options)

  if (hasDrawing) {
    const buffer = bytes!.buffer.slice(
      bytes!.byteOffset,
      bytes!.byteOffset + bytes!.byteLength
    )
    const opened = await docManager.openDocument(fileName!, buffer, openOptions)
    if (!opened) {
      throw new Error(`Failed to open "${fileName}".`)
    }
  } else if (options.startBlank !== false) {
    // No -i: start from ISO template in write mode (scripts may still call qnew).
    const created = await docManager.newDocument({
      ...openOptions,
      mode: AcEdOpenMode.Write
    })
    if (!created) {
      throw new Error('Failed to create a blank drawing.')
    }
  }

  await waitForSceneIdle()
  await docManager.runScript(script)
  await Promise.all(pendingCaptures)
  await accmYieldForPaint()

  return {
    ok: true,
    files: capturedFiles.map(file => ({ ...file }))
  }
}
