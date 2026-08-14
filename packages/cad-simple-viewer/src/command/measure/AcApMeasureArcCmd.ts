import {
  AcCmColor,
  AcDbArc,
  AcDbCircle,
  AcDbDatabase,
  AcDbLine,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot,
  AcTrHtmlGroup,
  AcTrHtmlSnapIndicator,
  AcTrHtmlTransientManager
} from '@mlightcad/three-renderer'

import { AcApContext } from '../../app'
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
  type AcApMeasurementStyle,
  cssColor,
  currentMeasurementStyle,
  formatMeasurementLength,
  measurementCanvasLineWidth,
  measurementColor
} from '../../util'
import { AcTrView2d } from '../../view'
import { serializeMeasurementStyle } from './AcApMeasurementSidecar'
import {
  commitMeasurementGroup,
  getMeasurementStyle,
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER
} from './AcApMeasurementStore'

interface CircleGeom {
  cx: number
  cy: number
  r: number
}

/** Returns the world point snapped to the nearest point on the circle circumference */
function snapToCircle(
  p: AcGePoint3dLike,
  g: CircleGeom
): { x: number; y: number; z: number } {
  const angle = Math.atan2(p.y - g.cy, p.x - g.cx)
  return {
    x: g.cx + g.r * Math.cos(angle),
    y: g.cy + g.r * Math.sin(angle),
    z: 0
  }
}

/** Returns the shorter arc length between two points on a circle */
function shortArcLength(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  g: CircleGeom
): number {
  const a1 = Math.atan2(p1.y - g.cy, p1.x - g.cx)
  const a2 = Math.atan2(p2.y - g.cy, p2.x - g.cx)
  const norm = (a: number) =>
    ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const span = norm(a2 - a1)
  return Math.min(span, 2 * Math.PI - span) * g.r
}

/** World midpoint of the shorter arc between two circle points */
function shortArcMid(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  g: CircleGeom
): { x: number; y: number; z: number } {
  const a1 = Math.atan2(p1.y - g.cy, p1.x - g.cx)
  const a2 = Math.atan2(p2.y - g.cy, p2.x - g.cx)
  const norm = (a: number) =>
    ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const ccwSpan = norm(a2 - a1)
  const mid =
    ccwSpan <= Math.PI ? a1 + ccwSpan / 2 : a1 - (2 * Math.PI - ccwSpan) / 2
  return { x: g.cx + g.r * Math.cos(mid), y: g.cy + g.r * Math.sin(mid), z: 0 }
}

/**
 * Draws the arc between two snapped circle points onto a canvas element.
 * Uses screen-space angles so the Y-axis flip is handled automatically.
 */
function drawArcOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  g: CircleGeom,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  color: AcCmColor,
  lineWidth = 4
) {
  const rect = view.canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  const origin = view.canvasToContainer({ x: 0, y: 0 })
  canvas.style.left = `${origin.x}px`
  canvas.style.top = `${origin.y}px`
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)

  const sc = view.worldToScreen({ x: g.cx, y: g.cy })
  const ss = view.worldToScreen(p1)
  const se = view.worldToScreen(p2)
  const screenR = Math.hypot(ss.x - sc.x, ss.y - sc.y)

  const sa = Math.atan2(ss.y - sc.y, ss.x - sc.x)
  const ea = Math.atan2(se.y - sc.y, se.x - sc.x)

  const norm = (a: number) =>
    ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const cwSpan = norm(ea - sa)
  const antiClockwise = cwSpan > Math.PI

  ctx.beginPath()
  ctx.arc(sc.x, sc.y, screenR, sa, ea, antiClockwise)
  ctx.strokeStyle = cssColor(color)
  ctx.lineWidth = lineWidth
  ctx.stroke()

  ctx.restore()
}

/**
 * Commit an arc-length measurement overlay (also used when importing a sidecar).
 */
