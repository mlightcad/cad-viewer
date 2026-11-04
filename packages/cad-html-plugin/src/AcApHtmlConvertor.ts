import type { AcExHtmlSnapshot } from '@mlightcad/cad-html-core'
import {
  acexHtmlApplyBackground,
  acexHtmlProtectEncodedSnapshot,
  acexHtmlResolveExpiresAt
} from '@mlightcad/cad-html-core'
import {
  acexHtmlPackHtmlEmbeddedPackage,
  acexHtmlShouldEmbedChunks
} from '@mlightcad/cad-html-core'
import { acexHtmlPackHtml } from '@mlightcad/cad-html-core'
import { acexHtmlBuildPackageAsync } from '@mlightcad/cad-html-core'
import { acexHtmlZipPackageFiles } from '@mlightcad/cad-html-core'
import { acexHtmlEncodeSnapshot } from '@mlightcad/cad-html-core'
import {
  AcApDocManager,
  AcEdBaseView,
  AcTrView2d,
  getDrawingExportBaseName,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'
import { accmYieldForPaint } from '@mlightcad/data-model'

import {
  type AcApHtmlExportOptions,
  captureAcApHtmlViewState,
  resolveAcApHtmlExportOptions,
  resolveAcApHtmlPackageBuildOptions
} from './AcApHtmlExportOptions'
import {
  type AcApHtmlPluginOptions,
  resolveViewerRuntimeUrl
} from './AcApHtmlPluginOptions'
import { AcApHtmlSnapshotBuilder } from './AcApHtmlSnapshotBuilder'

function logExportTiming(label: string, ms: number) {
  console.log(`[chtml] ${label}: ${ms.toFixed(0)} ms`)
}

/** Bytes produced by {@link AcApHtmlConvertor.exportToResult} (no download). */
export interface AcApHtmlExportResult {
  /** Suggested download name including extension. */
  fileName: string
  /** File body. */
  bytes: Uint8Array
  /** IANA media type (`text/html;charset=utf-8` or `application/zip`). */
  mediaType: string
}

/**
 * Orchestrates export of the active drawing to a downloadable HTML file
 * or multi-file ACEX package zip.
 *
 * Workflow:
 * 1. Build a display-only {@link AcExHtmlSnapshot} from the current scene and database.
 * 2. Fetch the IIFE viewer runtime (inlined into the HTML).
 * 3. Package as self-contained HTML (`single`) or zip of package files (`multi`).
 *    For `single`, large drawings automatically embed progressive ACEC chunks;
 *    small drawings keep a monolithic ACEX payload.
 *
 * A busy indicator is shown for the duration of the operation. The UI thread
 * is yielded between heavy steps so the browser can repaint.
 *
 * The runtime URL is configured on this plugin (`viewerRuntimeUrl`), not on
 * `AcApDocManager` — see {@link AcApHtmlPluginOptions}.
 */
export class AcApHtmlConvertor {
  /** Collects geometry and metadata from the live Three.js scene. */
  private readonly _snapshotBuilder = new AcApHtmlSnapshotBuilder()

  /**
   * @param options - Plugin options; `viewerRuntimeUrl` overrides module defaults
   */
  constructor(private readonly options: AcApHtmlPluginOptions = {}) {}

  /**
   * Prepares the active 2D view for HTML snapshot export.
   *
   * Ensures drawable entities skipped during interactive viewing (for example on
   * off layers) are converted into the scene. Converted geometry remains in the
   * live scene after export completes.
   */
  async prepareAcTrView2dForHtmlExport(
    view: AcEdBaseView | null | undefined,
    options: Pick<
      AcApHtmlExportOptions,
      'exportInvisibleLayers' | 'exportLayouts'
    > = {}
  ): Promise<AcTrView2d> {
    if (!view || !('cadScene' in view) || !view.cadScene) {
      throw new Error(
        'CAD scene is not available. Open a drawing before exporting to HTML.'
      )
    }
    if (!(view instanceof AcTrView2d)) {
      throw new Error(
        'HTML export requires a 2D CAD view. Open a drawing before exporting.'
      )
    }
    const resolved = resolveAcApHtmlExportOptions(options)
    const conversionOptions = {
      includeInvisibleLayers: resolved.exportInvisibleLayers,
      includeLayouts: resolved.exportLayouts
    }
    await view.ensureEntitiesConvertedForExport(conversionOptions)
    await accmYieldForPaint()
    return view
  }

  /**
   * Exports the document currently open in {@link AcApDocManager} and returns
   * the file bytes without starting a download.
   *
   * Used by agent script hosts (`cad.file.saveHtml`) that deliver the payload
   * themselves (MCP outbox or a later download).
   *
   * @param fileName - Optional base name (without extension).
   * @param options - Export options including {@link AcApHtmlExportOptions.exportFormat}.
   * @param view - Optional view to export from. Defaults to the active view.
   */
  async exportToResult(
    fileName?: string,
    options: AcApHtmlExportOptions = {},
    view?: AcEdBaseView | null
  ): Promise<AcApHtmlExportResult> {
    const docManager = AcApDocManager.instance
    const resolved = resolveAcApHtmlExportOptions(options)
    const totalT0 = performance.now()
    let result!: AcApHtmlExportResult

    await docManager.withBusyIndicator(async () => {
      result = await this.buildExportResult(fileName, resolved, view)
      logExportTiming('chtml total', performance.now() - totalT0)
    })
    return result
  }

  /**
   * Exports the document currently open in {@link AcApDocManager}.
   *
   * @param fileName - Optional base name for the download (without extension).
   *   When omitted, the active document's `fileName` is used.
   * @param options - Export options including {@link AcApHtmlExportOptions.exportFormat}.
   * @param view - Optional view to export from. Defaults to the active view.
   * @returns Resolves when packaging and download complete.
   */
  async convert(
    fileName?: string,
    options: AcApHtmlExportOptions = {},
    view?: AcEdBaseView | null
  ) {
    const result = await this.exportToResult(fileName, options, view)
    this.downloadBytes(result.bytes, result.fileName, result.mediaType)
  }

  private async buildExportResult(
    fileName: string | undefined,
    resolved: ReturnType<typeof resolveAcApHtmlExportOptions>,
    view?: AcEdBaseView | null
  ): Promise<AcApHtmlExportResult> {
    const docManager = AcApDocManager.instance
    await accmYieldForPaint()

    const document = docManager.curDocument
    let t0 = performance.now()
    const exportView = await this.prepareAcTrView2dForHtmlExport(
      view ?? docManager.curView,
      resolved
    )
    logExportTiming('prepare (missing entities)', performance.now() - t0)

    const sourceName = fileName || document.fileName || document.docTitle
    const baseName = getDrawingExportBaseName(sourceName)
    t0 = performance.now()
    const snapshot = await this._snapshotBuilder.buildAsync(
      exportView.cadScene,
      document.database,
      {
        title: baseName,
        background: exportView.backgroundColor,
        exportInvisibleLayers: resolved.exportInvisibleLayers,
        exportLayouts: resolved.exportLayouts,
        initialView: resolved.initialView,
        viewerMode: resolved.viewerMode,
        viewState:
          resolved.initialView === 'current' &&
          (resolved.exportLayouts ||
            exportView.activeLayoutBtrId === exportView.modelSpaceBtrId)
            ? captureAcApHtmlViewState(exportView)
            : undefined,
        canvasAspectRatio: exportView.width / Math.max(exportView.height, 1)
      }
    )
    // Live geometry is baked for the active layout canvas (white in paper
    // space). Remap near-black / near-white ink onto the chosen canvas.
    // `'space'` remaps each layout on its own: model black, paper white.
    acexHtmlApplyBackground(
      snapshot,
      exportView.backgroundColor,
      resolved.background
    )
    logExportTiming('snapshot build', performance.now() - t0)

    await accmYieldForPaint()

    t0 = performance.now()
    const viewerRuntime = await this.loadViewerRuntime()
    logExportTiming('load viewer runtime', performance.now() - t0)

    await accmYieldForPaint()

    if (resolved.exportFormat === 'multi') {
      t0 = performance.now()
      const packageBuild = resolveAcApHtmlPackageBuildOptions(resolved)
      const pkg = await acexHtmlBuildPackageAsync(snapshot, {
        viewerRuntime,
        baseName,
        ...packageBuild
      })
      logExportTiming(
        packageBuild.compressChunks
          ? 'package + gzip chunks'
          : 'package chunks',
        performance.now() - t0
      )
      t0 = performance.now()
      const zipBytes = acexHtmlZipPackageFiles(pkg)
      logExportTiming('zip package', performance.now() - t0)
      await accmYieldForPaint()
      return {
        fileName: resolveExportDownloadName(sourceName, 'zip'),
        bytes: zipBytes,
        mediaType: 'application/zip'
      }
    }

    const expiresAt = acexHtmlResolveExpiresAt(
      resolved.expiryDays,
      Date.now(),
      resolved.expiresAt
    )
    t0 = performance.now()
    const html = await this.packSelfContainedHtml(snapshot, viewerRuntime, {
      expiresAt,
      password: resolved.password || undefined
    })
    logExportTiming('pack self-contained html', performance.now() - t0)

    await accmYieldForPaint()
    return {
      fileName: resolveExportDownloadName(sourceName, 'html'),
      bytes: new TextEncoder().encode(html),
      mediaType: 'text/html;charset=utf-8'
    }
  }

  /**
   * Packages a pre-built snapshot into HTML and downloads it.
   *
   * Skips scene collection; useful for tests, CLI tooling, or re-exporting a
   * snapshot produced elsewhere.
   *
   * @param snapshot - Complete snapshot to embed in the HTML.
   * @param downloadName - File name passed to the browser download API (should
   *   include the `.html` extension).
   * @returns Resolves when packaging and download complete.
   */
  async packSnapshot(snapshot: AcExHtmlSnapshot, downloadName: string) {
    const docManager = AcApDocManager.instance

    await docManager.withBusyIndicator(async () => {
      await accmYieldForPaint()
      const viewerRuntime = await this.loadViewerRuntime()
      await accmYieldForPaint()
      const html = await this.packSelfContainedHtml(snapshot, viewerRuntime, {
        expiresAt: null
      })
      await accmYieldForPaint()
      this.downloadHtml(html, downloadName)
    })
  }

  /**
   * Packages a snapshot as self-contained HTML.
   * Large drawings embed progressive ACEC chunks; small ones keep a monolithic ACEX.
   */
  private async packSelfContainedHtml(
    snapshot: AcExHtmlSnapshot,
    viewerRuntime: string,
    options: { expiresAt: number | null; password?: string }
  ): Promise<string> {
    if (acexHtmlShouldEmbedChunks(snapshot)) {
      return acexHtmlPackHtmlEmbeddedPackage(snapshot, {
        title: snapshot.meta.title,
        viewerRuntime,
        expiresAt: options.expiresAt,
        password: options.password
      })
    }

    const protectedSnapshot = await acexHtmlProtectEncodedSnapshot(
      acexHtmlEncodeSnapshot(snapshot),
      {
        expiresAt: options.expiresAt,
        password: options.password
      }
    )
    return acexHtmlPackHtml(snapshot, {
      title: snapshot.meta.title,
      viewerRuntime,
      encoded: protectedSnapshot.encoded,
      accessManifest: protectedSnapshot.manifest
    })
  }

  /**
   * Fetches the offline viewer runtime as source text for inlining.
   *
   * @returns The runtime script body as a string.
   * @throws If the HTTP response is not OK (missing build artifact, CORS, etc.).
   */
  private async loadViewerRuntime(): Promise<string> {
    const runtimeUrl = resolveViewerRuntimeUrl(this.options.viewerRuntimeUrl)
    const response = await fetch(runtimeUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to load HTML viewer runtime from "${runtimeUrl}" (${response.status}). ` +
          'Install @mlightcad/cad-html-plugin, copy viewer-runtime.iife.js to your app assets, ' +
          'and set viewerRuntimeUrl on registerLazyHtmlPlugin / createHtmlPlugin / AcApHtmlConvertor.'
      )
    }
    return response.text()
  }

  /**
   * Triggers a client-side download of the generated HTML string.
   *
   * @param content - Full HTML document text.
   * @param downloadName - Value for the anchor `download` attribute.
   */
  private downloadHtml(content: string, downloadName: string) {
    this.downloadBytes(
      new TextEncoder().encode(content),
      downloadName,
      'text/html;charset=utf-8'
    )
  }

  /**
   * Triggers a client-side download of raw bytes.
   */
  private downloadBytes(
    bytes: Uint8Array,
    downloadName: string,
    mimeType: string
  ) {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    const blob = new Blob([copy], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
