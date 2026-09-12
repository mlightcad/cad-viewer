import {
  AcGeBox2d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGiEntity
} from '@mlightcad/data-model'

import type { AcPdfContentWriter } from '../pdf/AcPdfContentWriter'
import { effectivePdfLayer } from '../pdf/AcPdfEffectiveLayer'
import type { AcPdfOcgManager } from '../pdf/AcPdfOcgManager'
import { AcPdfMatrixUtil } from './AcPdfMatrixUtil'
import type { AcPdfOp } from './AcPdfStyle'

export interface AcPdfPaintContext {
  writer: AcPdfContentWriter
  ocg?: AcPdfOcgManager
  insertLayer?: string
  embedActualText?: boolean
  formReuse?: boolean
  /**
   * Maps this node's local coordinates into drawing space (the space the
   * page CTM already maps to PDF). Prefer baking over PDF `cm` so INSERT
   * placement does not depend on left-multiply conjugation.
   */
  localToDrawing?: AcGeMatrix3d
}

/**
 * Drawable node produced by {@link AcPdfRenderer}.
 */
export class AcPdfEntity implements AcGiEntity {
  private _objectId = ''
  private _ownerId = ''
  private _layerName = ''
  private _visible = true
  private _userData: object = {}
  protected _box = new AcGeBox2d()
  private _matrix?: AcGeMatrix3d
  protected _basePoint?: AcGePoint3d
  private readonly _ops: AcPdfOp[] = []
  private readonly _children: AcPdfEntity[] = []
  private _drawOrder = 0
  private _entityType = ''
  private _insertName?: string
  private _actualText?: string
  /** When set, paint clips children/ops to this paper-space rectangle. */
  private _clipBox?: AcGeBox2d

  get box() {
    return this._box
  }
  set box(value: AcGeBox2d) {
    this._box.copy(value)
  }

  get drawOrder() {
    return this._drawOrder
  }
  set drawOrder(value: number) {
    this._drawOrder = value
  }

  get objectId() {
    return this._objectId
  }
  set objectId(value: string) {
    this._objectId = value
  }

  get ownerId() {
    return this._ownerId
  }
  set ownerId(value: string) {
    this._ownerId = value
  }

  get layerName() {
    return this._layerName
  }
  set layerName(value: string) {
    this._layerName = value
  }

  get entityType() {
    return this._entityType
  }
  set entityType(value: string) {
    this._entityType = value
  }

  get insertName() {
    return this._insertName
  }
  set insertName(value: string | undefined) {
    this._insertName = value
  }

  get actualText() {
    return this._actualText
  }
  set actualText(value: string | undefined) {
    this._actualText = value
  }

  get clipBox() {
    return this._clipBox
  }

  /**
   * Clips this node's paint to `box` and uses `box` as the page-framing
   * extents (paper-space viewport frame).
   */
  setClipBox(box: AcGeBox2d) {
    this._clipBox = box.clone()
    this._box.copy(box)
  }

  get visible() {
    return this._visible
  }
  set visible(value: boolean) {
    this._visible = value
  }

  get userData(): object {
    return this._userData
  }
  set userData(value: object) {
    this._userData = value
  }

  get childCount() {
    return this._children.length
  }

  addOp(op: AcPdfOp) {
    this._ops.push(op)
  }

  /**
   * Walks this node and descendants, invoking `visitor` for each draw op.
   */
  forEachOp(visitor: (op: AcPdfOp) => void) {
    for (const op of this._ops) {
      visitor(op)
    }
    for (const child of this._children) {
      child.forEachOp(visitor)
    }
  }

  /**
   * Like {@link forEachOp}, but applies this node's INSERT/CTM matrix so
   * points are in the same drawing space as {@link box} after applyMatrix.
   */
  forEachWorldOp(
    visitor: (op: AcPdfOp, matrix?: AcGeMatrix3d) => void,
    parentMatrix?: AcGeMatrix3d
  ) {
    const matrix = this._matrix
      ? parentMatrix
        ? parentMatrix.clone().multiply(this._matrix)
        : this._matrix
      : parentMatrix
    for (const op of this._ops) {
      visitor(op, matrix)
    }
    for (const child of this._children) {
      child.forEachWorldOp(visitor, matrix)
    }
  }

