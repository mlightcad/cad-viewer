import {
  AcDbDatabase,
  AcDbObjectId,
  AcDbViewport,
  AcGeBox2d,
  AcGePoint2d
} from '@mlightcad/data-model'
import { AcTrViewportView } from '@mlightcad/three-renderer'

/** Axis-aligned box used by layout framing heuristics. */
export type AcApLayoutFrameBox = {
  min: { x: number; y: number }
  max: { x: number; y: number }
}

/**
 * Returns true when `outer` fully contains `inner` (inclusive).
 */
export function acapBoxContains(
  outer: AcApLayoutFrameBox,
  inner: AcApLayoutFrameBox
): boolean {
  return (
    outer.min.x <= inner.min.x &&
    outer.min.y <= inner.min.y &&
    outer.max.x >= inner.max.x &&
    outer.max.y >= inner.max.y
  )
}

/**
 * Converts a layout frame box to {@link AcGeBox2d}.
 */
export function acapFrameBoxToGeBox2d(box: AcApLayoutFrameBox): AcGeBox2d {
  return new AcGeBox2d(
    new AcGePoint2d(box.min.x, box.min.y),
    new AcGePoint2d(box.max.x, box.max.y)
  )
}

/**
 * Paper-space rectangle of a viewport entity from its center / width / height.
 */
export function acapViewportPaperBox(viewport: {
  centerPoint: { x: number; y: number }
  width: number
  height: number
}): AcApLayoutFrameBox | undefined {
  const width = viewport.width
  const height = viewport.height
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined
  }
  const cx = viewport.centerPoint.x
  const cy = viewport.centerPoint.y
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return undefined
  const hx = width / 2
  const hy = height / 2
  return {
    min: { x: cx - hx, y: cy - hy },
    max: { x: cx + hx, y: cy + hy }
  }
}

/**
 * Union of real (non-default) paper-space viewport borders on a layout BTR.
 *
 * Reads the database directly so open-time framing can validate LIMMIN/LIMMAX
 * before viewport entities are converted into the scene.
 */
export function acapCollectPaperViewportsBox(
  database: AcDbDatabase,
  layoutBtrId: AcDbObjectId
): AcGeBox2d | undefined {
  const btr = database.tables.blockTable.getIdAt(layoutBtrId)
  if (!btr) return undefined

  const union = new AcGeBox2d()
  let any = false
  for (const entity of btr.newIterator()) {
    if (!(entity instanceof AcDbViewport)) continue
    if (AcTrViewportView.isDefaultPaperSpaceViewport(entity)) continue
    const paperBox = acapViewportPaperBox(entity)
    if (!paperBox) continue
    union.expandByPoint(paperBox.min)
    union.expandByPoint(paperBox.max)
    any = true
  }
  return any && !union.isEmpty() ? union : undefined
}

export type AcApResolveLayoutFrameBoxInput = {
  /** Layout LIMMIN/LIMMAX when present. */
  limits?: AcGeBox2d | AcApLayoutFrameBox | null
  /** Bounding box of real paper viewports (scene or database). */
  viewportsBox?: AcGeBox2d | AcApLayoutFrameBox | null
  /** Layout EXTMIN/EXTMAX projected to XY when present. */
  layoutExtents?: AcGeBox2d | AcApLayoutFrameBox | null
  /** Batch / entity extents for the layout (after convert). */
  entityBox?: AcGeBox2d | AcApLayoutFrameBox | null
}

export type AcApResolveLayoutFrameBoxResult = {
  box: AcGeBox2d
  /** Which signal produced the frame. */
  source: 'limits' | 'viewports' | 'layoutExtents' | 'entityBox'
}

function toFrameBox(
  box: AcGeBox2d | AcApLayoutFrameBox | null | undefined
): AcApLayoutFrameBox | undefined {
  if (!box) return undefined
  if ('isEmpty' in box && typeof box.isEmpty === 'function' && box.isEmpty()) {
    return undefined
  }
  const min = box.min
  const max = box.max
  if (
    !Number.isFinite(min.x) ||
    !Number.isFinite(min.y) ||
    !Number.isFinite(max.x) ||
    !Number.isFinite(max.y) ||
    max.x < min.x ||
    max.y < min.y
  ) {
    return undefined
  }
  return { min: { x: min.x, y: min.y }, max: { x: max.x, y: max.y } }
}

/**
 * Picks the best camera frame for a layout (paper or model).
 *
 * Priority:
 * 1. **limits** — only when they contain the viewport box (rejects stale
 *    template LIMMIN/LIMMAX such as `(0,0)-(12,9)` while viewports sit far away).
 *    Limits are **not** trusted when there is no viewport box; Model space and
 *    empty sheets must fall through.
 * 2. **viewports** — real paper viewport borders.
 * 3. **layoutExtents** — layout EXTMIN/EXTMAX.
 * 4. **entityBox** — converted scene / entity extents.
 * 5. **limits** (last resort) — empty new layouts that only have LIMMIN/LIMMAX.
 */
export function acapResolveLayoutFrameBox(
  input: AcApResolveLayoutFrameBoxInput
): AcApResolveLayoutFrameBoxResult | undefined {
  const limits = toFrameBox(input.limits ?? undefined)
  const viewportsBox = toFrameBox(input.viewportsBox ?? undefined)
  const layoutExtents = toFrameBox(input.layoutExtents ?? undefined)
  const entityBox = toFrameBox(input.entityBox ?? undefined)

  if (limits && viewportsBox && acapBoxContains(limits, viewportsBox)) {
    return { box: acapFrameBoxToGeBox2d(limits), source: 'limits' }
  }
  if (viewportsBox) {
    return { box: acapFrameBoxToGeBox2d(viewportsBox), source: 'viewports' }
  }
  if (layoutExtents) {
    return {
      box: acapFrameBoxToGeBox2d(layoutExtents),
      source: 'layoutExtents'
    }
  }
  if (entityBox) {
    return { box: acapFrameBoxToGeBox2d(entityBox), source: 'entityBox' }
  }
  if (limits) {
    return { box: acapFrameBoxToGeBox2d(limits), source: 'limits' }
  }
  return undefined
}
