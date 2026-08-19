import {
  AcCmColor,
  AcDbArc,
  AcDbCircle,
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
  AcEdCommand,
  AcEdCorsorType,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdViewMode
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementColor,
  acapGetMeasurementFontSize,
  acapGetMeasurementLineWeight,
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementLength
} from '../../util'
import { AcTrView2d } from '../../view'
import {
  AcApHtmlLivePreview,
  acapStrokeLivePolyline,
  acapStrokeLiveSegment
} from '../overlay/AcApHtmlLivePreview'
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
  p: AcGePoint3dLike,
  g: AcApMeasureCircleGeom
): { x: number; y: number; z: number } {
  const dx = p.x - g.cx
  const dy = p.y - g.cy
  const d = Math.hypot(dx, dy)
  if (!(d > 0)) return { x: g.cx + g.r, y: g.cy, z: 0 }
  const s = g.r / d
  return { x: g.cx + dx * s, y: g.cy + dy * s, z: 0 }
}

function circleGeomFromEntity(entity: unknown): AcApMeasureCircleGeom | null {
  if (entity instanceof AcDbCircle || entity instanceof AcDbArc) {
    return { cx: entity.center.x, cy: entity.center.y, r: entity.radius }
  }
  return null
}

/**
 * Picks the CIRCLE/ARC whose circumference is closest to `p` in screen space.
 *
 * @returns Geometry and the point snapped onto that circumference, or `null`.
 */
function pickCircleGeomAtPoint(
  context: AcApContext,
  p: AcGePoint3dLike
): { geom: AcApMeasureCircleGeom; snapped: AcGePoint3dLike } | null {
  const hits = context.view.pick(p, SNAP_SCREEN_PX)
  const blockTable = context.doc.database.tables.blockTable

  let bestGeom: AcApMeasureCircleGeom | null = null
  let bestDist = Number.MAX_VALUE

  for (const hit of hits) {
    const entity = blockTable.getEntityById(hit.id)
    const geom = circleGeomFromEntity(entity)
    if (!geom) continue
    const distToCircumference = Math.abs(
      Math.hypot(p.x - geom.cx, p.y - geom.cy) - geom.r
    )
    if (distToCircumference < bestDist) {
      bestDist = distToCircumference
      bestGeom = geom
    }
  }

  if (!bestGeom) return null

  const snapped = snapToCircle(p, bestGeom)
  const cursorScreen = context.view.worldToScreen(p)
  const snapScreen = context.view.worldToScreen(snapped)
  const screenDist = Math.hypot(
    cursorScreen.x - snapScreen.x,
    cursorScreen.y - snapScreen.y
  )
  if (screenDist > SNAP_SCREEN_PX) return null
  return { geom: bestGeom, snapped }
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
 * First-point jig: square snap indicator when the cursor is on a CIRCLE/ARC.
 */
class AcApArcSnapJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _ctx: AcApContext
  private readonly _indicator: AcTrHtmlSnapIndicator
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _indicatorId: string
  private readonly _onSnap: (
    geom: AcApMeasureCircleGeom | null,
    snapped: AcGePoint3dLike | null
  ) => void

  constructor(
    context: AcApContext,
    color: AcCmColor,
    onSnap: (
      geom: AcApMeasureCircleGeom | null,
      snapped: AcGePoint3dLike | null
    ) => void
  ) {
    super(context.view)
    this._ctx = context
    this._onSnap = onSnap

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
      this._onSnap(hit.geom, hit.snapped)
      return
    }
    this._indicator.object.visible = false
    this._onSnap(null, null)
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
  private readonly _view: AcTrView2d
  private readonly _geom: AcApMeasureCircleGeom
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
    view: AcEdBaseView,
    db: AcDbDatabase,
    geom: AcApMeasureCircleGeom,
    start: AcGePoint3dLike,
    color: AcCmColor
  ) {
    super(view)
    this._view = view as AcTrView2d
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
    this._badge.object.visible = false
    this._htManager.add(this._badge)

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
    const snapped = snapToCircle(p, this._geom)
    const end = toPoint2(snapped)
    this._trackSweepDirection(end)
    this._color = acapGetMeasurementColor(this._db)
    this._indicator.setPosition(snapped)
    this._badge.setColor(this._color)
    this._badge.setFontSize(acapGetMeasurementFontSize())

    const lineWidth = acapMeasurementCanvasLineWidth(
      acapGetMeasurementLineWeight()
    )
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
    const lineWidth = acapMeasurementCanvasLineWidth(
      acapGetMeasurementLineWeight()
    )
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
    this._badge.object.visible = false
    this._htManager.add(this._badge)

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
    this._badge.setFontSize(acapGetMeasurementFontSize())

    const lineWidth = acapMeasurementCanvasLineWidth(
      acapGetMeasurementLineWeight()
    )
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
 * If the first pick lands on a CIRCLE or ARC entity, subsequent picks lock
 * onto that circumference (two-point sweep). Sweep direction follows the
 * first mouse movement so arcs greater than 180 degrees stay on the same
 * side; Ctrl flips to the complementary (major/minor) arc. Otherwise three
 * world points (start, a point on the arc, end) define a free-form arc.
 *
 * Interactive preview is HTML-only. The committed overlay is placed via
 * {@link placeArcMeasurement}.
 */
export class AcApMeasureArcCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)
    const view = context.view as AcTrView2d

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        editor.resetInputToggles()
        let snapGeom: AcApMeasureCircleGeom | null = null
        let snappedStart: AcGePoint3dLike | null = null

        const startPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureArc.startPoint')
        )
        startPrompt.jig = new AcApArcSnapJig(
          context,
          color,
          (geom, snapped) => {
            snapGeom = geom
            snappedStart = snapped
          }
        )
        const startResult = await editor.getPoint(startPrompt)
        if (startResult.status !== AcEdPromptStatus.OK) return

        if (snapGeom && snappedStart) {
          await this.commitLockedArc(
            context,
            view,
            db,
            color,
            snapGeom,
            snappedStart
          )
          return
        }

        const start = startResult.value!
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
          this.showMessage(
            AcApI18n.t('jig.measureArc.invalidPoints'),
            'warning'
          )
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
    )
  }

  /**
   * Two-point locked-arc flow after the start pick landed on a CIRCLE/ARC.
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
    const jig = new AcApArcLockedEndJig(
      context.view,
      db,
      geom,
      start,
      color
    )
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
    const start2 = toPoint2(start)
    const end2 = toPoint2(snapToCircle(endRaw, geom))
    const sweep = lockedSweep(start2, end2, geom, jig.clockwise)
    if (!sweep) {
      this.showMessage(AcApI18n.t('jig.measureArc.invalidPoints'), 'warning')
      return
    }

    placeArcMeasurement(
      view,
      db,
      geom,
      start2,
      sweep.through,
      end2,
      acapGetCurrentMeasurementStyle(db)
    )
  }
}
