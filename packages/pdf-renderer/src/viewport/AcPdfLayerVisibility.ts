import { type AcDbDatabase, AcGeBox2d } from '@mlightcad/data-model'

import { effectivePdfLayer } from '../pdf/AcPdfEffectiveLayer'
import type { AcPdfEntity } from '../renderer/AcPdfEntity'

/**
 * Layer names that are Off or Frozen in the drawing's layer table.
 *
 * Matches AutoCAD plot and the interactive viewer: Off and Frozen geometry
 * must not appear in the PDF. INSERT-on-Off is handled when applying the sets
 * (nested entities keep their own layers; layer `"0"` inherits the INSERT).
 */
export interface AcPdfDatabaseLayerVisibility {
  offLayers: ReadonlySet<string>
  frozenLayers: ReadonlySet<string>
}

/**
 * Collects Off / Frozen layer names from the database layer table.
 */
export function acPdfCollectDatabaseLayerVisibility(
  database: AcDbDatabase
): AcPdfDatabaseLayerVisibility {
  const offLayers = new Set<string>()
  const frozenLayers = new Set<string>()
  for (const layer of database.tables.layerTable.newIterator()) {
    const name = layer.name
    if (!name) {
      continue
    }
    if (layer.isFrozen) {
      frozenLayers.add(name)
    }
    if (layer.isOff) {
      offLayers.add(name)
    }
  }
  return { offLayers, frozenLayers }
}

/**
 * Returns true when a top-level entity on `layerName` should be omitted from
 * PDF (Off or Frozen). Used for paper-space viewports, which hide both border
 * and model content when their layer is closed.
 */
export function acPdfIsLayerClosed(
  layerName: string | undefined,
  visibility: AcPdfDatabaseLayerVisibility
): boolean {
  const layer = layerName || '0'
  return (
    visibility.frozenLayers.has(layer) || visibility.offLayers.has(layer)
  )
}

function isInsertEntity(entity: AcPdfEntity): boolean {
  return !!entity.insertName || entity.entityType === 'INSERT'
}

/**
 * Hides drawables that sit on Off or Frozen layers so they neither paint nor
 * expand page extents (framing skips nodes with `visible === false`).
 *
 * AutoCAD Off vs Freeze for INSERTs:
 * - Frozen INSERT layer → hide the whole reference (no children).
 * - Off INSERT layer → keep the INSERT so nested geometry on other layers can
 *   still plot; each child is evaluated on its effective layer (layer `"0"`
 *   inherits the INSERT layer).
 */
export function acPdfApplyLayerVisibility(
  roots: readonly AcPdfEntity[],
  visibility: AcPdfDatabaseLayerVisibility
): void {
  const { offLayers, frozenLayers } = visibility
  if (offLayers.size === 0 && frozenLayers.size === 0) {
    return
  }
  for (const root of roots) {
    applyLayerVisibility(root, offLayers, frozenLayers)
  }
}

/**
 * Applies {@link acPdfCollectDatabaseLayerVisibility} to a drawable tree.
 */
export function acPdfApplyDatabaseLayerVisibility(
  roots: readonly AcPdfEntity[],
  database: AcDbDatabase
): void {
  acPdfApplyLayerVisibility(roots, acPdfCollectDatabaseLayerVisibility(database))
}

function applyLayerVisibility(
  entity: AcPdfEntity,
  offLayers: ReadonlySet<string>,
  frozenLayers: ReadonlySet<string>,
  insertLayer?: string
): void {
  const layer = effectivePdfLayer(entity.layerName, insertLayer)
  const isInsert = isInsertEntity(entity)

  if (frozenLayers.has(layer)) {
    entity.visible = false
    return
  }
  if (!isInsert && offLayers.has(layer)) {
    entity.visible = false
    return
  }

  const childInsertLayer = isInsert ? layer : insertLayer
  for (let i = 0; i < entity.childCount; i++) {
    const child = entity.childAt(i)
    if (child) {
      applyLayerVisibility(child, offLayers, frozenLayers, childInsertLayer)
    }
  }

  // Off INSERT stays visible for On-layer children; shrink its box so Off
  // nested geometry does not inflate page extents, and hide the INSERT when
  // every child was closed (INSERT groups are normally pure child containers).
  if (isInsert && entity.visible && entity.childCount > 0) {
    refreshInsertBoxAfterVisibility(entity)
  }
}

function refreshInsertBoxAfterVisibility(entity: AcPdfEntity): void {
  const box = new AcGeBox2d()
  let anyVisibleChild = false
  for (let i = 0; i < entity.childCount; i++) {
    const child = entity.childAt(i)
    if (!child?.visible) {
      continue
    }
    anyVisibleChild = true
    if (!child.box.isEmpty()) {
      box.union(child.box)
    }
  }
  if (!anyVisibleChild) {
    entity.visible = false
    return
  }
  if (!box.isEmpty()) {
    entity.box = box
  }
}
