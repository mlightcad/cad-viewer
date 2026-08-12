import {
  AcCmColor,
  AcDbDatabase,
  AcDbLine,
  AcGePoint3dLike,
  AcGiLineWeight
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot,
  AcTrHtmlGroup,
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
import { cssColor, measurementColor } from '../../util'
import { AcTrView2d } from '../../view'
import {
  commitMeasurementGroup,
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER
} from './AcApMeasurementStore'

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
    this._line.lineWeight = AcGiLineWeight.LineWeight070

    this._badgeId = `live-angle-badge-${Date.now()}`
    this._htManager = (view as AcTrView2d).htmlTransientManager
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: vertex,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (view as AcTrView2d).activeLayoutBtrId,
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
      this._color
    )

    const deg = calcAngleDeg(this._vertex, this._arm1, p)
    this._badge.setText(
      this._db.formatter.formatAngle((deg * Math.PI) / 180, {
        showUnits: true,
        showApproximate: true,
        applyAngbaseAngdir: false
      })
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
    const color = measurementColor(db)

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
        drawArm1OnCanvas(armOverlay.canvas, context.view, vertex, arm1, color)

        const redrawOnViewChange = () =>
          drawArm1OnCanvas(
            armOverlay.canvas,
            context.view,
            vertex,
            arm1,
            color
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
        const persistOverlay = new AcTrHtmlCanvasOverlay({
          id: `angle-arc-${Date.now()}`,
          container: context.view.container,
          layer: MEASUREMENT_LAYER,
          layoutId: (context.view as AcTrView2d).activeLayoutBtrId
        })
        drawAngleArcOnCanvas(
          persistOverlay.canvas,
          context.view,
          vertex,
          arm1,
          arm2,
          color
        )

        const redrawPersist = () =>
          drawAngleArcOnCanvas(
            persistOverlay.canvas,
            context.view,
            vertex,
            arm1,
            arm2,
            color
          )
        context.view.events.viewChanged.addEventListener(redrawPersist)

        // Persistent overlays via htmlTransientManager (auto-positioned by CSS2DRenderer)
        const id = `angle-${Date.now()}`

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

        const group = new AcTrHtmlGroup({
          id,
          layer: MEASUREMENT_LAYER,
          layoutId: (context.view as AcTrView2d).activeLayoutBtrId,
          selectable: true
        })
          .add(
            new AcTrHtmlDot({
              id: `${id}-dotV`,
              color,
              worldPosition: vertex,
              layer: MEASUREMENT_LAYER
            }),
            new AcTrHtmlDot({
              id: `${id}-dot1`,
              color,
              worldPosition: arm1,
              layer: MEASUREMENT_LAYER
            }),
            new AcTrHtmlDot({
              id: `${id}-dot2`,
              color,
              worldPosition: arm2,
              layer: MEASUREMENT_LAYER
            }),
            new AcTrHtmlBadge({
              id: `${id}-badge`,
              color,
              text: db.formatter.formatAngle((degrees * Math.PI) / 180, {
                showUnits: true,
                applyAngbaseAngdir: false
              }),
              worldPosition: badgeWorld,
              layer: MEASUREMENT_LAYER
            })
          )
          .addCanvas(persistOverlay)

        commitMeasurementGroup(context.view as AcTrView2d, group, {
          entityIds: [line1.objectId, line2.objectId],
          dispose: () => {
            context.view.removeTransientEntity(line1.objectId)
            context.view.removeTransientEntity(line2.objectId)
            context.view.events.viewChanged.removeEventListener(redrawPersist)
          }
        })
      })
    )
  }
}
