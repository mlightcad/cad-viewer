import {
  AcDbViewport,
  AcGeBox2d,
  AcGeMatrix3d,
  type AcGiViewport
} from '@mlightcad/data-model'

const EPS = 1e-6

/**
 * Returns `true` when the viewport is AutoCAD's internal default paper-space
 * viewport (`*Paper_Space`), which does not show model content.
 *
 * Matches {@link AcTrViewportView.isDefaultPaperSpaceViewport}: `number` alone
 * is unreliable after LibreDWG reassignment, so structural fingerprints are
 * used instead.
 */
export function isDefaultPaperSpaceViewport(viewport: {
  centerPoint: { x: number; y: number }
  viewCenter: { x: number; y: number }
  height?: number
  viewHeight?: number
  viewTarget?: { x: number; y: number }
}): boolean {
  const looksAtItself =
    Math.abs(viewport.centerPoint.x - viewport.viewCenter.x) < EPS &&
    Math.abs(viewport.centerPoint.y - viewport.viewCenter.y) < EPS
  if (looksAtItself) return true

  const centerAtOrigin =
    Math.abs(viewport.centerPoint.x) < EPS &&
    Math.abs(viewport.centerPoint.y) < EPS
  if (!centerAtOrigin) return false

  const height = viewport.height
  const viewHeight = viewport.viewHeight
  if (
    height == null ||
    viewHeight == null ||
    !Number.isFinite(height) ||
    !Number.isFinite(viewHeight) ||
    Math.abs(viewHeight - height) >= EPS
  ) {
    return false
  }

  const target = viewport.viewTarget
  if (!target) return true
  return Math.abs(target.x) < EPS && Math.abs(target.y) < EPS
}

/**
 * Builds the affine map from model-space WCS into the viewport's paper
 * rectangle (inverse of paper→model through DVIEW twist).
 *
 * `M = T(paperCenter) · S(sx,sy) · R(-twist) · T(-modelCenter)`
 */
export function buildModelToPaperMatrix(
  paper: AcGeBox2d,
  model: AcGeBox2d,
  twistRadians = 0
): AcGeMatrix3d {
  const modelW = Math.max(model.max.x - model.min.x, EPS)
  const modelH = Math.max(model.max.y - model.min.y, EPS)
  const paperW = Math.max(paper.max.x - paper.min.x, EPS)
  const paperH = Math.max(paper.max.y - paper.min.y, EPS)
  const sx = paperW / modelW
  const sy = paperH / modelH
  const modelCx = (model.min.x + model.max.x) / 2
  const modelCy = (model.min.y + model.max.y) / 2
  const paperCx = (paper.min.x + paper.max.x) / 2
  const paperCy = (paper.min.y + paper.max.y) / 2

  const toOrigin = new AcGeMatrix3d().makeTranslation(-modelCx, -modelCy, 0)
  const unrotate = new AcGeMatrix3d()
  if (Number.isFinite(twistRadians) && Math.abs(twistRadians) > 1e-12) {
    unrotate.makeRotationZ(-twistRadians)
  }
  const scale = new AcGeMatrix3d().makeScale(sx, sy, 1)
  const toPaper = new AcGeMatrix3d().makeTranslation(paperCx, paperCy, 0)

  return toPaper.clone().multiply(scale).multiply(unrotate).multiply(toOrigin)
}

/**
 * Resolves paper and model view boxes from a viewport entity / GI viewport.
 * Returns `null` when either box is empty or degenerate.
 */
export function resolveViewportBoxes(
  viewport: AcDbViewport | AcGiViewport
): { paper: AcGeBox2d; model: AcGeBox2d; twist: number } | null {
  const gi =
    viewport instanceof AcDbViewport ? viewport.toGiViewport() : viewport
  const paper = gi.box
  const model = gi.viewBox
  if (
    paper.isEmpty() ||
    model.isEmpty() ||
    paper.max.x - paper.min.x <= EPS ||
    paper.max.y - paper.min.y <= EPS ||
    model.max.x - model.min.x <= EPS ||
    model.max.y - model.min.y <= EPS
  ) {
    return null
  }
  const twist = Number.isFinite(gi.viewTwistAngle) ? gi.viewTwistAngle : 0
  return { paper, model, twist }
}
