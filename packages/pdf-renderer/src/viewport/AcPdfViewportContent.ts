import { AcGeBox2d, AcGeMatrix3d } from '@mlightcad/data-model'

import { effectivePdfLayer } from '../pdf/AcPdfEffectiveLayer'
import {
  AcPdfEntity,
  type AcPdfPaintContext
} from '../renderer/AcPdfEntity'
import { AcPdfMatrixUtil } from '../renderer/AcPdfMatrixUtil'
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
  /** VPLAYER frozen layer names for this viewport; undefined when none. */
  private readonly _frozenLayers?: ReadonlySet<string>
  /** Annotation scale factor for this viewport; undefined when unset. */
  private readonly _annotationScaleFactor?: number
  /** Mirrors AutoCAD ANNOALLVISIBLE for unsupported annotative objects. */
  private readonly _annoAllVisible: boolean
  /**
   * Model-space box this viewport shows (paper clip mapped back through the
   * inverse model→paper transform), or `undefined` when it cannot be
   * computed. Roots entirely outside it are not painted.
   */
  private readonly _modelViewBox?: AcGeBox2d

  constructor(
    sharedRoots: AcPdfEntity[],
    modelToPaper: AcGeMatrix3d,
    paperBox: AcGeBox2d,
    frozenLayers: readonly string[] = [],
    annotationScaleFactor?: number,
    annoAllVisible: boolean = true
  ) {
    super()
    this._sharedRoots = sharedRoots
    this._modelToPaper = modelToPaper.clone()
    this._frozenLayers =
      frozenLayers.length > 0 ? new Set(frozenLayers) : undefined
    this._annotationScaleFactor =
      annotationScaleFactor != null && annotationScaleFactor > 0
        ? annotationScaleFactor
        : undefined
    this._annoAllVisible = annoAllVisible
    this._modelViewBox = modelViewBox(paperBox, this._modelToPaper)
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
    const embedEntity =
      ctx.embedEntityMarkedContent === true && !!this.objectId
    if (embedEntity) {
      writer.beginEntity({
        handle: this.objectId,
        type: 'VIEWPORT_CONTENT',
        layer
      })
    }

    const clipBox = this.clipBox
    if (clipBox) {
      writer.save()
      writer.clipRect(
        ctx.drawingRebase
          ? AcPdfMatrixUtil.mapRect(clipBox, ctx.drawingRebase)
          : clipBox
      )
    }
    const localToDrawing = ctx.localToDrawing
      ? ctx.localToDrawing.clone().multiply(this._modelToPaper)
      : this._modelToPaper.clone()
    // Apply this viewport's VPLAYER freeze without mutating the shared model
    // tree — each viewport pass gets its own frozenLayers set on the context.
    const childCtx: AcPdfPaintContext = {
      ...ctx,
      localToDrawing,
      frozenLayers: this._frozenLayers,
      annotationScaleFactor: this._annotationScaleFactor,
      annoAllVisible: this._annoAllVisible
    }
    for (const root of this._sharedRoots) {
      // Every viewport shares the whole model tree; painting roots it cannot
      // show only to clip them away wrote the full model once per viewport
      // (a layout with 30 detail viewports produced a 1 GB content stream).
      if (this.isOutsideView(root)) {
        continue
      }
      root.paint(childCtx)
    }
    if (clipBox) {
      writer.restore()
    }

    if (embedEntity) {
      writer.endMarked()
    }
    if (ocgName) {
      writer.endMarked()
    }
  }

  /**
   * True when `root` lies entirely outside the model region this viewport
   * shows. Roots without a known box are always painted (the clip still
   * applies), so culling can only drop geometry that would be clipped away.
   */
  private isOutsideView(root: AcPdfEntity): boolean {
    const view = this._modelViewBox
    if (!view || root.box.isEmpty()) {
      return false
    }
    return !view.intersectsBox(root.box)
  }
}

/**
 * Maps the viewport's paper rectangle back into model space.
 *
 * Uses all four corners, so twisted viewports get the axis-aligned bound of
 * the rotated view. The box is padded so strokes whose box sits on the
 * viewport edge are never culled; the paper clip trims the overshoot.
 */
function modelViewBox(
  paperBox: AcGeBox2d,
  modelToPaper: AcGeMatrix3d
): AcGeBox2d | undefined {
  if (paperBox.isEmpty() || modelToPaper.determinant() === 0) {
    return undefined
  }
  const box = paperBox.clone()
  AcPdfMatrixUtil.transformBox(box, modelToPaper.clone().invert())
  if (
    !Number.isFinite(box.min.x) ||
    !Number.isFinite(box.min.y) ||
    !Number.isFinite(box.max.x) ||
    !Number.isFinite(box.max.y)
  ) {
    return undefined
  }
  const pad =
    Math.max(box.max.x - box.min.x, box.max.y - box.min.y) *
    VIEW_BOX_PADDING_RATIO
  box.expandByScalar(pad)
  return box
}

/** Padding around the culling box, as a fraction of its larger side. */
const VIEW_BOX_PADDING_RATIO = 0.01

type AcPdfContentWriterOrCtx = Parameters<AcPdfEntity['paint']>[0]
