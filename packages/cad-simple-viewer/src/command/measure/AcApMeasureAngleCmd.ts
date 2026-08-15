import {
  AcCmColor,
  AcDbDatabase,
  AcDbLine,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
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
  acapCssColor,
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementColor,
  acapGetMeasurementFontSize,
  acapGetMeasurementLineWeight,
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  formatMeasurementAngle
} from '../../util'
import { AcTrView2d } from '../../view'
import { AcApMeasureAngleEntity } from './entity'
import { MEASUREMENT_LIVE_LAYER } from './AcApMeasurementStore'

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
 * Draws the first arm (vertex->arm1) as a dashed line on a canvas overlay,
 * used during second arm selection so the user can see the first arm.
 */
function drawArm1OnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  vertex: AcGePoint3dLike,
  arm1: AcGePoint3dLike,
  color: AcCmColor,
  lineWidth = 2
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
  ctx.strokeStyle = acapCssColor(color)
  ctx.lineWidth = lineWidth
  ctx.setLineDash([8, 5])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

/**
 * Commit an angle measurement overlay (also used when importing a sidecar).
 */
export function placeAngleMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  vertex: AcGePoint3dLike,
  arm1: AcGePoint3dLike,
  arm2: AcGePoint3dLike,
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  AcApMeasureAngleEntity.create(vertex, arm1, arm2, style, options).commit(
    view,
    db
  )
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
    this._line.lineWeight = acapGetMeasurementLineWeight()
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
  private _badge: AcTrHtmlBadge
  private _htManager: AcTrHtmlTransientManager
  private readonly _badgeId: string
  private _canvas: HTMLCanvasElement
  private _color: AcCmColor
  private _db: AcDbDatabase

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
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
    this._db = db
    this._line = new AcDbLine(vertex, vertex)
    this._line.color = color
    this._line.lineWeight = acapGetMeasurementLineWeight()

    this._badgeId = `live-angle-badge-${Date.now()}`
    this._htManager = (view as AcTrView2d).htmlTransientManager
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: vertex,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (view as AcTrView2d).activeLayoutBtrId,
      fontSize: acapGetMeasurementFontSize(),
      // Keep the label slightly above the vertex (was -30px screen offset).
      transform: 'translate(-50%, calc(-50% - 30px))'
    })
    this._badge.object.visible = false
    this._htManager.add(this._badge)
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
      this._color,
      acapMeasurementCanvasLineWidth(acapGetMeasurementLineWeight())
    )

    const deg = calcAngleDeg(this._vertex, this._arm1, p)
    this._badge.setText(
      formatMeasurementAngle(this._db, (deg * Math.PI) / 180)
    )
    this._badge.setPosition(this._vertex)
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._htManager.remove(this._badgeId)
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
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)
    const style = acapGetCurrentMeasurementStyle(db)
    const canvasLineWidth = acapMeasurementCanvasLineWidth(style.lineWeight)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        // Pick vertex
        const vertexPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureAngle.vertex')
        )
        const vertexResult = await editor.getPoint(vertexPrompt)
        if (vertexResult.status !== AcEdPromptStatus.OK) return
        const vertex = vertexResult.value!

        // Pick first arm endpoint (jig provides preview line from vertex)
        const arm1Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureAngle.arm1')
        )
        arm1Prompt.useBasePoint = true
        arm1Prompt.jig = new AcApMeasureArm1Jig(context.view, vertex, color)
        const arm1Result = await editor.getPoint(arm1Prompt)
        if (arm1Result.status !== AcEdPromptStatus.OK) return
        const arm1 = arm1Result.value!

        // Construction-phase canvas for the first arm dashed line
        const armOverlay = new AcTrHtmlCanvasOverlay({
          id: `live-angle-arm-${Date.now()}`,
          container: context.view.container,
          layer: MEASUREMENT_LIVE_LAYER,
          layoutId: (context.view as AcTrView2d).activeLayoutBtrId
        })
        const htLive = (context.view as AcTrView2d).htmlTransientManager
        htLive.add(armOverlay)
        drawArm1OnCanvas(
          armOverlay.canvas,
          context.view,
          vertex,
          arm1,
          color,
          canvasLineWidth
        )

        const redrawOnViewChange = () =>
          drawArm1OnCanvas(
            armOverlay.canvas,
            context.view,
            vertex,
            arm1,
            color,
            canvasLineWidth
          )
        context.view.events.viewChanged.addEventListener(redrawOnViewChange)

        // Pick second arm endpoint with live preview (jig provides line + angle badge)
        const arm2Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureAngle.arm2')
        )
        arm2Prompt.jig = new AcApMeasureAngleJig(
          context.view,
          db,
          vertex,
          arm1,
          armOverlay.canvas,
          color
        )

        let arm2: AcGePoint3dLike
        try {
          const arm2Result = await editor.getPoint(arm2Prompt)
          if (arm2Result.status !== AcEdPromptStatus.OK) {
            // User pressed ESC / cancelled — clean up construction-phase DOM
            context.view.events.viewChanged.removeEventListener(
              redrawOnViewChange
            )
            htLive.remove(armOverlay.id)
            return
          }
          arm2 = arm2Result.value!
        } catch {
          // User pressed ESC / cancelled — clean up construction-phase DOM
          context.view.events.viewChanged.removeEventListener(
            redrawOnViewChange
          )
          htLive.remove(armOverlay.id)
          return
        }

        // Clean up construction-phase canvas
        context.view.events.viewChanged.removeEventListener(redrawOnViewChange)
        htLive.remove(armOverlay.id)

        placeAngleMeasurement(
          context.view as AcTrView2d,
          db,
          vertex,
          arm1,
          arm2,
          acapGetCurrentMeasurementStyle(db)
        )
      })
    )
  }
}
