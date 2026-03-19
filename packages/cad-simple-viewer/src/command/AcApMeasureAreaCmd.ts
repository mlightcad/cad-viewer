import {
  AcCmColor,
  AcDbLine,
  AcGePoint3dLike,
  AcGiLineWeight
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
  colorToCss,
  colorToCssAlpha,
  makeBadge,
  makeDot,
  measurementColor
} from '../util'
import { registerMeasurementCleanup } from './AcApClearMeasurementsCmd'

/**
 * Rubber-band jig: shows a preview line from the last confirmed
 * vertex to the current cursor position and fires onMove on each update.
 */
class AcApMeasureAreaJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine
  private _onMove: (p: AcGePoint3dLike) => void

  constructor(
    view: AcEdBaseView,
    from: AcGePoint3dLike,
    color: AcCmColor,
    onMove: (p: AcGePoint3dLike) => void
  ) {
    super(view)
    this._line = new AcDbLine(from, from)
    this._line.color = color
    this._line.lineWeight = AcGiLineWeight.LineWeight070
    this._onMove = onMove
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p: AcGePoint3dLike) {
    this._line.endPoint = p
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

/** Draws a filled polygon on a full-viewport canvas overlay. */
function drawAreaOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  points: AcGePoint3dLike[],
  color: AcCmColor
): void {
  const rect = view.canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  canvas.style.left = `${rect.left}px`
  canvas.style.top = `${rect.top}px`
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx || points.length < 3) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)

  const spts = points.map(p => view.worldToScreen(p))

  ctx.beginPath()
  ctx.moveTo(spts[0].x, spts[0].y)
  for (let i = 1; i < spts.length; i++) ctx.lineTo(spts[i].x, spts[i].y)
  ctx.closePath()
  ctx.fillStyle = colorToCssAlpha(color, 0.2)
  ctx.fill()
  ctx.strokeStyle = colorToCss(color)
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.restore()
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
 * cleaned up via {@link registerMeasurementCleanup}.
 */
export class AcApMeasureAreaCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const color = measurementColor(context.doc.database)
    const points: AcGePoint3dLike[] = []

    // Construction-phase canvas overlay — removed before this method returns
    const fillCanvas = document.createElement('canvas')
    fillCanvas.style.cssText =
      'position:fixed;pointer-events:none;z-index:99997;'
    document.body.appendChild(fillCanvas)

    // Live area badge shown while the jig is active — also removed before returning
    const liveBadge = document.createElement('div')
    liveBadge.style.cssText =
      `position:fixed;background:rgba(255,255,255,0.95);color:${colorToCss(color)};` +
      'font-size:13px;font-family:sans-serif;font-weight:500;' +
      'padding:3px 14px;border-radius:20px;pointer-events:none;' +
      'transform:translate(-50%,-50%);white-space:nowrap;' +
      'box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:99999;display:none;'
    document.body.appendChild(liveBadge)

    const drawPolygon = (cursor?: AcGePoint3dLike) => {
      const rect = context.view.canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)

      fillCanvas.style.left = `${rect.left}px`
      fillCanvas.style.top = `${rect.top}px`
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
        ctx.fillStyle = colorToCssAlpha(color, 0.2)
        ctx.fill()
      }

      if (confirmedSpts.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(confirmedSpts[0].x, confirmedSpts[0].y)
        for (let i = 1; i < confirmedSpts.length; i++)
          ctx.lineTo(confirmedSpts[i].x, confirmedSpts[i].y)
        ctx.strokeStyle = colorToCss(color)
        ctx.lineWidth = 2.5
        ctx.setLineDash([8, 5])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    }

    const redrawOnViewChange = () => drawPolygon()
    context.view.events.viewChanged.addEventListener(redrawOnViewChange)

    const p1 = await editor.getPoint(
      new AcEdPromptPointOptions(AcApI18n.t('jig.measureArea.firstPoint'))
    )
    points.push(p1)
    drawPolygon()

    try {
      while (points.length < 50) {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureArea.nextPoint')
        )
        prompt.useBasePoint = true

        const onMove = (cursor: AcGePoint3dLike) => {
          if (points.length < 2) return
          const tempPts = [...points, cursor]
          const area = shoelaceArea(tempPts)
          liveBadge.textContent = `~ ${area.toFixed(3)} m²`
          liveBadge.style.display = ''
          const mid = centroid(tempPts)
          const rect = context.view.canvas.getBoundingClientRect()
          const sc = context.view.worldToScreen(mid)
          liveBadge.style.left = `${sc.x + rect.left}px`
          liveBadge.style.top = `${sc.y + rect.top}px`
          drawPolygon(cursor)
        }

        prompt.jig = new AcApMeasureAreaJig(
          context.view,
          points[points.length - 1],
          color,
          onMove
        )

        const p = await editor.getPoint(prompt)
        liveBadge.style.display = 'none'

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

    // Clean up construction-phase elements
    liveBadge.remove()
    context.view.events.viewChanged.removeEventListener(redrawOnViewChange)
    fillCanvas.remove()

    if (points.length < 3) return

    const area = shoelaceArea(points)

    // Persistent fill canvas — redrawn on viewChanged, cleaned up by Clear
    const persistCanvas = document.createElement('canvas')
    persistCanvas.style.cssText =
      'position:fixed;pointer-events:none;z-index:99997;'
    document.body.appendChild(persistCanvas)
    drawAreaOnCanvas(persistCanvas, context.view, points, color)

    const redrawPersist = () =>
      drawAreaOnCanvas(persistCanvas, context.view, points, color)
    context.view.events.viewChanged.addEventListener(redrawPersist)

    // Persistent badge + dots via htmlTransientManager
    const htManager = AcApDocManager.instance.curView.htmlTransientManager
    const id = `area-${Date.now()}`
    const mid = centroid(points)

    htManager.add(
      `${id}-badge`,
      makeBadge(color, `~ ${area.toFixed(3)} m²`),
      mid,
      'measurement'
    )
    points.forEach((p, i) => {
      htManager.add(`${id}-dot${i}`, makeDot(color), p, 'measurement')
    })

    registerMeasurementCleanup(() => {
      persistCanvas.remove()
      context.view.events.viewChanged.removeEventListener(redrawPersist)
      htManager.remove(`${id}-badge`)
      points.forEach((_, i) => {
        htManager.remove(`${id}-dot${i}`)
      })
    })
  }
}
