import { AcDbLine, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { eventBus } from '../editor/global/eventBus'
import { AcApI18n } from '../i18n'
import { createMeasurementLine, MEASUREMENT_CANVAS_LINE_WIDTH, MEASUREMENT_COLOR, prepareCanvasOverlay } from '../util'
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

/**
 * Draws the first arm (vertex→arm1) as a dashed blue line on a canvas overlay,
 * matching the area measurement's confirmed-edge style.
 */
function drawArm1OnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  vertex: AcGePoint3dLike,
  arm1: AcGePoint3dLike
): void {
  const ctx = prepareCanvasOverlay(canvas, view.canvas)
  if (!ctx) return

  const sv = view.worldToScreen(vertex)
  const sa = view.worldToScreen(arm1)

  ctx.beginPath()
  ctx.moveTo(sv.x, sv.y)
  ctx.lineTo(sa.x, sa.y)
  ctx.strokeStyle = MEASUREMENT_COLOR
  ctx.lineWidth = MEASUREMENT_CANVAS_LINE_WIDTH
  ctx.setLineDash([8, 5])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

/**
 * Simple rubber-band jig for picking arm1: draws a blue transient line
 * from vertex to cursor, matching the style of the arm2 jig.
 */
class AcApMeasureArm1Jig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine

  constructor(view: AcEdBaseView, vertex: AcGePoint3dLike) {
    super(view)
    this._line = createMeasurementLine(vertex, vertex)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p: AcGePoint3dLike) {
    this._line.endPoint = p
  }
}

/**
 * Preview jig for picking arm2: draws a blue transient line from vertex to
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

  constructor(
    view: AcEdBaseView,
    vertex: AcGePoint3dLike,
    arm1: AcGePoint3dLike,
    canvas: HTMLCanvasElement
  ) {
    super(view)
    this._vertex = vertex
    this._arm1 = arm1
    this._view = view
    this._canvas = canvas
    this._line = createMeasurementLine(vertex, vertex)

    this._badge = document.createElement('div')
    this._badge.style.cssText =
      'position:fixed;background:rgba(255,255,255,0.95);color:#1e40af;' +
      'font-size:13px;font-family:sans-serif;font-weight:500;' +
      'padding:3px 14px;border-radius:20px;pointer-events:none;' +
      'transform:translate(-50%,-50%);white-space:nowrap;' +
      'box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:99999;display:none;'
    document.body.appendChild(this._badge)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p: AcGePoint3dLike) {
    this._line.endPoint = p

    // Redraw the first arm dashed line (stays in sync with pan/zoom)
    drawArm1OnCanvas(this._canvas, this._view, this._vertex, this._arm1)

    const deg = calcAngleDeg(this._vertex, this._arm1, p)
    this._badge.textContent = `~ ${deg.toFixed(2)}°`
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
 * transient CAD lines are added for both arms and a `measurement-added` event
 * is emitted so the `useMeasurements` composable in `cad-viewer` renders the
 * persistent DOM overlay (arc + dots + badge).
 */
export class AcApMeasureAngleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor

    // Pick vertex
    const vertexPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureAngle.vertex')
    )
    const vertex = await editor.getPoint(vertexPrompt)

    // Pick first arm endpoint (jig provides blue preview line from vertex)
    const arm1Prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureAngle.arm1')
    )
    arm1Prompt.useBasePoint = true
    arm1Prompt.jig = new AcApMeasureArm1Jig(context.view, vertex)
    const arm1 = await editor.getPoint(arm1Prompt)

    // Construction-phase canvas for the first arm dashed line — removed after arm2 is confirmed
    const armCanvas = document.createElement('canvas')
    armCanvas.style.cssText =
      'position:fixed;pointer-events:none;z-index:99997;'
    document.body.appendChild(armCanvas)
    drawArm1OnCanvas(armCanvas, context.view, vertex, arm1)

    const redrawOnViewChange = () =>
      drawArm1OnCanvas(armCanvas, context.view, vertex, arm1)
    context.view.events.viewChanged.addEventListener(redrawOnViewChange)

    // Pick second arm endpoint with live preview (jig provides blue line + angle badge)
    const arm2Prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureAngle.arm2')
    )
    arm2Prompt.jig = new AcApMeasureAngleJig(context.view, vertex, arm1, armCanvas)
    const arm2 = await editor.getPoint(arm2Prompt)

    // Clean up construction-phase canvas
    context.view.events.viewChanged.removeEventListener(redrawOnViewChange)
    armCanvas.remove()

    const degrees = calcAngleDeg(vertex, arm1, arm2)

    // Persistent CAD transient lines for both arms (zoom/pan aware)
    const line1 = createMeasurementLine(vertex, arm1)
    context.view.addTransientEntity(line1)

    const line2 = createMeasurementLine(vertex, arm2)
    context.view.addTransientEntity(line2)

    registerMeasurementCleanup(() => {
      context.view.removeTransientEntity(line1.objectId)
      context.view.removeTransientEntity(line2.objectId)
    })

    // Notify the useMeasurements composable to render the persistent DOM overlay
    eventBus.emit('measurement-added', {
      type: 'angle',
      vertex,
      arm1,
      arm2,
      degrees
    })
  }
}
