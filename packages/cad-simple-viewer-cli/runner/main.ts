import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
import {
  AcApDocManager,
  AcApI18n,
  type AcApLocale,
  type AcApOpenDatabaseOptions,
  AcApOpenFileProfiler,
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
  /**
   * Base URL for POSTing export downloads as raw bodies
   * (`${saveBaseUrl}${fileName}`). Avoids base64 over CDP.
   */
  saveBaseUrl?: string
}

declare global {
  interface Window {
    runCadScript: (
      fileName: string | null,
      drawingUrl: string | null,
      script: string,
      options?: CadViewerCliRunOptions
    ) => Promise<CadViewerCliRunResult>
  }
}

let ready = false
const capturedFiles: CadViewerCliCapturedFile[] = []
const pendingCaptures: Promise<void>[] = []
let saveBaseUrl: string | undefined

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

      const task = (async () => {
        let blob: Blob | undefined = blobByUrl.get(href)
        if (!blob && href.startsWith('data:')) {
          const response = await fetch(href)
          blob = await response.blob()
        }
        if (!blob) {
          const response = await fetch(href)
          if (!response.ok) {
            throw new Error(`Failed to fetch download "${fileName}"`)
          }
          blob = await response.blob()
        }

        if (!saveBaseUrl) {
          throw new Error('CLI save endpoint not configured')
        }
        const t0 = performance.now()
        const response = await fetch(
          `${saveBaseUrl}${encodeURIComponent(fileName)}`,
          {
            method: 'POST',
            body: blob
          }
        )
        if (!response.ok) {
          throw new Error(
            `Failed to save download "${fileName}" (${response.status})`
          )
        }
        console.log(
          `[cad-simple-viewer-cli] saved ${fileName}: ${(
            performance.now() - t0
          ).toFixed(0)} ms (${blob.size} bytes)`
        )
        capturedFiles.push({ fileName })
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
 *
 * Export-oriented flags convert off layers / all layouts once, skip the pick
 * spatial index, and disable cooperative convert yields.
 */
function buildOpenOptions(
  options: CadViewerCliRunOptions
): AcApOpenDatabaseOptions {
  const openOptions: AcApOpenDatabaseOptions = {
    mode: resolveOpenMode(options.mode),
    progressiveRendering: false,
    convertInvisibleLayers: true,
    convertAllLayouts: true,
    skipSpatialIndex: true,
    cooperativeYield: false
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

function logOpenProfile() {
  const snapshot = AcApOpenFileProfiler.getLastSnapshot()
  if (!snapshot) {
    return
  }
  const lines = [
    `[cad-simple-viewer-cli] OPENPROF total=${snapshot.totalMs.toFixed(0)}ms` +
      ` read=${snapshot.readMs.toFixed(0)}ms` +
      ` convert=${snapshot.convertMs.toFixed(0)}ms` +
      ` parse=${snapshot.parseMs.toFixed(0)}ms` +
      ` entity=${snapshot.entityMs.toFixed(0)}ms`,
    `[cad-simple-viewer-cli] OPENPROF cache hits=${snapshot.cache.topLevel.hits}` +
      ` misses=${snapshot.cache.topLevel.misses}` +
      ` clone=${snapshot.cache.topLevel.cloneMs.toFixed(0)}ms` +
      ` build=${snapshot.cache.topLevel.missBuildMs.toFixed(0)}ms` +
      ` compact=${snapshot.cache.topLevel.missCompactMs.toFixed(0)}ms`
  ]
  if (snapshot.convertPhase) {
    const p = snapshot.convertPhase
    lines.push(
      '[cad-simple-viewer-cli] OPENPROF convertPhase' +
        ` finishGeometry=${p.finishGeometryMs.toFixed(0)}ms` +
        ` handleGroup=${p.handleGroupMs.toFixed(0)}ms` +
        ` addEntity=${p.addEntityMs.toFixed(0)}ms` +
        ` awaitFonts=${p.awaitFontsMs.toFixed(0)}ms`
    )
  }
  for (const line of lines) {
    console.log(line)
  }
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

window.runCadScript = async (fileName, drawingUrl, script, options = {}) => {
  await ensureViewer(options)
  capturedFiles.length = 0
  pendingCaptures.length = 0
  saveBaseUrl = options.saveBaseUrl

  const locale = resolveLocale(options.locale)
  if (locale) {
    AcApI18n.setCurrentLocale(locale)
  }

  const docManager = AcApDocManager.instance
  const hasDrawing = !!(drawingUrl && fileName)
  const openOptions = buildOpenOptions(options)

  const openT0 = performance.now()
  const openWallClock = Date.now()
  if (hasDrawing) {
    const fetchT0 = performance.now()
    const response = await fetch(drawingUrl!)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch drawing "${fileName}" (${response.status}).`
      )
    }
    const buffer = await response.arrayBuffer()
    console.log(
      `[cad-simple-viewer-cli] fetch drawing: ${(
        performance.now() - fetchT0
      ).toFixed(0)} ms (${buffer.byteLength} bytes)`
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
  console.log(
    `[cad-simple-viewer-cli] open+idle: ${(performance.now() - openT0).toFixed(
      0
    )} ms`
  )
  // OPENPROF publishes on the same idle edge; wait briefly for the snapshot.
  for (let i = 0; i < 60; i++) {
    const snap = AcApOpenFileProfiler.getLastSnapshot()
    if (snap && snap.collectedAt >= openWallClock) {
      break
    }
    await new Promise<void>(resolve => setTimeout(resolve, 16))
  }
  logOpenProfile()

  const scriptT0 = performance.now()
  await docManager.runScript(script)
  await Promise.all(pendingCaptures)
  await accmYieldForPaint()
  console.log(
    `[cad-simple-viewer-cli] script: ${(performance.now() - scriptT0).toFixed(
      0
    )} ms`
  )

  return {
    ok: true,
    files: capturedFiles.map(file => ({ ...file }))
  }
}
