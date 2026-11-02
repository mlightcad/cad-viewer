import {
  type AcDbDatabase,
  AcGeBox2d,
  AcGePoint2d
} from '@mlightcad/data-model'

import type { CadSession, CadSessionView } from '../session/CadSession'

/**
 * Snapshot of the active drawing used by `cad.drawing` in the script host.
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

/**
 * Drawable XY extents: the view's scene extents, else the header EXTMIN/EXTMAX.
 *
 * Header extents can be stale, so they are only used when the view reports
 * nothing (empty drawing, or before the scene is built).
 */
function resolveDrawingExtents(
  view: Pick<CadSessionView, 'getDrawingExtents'>,
  database: AcDbDatabase
): AcGeBox2d | undefined {
  const fromView = view.getDrawingExtents()
  if (fromView && !fromView.isEmpty()) return fromView

  const header = database.extents
  if (header && !header.isEmpty()) {
    return new AcGeBox2d(
      new AcGePoint2d(header.min.x, header.min.y),
      new AcGePoint2d(header.max.x, header.max.y)
    )
  }
  return undefined
}