  /**
   * Paints this node and its children into a PDF content stream.
   */
  paint(writerOrCtx: AcPdfContentWriter | AcPdfPaintContext) {
    const ctx: AcPdfPaintContext =
      'drawOp' in writerOrCtx ? { writer: writerOrCtx } : writerOrCtx
    const writer = ctx.writer
    if (!this._visible) {
      return
    }
    const isInsert = !!this._insertName || this._entityType === 'INSERT'
    const layer = effectivePdfLayer(this._layerName, ctx.insertLayer)
    const ocgName = ctx.ocg?.ensure(layer).resourceName
    if (ocgName) {
      writer.beginOcg(ocgName)
    }
    if (this._objectId || isInsert) {
      writer.beginEntity({
        handle: this._objectId || undefined,
        type: isInsert ? 'INSERT' : this._entityType || undefined,
        name: this._insertName,
        layer
      })
    }
    const text =
      ctx.embedActualText !== false ? this._actualText?.trim() : undefined
    if (text) {
      writer.beginActualText(text)
    }

    const localToDrawing = this._matrix
      ? composeCtm(ctx.localToDrawing, this._matrix)
      : ctx.localToDrawing

    // Form reuse is disabled: Form XObjects + page CTM conjugation proved
    // brittle across viewers; baking into drawing space is deterministic.
    const paintedAsForm = false

    if (!paintedAsForm) {
      if (this._clipBox) {
        writer.save()
        writer.clipRect(this._clipBox)
      }
      for (const op of this._ops) {
        writer.drawOp(localToDrawing ? transformOpByMatrix(op, localToDrawing) : op)
      }
      const childCtx: AcPdfPaintContext = {
        ...ctx,
        insertLayer: isInsert ? layer : ctx.insertLayer,
        localToDrawing
      }
      for (const child of this._children) {
        child.paint(childCtx)
      }
      if (this._clipBox) {
        writer.restore()
      }
    }

    if (text) {
      writer.endMarked()
    }
    if (this._objectId || isInsert) {
      writer.endMarked()
    }
    if (ocgName) {
      writer.endMarked()
    }
  }

  applyMatrix(matrix: AcGeMatrix3d) {
    if (!this._matrix) {
      this._matrix = matrix.clone()
    } else {
      this._matrix = matrix.clone().multiply(this._matrix)
    }
    this.transformBoxesRecursive(matrix)
  }

  private transformBoxesRecursive(matrix: AcGeMatrix3d) {
    AcPdfMatrixUtil.transformBox(this._box, matrix)
    for (const child of this._children) {
      child.transformBoxesRecursive(matrix)
    }
  }

  recomputeBoundingBox() {
    // Bounding boxes are maintained during draw and applyMatrix.
  }

  highlight() {
    // Export renderer: no interactive highlight.
  }

  unhighlight() {
    // Export renderer: no interactive highlight.
  }

  addChild(entity: AcGiEntity) {
    if (entity instanceof AcPdfEntity) {
      this._children.push(entity)
      this._box.union(entity.box)
    }
  }

  fastDeepClone(shareGeometry: boolean = false): AcPdfEntity {
    const cloned = new AcPdfEntity()
    cloned._objectId = this._objectId
    cloned._ownerId = this._ownerId
    cloned._layerName = this._layerName
    cloned._visible = this._visible
    cloned._userData = this._userData
    cloned._drawOrder = this._drawOrder
    cloned._entityType = this._entityType
    cloned._insertName = this._insertName
    cloned._actualText = this._actualText
    cloned._box.copy(this._box)
    if (this._clipBox) {
      cloned._clipBox = this._clipBox.clone()
    }
    if (this._matrix) {
      cloned._matrix = this._matrix.clone()
    }
    if (this._basePoint) {
      cloned._basePoint = this._basePoint.clone()
    }
    for (const op of this._ops) {
      cloned._ops.push(shareGeometry ? op : cloneOp(op))
    }
    for (const child of this._children) {
      cloned._children.push(child.fastDeepClone(shareGeometry))
    }
    return cloned
  }
}

