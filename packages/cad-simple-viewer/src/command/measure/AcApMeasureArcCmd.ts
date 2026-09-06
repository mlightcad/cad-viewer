import {
  AcCmColor,
  AcDbDatabase,
  AcGeCircArc2d,
  AcGeMathUtil,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlDot,
  AcTrHtmlSnapIndicator,
  AcTrHtmlTransientManager
} from '@mlightcad/three-renderer'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementColor,
  acapGetMeasurementFontSize,
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementLength,
  MEASUREMENT_LINE_WEIGHT
} from '../../util'
import { AcTrView2d } from '../../view'
import {
  AcApHtmlLivePreview,
  acapStrokeLivePolyline,
  acapStrokeLiveSegment
} from '../overlay/AcApHtmlLivePreview'
import { acapSyncLiveOverlayTextHeight } from '../overlay/AcApOverlayDrawUtil'
import {
  inwardLockAlignment,
  isBetterLockCandidate,
  lockCurvesFromEntity,
  pointLiesOnCircle,
  sameCircleGeom
} from './AcApMeasureArcLock'
import { AcApMeasureDrawCmd } from './AcApMeasureDrawCmd'
import { MEASUREMENT_LIVE_LAYER } from './AcApMeasurementStore'
import {
  AcApMeasureArcEntity,
  type AcApMeasureCircleGeom,
  strokeMeasureArcOnContext
} from './entity'

type Point2 = { x: number; y: number }

/** Screen-pixel aperture for locking the first pick onto a CIRCLE/ARC stroke. */
const SNAP_SCREEN_PX = 20
/** Minimum angular move (radians) before the locked-arc sweep direction is chosen. */
const DIR_LOCK_RAD = 0.02

/**
 * Wraps an angle delta into (−π, π].
 */
function wrapAngleToPi(delta: number): number {
  return AcGeMathUtil.normalizeAngle(delta + Math.PI) - Math.PI
}

/**
 * Sweep on `g` from `start` to `end`.
 *
 * Default is counter-clockwise so the arc can grow past 180° without
 * jumping to the complementary minor arc. `clockwise` selects that
 * complementary direction (Ctrl toggle).
 */
function lockedSweep(
  start: Point2,
  end: Point2,
  g: AcApMeasureCircleGeom,
  clockwise: boolean
): { through: Point2; length: number } | undefined {
  const a1 = Math.atan2(start.y - g.cy, start.x - g.cx)
  const a2 = Math.atan2(end.y - g.cy, end.x - g.cx)
  const span = AcGeMathUtil.normalizeAngle(clockwise ? a1 - a2 : a2 - a1)
  if (!(span > 1e-10) || span >= Math.PI * 2 - 1e-10) return undefined
  const mid = clockwise ? a1 - span / 2 : a1 + span / 2
  return {
    through: { x: g.cx + g.r * Math.cos(mid), y: g.cy + g.r * Math.sin(mid) },
    length: span * g.r
  }
}

function toPoint2(p: AcGePoint3dLike): Point2 {
  return { x: p.x, y: p.y }
}

function circleGeomFromArc(arc: AcGeCircArc2d): AcApMeasureCircleGeom {
  return { cx: arc.center.x, cy: arc.center.y, r: arc.radius }
}

/**
 * Projects `p` onto the circle circumference. If `p` is the center, the
 * point at angle 0 is returned.
 */
function snapToCircle(
  p: Point2,
  g: AcApMeasureCircleGeom
): { x: number; y: number; z: number } {
  const dx = p.x - g.cx
  const dy = p.y - g.cy
  const d = Math.hypot(dx, dy)
  if (!(d > 0)) return { x: g.cx + g.r, y: g.cy, z: 0 }
  const s = g.r / d
  return { x: g.cx + dx * s, y: g.cy + dy * s, z: 0 }
}

/**
 * Picks the CIRCLE / ARC / polyline-bulge stroke closest to `p` in screen space.
 *
 * Distance is measured to the drawn curve (not the complementary full circle)
 * so a click on a gap or a straight polyline chord does not lock.
 *
 * @returns Geometry and the nearest point on that stroke, or `null`.
 */
