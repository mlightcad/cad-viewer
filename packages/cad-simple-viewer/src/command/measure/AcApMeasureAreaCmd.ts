import { AcCmColor, AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcTrHtmlBadge, AcTrHtmlCanvasOverlay } from '@mlightcad/three-renderer'

import { AcApContext } from '../../app'
import {
  AcEdBaseView,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapColorToCssAlpha,
  acapCssColor,
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementColor,
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementArea
} from '../../util'
import { AcTrView2d } from '../../view'
import {
  acapOverlayDash,
  acapScaledOverlayLineWidth,
  acapSyncLiveOverlayTextHeight
} from '../overlay/AcApOverlayDrawUtil'
import { AcApMeasureDrawCmd } from './AcApMeasureDrawCmd'
import { MEASUREMENT_LIVE_LAYER } from './AcApMeasurementStore'
import { AcApMeasureAreaEntity } from './entity'

/**
 * Rubber-band jig: fires onMove on each cursor update so the command can
 * redraw the live polygon fill / outline (HTML-only — no CAD transient).
 */
class AcApMeasureAreaJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _onMove: (p: AcGePoint3dLike) => void

  constructor(
    view: AcEdBaseView,
    _from: AcGePoint3dLike,
    _color: AcCmColor,
    onMove: (p: AcGePoint3dLike) => void
  ) {
    super(view)
    this._onMove = onMove
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: AcGePoint3dLike) {
    this._onMove(p)
  }
}

/**
 * Returns true when segment (p1→p2) properly crosses segment (p3→p4).
 * Endpoint-touches are intentionally excluded so adjacent edges never trigger.
 */
function segmentsIntersect(
  p1: AcGePoint3dLike,
  p2: AcGePoint3dLike,
  p3: AcGePoint3dLike,
  p4: AcGePoint3dLike
): boolean {
  const d1x = p2.x - p1.x,
    d1y = p2.y - p1.y
  const d2x = p4.x - p3.x,
    d2y = p4.y - p3.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return false // parallel
  const dx = p3.x - p1.x,
    dy = p3.y - p1.y
  const t = (dx * d2y - dy * d2x) / denom
  const u = (dx * d1y - dy * d1x) / denom
  return t > 0 && t < 1 && u > 0 && u < 1
}

/** Computes the area of a polygon using the shoelace (Gauss) formula. */
function shoelaceArea(pts: AcGePoint3dLike[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  return Math.abs(area) / 2
}

/** Returns the arithmetic centroid of a set of world points. */
function centroid(pts: AcGePoint3dLike[]): { x: number; y: number } {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x, y }
}

/**
 * Commit an area measurement overlay (also used when importing a sidecar).
 */
export function placeAreaMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  points: AcGePoint3dLike[],
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  if (points.length < 3) return
  AcApMeasureAreaEntity.create(points, style, options).commit(view, db)
}

/**
 * Command that measures the area of a polygon drawn by the user.
 *
 * The user clicks successive vertices; after each click the canvas overlay
 * updates with a semi-transparent blue fill and a dashed outline. The polygon
 * auto-closes when the user clicks near the first vertex (14 px threshold),
 * clicks near the last vertex, or draws a segment that crosses an existing
 * edge — matching AutoCAD's area measurement behaviour. Pressing ESC/Enter
 * also finalises the polygon.
 *
 * Persistent overlays are placed via {@link AcTrHtmlTransientManager} for dots
 * and badge. The filled area canvas is managed with a viewChanged listener
 * cleaned up via {@link commitMeasurementGroup}.
 */
