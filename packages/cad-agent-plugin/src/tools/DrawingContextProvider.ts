import {
  AcApDocManager,
  type AcTrView2d,
  resolveDrawingExtents
} from '@mlightcad/cad-simple-viewer'

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
  /**
   * Axis-aligned bounding box of drawable geometry (prefers scene extents
   * over stale header EXTMIN/EXTMAX).
   */
  extents: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    isEmpty: boolean
  }
  /** Human-readable document title. */
  documentTitle: string
}

/**
 * Collects layer, unit, and extent metadata from the active document.
 *
 * @returns A JSON-serializable context object for agent tool calls.
 */
export function getDrawingContext(): DrawingContextSnapshot {
  const doc = AcApDocManager.instance.curDocument
  const db = doc.database
  const view = AcApDocManager.instance.curView as AcTrView2d

  const layers = doc.layerStore.getLayers().map(layer => layer.name)
  const extents = resolveDrawingExtents(view, db)

  return {
    currentLayer: doc.layerStore.getCurrentLayerName(),
    layers,
    insunits: db.insunits,
    extents: extents
      ? {
          min: { x: extents.min.x, y: extents.min.y, z: 0 },
          max: { x: extents.max.x, y: extents.max.y, z: 0 },
          isEmpty: extents.isEmpty()
        }
      : {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
          isEmpty: true
        },
    documentTitle: doc.docTitle
  }
}
