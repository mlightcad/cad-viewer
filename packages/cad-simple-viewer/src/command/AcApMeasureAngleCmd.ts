import {
  AcCmColor,
  AcDbLine,
  AcGePoint3dLike,
  AcGiLineWeight
} from '@mlightcad/data-model'

import { AcApContext } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdCorsorType,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdViewMode
} from '../editor'
import { AcApI18n } from '../i18n'
import {
  cssColor,
  makeBadge,
  makeDot,
  makeLiveBadge,
  makeOverlayCanvas,
  measurementColor
} from '../util'
import { AcTrView2d } from '../view'
import { registerMeasurementCleanup } from './AcApClearMeasurementsCmd'

/** Returns the angle in degrees between two arms sharing a common vertex. */
function calcAngleDeg(
  vertex: AcGePoint3dLike,
  arm1: AcGePoint3dLike,
  arm2: AcGePoint3dLike
): number {
  const dx1 = arm1.x - vertex.x
  const dy1 = arm1.y - vertex.y
  const dx2 = arm2.x - vertex.x
  const dy2 = arm2.y - vertex.y
  const dot = dx1 * dx2 + dy1 * dy2
  const cross = dx1 * dy2 - dy1 * dx2
  const rad = Math.atan2(Math.abs(cross), dot)
  return (rad * 180) / Math.PI
}

/** Normalises an angle into [0, 2pi). */
const normaliseAngle = (a: number) =>
  ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

/**
 * Draws the first arm (vertex->arm1) as a dashed line on a canvas overlay,
 * used during second arm selection so the user can see the first arm.
 */
function drawArm1OnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  vertex: AcGePoint3dLike,
  arm1: AcGePoint3dLike,
  color: AcCmColor
): void {
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

  const sv = view.worldToScreen(vertex)
  const sa = view.worldToScreen(arm1)

  ctx.beginPath()
  ctx.moveTo(sv.x, sv.y)
  ctx.lineTo(sa.x, sa.y)
  ctx.strokeStyle = cssColor(color)
  ctx.lineWidth = 2
  ctx.setLineDash([8, 5])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

/**
 * Draws an arc between two arms on a canvas overlay for the persistent
 * angle visualization.
 */
function drawAngleArcOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  vertex: AcGePoint3dLike,
  arm1: AcGePoint3dLike,
  arm2: AcGePoint3dLike,
  color: AcCmColor
): void {
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

  const sv = view.worldToScreen(vertex)
  const sa1 = view.worldToScreen(arm1)
  const sa2 = view.worldToScreen(arm2)

  const len1 = Math.hypot(sa1.x - sv.x, sa1.y - sv.y)
  const len2 = Math.hypot(sa2.x - sv.x, sa2.y - sv.y)
  const arcR = Math.max(Math.min(len1, len2) * 0.3, 15)

  const startAngle = Math.atan2(sa1.y - sv.y, sa1.x - sv.x)
  const endAngle = Math.atan2(sa2.y - sv.y, sa2.x - sv.x)
  const antiClockwise = normaliseAngle(endAngle - startAngle) > Math.PI

  ctx.beginPath()
  ctx.arc(sv.x, sv.y, arcR, startAngle, endAngle, antiClockwise)
  ctx.strokeStyle = cssColor(color)
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

/**
 * Simple rubber-band jig for picking arm1: draws a transient line
 * from vertex to cursor.
 */
class AcApMeasureArm1Jig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine

  constructor(view: AcEdBaseView, vertex: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._line = new AcDbLine(vertex, vertex)
    this._line.color = color
    this._line.lineWeight = AcGiLineWeight.LineWeight070
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p: AcGePoint3dLike) {
    this._line.endPoint = p
  }
}

/**
 * Preview jig for picking arm2: draws a transient line from vertex to
 * cursor, redraws the first arm as a dashed canvas line, and shows a live
 * angle badge.
 */
class AcApMeasureAngleJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine
  private _vertex: AcGePoint3dLike
  private _arm1: AcGePoint3dLike
  private _view: AcEdBaseView
  private _badge: HTMLDivElement
  private _canvas: HTMLCanvasElement
  private _color: AcCmColor

  constructor(
    view: AcEdBaseView,
    vertex: AcGePoint3dLike,
    arm1: AcGePoint3dLike,
    canvas: HTMLCanvasElement,
    color: AcCmColor
  ) {
    super(view)
    this._vertex = vertex
    this._arm1 = arm1
    this._view = view
    this._canvas = canvas
    this._color = color
    this._line = new AcDbLine(vertex, vertex)
    this._line.color = color
    this._line.lineWeight = AcGiLineWeight.LineWeight070

    this._badge = makeLiveBadge(color)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p: AcGePoint3dLike) {
    this._line.endPoint = p

    // Redraw the first arm dashed line (stays in sync with pan/zoom)
    drawArm1OnCanvas(
      this._canvas,
      this._view,
      this._vertex,
      this._arm1,
      this._color
    )

    const deg = calcAngleDeg(this._vertex, this._arm1, p)
    this._badge.textContent = `~ ${deg.toFixed(2)}\u00B0`
    this._badge.style.display = 'block'

    const rect = this._view.canvas.getBoundingClientRect()
    const sv = this._view.worldToScreen(this._vertex)
    this._badge.style.left = `${sv.x + rect.left}px`
    this._badge.style.top = `${sv.y + rect.top - 30}px`
  }

  end() {
    super.end()
    this._badge.remove()
  }
}

