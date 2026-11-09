import { AcDbObjectId, AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'
import {
  AcTrEntityPreview,
  disposePreviewSubset
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcApDocManager } from '../../app'
import { resolveExportDownloadName } from '../../util/AcApExportFileNameUtil'
import { AcTrView2d } from '../../view'

export type AcApEntityPreviewExportFailure =
  | 'no-preview-root'
  | 'no-bounds'
  | 'capture-failed'
  | 'download-failed'

export type AcApEntityPreviewExportResult =
  | { ok: true; exportedCount: number; skippedCount: number }
  | { ok: false; reason: AcApEntityPreviewExportFailure }

export type AcApEntityPreviewCaptureResult =
  | {
      ok: true
      dataUrl: string
      exportedCount: number
      skippedCount: number
    }
  | { ok: false; reason: AcApEntityPreviewExportFailure | 'no-entities' }

/**
 * Result of {@link AcApEntityPreviewConvertor.captureLayers}.
 *
 * `no-layers` means none of the requested names has geometry in model space.
 */
export type AcApLayerPreviewCaptureResult =
  | {
      ok: true
      dataUrl: string
      /** Scene layer names that were rendered (actual casing). */
      layerNames: string[]
    }
  | {
      ok: false
      reason: 'no-layers' | 'no-bounds' | 'no-preview-root' | 'capture-failed'
    }

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
    const capture = this.capture(entityIds, longSide)
    if (!capture.ok) {
      if (capture.reason === 'no-entities') {
        return { ok: false, reason: 'no-bounds' }
      }
      if (capture.reason === 'download-failed') {
        return { ok: false, reason: 'capture-failed' }
      }
      return { ok: false, reason: capture.reason }
    }

    const downloaded = this.downloadDataUrl(capture.dataUrl)
    if (!downloaded) {
      return { ok: false, reason: 'download-failed' }
    }

    return {
      ok: true,
      exportedCount: capture.exportedCount,
      skippedCount: capture.skippedCount
    }
  }

  /**
   * Renders selected entities into one PNG and returns a data URL.
   *
   * @param entityIds - Database object ids to include in the preview
   * @param longSide - Maximum output width or height in pixels
   */
  capture(
    entityIds: AcDbObjectId[],
    longSide: number
  ): AcApEntityPreviewCaptureResult {
    if (entityIds.length === 0) {
      return { ok: false, reason: 'no-entities' }
    }

    const view = AcApDocManager.instance.curView as AcTrView2d
    const scene = view.cadScene
    const previewableIds = scene.findPreviewableEntityIds(entityIds, 'all')
    const exportedCount = previewableIds.length
    const skippedCount = entityIds.length - exportedCount

    const bounds =
      scene.computeEntityPreviewBounds2d(entityIds, 1.1, 'all') ?? null
    if (!bounds) {
      console.warn('[ENTPREVIEW] Failed to compute preview bounds', entityIds)
      return { ok: false, reason: 'no-bounds' }
    }

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

    const rendered = this.renderPreviewRoot(previewRoot, bounds, longSide)
    if (!rendered.ok) {
      return rendered
    }
    return {
      ok: true,
      dataUrl: rendered.dataUrl,
      exportedCount,
      skippedCount
    }
  }

  /**
   * Renders all model-space geometry of the given CAD layers into one PNG and
   * returns a data URL.
   *
   * Only geometry bucketed on those layers is extracted (an INSERT contributes
   * just its fragments on the requested layers), and the image is framed to
   * the union of those layers' batch bounds, so unrelated drawing content does
   * not widen the crop. Layer on/off/frozen state is ignored: the layers were
   * asked for explicitly.
   *
   * @param layerNames - CAD layer names (case-insensitive)
   * @param longSide - Maximum output width or height in pixels
   */
  captureLayers(
    layerNames: readonly string[],
    longSide: number
  ): AcApLayerPreviewCaptureResult {
    if (layerNames.length === 0) {
      return { ok: false, reason: 'no-layers' }
    }

    const view = AcApDocManager.instance.curView as AcTrView2d
    const layout = view.cadScene.modelSpaceLayout
    if (!layout) {
      return { ok: false, reason: 'no-layers' }
    }

    const layers = layout.findLayers(layerNames)
    if (layers.length === 0) {
      return { ok: false, reason: 'no-layers' }
    }
    const matchedLayerNames = layers.map(layer => layer.name)

    const bounds = AcTrEntityPreview.box3ToBounds2d(
      layout.computeLayerPreviewBoundsBox(matchedLayerNames),
      1.1
    )
    if (!bounds) {
      return { ok: false, reason: 'no-bounds' }
    }

    const previewRoot = layout.createLayerPreviewRoot(matchedLayerNames)
    if (!previewRoot) {
      console.warn(
        '[ENTPREVIEW] Failed to build layer preview geometry',
        matchedLayerNames
      )
      return { ok: false, reason: 'no-preview-root' }
    }

    const rendered = this.renderPreviewRoot(previewRoot, bounds, longSide)
    if (!rendered.ok) {
      return rendered
    }
    return {
      ok: true,
      dataUrl: rendered.dataUrl,
      layerNames: matchedLayerNames
    }
  }

  /**
   * Renders one extracted preview root framed to `bounds` and disposes it.
   */
  private renderPreviewRoot(
    previewRoot: THREE.Group,
    bounds: AcGeBox2d,
    longSide: number
  ): { ok: true; dataUrl: string } | { ok: false; reason: 'capture-failed' } {
    const view = AcApDocManager.instance.curView as AcTrView2d
    // Output aspect follows the framed bounds so the PNG carries no extra
    // letterbox padding beyond the bounds margin.
    const outputSize = this.resolveOutputSize(
      longSide,
      this.getBoundsAspect(bounds)
    )

    try {
      const capture = view.renderer.renderEntityPreview(previewRoot, {
        width: outputSize.width,
        height: outputSize.height,
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
      return { ok: true, dataUrl: capture.canvas.toDataURL('image/png') }
    } catch (error) {
      console.error('[ENTPREVIEW] Failed to render preview image', error)
      return { ok: false, reason: 'capture-failed' }
    } finally {
      disposePreviewSubset(previewRoot)
    }
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
  private downloadDataUrl(dataUrl: string) {
    try {
      const doc = AcApDocManager.instance.curDocument
      const downloadName = resolveExportDownloadName(
        doc.fileName || doc.docTitle,
        'png',
        'entity-preview'
      )
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