function pickCircleGeomAtPoint(
  context: AcApContext,
  p: AcGePoint3dLike
): { geom: AcApMeasureCircleGeom; snapped: AcGePoint3dLike } | null {
  const blockTable = context.doc.database.tables.blockTable
  // OSNAP may have pulled `p` onto a shared polyline vertex. Score against
  // the live cursor so the lock follows whichever arc the mouse is nearer.
  const mouse = context.view.curPos
  const seen = new Set<string>()
  const hits = [
    ...context.view.pick(mouse, SNAP_SCREEN_PX),
    ...context.view.pick(p, SNAP_SCREEN_PX)
  ].filter(hit => {
    if (seen.has(hit.id)) return false
    seen.add(hit.id)
    return true
  })
  const cursorScreen = context.view.worldToScreen(mouse)
  const pick = { x: mouse.x, y: mouse.y, z: 0 }

  let best: { geom: AcApMeasureCircleGeom; snapped: AcGePoint3dLike } | null =
    null
  let bestScreen = SNAP_SCREEN_PX
  let bestAlign = -Infinity

  for (const hit of hits) {
    const entity = blockTable.getEntityById(hit.id)
    if (!entity) continue
    for (const curve of lockCurvesFromEntity(entity)) {
      if (!(curve.radius > 0)) continue
      const nearest = curve.nearestPoint(pick)
      const nearScreen = context.view.worldToScreen(nearest)
      const screenDist = Math.hypot(
        cursorScreen.x - nearScreen.x,
        cursorScreen.y - nearScreen.y
      )
      if (screenDist > SNAP_SCREEN_PX) continue
      const align = inwardLockAlignment(
        curve,
        { x: nearest.x, y: nearest.y },
        { x: mouse.x, y: mouse.y }
      )
      if (
        !best ||
        isBetterLockCandidate(
          screenDist * screenDist,
          align,
          bestScreen * bestScreen,
          bestAlign
        )
      ) {
        bestScreen = screenDist
        bestAlign = align
        const geom = circleGeomFromArc(curve)
        best = {
          geom,
          snapped: { x: nearest.x, y: nearest.y, z: 0 }
        }
      }
    }
  }
  return best
}

/**
 * Commit an arc-length measurement overlay (also used when importing a sidecar).
 */
export function placeArcMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  geom: AcApMeasureCircleGeom,
  start: Point2,
  through: Point2 | undefined,
  end: Point2,
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  AcApMeasureArcEntity.create(geom, start, end, style, {
    ...options,
    through
  }).commit(view, db)
}

/**
 * First-point jig: square snap indicator when the cursor is on a CIRCLE/ARC
 * or a polyline bulge.
 */
class AcApArcSnapJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _ctx: AcApContext
  private readonly _indicator: AcTrHtmlSnapIndicator
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _indicatorId: string

  constructor(context: AcApContext, color: AcCmColor) {
    super(context.view)
    this._ctx = context

    this._indicatorId = `live-arc-snap-${Date.now()}`
    this._htManager = (context.view as AcTrView2d).htmlTransientManager
    this._indicator = new AcTrHtmlSnapIndicator({
      id: this._indicatorId,
      color,
      worldPosition: { x: 0, y: 0, z: 0 },
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (context.view as AcTrView2d).activeLayoutBtrId
    })
    this._indicator.object.visible = false
    this._htManager.add(this._indicator)
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: AcGePoint3dLike) {
    const hit = pickCircleGeomAtPoint(this._ctx, p)
    if (hit) {
      this._indicator.setPosition(hit.snapped)
      this._indicator.object.visible = true
      return
    }
    this._indicator.object.visible = false
  }

  end() {
    super.end()
    this._htManager.remove(this._indicatorId)
  }
}

/**
 * End-point jig when a circle is already locked: cursor stays on the
 * circumference, with a live arc preview (major or minor) and length badge.
 *
 * Sweep direction follows the first mouse movement past a small angle
 * threshold, so dragging past 180° keeps the same side. Ctrl (the same
 * sticky toggle as the ARC command) flips to the complementary sweep.
 */
class AcApArcLockedEndJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _ctx: AcApContext
  private readonly _view: AcTrView2d
  private _geom: AcApMeasureCircleGeom
  private readonly _start: Point2
  private readonly _db: AcDbDatabase
  private readonly _indicator: AcTrHtmlSnapIndicator
  private readonly _badge: AcTrHtmlBadge
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _indicatorId: string
  private readonly _badgeId: string
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  /** Last polar angle of the snapped cursor, used to lock sweep direction. */
  private _lastAngle: number
  /**
   * Clockwise vs CCW chosen from the first significant mouse move.
   * `null` until that move; preview then defaults to CCW.
   */
  private _baseClockwise: boolean | null = null

  constructor(
    context: AcApContext,
    db: AcDbDatabase,
    geom: AcApMeasureCircleGeom,
    start: AcGePoint3dLike,
    color: AcCmColor
  ) {
    super(context.view)
    this._ctx = context
    this._view = context.view as AcTrView2d
    this._geom = geom
    this._start = toPoint2(start)
    this._db = db
    this._color = color
    this._lastAngle = Math.atan2(start.y - geom.cy, start.x - geom.cx)
    this._htManager = this._view.htmlTransientManager

    this._indicatorId = `live-arc-end-snap-${Date.now()}`
    this._indicator = new AcTrHtmlSnapIndicator({
      id: this._indicatorId,
      color,
      worldPosition: start,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId
    })
    this._htManager.add(this._indicator)

    this._badgeId = `live-arc-locked-badge-${Date.now()}`
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: start,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: acapGetMeasurementFontSize()
    })
    this._htManager.add(this._badge)
    acapSyncLiveOverlayTextHeight(
      this._view,
      [this._badge],
      acapGetCurrentMeasurementStyle(this._db)
    )
    this._badge.object.visible = false

    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-arc-locked-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  /**
   * Circle currently locked for the end pick. May switch between polyline
   * bulge segments that share the start vertex as the cursor moves.
   */
  get geom(): AcApMeasureCircleGeom {
    return this._geom
  }

  /**
   * Effective sweep direction after mouse-lock XOR the Ctrl sticky toggle.
   */
  get clockwise(): boolean {
    return (this._baseClockwise ?? false) !== this._isCtrlFlipped()
  }

  private _isCtrlFlipped(): boolean {
    return AcApDocManager.instance.editor.getInputToggles().ctrlArcFlip
  }

  private _trackSweepDirection(end: Point2): void {
    const angle = Math.atan2(end.y - this._geom.cy, end.x - this._geom.cx)
    if (this._baseClockwise == null) {
      const delta = wrapAngleToPi(angle - this._lastAngle)
      if (Math.abs(delta) > DIR_LOCK_RAD) {
        this._baseClockwise = delta < 0
      }
    }
    this._lastAngle = angle
  }

  update(p: AcGePoint3dLike) {
    const mouse = this._view.curPos
    const hit = pickCircleGeomAtPoint(this._ctx, p)
    if (
      hit &&
      pointLiesOnCircle(this._start, hit.geom) &&
      !sameCircleGeom(this._geom, hit.geom)
    ) {
      this._geom = hit.geom
      this._baseClockwise = null
      this._lastAngle = Math.atan2(
        this._start.y - hit.geom.cy,
        this._start.x - hit.geom.cx
      )
    }
    const snapped = snapToCircle(mouse, this._geom)
    const end = toPoint2(snapped)
    this._trackSweepDirection(end)
    this._color = acapGetMeasurementColor(this._db)
    this._indicator.setPosition(snapped)
    this._badge.setColor(this._color)
    const style = acapGetCurrentMeasurementStyle(this._db)
    this._badge.setFontSize(style.fontSize)
    acapSyncLiveOverlayTextHeight(this._view, [this._badge], style)

    const lineWidth = acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    const sweep = lockedSweep(this._start, end, this._geom, this.clockwise)

    this._preview.acapSetDraw((ctx, view) => {
      strokeMeasureArcOnContext(
        ctx,
        view,
        this._geom,
        this._start,
        end,
        this._color,
        lineWidth,
        sweep?.through
      )
    })

    if (!sweep) {
      this._badge.object.visible = false
      return
    }
    this._badge.setText(formatMeasurementLength(this._db, sweep.length))
    this._badge.setPosition(sweep.through)
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.acapDispose()
    this._htManager.remove(this._indicatorId)
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Rubber-band jig for picking the through point: solid HTML preview from start
 * to cursor.
 */
class AcApMeasureArcThroughJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _start: AcGePoint3dLike
  private readonly _preview: AcApHtmlLivePreview
  private readonly _color: AcCmColor
  private _cursor: AcGePoint3dLike

  constructor(view: AcEdBaseView, start: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._start = start
    this._cursor = start
    this._color = color

    this._preview = new AcApHtmlLivePreview(
      view as AcTrView2d,
      `live-arc-through-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: AcGePoint3dLike) {
    this._cursor = p
    const lineWidth = acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLiveSegment(
        ctx,
        view,
        this._start,
        this._cursor,
        this._color,
        lineWidth
      )
    })
  }

  end() {
    super.end()
    this._preview.acapDispose()
  }
}

/**
 * Preview jig for picking the end point: live arc stroke (or polyline fallback
 * when the three points are collinear) plus a length badge.
 */
class AcApMeasureArcEndJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _start: Point2
  private readonly _through: Point2
  private readonly _db: AcDbDatabase
  private readonly _badge: AcTrHtmlBadge
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _badgeId: string
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _end: Point2

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    start: AcGePoint3dLike,
    through: AcGePoint3dLike,
    color: AcCmColor
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._start = toPoint2(start)
    this._through = toPoint2(through)
    this._end = toPoint2(through)
    this._color = color
    this._db = db

    this._badgeId = `live-arc-badge-${Date.now()}`
    this._htManager = this._view.htmlTransientManager
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: start,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: acapGetMeasurementFontSize()
    })
    this._htManager.add(this._badge)
    acapSyncLiveOverlayTextHeight(
      this._view,
      [this._badge],
      acapGetCurrentMeasurementStyle(this._db)
    )
    this._badge.object.visible = false

    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-arc-end-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: AcGePoint3dLike) {
    this._end = toPoint2(p)
    this._color = acapGetMeasurementColor(this._db)
    this._badge.setColor(this._color)
    const style = acapGetCurrentMeasurementStyle(this._db)
    this._badge.setFontSize(style.fontSize)
    acapSyncLiveOverlayTextHeight(this._view, [this._badge], style)

    const lineWidth = acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    const arc = AcGeCircArc2d.tryCreateByThreePoints(
      this._start,
      this._through,
      this._end
    )
    const geom = arc ? circleGeomFromArc(arc) : null

    this._preview.acapSetDraw((ctx, view) => {
      if (!geom) {
        acapStrokeLivePolyline(
          ctx,
          view,
          [this._start, this._through, this._end],
          this._color,
          lineWidth
        )
        return
      }
      strokeMeasureArcOnContext(
        ctx,
        view,
        geom,
        this._start,
        this._end,
        this._color,
        lineWidth,
        this._through
      )
    })

    if (!arc) {
      this._badge.object.visible = false
      return
    }

    this._badge.setText(formatMeasurementLength(this._db, arc.length))
    this._badge.setPosition(arc.midPoint)
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.acapDispose()
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Command that measures arc length.
 *
 * If the first pick lands on a CIRCLE, ARC, or polyline bulge, subsequent
 * picks lock onto that circumference (two-point sweep). Sweep direction
 * follows the first mouse movement so arcs greater than 180 degrees stay on
 * the same side; Ctrl flips to the complementary (major/minor) arc. Otherwise
 * three world points (start, a point on the arc, end) define a free-form arc.
 *
 * Interactive preview is HTML-only. The committed overlay is placed via
 * {@link placeArcMeasurement}.
 */
export class AcApMeasureArcCmd extends AcApMeasureDrawCmd {
  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)
    const view = context.view as AcTrView2d

    await this.withMeasureInput(context, async () => {
      editor.resetInputToggles()

      const startPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureArc.startPoint')
      )
      startPrompt.jig = new AcApArcSnapJig(context, color)
      const startResult = await editor.getPoint(startPrompt)
      if (startResult.status !== AcEdPromptStatus.OK) return

      const start = startResult.value!
      const lock = pickCircleGeomAtPoint(context, start)
      if (lock) {
        const startOnLock = pointLiesOnCircle(toPoint2(start), lock.geom)
          ? start
          : lock.snapped
        await this.commitLockedArc(
          context,
          view,
          db,
          color,
          lock.geom,
          startOnLock
        )
        return
      }
      const throughPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureArc.throughPoint')
      )
      throughPrompt.useBasePoint = true
      throughPrompt.jig = new AcApMeasureArcThroughJig(
        context.view,
        start,
        color
      )
      const throughResult = await editor.getPoint(throughPrompt)
      if (throughResult.status !== AcEdPromptStatus.OK) return
      const through = throughResult.value!

      const endPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureArc.endPoint')
      )
      endPrompt.jig = new AcApMeasureArcEndJig(
        context.view,
        db,
        start,
        through,
        color
      )
      const endResult = await editor.getPoint(endPrompt)
      if (endResult.status !== AcEdPromptStatus.OK) return
      const end = endResult.value!

      const start2 = toPoint2(start)
      const through2 = toPoint2(through)
      const end2 = toPoint2(end)
      const measured = AcGeCircArc2d.tryCreateByThreePoints(
        start2,
        through2,
        end2
      )
      if (!measured) {
        this.showMessage(AcApI18n.t('jig.measureArc.invalidPoints'), 'warning')
        return
      }

      placeArcMeasurement(
        view,
        db,
        circleGeomFromArc(measured),
        start2,
        through2,
        end2,
        acapGetCurrentMeasurementStyle(db)
      )
    })
  }

  /**
   * Two-point locked-arc flow after the start pick landed on a CIRCLE, ARC,
   * or polyline bulge.
   *
   * Sweep direction follows the cursor; Ctrl toggles the complementary arc.
   */
  private async commitLockedArc(
    context: AcApContext,
    view: AcTrView2d,
    db: AcDbDatabase,
    color: AcCmColor,
    geom: AcApMeasureCircleGeom,
    start: AcGePoint3dLike
  ): Promise<void> {
    context.view.editor.resetInputToggles()
    const htManager = view.htmlTransientManager
    const liveDotId = `live-arc-locked-dot-${Date.now()}`
    htManager.add(
      new AcTrHtmlDot({
        id: liveDotId,
        color,
        worldPosition: start,
        layer: MEASUREMENT_LIVE_LAYER,
        layoutId: view.activeLayoutBtrId
      })
    )

    const endPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureArc.lockedEndPoint')
    )
    const jig = new AcApArcLockedEndJig(context, db, geom, start, color)
    endPrompt.jig = jig

    let endRaw: AcGePoint3dLike | undefined
    try {
      const endResult = await context.view.editor.getPoint(endPrompt)
      if (endResult.status !== AcEdPromptStatus.OK) return
      endRaw = endResult.value!
    } finally {
      htManager.remove(liveDotId)
    }

    if (!endRaw) return
    const geomNow = jig.geom
    const start2 = toPoint2(start)
    const end2 = toPoint2(snapToCircle(endRaw, geomNow))
    const sweep = lockedSweep(start2, end2, geomNow, jig.clockwise)
    if (!sweep) {
      this.showMessage(AcApI18n.t('jig.measureArc.invalidPoints'), 'warning')
      return
    }

    placeArcMeasurement(
      view,
      db,
      geomNow,
      start2,
      sweep.through,
      end2,
      acapGetCurrentMeasurementStyle(db)
    )
  }
}
