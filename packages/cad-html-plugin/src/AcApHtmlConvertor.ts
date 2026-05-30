import {
  AcApDocManager,
  getDrawingExportBaseName,
  resolveExportDownloadName,
  yieldToMain
} from '@mlightcad/cad-simple-viewer'

import { AcApHtmlSnapshotBuilder } from './AcApHtmlSnapshotBuilder'
import { packHtml } from './AcExHtmlPackager'
import type { AcExSnapshot } from './AcExSnapshotTypes'

/**
 * Relative URL of the bundled offline viewer script when no override is
 * configured on {@link AcApDocManager.htmlViewerRuntimeUrl}.
 */
const DEFAULT_RUNTIME_URL = './viewer-runtime.iife.js'

/**
 * Orchestrates export of the active drawing to a downloadable HTML file.
 *
 * Workflow:
 * 1. Build a display-only {@link AcExSnapshot} from the current scene and database.
 * 2. Fetch the IIFE viewer runtime (inlined into the HTML).
 * 3. Package snapshot + runtime via `packHtml` and trigger a browser download.
 *
 * A busy indicator is shown for the duration of the operation. The UI thread
 * is yielded between heavy steps so the browser can repaint.
 */
export class AcApHtmlConvertor {
  /** Collects geometry and metadata from the live Three.js scene. */
  private readonly _snapshotBuilder = new AcApHtmlSnapshotBuilder()

  /**
   * Exports the document currently open in {@link AcApDocManager}.
   *
   * @param fileName - Optional base name for the download (without extension).
   *   When omitted, the active document's `fileName` is used. A `.html` suffix
   *   is always applied; `.dwg` / `.dxf` suffixes on the input are stripped.
   * @returns Resolves when packaging and download complete.
   */
  async convert(fileName?: string) {
    const docManager = AcApDocManager.instance
    docManager.showBusyIndicator()

    try {
      await yieldToMain()

      const document = docManager.curDocument
      const view = docManager.curView
      if (!view?.cadScene) {
        throw new Error(
          'CAD scene is not available. Open a drawing before exporting to HTML.'
        )
      }
      const sourceName = fileName || document.fileName || document.docTitle
      const snapshot = await this._snapshotBuilder.buildAsync(
        view.cadScene,
        document.database,
        {
          title: getDrawingExportBaseName(sourceName),
          background: view.backgroundColor
        }
      )

      await yieldToMain()

      const viewerRuntime = await this.loadViewerRuntime(
        docManager.htmlViewerRuntimeUrl
      )

      await yieldToMain()

      const html = packHtml(snapshot, {
        title: snapshot.meta.title,
        viewerRuntime
      })

      await yieldToMain()

      this.downloadHtml(html, resolveExportDownloadName(sourceName, 'html'))
    } finally {
      docManager.hideBusyIndicator()
    }
  }

  /**
   * Packages a pre-built snapshot into HTML and downloads it.
   *
   * Skips scene collection; useful for tests, CLI tooling, or re-exporting a
   * snapshot produced elsewhere.
   *
   * @param snapshot - Complete v1 snapshot to embed in the HTML.
   * @param downloadName - File name passed to the browser download API (should
   *   include the `.html` extension).
   * @returns Resolves when packaging and download complete.
   */
  async packSnapshot(snapshot: AcExSnapshot, downloadName: string) {
    const docManager = AcApDocManager.instance
    docManager.showBusyIndicator()

    try {
      await yieldToMain()
      const viewerRuntime = await this.loadViewerRuntime(
        docManager.htmlViewerRuntimeUrl
      )
      await yieldToMain()
      const html = packHtml(snapshot, {
        title: snapshot.meta.title,
        viewerRuntime
      })
      await yieldToMain()
      this.downloadHtml(html, downloadName)
    } finally {
      docManager.hideBusyIndicator()
    }
  }

  /**
   * Fetches the offline viewer runtime as source text for inlining.
   *
   * @param url - Absolute or relative URL of `viewer-runtime.iife.js`. When
   *   omitted, {@link DEFAULT_RUNTIME_URL} is used.
   * @returns The runtime script body as a string.
   * @throws If the HTTP response is not OK (missing build artifact, CORS, etc.).
   */
  private async loadViewerRuntime(url?: string | URL): Promise<string> {
    const runtimeUrl = url != null ? String(url) : DEFAULT_RUNTIME_URL
    const response = await fetch(runtimeUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to load HTML viewer runtime from "${runtimeUrl}" (${response.status}). ` +
          'Build @mlightcad/cad-html-plugin and copy viewer-runtime.iife.js to your app assets.'
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
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
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
