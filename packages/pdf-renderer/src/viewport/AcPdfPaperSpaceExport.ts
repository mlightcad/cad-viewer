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
import { AcPdfViewportContent } from './AcPdfViewportContent'

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
 * Walks one block's entities into PDF drawables (skipping viewports).
 */
function walkBlockDrawables(
  block: AcDbBlockTableRecord,
  renderer: AcPdfRenderer
): AcPdfEntity[] {
  const roots: AcPdfEntity[] = []
  for (const entity of block.newIterator()) {
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
 * Walks a block twice so INSERT cache templates receive async mtext/image
 * ops before clones snapshot them.
 *
 * `AcDbRenderingCache` stores the first-drawn template by reference, then
 * hands each INSERT a `fastDeepClone`. Text/mtext fill their op lists in
 * microtasks (`awaitPending`). Cloning beforehand copies empty `_ops`
 * arrays, so arc-aligned labels (and any other async text) inside blocks
 * never appear in the PDF. Warming the cache, awaiting, then re-walking
 * makes hits clone already-filled templates.
 */
export async function collectBlockRoots(
  block: AcDbBlockTableRecord,
  renderer: AcPdfRenderer
): Promise<AcPdfEntity[]> {
  walkBlockDrawables(block, renderer)
  await renderer.awaitPending()
  renderer.resetCollected()
  const roots = walkBlockDrawables(block, renderer)
  await renderer.awaitPending()
  return roots
}

/**
 * Walks model space and returns PDF drawables for viewport reuse.
 */
export async function collectModelSpaceRoots(
  db: AcDbDatabase,
  renderer: AcPdfRenderer
): Promise<AcPdfEntity[]> {
  return collectBlockRoots(db.tables.blockTable.modelSpace, renderer)
}

/**
 * Builds clipped, model→paper transformed content for one user viewport.
 *
 * `resolveModelRoots` is invoked only for viewports that actually show model
 * geometry, so layouts without usable viewports never traverse model space.
 * The returned content paints the shared roots on demand — no per-viewport
 * geometry clone is created.
 */
export function buildViewportModelContent(
  viewport: AcDbViewport,
  resolveModelRoots: () => AcPdfEntity[],
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
  const content = new AcPdfViewportContent(
    resolveModelRoots(),
    matrix,
    boxes.paper
  )
  content.objectId = viewport.objectId

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
