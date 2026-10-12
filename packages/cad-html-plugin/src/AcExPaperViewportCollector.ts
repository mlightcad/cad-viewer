import {
  type AcDbBlockTableRecord,
  type AcDbDatabase,
  AcDbViewport
} from '@mlightcad/data-model'
import { AcTrViewportView } from '@mlightcad/three-renderer'

import type { AcExExtents, AcExViewportSnapshot } from './AcExSnapshotTypes'

/**
 * Collects user-created paper-space viewports for HTML export.
 *
 * Skips the default `*Paper_Space` viewport via
 * {@link AcTrViewportView.isDefaultPaperSpaceViewport}. Model-space layouts
 * return `undefined`.
 *
 * @param database - Open drawing database.
 * @param layoutBtrId - Block-table-record id of the layout.
 * @param isModelSpace - When `true`, no viewports are collected.
 */
export function collectLayoutViewports(
  database: AcDbDatabase,
  layoutBtrId: string,
  isModelSpace: boolean
): AcExViewportSnapshot[] | undefined {
  if (isModelSpace) return undefined

  const block = resolveLayoutBlock(database, layoutBtrId)
  if (!block?.newIterator) return undefined

  const viewports: AcExViewportSnapshot[] = []
  for (const entity of block.newIterator()) {
    if (!(entity instanceof AcDbViewport)) continue
    if (AcTrViewportView.isDefaultPaperSpaceViewport(entity)) continue
    if (typeof entity.toGiViewport !== 'function') continue

    const gi = entity.toGiViewport()
    const paperBox = gi.box
    const modelBox = gi.viewBox
    const paper = extentsFromBox2d(paperBox)
    const model = extentsFromBox2d(modelBox)
    if (!paper || !model) continue
    const twist = Number.isFinite(gi.viewTwistAngle)
      ? gi.viewTwistAngle
      : entity.viewTwistAngle
    const frozenLayers = resolveFrozenLayers(
      gi as { frozenLayers?: readonly string[] },
      entity
    )
    const snapshot: AcExViewportSnapshot = { paper, model }
    if (Number.isFinite(twist) && Math.abs(twist) > 1e-12) {
      snapshot.twist = twist
    }
    if (frozenLayers.length > 0) {
      snapshot.frozenLayers = frozenLayers
    }
    viewports.push(snapshot)
  }

  return viewports.length > 0 ? viewports : undefined
}

/**
 * Resolves per-viewport frozen layer names from the GI viewport, falling back
 * to resolving soft-pointer ids on the database entity when an older
 * data-model build omits {@link AcGiViewport.frozenLayers}.
 */
function resolveFrozenLayers(
  gi: { frozenLayers?: readonly string[] },
  entity: AcDbViewport
): string[] {
  const fromGi = gi.frozenLayers
  if (fromGi && fromGi.length > 0) {
    return [...fromGi]
  }
  const ids = entity.frozenLayerIds
  if (!ids?.length) return []
  const layerTable = entity.database?.tables.layerTable
  if (!layerTable) return []
  const names: string[] = []
  for (const id of ids) {
    const layer = layerTable.getIdAt(id)
    if (layer) names.push(layer.name)
  }
  return names
}

function extentsFromBox2d(box: {
  min: { x: number; y: number }
  max: { x: number; y: number }
  isEmpty?: () => boolean
}): AcExExtents | undefined {
  if (typeof box.isEmpty === 'function' && box.isEmpty()) return undefined
  const minX = box.min.x
  const minY = box.min.y
  const maxX = box.max.x
  const maxY = box.max.y
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    maxX - minX <= 0 ||
    maxY - minY <= 0
  ) {
    return undefined
  }
  return { minX, minY, maxX, maxY }
}

function resolveLayoutBlock(
  database: AcDbDatabase,
  layoutBtrId: string
): AcDbBlockTableRecord | undefined {
  const blockTable = database.tables?.blockTable
  if (!blockTable) return undefined

  const direct =
    typeof blockTable.getIdAt === 'function'
      ? blockTable.getIdAt(layoutBtrId)
      : undefined
  if (direct) return direct

  if (typeof blockTable.newIterator === 'function') {
    for (const block of blockTable.newIterator()) {
      if (block.objectId === layoutBtrId) {
        return block
      }
    }
  }

  const modelSpace = blockTable.modelSpace
  if (modelSpace?.objectId === layoutBtrId) {
    return modelSpace
  }
  return undefined
}
