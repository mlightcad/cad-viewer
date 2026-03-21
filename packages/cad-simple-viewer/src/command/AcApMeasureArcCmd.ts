import {
  AcCmColor,
  AcDbArc,
  AcDbCircle,
  AcDbLine,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'
import {
  cssColor,
  makeBadge,
  makeDot,
  makeLiveBadge,
  makeLiveDot,
  makeOverlayCanvas,
  makeSnapIndicator,
  measurementColor
} from '../util'
import { AcTrView2d } from '../view'
import { registerMeasurementCleanup } from './AcApClearMeasurementsCmd'

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
  color: AcCmColor
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
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.restore()
}

/**
 * Jig for the first point: shows a small square snap indicator when the
 * cursor hovers over a circle or arc entity. Notifies the caller via onSnap.
 */
class AcApArcSnapJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _dummy: AcDbLine
  private _indicator: HTMLDivElement
  private _ctx: AcApContext
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

    this._indicator = makeSnapIndicator(color)
  }

  get entity(): AcDbLine {
    return this._dummy
  }

  update(p: AcGePoint3dLike) {
    const hits = this._ctx.view.pick(p)
    const modelSpace = this._ctx.doc.database.tables.blockTable.modelSpace

    for (const hit of hits) {
      const entity = modelSpace.getIdAt(hit.id)
      let geom: CircleGeom | null = null

      if (entity instanceof AcDbCircle) {
        geom = { cx: entity.center.x, cy: entity.center.y, r: entity.radius }
      } else if (entity instanceof AcDbArc) {
        geom = { cx: entity.center.x, cy: entity.center.y, r: entity.radius }
      }

      if (geom) {
        const snapped = snapToCircle(p, geom)
        const rect = this._ctx.view.canvas.getBoundingClientRect()
        const sp = this._ctx.view.worldToScreen(snapped)
        this._indicator.style.left = `${sp.x + rect.left}px`
        this._indicator.style.top = `${sp.y + rect.top}px`
        this._indicator.style.display = 'block'
        this._onSnap(geom, snapped)
        return
      }
    }

    this._indicator.style.display = 'none'
    this._onSnap(null, null)
  }

  end() {
    super.end()
    this._indicator.remove()
  }
}

/**
 * Jig for the second point: snaps cursor to the known circle, shows the
 * square snap indicator, and fires onMove with the already-snapped point.
 */
class AcApArcEndSnapJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _dummy: AcDbLine
  private _indicator: HTMLDivElement
  private _ctx: AcApContext
  private _geom: CircleGeom
  private _onMove: (snapped: AcGePoint3dLike) => void

  constructor(
    context: AcApContext,
    geom: CircleGeom,
    color: AcCmColor,
    onMove: (snapped: AcGePoint3dLike) => void
  ) {
    super(context.view)
    this._ctx = context
    this._geom = geom
    this._onMove = onMove

    const o = { x: 0, y: 0, z: 0 }
    this._dummy = new AcDbLine(o, o)

    this._indicator = makeSnapIndicator(color)
    this._indicator.style.display = 'block'
  }

  get entity(): AcDbLine {
    return this._dummy
  }

  update(p: AcGePoint3dLike) {
    const snapped = snapToCircle(p, this._geom)
    const rect = this._ctx.view.canvas.getBoundingClientRect()
    const sp = this._ctx.view.worldToScreen(snapped)
    this._indicator.style.left = `${sp.x + rect.left}px`
    this._indicator.style.top = `${sp.y + rect.top}px`
    this._onMove(snapped)
  }

  end() {
    super.end()
    this._indicator.remove()
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
 * via {@link registerMeasurementCleanup}.
 */
export class AcApMeasureArcCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const color = measurementColor(context.doc.database)

    // Construction-phase canvas — removed before this method returns
    const arcCanvas = makeOverlayCanvas(context.view.container)

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
      await editor.getPoint(p1Prompt)
    } catch {
      arcCanvas.remove()
      return
    }

    if (!snapGeom || !snappedStart) {
      arcCanvas.remove()
      return
    }

    const geom = snapGeom
    const start = snappedStart

    // ── Phase 2: end point with live arc preview ─────────────────────────────
    // dot1 and liveBadge are short-lived during construction
    const dot1 = makeLiveDot(color)
    const liveBadge = makeLiveBadge(color)

    const reposDot1 = () => {
      const rect = context.view.canvas.getBoundingClientRect()
      const sp = context.view.worldToScreen(start)
      dot1.style.left = `${sp.x + rect.left}px`
      dot1.style.top = `${sp.y + rect.top}px`
    }
    reposDot1()

    const redrawPreview = () =>
      drawArcOnCanvas(arcCanvas, context.view, geom, start, start, color)
    const onViewChangedPreview = () => {
      reposDot1()
      redrawPreview()
    }
    context.view.events.viewChanged.addEventListener(onViewChangedPreview)

    const onMove = (snapped: AcGePoint3dLike) => {
      drawArcOnCanvas(arcCanvas, context.view, geom, start, snapped, color)

      const len = shortArcLength(start, snapped, geom)
      liveBadge.textContent = `~ ${len.toFixed(4)} m`
      liveBadge.style.display = ''

      const mid = shortArcMid(start, snapped, geom)
      const rect = context.view.canvas.getBoundingClientRect()
      const sm = context.view.worldToScreen(mid)
      liveBadge.style.left = `${sm.x + rect.left}px`
      liveBadge.style.top = `${sm.y + rect.top}px`

      reposDot1()
    }

    const p2Prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureArc.endPoint')
    )
    p2Prompt.jig = new AcApArcEndSnapJig(context, geom, color, onMove)

    let p2Raw: AcGePoint3dLike
    try {
      p2Raw = await editor.getPoint(p2Prompt)
    } catch {
      arcCanvas.remove()
      dot1.remove()
      liveBadge.remove()
      context.view.events.viewChanged.removeEventListener(onViewChangedPreview)
      return
    }

    // Clean up construction-phase elements
    liveBadge.remove()
    dot1.remove()
    context.view.events.viewChanged.removeEventListener(onViewChangedPreview)
    arcCanvas.remove()

    const end = snapToCircle(p2Raw, geom)
    const arcLen = shortArcLength(start, end, geom)
    const mid = shortArcMid(start, end, geom)

    // Persistent arc canvas — redrawn on viewChanged, cleaned up by Clear
    const persistCanvas = makeOverlayCanvas(context.view.container)
    drawArcOnCanvas(persistCanvas, context.view, geom, start, end, color)

    const redrawPersist = () =>
      drawArcOnCanvas(persistCanvas, context.view, geom, start, end, color)
    context.view.events.viewChanged.addEventListener(redrawPersist)

    // Persistent badge + dots via htmlTransientManager
    const htManager = (context.view as AcTrView2d).htmlTransientManager
    const id = `arc-${Date.now()}`

    htManager.add(`${id}-dot1`, makeDot(color), start, 'measurement')
    htManager.add(`${id}-dot2`, makeDot(color), end, 'measurement')
    htManager.add(
      `${id}-badge`,
      makeBadge(color, `~ ${arcLen.toFixed(4)} m`),
      mid,
      'measurement'
    )

    registerMeasurementCleanup(() => {
      persistCanvas.remove()
      context.view.events.viewChanged.removeEventListener(redrawPersist)
      htManager.remove(`${id}-dot1`)
      htManager.remove(`${id}-dot2`)
      htManager.remove(`${id}-badge`)
    })
  }
}