/**
 * Command that measures the angle between two arms sharing a common vertex.
 *
 * Prompts the user to pick three world points: the vertex, a point on the
 * first arm, and a point on the second arm. After the second arm is confirmed,
 * transient CAD lines are added for both arms and persistent DOM overlays
 * (arc canvas + dots + badge) are placed via {@link AcTrHtmlTransientManager}.
 */
export class AcApMeasureAngleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = context.view.editor
    const color = measurementColor(context.doc.database)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        // Pick vertex
        const vertexPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureAngle.vertex')
        )
        const vertex = await editor.getPoint(vertexPrompt)

        // Pick first arm endpoint (jig provides preview line from vertex)
        const arm1Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureAngle.arm1')
        )
        arm1Prompt.useBasePoint = true
        arm1Prompt.jig = new AcApMeasureArm1Jig(context.view, vertex, color)
        const arm1 = await editor.getPoint(arm1Prompt)

        // Construction-phase canvas for the first arm dashed line
        const armCanvas = makeOverlayCanvas(context.view.container)
        drawArm1OnCanvas(armCanvas, context.view, vertex, arm1, color)

        const redrawOnViewChange = () =>
          drawArm1OnCanvas(armCanvas, context.view, vertex, arm1, color)
        context.view.events.viewChanged.addEventListener(redrawOnViewChange)

        // Pick second arm endpoint with live preview (jig provides line + angle badge)
        const arm2Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureAngle.arm2')
        )
        arm2Prompt.jig = new AcApMeasureAngleJig(
          context.view,
          vertex,
          arm1,
          armCanvas,
          color
        )

        let arm2: AcGePoint3dLike
        try {
          arm2 = await editor.getPoint(arm2Prompt)
        } catch {
          // User pressed ESC / cancelled — clean up construction-phase DOM
          context.view.events.viewChanged.removeEventListener(
            redrawOnViewChange
          )
          armCanvas.remove()
          return
        }

        // Clean up construction-phase canvas
        context.view.events.viewChanged.removeEventListener(redrawOnViewChange)
        armCanvas.remove()

        const degrees = calcAngleDeg(vertex, arm1, arm2)

        // Persistent CAD transient lines for both arms (zoom/pan aware)
        const line1 = new AcDbLine(vertex, arm1)
        line1.color = color
        line1.lineWeight = AcGiLineWeight.LineWeight070
        context.view.addTransientEntity(line1)

        const line2 = new AcDbLine(vertex, arm2)
        line2.color = color
        line2.lineWeight = AcGiLineWeight.LineWeight070
        context.view.addTransientEntity(line2)

        // Persistent arc canvas — redrawn on viewChanged, cleaned up by Clear
        const persistCanvas = makeOverlayCanvas(context.view.container)
        drawAngleArcOnCanvas(
          persistCanvas,
          context.view,
          vertex,
          arm1,
          arm2,
          color
        )

        const redrawPersist = () =>
          drawAngleArcOnCanvas(
            persistCanvas,
            context.view,
            vertex,
            arm1,
            arm2,
            color
          )
        context.view.events.viewChanged.addEventListener(redrawPersist)

        // Persistent overlays via htmlTransientManager (auto-positioned by CSS2DRenderer)
        const htManager = (context.view as AcTrView2d).htmlTransientManager
        const id = `angle-${Date.now()}`

        htManager.add(`${id}-dotV`, makeDot(color), vertex, 'measurement')
        htManager.add(`${id}-dot1`, makeDot(color), arm1, 'measurement')
        htManager.add(`${id}-dot2`, makeDot(color), arm2, 'measurement')

        // Place badge along the angle bisector in world space
        const dx1 = arm1.x - vertex.x
        const dy1 = arm1.y - vertex.y
        const dx2 = arm2.x - vertex.x
        const dy2 = arm2.y - vertex.y
        const wLen1 = Math.hypot(dx1, dy1)
        const wLen2 = Math.hypot(dx2, dy2)
        // Unit vectors along each arm
        const u1x = wLen1 > 0 ? dx1 / wLen1 : 1
        const u1y = wLen1 > 0 ? dy1 / wLen1 : 0
        const u2x = wLen2 > 0 ? dx2 / wLen2 : 1
        const u2y = wLen2 > 0 ? dy2 / wLen2 : 0
        // Bisector direction (sum of unit vectors)
        let bx = u1x + u2x
        let by = u1y + u2y
        const bLen = Math.hypot(bx, by)
        if (bLen > 0) {
          bx /= bLen
          by /= bLen
        } else {
          // Arms are exactly opposite — use perpendicular
          bx = -u1y
          by = u1x
        }
        const badgeOffset = Math.max(
          Math.min(wLen1, wLen2) * 0.4,
          Math.max(wLen1, wLen2) * 0.15
        )
        const badgeWorld = {
          x: vertex.x + bx * badgeOffset,
          y: vertex.y + by * badgeOffset
        }
        htManager.add(
          `${id}-badge`,
          makeBadge(color, `${degrees.toFixed(2)}\u00B0`),
          badgeWorld,
          'measurement'
        )

        registerMeasurementCleanup(() => {
          context.view.removeTransientEntity(line1.objectId)
          context.view.removeTransientEntity(line2.objectId)
          persistCanvas.remove()
          context.view.events.viewChanged.removeEventListener(redrawPersist)
          htManager.remove(`${id}-dotV`)
          htManager.remove(`${id}-dot1`)
          htManager.remove(`${id}-dot2`)
          htManager.remove(`${id}-badge`)
        })
      })
    )
  }
}
