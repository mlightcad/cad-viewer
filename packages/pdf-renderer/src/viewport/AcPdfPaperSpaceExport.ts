import {
  AcDbBlockReference,
  type AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbEntity,
  AcDbViewport,
  AcGePoint3d} from '@mlightcad/data-model'

import { AcPdfEntity } from '../renderer/AcPdfEntity'
import type { AcPdfRenderer } from '../renderer/AcPdfRenderer'
import {
  buildModelToPaperMatrix,
  isDefaultPaperSpaceViewport,
  resolveViewportBoxes
} from './AcPdfPaperViewport'

/**
 * Attaches common PDF metadata copied from the source database entity.
 */
export function attachPdfEntityMeta(
  drawable: AcPdfEntity,
  entity: AcDbEntity,
  typeName: string
): void {
  if (!drawable.objectId) {
    drawable.objectId = entity.objectId
  }
  const layer = (entity as { layer?: string }).layer
  if (!drawable.layerName && layer) {
    drawable.layerName = layer
  }
  drawable.entityType = typeName
  if (entity instanceof AcDbBlockReference) {
    drawable.entityType = 'INSERT'
    drawable.insertName =
      (entity as { blockName?: string }).blockName ?? typeName
  }
}

/**
 * Walks model space once and returns PDF drawables for viewport reuse.
 */
export function collectModelSpaceRoots(
  db: AcDbDatabase,
  renderer: AcPdfRenderer
): AcPdfEntity[] {
  const roots: AcPdfEntity[] = []
  for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
    if (entity instanceof AcDbViewport) continue
    const typeName = String(
      (entity as { type?: string }).type ??
        (entity as { dxfTypeName?: string }).dxfTypeName ??
        ''
    )
    const drawable = entity.worldDraw(renderer)
    if (drawable instanceof AcPdfEntity) {
      attachPdfEntityMeta(drawable, entity, typeName)
      roots.push(drawable)
    }
  }
  return roots
}

/**
 * Builds clipped, model→paper transformed content for one user viewport.
 */
export function buildViewportModelContent(
  viewport: AcDbViewport,
  modelRoots: AcPdfEntity[],
  renderer: AcPdfRenderer
): { content: AcPdfEntity; border: AcPdfEntity | undefined } | null {
  if (isDefaultPaperSpaceViewport(viewport)) {
    return null
  }
  const boxes = resolveViewportBoxes(viewport)
  if (!boxes) {
    return null
  }

  const matrix = buildModelToPaperMatrix(boxes.paper, boxes.model, boxes.twist)
  const content = new AcPdfEntity()
  content.entityType = 'VIEWPORT_CONTENT'
  content.objectId = viewport.objectId
  content.setClipBox(boxes.paper)

  for (const root of modelRoots) {
    // Clone after glyphs are filled (caller awaits renderer.awaitPending).
    // Deep-copy ops so later paint transforms cannot alias across viewports.
    const cloned = root.fastDeepClone(false)
    cloned.applyMatrix(matrix)
    content.addChild(cloned)
  }
  // Page framing must stay on the paper frame, not the full transformed model.
  content.box.copy(boxes.paper)

  let border = viewport.worldDraw(renderer)
  if (!(border instanceof AcPdfEntity)) {
    border = synthesizeViewportBorder(renderer, boxes.paper)
  }
  if (border instanceof AcPdfEntity) {
    attachPdfEntityMeta(border, viewport, 'VIEWPORT')
  }

  return {
    content,
    border: border instanceof AcPdfEntity ? border : undefined
  }
}

/**
 * Draws a viewport rectangle when `AcDbViewport.worldDraw` skips it (legacy
 * `number > 1` heuristic).
 */
function synthesizeViewportBorder(
  renderer: AcPdfRenderer,
  paper: { min: { x: number; y: number }; max: { x: number; y: number } }
): AcPdfEntity | undefined {
  const { min, max } = paper
  const lines = [
    renderer.lines([
      new AcGePoint3d(min.x, min.y, 0),
      new AcGePoint3d(max.x, min.y, 0)
    ]),
    renderer.lines([
      new AcGePoint3d(max.x, min.y, 0),
      new AcGePoint3d(max.x, max.y, 0)
    ]),
    renderer.lines([
      new AcGePoint3d(max.x, max.y, 0),
      new AcGePoint3d(min.x, max.y, 0)
    ]),
    renderer.lines([
      new AcGePoint3d(min.x, max.y, 0),
      new AcGePoint3d(min.x, min.y, 0)
    ])
  ].filter((line): line is AcPdfEntity => line instanceof AcPdfEntity)
  if (lines.length === 0) return undefined
  return renderer.group(lines)
}

/**
 * True when `block` is not model space (paper-space layout BTR).
 */
export function isPaperSpaceBlock(
  db: AcDbDatabase,
  block: AcDbBlockTableRecord
): boolean {
  return block.objectId !== db.tables.blockTable.modelSpace.objectId
}
