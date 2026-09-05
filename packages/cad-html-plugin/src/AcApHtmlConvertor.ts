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
  resolveAcApHtmlExportOptions
} from './AcApHtmlExportOptions'
import {
  type AcApHtmlPluginOptions,
  resolveViewerRuntimeUrl
} from './AcApHtmlPluginOptions'
import { AcApHtmlSnapshotBuilder } from './AcApHtmlSnapshotBuilder'
import {
  protectAcExHtmlEncodedSnapshot,
  resolveAcApHtmlExpiresAt
} from './AcExHtmlAccess'
import { packHtml } from './AcExHtmlPackager'
import { buildAcExPackage } from './AcExPackageBuilder'
import { zipAcExPackageFiles } from './AcExPackageZip'
import { encodeSnapshot } from './AcExSnapshotCodec'
import type { AcExSnapshot } from './AcExSnapshotTypes'

/**
 * Orchestrates export of the active drawing to a downloadable HTML file
 * or multi-file ACEX package zip.
 *
 * Workflow:
 * 1. Build a display-only {@link AcExSnapshot} from the current scene and database.
 * 2. Fetch the IIFE viewer runtime (inlined into the HTML).
 * 3. Package as self-contained HTML (`single`) or zip of package files (`multi`).
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
    const docManager = AcApDocManager.instance
    const resolved = resolveAcApHtmlExportOptions(options)

    await docManager.withBusyIndicator(async () => {
      await accmYieldForPaint()

      const document = docManager.curDocument
      const exportView = await this.prepareAcTrView2dForHtmlExport(
        view ?? docManager.curView,
        resolved
      )

      const sourceName = fileName || document.fileName || document.docTitle
      const baseName = getDrawingExportBaseName(sourceName)
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
              : undefined
        }
      )

      await accmYieldForPaint()

      const viewerRuntime = await this.loadViewerRuntime()

      await accmYieldForPaint()

      if (resolved.exportFormat === 'multi') {
        const pkg = buildAcExPackage(snapshot, {
          viewerRuntime,
          baseName
        })
        const zipBytes = zipAcExPackageFiles(pkg)
        await accmYieldForPaint()
        this.downloadBytes(
          zipBytes,
          resolveExportDownloadName(sourceName, 'zip'),
          'application/zip'
        )
        return
      }

      const expiresAt = resolveAcApHtmlExpiresAt(
        resolved.expiryDays,
        Date.now(),
        resolved.expiresAt
      )
      const protectedSnapshot = await protectAcExHtmlEncodedSnapshot(
        encodeSnapshot(snapshot),
        {
          expiresAt,
          password: resolved.password || undefined
        }
      )

      const html = packHtml(snapshot, {
        title: snapshot.meta.title,
        viewerRuntime,
        encoded: protectedSnapshot.encoded,
        accessManifest: protectedSnapshot.manifest
      })

      await accmYieldForPaint()

      this.downloadHtml(html, resolveExportDownloadName(sourceName, 'html'))
    })
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
  async packSnapshot(snapshot: AcExSnapshot, downloadName: string) {
    const docManager = AcApDocManager.instance

    await docManager.withBusyIndicator(async () => {
      await accmYieldForPaint()
      const viewerRuntime = await this.loadViewerRuntime()
      await accmYieldForPaint()
      const protectedSnapshot = await protectAcExHtmlEncodedSnapshot(
        encodeSnapshot(snapshot),
        { expiresAt: null }
      )
      const html = packHtml(snapshot, {
        title: snapshot.meta.title,
        viewerRuntime,
        encoded: protectedSnapshot.encoded,
        accessManifest: protectedSnapshot.manifest
      })
      await accmYieldForPaint()
      this.downloadHtml(html, downloadName)
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
