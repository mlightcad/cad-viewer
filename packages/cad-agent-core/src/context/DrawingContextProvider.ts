import { resolveDrawingExtents } from '@mlightcad/cad-simple-viewer'

import type { CadSession } from '../session/CadSession'

/**
 * Snapshot of the active drawing passed to the model via `get_drawing_context`.
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
 * Collects layer, unit, and extent metadata from the active session.
 *
 * @param session - Document and view access for this call.
 * @returns A JSON-serializable context object for agent tool calls.
 */
export function getDrawingContext(session: CadSession): DrawingContextSnapshot {
  const doc = session.getDocument()
  if (!doc) {
    throw new Error('No drawing is available.')
  }
  const db = doc.database
  const view = session.getView()
  const extents = view ? resolveDrawingExtents(view, db) : undefined
  const layers = doc.layerStore.getLayers().map(layer => layer.name)

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
