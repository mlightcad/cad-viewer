import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

/**
 * Snapshot of the active drawing passed to the LLM via `get_drawing_context`.
 */
export interface DrawingContextSnapshot {
  /** Name of the current layer (CLAYER). */
  currentLayer: string
  /** All layer names in the document. */
  layers: string[]
  /** Drawing units code (INSUNITS). */
  insunits: number
  /** Number of entities in model space. */
  entityCount: number
  /** Axis-aligned bounding box of the database. */
  extents: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    isEmpty: boolean
  }
  /** Human-readable document title. */
  documentTitle: string
}

/**
 * Collects layer, unit, extent, and entity metadata from the active document.
 *
 * @returns A JSON-serializable context object for agent tool calls.
 */
export function getDrawingContext(): DrawingContextSnapshot {
  const doc = AcApDocManager.instance.curDocument
  const db = doc.database
  const modelSpace = db.tables.blockTable.modelSpace

  let entityCount = 0
  for (const _entity of modelSpace.newIterator()) {
    entityCount++
  }

  const layers = doc.layerStore.getLayers().map(layer => layer.name)
  const extents = db.extents

  return {
    currentLayer: doc.layerStore.getCurrentLayerName(),
    layers,
    insunits: db.insunits,
    entityCount,
    extents: {
      min: { x: extents.min.x, y: extents.min.y, z: extents.min.z },
      max: { x: extents.max.x, y: extents.max.y, z: extents.max.z },
      isEmpty: extents.isEmpty()
    },
    documentTitle: doc.docTitle
  }
}
