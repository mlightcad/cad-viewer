import type { AcExExtents, AcExViewportSnapshot } from './AcExSnapshotTypes'

const EPS = 1e-12

/**
 * Returns `true` when `(x, y)` (paper WCS) lies inside the viewport frame.
 */
export function viewportContainsPaperPoint(
  viewport: AcExViewportSnapshot,
  x: number,
  y: number
): boolean {
  const box = viewport.paper
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY
}

/**
 * Returns `true` when the paper point is within `tolerance` of any of the
 * four viewport edges. Used to keep frame clicks on the border instead of
 * drilling through to model space.
 */
export function viewportIsNearPaperBorder(
  viewport: AcExViewportSnapshot,
  x: number,
  y: number,
  tolerance: number
): boolean {
  if (!viewportContainsPaperPoint(viewport, x, y)) return false
  const box = viewport.paper
  const distLeft = Math.abs(x - box.minX)
  const distRight = Math.abs(x - box.maxX)
  const distBottom = Math.abs(y - box.minY)
  const distTop = Math.abs(y - box.maxY)
  return Math.min(distLeft, distRight, distBottom, distTop) <= tolerance
}

/**
 * Paper-space WCS → model-space WCS through a viewport (affine, no twist).
 *
 * Inverse of {@link modelPointToPaper}. Degenerate paper boxes return the
 * model view center.
 */
export function paperPointToModel(
  viewport: AcExViewportSnapshot,
  x: number,
  y: number
): { x: number; y: number } {
  const paper = viewport.paper
  const model = viewport.model
  const paperW = paper.maxX - paper.minX
  const paperH = paper.maxY - paper.minY
  if (paperW <= EPS || paperH <= EPS) {
    return {
      x: (model.minX + model.maxX) / 2,
      y: (model.minY + model.maxY) / 2
    }
  }
  const u = (x - paper.minX) / paperW
  const v = (y - paper.minY) / paperH
  return {
    x: model.minX + u * (model.maxX - model.minX),
    y: model.minY + v * (model.maxY - model.minY)
  }
}

/**
 * Model-space WCS → paper-space WCS through a viewport (affine, no twist).
 *
 * Inverse of {@link paperPointToModel}. Degenerate model boxes return the
 * paper rectangle center.
 */
export function modelPointToPaper(
  viewport: AcExViewportSnapshot,
  x: number,
  y: number
): { x: number; y: number } {
  const paper = viewport.paper
  const model = viewport.model
  const modelW = model.maxX - model.minX
  const modelH = model.maxY - model.minY
  if (modelW <= EPS || modelH <= EPS) {
    return {
      x: (paper.minX + paper.maxX) / 2,
      y: (paper.minY + paper.maxY) / 2
    }
  }
  const u = (x - model.minX) / modelW
  const v = (y - model.minY) / modelH
  return {
    x: paper.minX + u * (paper.maxX - paper.minX),
    y: paper.minY + v * (paper.maxY - paper.minY)
  }
}

/**
 * Scale from paper WCS to model WCS along X (used to convert a paper-space
 * snap aperture into model units).
 */
export function viewportPaperToModelScale(
  viewport: AcExViewportSnapshot
): number {
  const paperW = viewport.paper.maxX - viewport.paper.minX
  if (paperW <= EPS) return 1
  return (viewport.model.maxX - viewport.model.minX) / paperW
}

/**
 * Orthographic camera parameters that fill a CSS-pixel viewport rectangle
 * with `model` extents, matching `AcTrViewportView.zoomTo(viewBox, 1.0)`
 * where `_frustum = vpH / 2`.
 */
export function computeViewportCamera(
  model: AcExExtents,
  vpW: number,
  vpH: number
): {
  centerX: number
  centerY: number
  zoom: number
  frustum: number
  aspect: number
} {
  const spanX = Math.max(model.maxX - model.minX, EPS)
  const spanY = Math.max(model.maxY - model.minY, EPS)
  const frustum = Math.max(vpH, EPS) / 2
  const aspect = vpW / Math.max(vpH, EPS)
  const zoom = Math.min((2 * aspect * frustum) / spanX, (2 * frustum) / spanY)
  return {
    centerX: (model.minX + model.maxX) / 2,
    centerY: (model.minY + model.maxY) / 2,
    zoom,
    frustum,
    aspect
  }
}

/**
 * Top-most viewport whose interior contains `(x, y)`, skipping the border
 * band used for frame selection. Search is last-to-first so later DXF
 * viewports (typically drawn on top) win.
 */
export function findDrillThroughViewport(
  viewports: readonly AcExViewportSnapshot[] | undefined,
  x: number,
  y: number,
  borderTolerance: number
): AcExViewportSnapshot | undefined {
  if (!viewports || viewports.length === 0) return undefined
  for (let i = viewports.length - 1; i >= 0; i--) {
    const viewport = viewports[i]!
    if (!viewportContainsPaperPoint(viewport, x, y)) continue
    if (viewportIsNearPaperBorder(viewport, x, y, borderTolerance)) continue
    return viewport
  }
  return undefined
}

/**
 * `true` when any exported paper layout has at least one user viewport.
 */
export function snapshotHasPaperViewports(
  layouts: ReadonlyArray<{ viewports?: AcExViewportSnapshot[] }>
): boolean {
  return layouts.some(
    layout => layout.viewports != null && layout.viewports.length > 0
  )
}
