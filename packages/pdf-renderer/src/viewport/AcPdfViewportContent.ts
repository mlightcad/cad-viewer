import { AcGeBox2d, AcGeMatrix3d } from '@mlightcad/data-model'

import { effectivePdfLayer } from '../pdf/AcPdfEffectiveLayer'
import {
  AcPdfEntity,
  type AcPdfPaintContext
} from '../renderer/AcPdfEntity'
import type { AcPdfOp } from '../renderer/AcPdfStyle'

/**
 * Paper-space viewport content backed by the shared model-space drawables.
 *
 * The exporter walks model space once and reuses the same {@link AcPdfEntity}
 * tree for every viewport (and every paper layout): this node only supplies
 * the viewport's clip rectangle and model→paper matrix at paint time. This
 * replaces the former per-viewport deep clone, which duplicated all
 * tessellated geometry and dominated heap use on drawings with several
 * viewports.
 *
 * Shared trees are never mutated while painting: the matrix is passed through
 * {@link AcPdfPaintContext.localToDrawing} and draw ops are transformed into
 * transient copies, so one tree can be painted through any number of
 * viewports in sequence.
 */
export class AcPdfViewportContent extends AcPdfEntity {
  private readonly _sharedRoots: AcPdfEntity[]
  private readonly _modelToPaper: AcGeMatrix3d

  constructor(
    sharedRoots: AcPdfEntity[],
    modelToPaper: AcGeMatrix3d,
    paperBox: AcGeBox2d
  ) {
    super()
    this._sharedRoots = sharedRoots
    this._modelToPaper = modelToPaper.clone()
    this.entityType = 'VIEWPORT_CONTENT'
    // Page framing and clipping both use the paper-space frame.
    this.setClipBox(paperBox)
  }

  /**
   * Image pre-embedding walks every op, including geometry that is only
   * reachable through the shared model roots.
   */
  override forEachOp(visitor: (op: AcPdfOp) => void) {
    for (const root of this._sharedRoots) {
      root.forEachOp(visitor)
    }
  }

  override forEachWorldOp(
    visitor: (op: AcPdfOp, matrix?: AcGeMatrix3d) => void,
    parentMatrix?: AcGeMatrix3d
  ) {
    const matrix = parentMatrix
      ? parentMatrix.clone().multiply(this._modelToPaper)
      : this._modelToPaper.clone()
    for (const root of this._sharedRoots) {
      root.forEachWorldOp(visitor, matrix)
    }
  }

  /**
   * Paints shared model geometry clipped to the viewport's paper rectangle
   * and mapped through its model→paper transform.
   */
  override paint(writerOrCtx: AcPdfContentWriterOrCtx) {
    const ctx: AcPdfPaintContext =
      'drawOp' in writerOrCtx ? { writer: writerOrCtx } : writerOrCtx
    if (!this.visible || this._sharedRoots.length === 0) {
      return
    }
    const writer = ctx.writer
    const layer = effectivePdfLayer(this.layerName, ctx.insertLayer)
    const ocgName = ctx.ocg?.ensure(layer).resourceName
    if (ocgName) {
      writer.beginOcg(ocgName)
    }
    if (this.objectId) {
      writer.beginEntity({
        handle: this.objectId,
        type: 'VIEWPORT_CONTENT',
        layer
      })
    }

    const clipBox = this.clipBox
    if (clipBox) {
      writer.save()
      writer.clipRect(clipBox)
    }
    const localToDrawing = ctx.localToDrawing
      ? ctx.localToDrawing.clone().multiply(this._modelToPaper)
      : this._modelToPaper.clone()
    for (const root of this._sharedRoots) {
      root.paint({ ...ctx, localToDrawing })
    }
    if (clipBox) {
      writer.restore()
    }

    if (this.objectId) {
      writer.endMarked()
    }
    if (ocgName) {
      writer.endMarked()
    }
  }
}

type AcPdfContentWriterOrCtx = Parameters<AcPdfEntity['paint']>[0]
