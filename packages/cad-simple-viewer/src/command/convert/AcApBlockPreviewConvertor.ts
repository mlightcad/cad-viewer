import {
  AcCmColor,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbRenderingCache,
  acdbPreviewIconToDataUrl
} from '@mlightcad/data-model'
import { AcTrEntity, type AcTrRenderer } from '@mlightcad/three-renderer'

import { AcApDocManager } from '../../app'
import { AcTrView2d } from '../../view'

const DEFAULT_PREVIEW_SIZE = 64

/**
 * Captures thumbnail images for block definitions.
 *
 * Prefers the stored {@link AcDbBlockTableRecord.previewIcon} (DXF/DWG group 310).
 * When absent — common for DXF exports without PreviewIcon — falls back to an
 * off-scene draw of the block definition via {@link AcDbRenderingCache}, matching
 * AutoCAD's gallery behavior for blocks that have no embedded icon.
 *
 * Thumbnails are cached per document + block-table-record object id. The cache is
 * cleared on document activation. Callers that need fresh thumbnails after an
 * in-place block edit (same object id) should call {@link clearCache} before
 * capturing again.
 */
export class AcApBlockPreviewConvertor {
  private static readonly _cache = new Map<string, string>()
  private static _cacheDocId: string | undefined
  private static _docListenerBound = false

  /**
   * Clears the in-memory thumbnail cache.
   */
  static clearCache() {
    this._cache.clear()
    this._cacheDocId = undefined
  }

  private static bindDocListener() {
    if (this._docListenerBound) return
    this._docListenerBound = true
    AcApDocManager.instance.events.documentActivated.addEventListener(() => {
      this.clearCache()
    })
  }

  /**
   * Returns a data URL thumbnail for the named block definition.
   *
   * @param blockName - Block table record name
   * @param size - Long side of the square output in pixels (default 64)
   * @returns PNG/BMP data URL, or `undefined` when capture fails
   */
  capture(
    blockName: string,
    size: number = DEFAULT_PREVIEW_SIZE
  ): string | undefined {
    AcApBlockPreviewConvertor.bindDocListener()

    const name = blockName.trim()
    if (!name) return undefined

    const doc = AcApDocManager.instance.curDocument
    const db = doc?.database
    const view = AcApDocManager.instance.curView as AcTrView2d | undefined
    if (!db || !view) return undefined

    const docId = doc.database.tables.blockTable.modelSpace.objectId
    if (AcApBlockPreviewConvertor._cacheDocId !== docId) {
      AcApBlockPreviewConvertor._cache.clear()
      AcApBlockPreviewConvertor._cacheDocId = docId
    }

    const btr = db.tables.blockTable.getAt(name)
    if (!btr || btr.isXref) return undefined

    // Prefer BTR objectId over name so a redefined block with the same name
    // does not reuse a thumbnail from a previous definition.
    const cacheKey = `${docId}\0${btr.objectId}\0${size}`
    const cached = AcApBlockPreviewConvertor._cache.get(cacheKey)
    if (cached) return cached

    const fromIcon = this.fromStoredIcon(btr)
    if (fromIcon) {
      AcApBlockPreviewConvertor._cache.set(cacheKey, fromIcon)
      return fromIcon
    }

    const fromGeometry = this.fromGeometry(btr, view, size)
    if (fromGeometry) {
      AcApBlockPreviewConvertor._cache.set(cacheKey, fromGeometry)
    }
    return fromGeometry
  }

  private fromStoredIcon(btr: AcDbBlockTableRecord): string | undefined {
    if (!btr.previewIcon?.length) return undefined
    return acdbPreviewIconToDataUrl(btr.previewIcon)
  }

  private fromGeometry(
    btr: AcDbBlockTableRecord,
    view: AcTrView2d,
    size: number
  ): string | undefined {
    const renderer = view.renderer as AcTrRenderer
    let root: AcTrEntity | null = null

    try {
      // Identity insert: same expand path as INSERT, without scene pollution.
      const insert = new AcDbBlockReference(btr.name)
      insert.database = btr.database

      const drawn = insert.worldDraw(renderer) as AcTrEntity | null
      if (!drawn) {
        // Empty block — try rendering BTR contents directly.
        const color = new AcCmColor()
        color.setForeground()
        const group = AcDbRenderingCache.instance.draw(
          renderer,
          btr,
          color,
          [],
          false
        ) as AcTrEntity | null
        root = group
      } else {
        root = drawn
      }

      if (!root) return undefined
      root.syncDraw()

      const capture = renderer.renderEntityPreview(root, {
        width: size,
        height: size,
        margin: 1.15,
        localLineResolutionOnly: true,
        viewportSize: { width: view.width, height: view.height },
        onRestored: () => {
          view.isDirty = true
        }
      })
      if (!capture) return undefined
      return capture.canvas.toDataURL('image/png')
    } catch (error) {
      console.warn('[BlockPreview] Failed to capture', btr.name, error)
      return undefined
    } finally {
      root?.dispose()
    }
  }
}