export function placeArcMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  geom: { cx: number; cy: number; r: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  const color = style.color
  const arcLen = shortArcLength(start, end, geom)
  const mid = shortArcMid(start, end, geom)
  const id = options?.id ?? `arc-${Date.now()}`
  const layoutId = options?.layoutId ?? view.activeLayoutBtrId

  const persistOverlay = new AcTrHtmlCanvasOverlay({
    id: `arc-canvas-${id}`,
    container: view.container,
    layer: MEASUREMENT_LAYER,
    layoutId
  })
  const paintArc = (paintStyle = style) =>
    drawArcOnCanvas(
      persistOverlay.canvas,
      view,
      geom,
      start,
      end,
      paintStyle.color,
      measurementCanvasLineWidth(paintStyle.lineWeight)
    )
  paintArc()

  const redrawPersist = () => paintArc(getMeasurementStyle(id) ?? style)
  view.events.viewChanged.addEventListener(redrawPersist)

  const group = new AcTrHtmlGroup({
    id,
    layer: MEASUREMENT_LAYER,
    layoutId,
    selectable: true
  })
    .add(
      new AcTrHtmlDot({
        id: `${id}-dot1`,
        color,
        worldPosition: start,
        layer: MEASUREMENT_LAYER
      }),
      new AcTrHtmlDot({
        id: `${id}-dot2`,
        color,
        worldPosition: end,
        layer: MEASUREMENT_LAYER
      }),
      new AcTrHtmlBadge({
        id: `${id}-badge`,
        color,
        text: formatMeasurementLength(db, arcLen),
        worldPosition: mid,
        layer: MEASUREMENT_LAYER,
        fontSize: style.fontSize
      })
    )
    .addCanvas(persistOverlay)

  commitMeasurementGroup(view, group, {
    style,
    value: { kind: 'length', value: arcLen },
    snapshot: {
      id,
      type: 'arc',
      layoutId,
      style: serializeMeasurementStyle(style),
      geometry: {
        type: 'arc',
        center: { x: geom.cx, y: geom.cy },
        radius: geom.r,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y }
      }
    },
    redraw: paintArc,
    dispose: () => {
      view.events.viewChanged.removeEventListener(redrawPersist)
    }
  })
}

/**
 * Jig for the first point: shows a small square snap indicator when the
 * cursor hovers over a circle or arc entity. Notifies the caller via onSnap.
 */
class AcApArcSnapJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _dummy: AcDbLine
  private _ctx: AcApContext
  private _indicator: AcTrHtmlSnapIndicator
  private _htManager: AcTrHtmlTransientManager
  private readonly _indicatorId: string
  private _onSnap: (
    geom: CircleGeom | null,
    snapped: AcGePoint3dLike | null
  ) => void

  constructor(
    context: AcApContext,
    color: AcCmColor,
    onSnap: (geom: CircleGeom | null, snapped: AcGePoint3dLike | null) => void
  ) {
    super(context.view)
    this._ctx = context
    this._onSnap = onSnap

    const o = { x: 0, y: 0, z: 0 }
    this._dummy = new AcDbLine(o, o)

    this._indicatorId = `live-arc-snap-${Date.now()}`
    this._htManager = (context.view as AcTrView2d).htmlTransientManager
    this._indicator = new AcTrHtmlSnapIndicator({
      id: this._indicatorId,
      color,
      worldPosition: o,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (context.view as AcTrView2d).activeLayoutBtrId
    })
    this._indicator.object.visible = false
    this._htManager.add(this._indicator)
  }

  get entity(): AcDbLine {
    return this._dummy
  }

  update(p: AcGePoint3dLike) {
    const hits = this._ctx.view.pick(p)
    const modelSpace = this._ctx.doc.database.tables.blockTable.modelSpace

    // Collect all circle/arc candidates, then pick the one whose
    // circumference is closest to the cursor (fixes wrong-arc selection
    // when multiple arcs overlap in the pick area).
    let bestGeom: CircleGeom | null = null
    let bestDist = Number.MAX_VALUE

    for (const hit of hits) {
      const entity = modelSpace.getIdAt(hit.id)
      let geom: CircleGeom | null = null

      if (entity instanceof AcDbCircle) {
        geom = { cx: entity.center.x, cy: entity.center.y, r: entity.radius }
      } else if (entity instanceof AcDbArc) {
        geom = { cx: entity.center.x, cy: entity.center.y, r: entity.radius }
      }

      if (geom) {
        // Distance from cursor to circumference
        const distToCenter = Math.hypot(p.x - geom.cx, p.y - geom.cy)
        const distToCircumference = Math.abs(distToCenter - geom.r)

        if (distToCircumference < bestDist) {
          bestDist = distToCircumference
          bestGeom = geom
        }
      }
    }

    if (bestGeom) {
      // Only snap when cursor is close enough to the circumference in
      // screen space (20 px threshold) — prevents snapping from far away.
      const snapped = snapToCircle(p, bestGeom)
      const cursorScreen = this._ctx.view.worldToScreen(p)
      const snapScreen = this._ctx.view.worldToScreen(snapped)
      const screenDist = Math.hypot(
        cursorScreen.x - snapScreen.x,
        cursorScreen.y - snapScreen.y
      )

      if (screenDist <= 20) {
        this._indicator.setPosition(snapped)
        this._indicator.object.visible = true
        this._onSnap(bestGeom, snapped)
        return
      }
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
 * Jig for the second point: snaps cursor to the known circle, shows the
 * square snap indicator, and fires onMove with the already-snapped point.
 */
class AcApArcEndSnapJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _dummy: AcDbLine
  private _geom: CircleGeom
  private _indicator: AcTrHtmlSnapIndicator
  private _htManager: AcTrHtmlTransientManager
  private readonly _indicatorId: string
  private _onMove: (snapped: AcGePoint3dLike) => void

  constructor(
    view: AcEdBaseView,
    geom: CircleGeom,
    color: AcCmColor,
    onMove: (snapped: AcGePoint3dLike) => void
  ) {
    super(view)
    this._geom = geom
    this._onMove = onMove

    const o = { x: 0, y: 0, z: 0 }
    this._dummy = new AcDbLine(o, o)

    this._indicatorId = `live-arc-end-snap-${Date.now()}`
    this._htManager = (view as AcTrView2d).htmlTransientManager
    this._indicator = new AcTrHtmlSnapIndicator({
      id: this._indicatorId,
      color,
      worldPosition: o,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (view as AcTrView2d).activeLayoutBtrId
    })
    this._htManager.add(this._indicator)
  }

  get entity(): AcDbLine {
    return this._dummy
  }

  update(p: AcGePoint3dLike) {
    const snapped = snapToCircle(p, this._geom)
    this._indicator.setPosition(snapped)
    this._indicator.object.visible = true
    this._onMove(snapped)
  }

  end() {
    super.end()
    this._htManager.remove(this._indicatorId)
  }
}

/**
 * Command that measures the length of an arc on an existing circle or arc entity.
 *
 * Uses a two-phase pick flow that mirrors AutoCAD's arc-length measurement:
 *
 * 1. **Phase 1 — entity snap**: The user hovers over a circle or arc in the
 *    drawing. A square snap indicator appears on the circumference and the
 *    entity geometry is captured. Clicking confirms the start point.
 *
 * 2. **Phase 2 — end point**: The same square indicator follows the cursor,
 *    always locked to the captured circle. A canvas overlay draws the shorter
 *    arc between the start and current position in real time, together with a
 *    live badge showing the arc length.
 *
 * Persistent overlays are placed via {@link AcTrHtmlTransientManager} for dots
 * and badge. The arc canvas is managed with a viewChanged listener cleaned up
 * via {@link commitMeasurementGroup}.
 */
export class AcApMeasureArcCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = measurementColor(db)
    const style = currentMeasurementStyle(db)
    const canvasLineWidth = measurementCanvasLineWidth(style.lineWeight)

    // Construction-phase canvas — removed before this method returns
    const liveId = `live-arc-${Date.now()}`
    const arcOverlay = new AcTrHtmlCanvasOverlay({
      id: `${liveId}-canvas`,
      container: context.view.container,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (context.view as AcTrView2d).activeLayoutBtrId
    })
    const htManager = (context.view as AcTrView2d).htmlTransientManager
    htManager.add(arcOverlay)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        // ── Phase 1: snap to circle/arc entity ──────────────────────────────────
        let snapGeom: CircleGeom | null = null
        let snappedStart: AcGePoint3dLike | null = null

        const snapJig = new AcApArcSnapJig(context, color, (geom, snapped) => {
          snapGeom = geom
          snappedStart = snapped
        })

        const p1Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureArc.startPoint')
        )
        p1Prompt.jig = snapJig

        try {
          const p1Result = await editor.getPoint(p1Prompt)
          if (p1Result.status !== AcEdPromptStatus.OK) {
            htManager.remove(arcOverlay.id)
            return
          }
        } catch {
          htManager.remove(arcOverlay.id)
          return
        }

        if (!snapGeom || !snappedStart) {
          htManager.remove(arcOverlay.id)
          return
        }

        const geom = snapGeom
        const start = snappedStart

        // ── Phase 2: end point with live arc preview ─────────────────────────────
        // Start marker + length badge are short-lived CSS2D overlays
        const liveDotId = `${liveId}-dot1`
        const liveBadgeId = `${liveId}-badge`
        htManager.add(
          new AcTrHtmlDot({
            id: liveDotId,
            color,
            worldPosition: start,
            layer: MEASUREMENT_LIVE_LAYER,
            layoutId: (context.view as AcTrView2d).activeLayoutBtrId
          })
        )
        const liveBadge = new AcTrHtmlBadge({
          id: liveBadgeId,
          color,
          worldPosition: start,
          layer: MEASUREMENT_LIVE_LAYER,
          layoutId: (context.view as AcTrView2d).activeLayoutBtrId,
          fontSize: style.fontSize
        })
        liveBadge.object.visible = false
        htManager.add(liveBadge)

        const redrawPreview = () =>
          drawArcOnCanvas(
            arcOverlay.canvas,
            context.view,
            geom,
            start,
            start,
            color,
            canvasLineWidth
          )
        const onViewChangedPreview = () => redrawPreview()
        context.view.events.viewChanged.addEventListener(onViewChangedPreview)

        const cleanupLivePreview = () => {
          htManager.remove(liveDotId)
          htManager.remove(liveBadgeId)
          htManager.remove(arcOverlay.id)
          context.view.events.viewChanged.removeEventListener(
            onViewChangedPreview
          )
        }

        const onMove = (snapped: AcGePoint3dLike) => {
          drawArcOnCanvas(
            arcOverlay.canvas,
            context.view,
            geom,
            start,
            snapped,
            color,
            canvasLineWidth
          )

          const len = shortArcLength(start, snapped, geom)
          liveBadge.setText(formatMeasurementLength(db, len))
          liveBadge.setPosition(shortArcMid(start, snapped, geom))
          liveBadge.object.visible = true
        }

        const p2Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureArc.endPoint')
        )
        p2Prompt.jig = new AcApArcEndSnapJig(context.view, geom, color, onMove)

        let p2Raw: AcGePoint3dLike
        try {
          const p2Result = await editor.getPoint(p2Prompt)
          if (p2Result.status !== AcEdPromptStatus.OK) {
            cleanupLivePreview()
            return
          }
          p2Raw = p2Result.value!
        } catch {
          cleanupLivePreview()
          return
        }

        // Clean up construction-phase elements
        cleanupLivePreview()

        const end = snapToCircle(p2Raw, geom)
        placeArcMeasurement(
          context.view as AcTrView2d,
          db,
          geom,
          start,
          end,
          currentMeasurementStyle(db)
        )
      })
    )
  }
}
