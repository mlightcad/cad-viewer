import {
  AcApHtmlConvertor,
  packHtml,
  AcApHtmlSnapshotBuilder,
  captureAcApHtmlViewState,
  resolveAcApHtmlExportOptions
} from '@mlightcad/cad-html-plugin'
import {
  AcApDocManager,
  AcEdOpenMode,
  AcTrView2d,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '@mlightcad/cad-simple-viewer'
import { accmYieldForPaint } from '@mlightcad/data-model'

/** Max wait for convert + deferred font/text geometry after open. */
const SCENE_IDLE_TIMEOUT_MS = 120_000

/**
 * Waits until the active view finishes entity conversion and glyph geometry.
 * Open can resolve before lazy fonts finish; snapshotting too early drops text.
 */
async function waitForSceneIdle(timeoutMs = SCENE_IDLE_TIMEOUT_MS) {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return
  }
  const idle = await view.waitUntilIdle(timeoutMs)
  if (!idle) {
    console.warn(
      '[cad-html-exporter-cli] Timed out waiting for scene idle; continuing'
    )
  }
  await accmYieldForPaint()
}

declare global {
  interface Window {
    exportCadToHtml: (
      fileName: string,
      bytes: Uint8Array,
      options?: {
        locale?: string
        title?: string
        exportInvisibleLayers?: boolean
        initialView?: 'fit' | 'current'
        viewerMode?: 'view' | 'measure'
      }
    ) => Promise<string>
  }
}

let ready = false

async function ensureViewer(): Promise<void> {
  if (ready) {
    return
  }
  const container = document.getElementById('cad-root') as HTMLDivElement
  AcApDocManager.createInstance({
    container,
    width: 1280,
    height: 720,
    autoResize: false,
    baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
    useMainThreadDraw: true,
    webworkerFileUrls: {
      dwgParser: `./workers/${LIBREDWG_PARSER_WORKER_FILE}`,
      mtextRender: `./workers/${MTEXT_RENDERER_WORKER_FILE}`
    }
  })
  ready = true
}

window.exportCadToHtml = async (fileName, bytes, options = {}) => {
  await ensureViewer()
  const docManager = AcApDocManager.instance
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )

  const opened = await docManager.openDocument(fileName, buffer, {
    mode: AcEdOpenMode.Read
  })
  if (!opened) {
    throw new Error(`Failed to open "${fileName}".`)
  }

  // Same race as cad-simple-viewer-cli: openDocument resolves before deferred
  // text/font geometry finishes. prepareAcTrView2dForHtmlExport also waits via
  // ensureEntitiesConvertedForExport → waitUntilIdle; this makes the runner
  // explicit and covers the post-open settle before export prep.
  await waitForSceneIdle()

  const view = await new AcApHtmlConvertor().prepareAcTrView2dForHtmlExport(
    docManager.curView,
    resolveAcApHtmlExportOptions(options)
  )

  const resolved = resolveAcApHtmlExportOptions(options)
  const snapshot = await new AcApHtmlSnapshotBuilder().buildAsync(
    view.cadScene,
    docManager.curDocument.database,
    {
      title: options.title ?? fileName,
      background: view.backgroundColor,
      locale: options.locale,
      exportInvisibleLayers: resolved.exportInvisibleLayers,
      initialView: resolved.initialView,
      viewerMode: resolved.viewerMode,
      viewState:
        resolved.initialView === 'current'
          ? captureAcApHtmlViewState(view)
          : undefined
    }
  )

  const runtimeResponse = await fetch('./viewer-runtime.iife.js')
  if (!runtimeResponse.ok) {
    throw new Error(
      'viewer-runtime.iife.js is missing from the export runner build.'
    )
  }
  const viewerRuntime = await runtimeResponse.text()

  return packHtml(snapshot, {
    title: snapshot.meta.title,
    viewerRuntime
  })
}
