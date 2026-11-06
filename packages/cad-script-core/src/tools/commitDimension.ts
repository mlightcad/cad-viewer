import {
  AcDbDatabase,
  AcDbDimension,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import type { Point2dInput } from './types'

type DimWithBlock = AcDbDimension & {
  createDimBlock(
    name: string
  ): import('@mlightcad/data-model').AcDbBlockTableRecord
}

/**
 * Allocates the next anonymous dimension block name `*D{n}`.
 */
export function allocateDimBlockName(db: AcDbDatabase): string {
  const blocks = db.tables.blockTable.newIterator()
  let maxNum = 0
  for (const block of blocks) {
    const name = block.name
    if (!name.startsWith('*D')) continue
    const num = Number(name.slice(2))
    if (Number.isInteger(num) && num > maxNum) {
      maxNum = num
    }
  }
  return `*D${maxNum + 1}`
}

/**
 * Binds the database current dimstyle (`$DIMSTYLE`) onto a new dimension when
 * the caller did not pass an explicit style name.
 */
export function applyDimStyle(
  dim: AcDbDimension,
  db: AcDbDatabase,
  styleName?: string
): void {
  if (styleName) {
    dim.dimensionStyleName = styleName
    return
  }
  dim.dimensionStyleName = db.dimstyle || null
}

/**
 * Builds the anonymous `*D{n}` block for a dimension and attaches it.
 *
 * Must run before the dimension is appended so the block name is available on
 * DXF write / render. Sets the host working database so `createDimBlock` can
 * resolve styles and arrow resources before the entity owns a database.
 * Arrow blocks are ensured inside each dimension's `createDimBlock`.
 */
export function commitDimBlock(db: AcDbDatabase, dim: DimWithBlock): string {
  acdbHostApplicationServices().workingDatabase = db
  const blockName = allocateDimBlockName(db)
  db.tables.blockTable.add(dim.createDimBlock(blockName))
  dim.dimBlockId = blockName
  return blockName
}

/**
 * Infers horizontal (0) or vertical (π/2) rotation from dim-line placement,
 * matching AutoCAD DIMLINEAR when no explicit angle is given.
 */
export function inferLinearRotation(
  x1: Point2dInput,
  x2: Point2dInput,
  dimLinePoint: Point2dInput
): number {
  const midX = (x1.x + x2.x) / 2
  const midY = (x1.y + x2.y) / 2
  const dx = Math.abs(dimLinePoint.x - midX)
  const dy = Math.abs(dimLinePoint.y - midY)
  return dy >= dx ? 0 : Math.PI / 2
}

/**
 * Point on a circle at `angleDeg` (CCW from +X), WCS.
 */
export function pointOnCircle(
  center: Point2dInput,
  radius: number,
  angleDeg: number
): Point2dInput {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: center.x + radius * Math.cos(rad),
    y: center.y + radius * Math.sin(rad)
  }
}