function cloneOp(op: AcPdfOp): AcPdfOp {
  if (op.kind === 'stroke') {
    return {
      kind: 'stroke',
      points: op.points.map(p => ({ x: p.x, y: p.y })),
      closed: op.closed,
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  if (op.kind === 'fill') {
    return {
      kind: 'fill',
      loops: op.loops.map(loop => loop.map(p => ({ x: p.x, y: p.y }))),
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  if (op.kind === 'circle') {
    return {
      kind: 'circle',
      x: op.x,
      y: op.y,
      r: op.r,
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  if (op.kind === 'gradient') {
    return {
      kind: 'gradient',
      loops: op.loops.map(loop => loop.map(p => ({ x: p.x, y: p.y }))),
      shadingType: op.shadingType,
      coords: [...op.coords],
      c0: { ...op.c0 },
      c1: { ...op.c1 },
      strips: op.strips?.map(s => ({
        rgb: { ...s.rgb },
        points: s.points.map(p => ({ x: p.x, y: p.y }))
      })),
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  return {
    kind: 'image',
    bytes: op.bytes,
    format: op.format,
    x: op.x,
    y: op.y,
    width: op.width,
    height: op.height
  }
}

/**
 * Maps draw-op geometry by an affine matrix (drawing-space bake).
 */
function affineScale2d(matrix: AcGeMatrix3d): number {
  const el = matrix.elements
  const sx = Math.hypot(el[0], el[1])
  const sy = Math.hypot(el[4], el[5])
  const scale = (sx + sy) / 2
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

function transformOpByMatrix(op: AcPdfOp, matrix: AcGeMatrix3d): AcPdfOp {
  const map = (p: { x: number; y: number }) =>
    AcPdfMatrixUtil.transformPoint(matrix, { x: p.x, y: p.y, z: 0 })
  const scale = affineScale2d(matrix)
  if (op.kind === 'stroke') {
    return {
      ...op,
      points: op.points.map(map),
      style: {
        ...op.style,
        rgb: { ...op.style.rgb },
        lineWidth: op.style.lineWidth * scale,
        dashArray: op.style.dashArray?.map(d => d * scale)
      }
    }
  }
  if (op.kind === 'fill') {
    return {
      ...op,
      loops: op.loops.map(loop => loop.map(map)),
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  if (op.kind === 'circle') {
    const c = map({ x: op.x, y: op.y })
    const edge = map({ x: op.x + op.r, y: op.y })
    const r = Math.hypot(edge.x - c.x, edge.y - c.y)
    return {
      ...op,
      x: c.x,
      y: c.y,
      r,
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  if (op.kind === 'gradient') {
    const mapCoord = (x: number, y: number) => {
      const p = map({ x, y })
      return { x: p.x, y: p.y }
    }
    let coords = [...op.coords]
    if (op.shadingType === 2 && coords.length >= 4) {
      const a = mapCoord(coords[0], coords[1])
      const b = mapCoord(coords[2], coords[3])
      coords = [a.x, a.y, b.x, b.y]
    } else if (op.shadingType === 3 && coords.length >= 6) {
      const c0 = mapCoord(coords[0], coords[1])
      const c1 = mapCoord(coords[3], coords[4])
      const edge = mapCoord(coords[0] + coords[2], coords[1])
      const edge2 = mapCoord(coords[3] + coords[5], coords[4])
      const r0 = Math.hypot(edge.x - c0.x, edge.y - c0.y)
      const r1 = Math.hypot(edge2.x - c1.x, edge2.y - c1.y)
      coords = [c0.x, c0.y, r0, c1.x, c1.y, r1]
    }
    return {
      ...op,
      loops: op.loops.map(loop => loop.map(map)),
      coords,
      strips: op.strips?.map(s => ({
        rgb: { ...s.rgb },
        points: s.points.map(map)
      })),
      style: { ...op.style, rgb: { ...op.style.rgb } }
    }
  }
  const p0 = map({ x: op.x, y: op.y })
  const p1 = map({ x: op.x + op.width, y: op.y + op.height })
  return {
    ...op,
    x: Math.min(p0.x, p1.x),
    y: Math.min(p0.y, p1.y),
    width: Math.abs(p1.x - p0.x),
    height: Math.abs(p1.y - p0.y)
  }
}

function composeCtm(
  parent: AcGeMatrix3d | undefined,
  local: AcGeMatrix3d
): AcGeMatrix3d {
  return parent ? parent.clone().multiply(local) : local.clone()
}
