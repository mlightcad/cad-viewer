import { AcDbObjectId, AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'
import { disposePreviewSubset } from '@mlightcad/three-renderer'

import { AcApDocManager } from '../../app'
import { resolveExportDownloadName } from '../../util/AcApExportFileNameUtil'
import { AcTrView2d } from '../../view'

export type AcApEntityPreviewExportFailure =
  | 'no-preview-root'
  | 'no-bounds'
  | 'capture-failed'
  | 'download-failed'

export type AcApEntityPreviewExportResult =
  | { ok: true }
  | { ok: false; reason: AcApEntityPreviewExportFailure }

/**
 * Exports one merged preview image for the specified entity ids.
 *
 * Reuses the same batch extraction path as MOVE/COPY/ROTATE jigs, then captures
 * through {@link AcTrRenderer.renderEntityPreview}.
 */
export class AcApEntityPreviewConvertor {
  /**
   * Renders selected entities into one PNG and triggers a browser download.
   *
   * @param entityIds - Database object ids to include in the preview
   * @param longSide - Maximum output width or height in pixels
   */
  export(
    entityIds: AcDbObjectId[],
    longSide: number
  ): AcApEntityPreviewExportResult {
    const view = AcApDocManager.instance.curView as AcTrView2d
    const scene = view.cadScene

    const bounds =
      scene.computeEntityPreviewBounds2d(entityIds, 1.1, 'all') ?? null
    if (!bounds) {
      console.warn('[ENTPREVIEW] Failed to compute preview bounds', entityIds)
      return { ok: false, reason: 'no-bounds' }
    }

    const outputSize = this.resolveOutputSize(
      longSide,
      this.getBoundsAspect(bounds)
    )
    const renderWidth = outputSize.width
    const renderHeight = outputSize.height

    const previewRoot = scene.createEntityPreviewRoot(entityIds, {
      scope: 'all'
    })
    if (!previewRoot) {
      console.warn(
        '[ENTPREVIEW] Failed to build preview geometry',
        `${entityIds.length} requested entity ids`
      )
      return { ok: false, reason: 'no-preview-root' }
    }

    const rendererWrapper = view.renderer
    let downloaded = false

    try {
      const capture = rendererWrapper.renderEntityPreview(previewRoot, {
        width: renderWidth,
        height: renderHeight,
        bounds,
        margin: 1,
        viewportSize: { width: view.width, height: view.height },
        localLineResolutionOnly: true,
        onRestored: () => {
          view.isDirty = true
        }
      })

      if (!capture) {
        return { ok: false, reason: 'capture-failed' }
      }

      downloaded = this.downloadCanvas(capture.canvas)
    } catch (error) {
      console.error('[ENTPREVIEW] Failed to render preview image', error)
      return { ok: false, reason: 'capture-failed' }
    } finally {
      disposePreviewSubset(previewRoot)
    }

    if (!downloaded) {
      return { ok: false, reason: 'download-failed' }
    }

    return { ok: true }
  }

  /**
   * Computes width and height from a target long side while preserving aspect ratio.
   */
  private resolveOutputSize(longSide: number, aspect: number) {
    const clampedLongSide = Math.max(1, Math.round(longSide))
    const safeAspect =
      Number.isFinite(aspect) && aspect > Number.EPSILON ? aspect : 1

    if (safeAspect >= 1) {
      return {
        width: clampedLongSide,
        height: Math.max(1, Math.round(clampedLongSide / safeAspect))
      }
    }

    return {
      width: Math.max(1, Math.round(clampedLongSide * safeAspect)),
      height: clampedLongSide
    }
  }

  /**
   * Returns the world-space aspect ratio of one 2D bounds box.
   */
  private getBoundsAspect(bounds: AcGeBox2d) {
    const size = new AcGeVector2d()
    bounds.getSize(size)
    const width = Math.max(Math.abs(size.x), Number.EPSILON)
    const height = Math.max(Math.abs(size.y), Number.EPSILON)
    return width / height
  }

  /**
   * Creates a downloadable PNG file and triggers the download.
   */
  private downloadCanvas(canvas: HTMLCanvasElement) {
    try {
      const doc = AcApDocManager.instance.curDocument
      const downloadName = resolveExportDownloadName(
        doc.fileName || doc.docTitle,
        'png',
        'entity-preview'
      )
      const dataUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = dataUrl
      downloadLink.download = downloadName
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      return true
    } catch (error) {
      console.error('[ENTPREVIEW] Failed to download preview PNG', error)
      return false
    }
  }
}