export class AcApMeasureAreaCmd extends AcApMeasureDrawCmd {
  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)
    const style = acapGetCurrentMeasurementStyle(db)
    const canvasLineWidth = acapMeasurementCanvasLineWidth(style.lineWeight)

    const points: AcGePoint3dLike[] = []

    // Construction-phase canvas overlay — removed before this method returns
    const fillOverlay = new AcTrHtmlCanvasOverlay({
      id: `live-area-canvas-${Date.now()}`,
      container: context.view.container,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (context.view as AcTrView2d).activeLayoutBtrId
    })
    const fillCanvas = fillOverlay.canvas

    // Live area badge shown while the jig is active — also removed before returning
    const htManagerLive = (context.view as AcTrView2d).htmlTransientManager
    htManagerLive.add(fillOverlay)
    const liveBadgeId = `live-area-badge-${Date.now()}`
    const liveBadge = new AcTrHtmlBadge({
      id: liveBadgeId,
      color,
      worldPosition: { x: 0, y: 0 },
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (context.view as AcTrView2d).activeLayoutBtrId,
      fontSize: style.fontSize
    })
    htManagerLive.add(liveBadge)
    acapSyncLiveOverlayTextHeight(context.view, [liveBadge], style)
    liveBadge.object.visible = false

    const drawPolygon = (cursor?: AcGePoint3dLike) => {
      const rect = context.view.canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)

      const origin = context.view.canvasToContainer({ x: 0, y: 0 })
      fillCanvas.style.left = `${origin.x}px`
      fillCanvas.style.top = `${origin.y}px`
      fillCanvas.style.width = `${w}px`
      fillCanvas.style.height = `${h}px`

      if (fillCanvas.width !== w * dpr || fillCanvas.height !== h * dpr) {
        fillCanvas.width = w * dpr
        fillCanvas.height = h * dpr
      }

      const ctx = fillCanvas.getContext('2d')
      if (!ctx || points.length < 1) return

      ctx.clearRect(0, 0, fillCanvas.width, fillCanvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      const confirmedSpts = points.map(p => context.view.worldToScreen(p))
      const fillSpts = cursor
        ? [...confirmedSpts, context.view.worldToScreen(cursor)]
        : confirmedSpts

      if (fillSpts.length >= 3) {
        ctx.beginPath()
        ctx.moveTo(fillSpts[0].x, fillSpts[0].y)
        for (let i = 1; i < fillSpts.length; i++)
          ctx.lineTo(fillSpts[i].x, fillSpts[i].y)
        ctx.closePath()
        ctx.fillStyle = acapColorToCssAlpha(color, 0.2)
        ctx.fill()
      }

      if (confirmedSpts.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(confirmedSpts[0].x, confirmedSpts[0].y)
        for (let i = 1; i < confirmedSpts.length; i++)
          ctx.lineTo(confirmedSpts[i].x, confirmedSpts[i].y)
        ctx.strokeStyle = acapCssColor(color)
        const strokeWidth = acapScaledOverlayLineWidth(
          canvasLineWidth,
          fillCanvas,
          context.view
        )
        ctx.lineWidth = strokeWidth
        ctx.setLineDash(acapOverlayDash(strokeWidth, canvasLineWidth))
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Rubber-band from last confirmed vertex to cursor (solid)
      if (cursor && confirmedSpts.length >= 1) {
        const last = confirmedSpts[confirmedSpts.length - 1]
        const sc = context.view.worldToScreen(cursor)
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(sc.x, sc.y)
        ctx.strokeStyle = acapCssColor(color)
        ctx.lineWidth = acapScaledOverlayLineWidth(
          canvasLineWidth,
          fillCanvas,
          context.view
        )
        ctx.stroke()
      }

      ctx.restore()
    }

    const redrawOnViewChange = () => drawPolygon()
    context.view.events.viewChanged.addEventListener(redrawOnViewChange)

    const cleanupLive = () => {
      htManagerLive.remove(liveBadgeId)
      htManagerLive.remove(fillOverlay.id)
      context.view.events.viewChanged.removeEventListener(redrawOnViewChange)
    }

    try {
      await this.withMeasureInput(context, async () => {
        const p1Result = await editor.getPoint(
          new AcEdPromptPointOptions(AcApI18n.t('jig.measureArea.firstPoint'))
        )
        if (p1Result.status !== AcEdPromptStatus.OK) return
        const p1 = p1Result.value!
        points.push(p1)
        drawPolygon()

        try {
          while (points.length < 50) {
            const prompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.measureArea.nextPoint')
            )
            prompt.useBasePoint = true
            // Allow the user to press Enter (without typing coordinates) to
            // finish picking vertices and close the area polygon.
            prompt.allowNone = true

            const onMove = (cursor: AcGePoint3dLike) => {
              if (points.length < 2) {
                // Still stroke rubber-band from first point while picking 2nd
                drawPolygon(cursor)
                return
              }
              const tempPts = [...points, cursor]
              const area = shoelaceArea(tempPts)
              const liveStyle = acapGetCurrentMeasurementStyle(db)
              liveBadge.setFontSize(liveStyle.fontSize)
              acapSyncLiveOverlayTextHeight(context.view, [liveBadge], liveStyle)
              liveBadge.setText(formatMeasurementArea(db, area))
              liveBadge.setPosition(centroid(tempPts))
              liveBadge.object.visible = true
              drawPolygon(cursor)
            }

            prompt.jig = new AcApMeasureAreaJig(
              context.view,
              points[points.length - 1],
              color,
              onMove
            )

            const pResult = await editor.getPoint(prompt)
            if (pResult.status !== AcEdPromptStatus.OK) break
            const p = pResult.value!
            liveBadge.object.visible = false

            if (points.length >= 3) {
              const sp = context.view.worldToScreen(p)
              const snap = (anchor: AcGePoint3dLike) => {
                const sa = context.view.worldToScreen(anchor)
                const dx = sp.x - sa.x
                const dy = sp.y - sa.y
                return dx * dx + dy * dy <= 14 * 14
              }
              if (snap(points[0]) || snap(points[points.length - 1])) break
            }

            if (points.length >= 3) {
              const last = points[points.length - 1]
              let crosses = false
              for (let i = 0; i < points.length - 2; i++) {
                if (segmentsIntersect(last, p, points[i], points[i + 1])) {
                  crosses = true
                  break
                }
              }
              if (crosses) break
            }

            points.push(p)
            drawPolygon()
          }
        } catch {
          // user pressed Enter/ESC to finish
        }
      })
    } finally {
      cleanupLive()
    }

    if (points.length < 3) return

    placeAreaMeasurement(
      context.view as AcTrView2d,
      db,
      points,
      acapGetCurrentMeasurementStyle(db)
    )
  }
}
