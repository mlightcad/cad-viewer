import { AcCmColor, AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlTransientManager
} from '@mlightcad/three-renderer'

import { AcApContext } from '../../app'
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
  formatMeasurementAngle,
  MEASUREMENT_LINE_WEIGHT
} from '../../util'
import { AcTrView2d } from '../../view'
import {
  AcApHtmlLivePreview,
  acapStrokeLiveSegment
} from '../overlay/AcApHtmlLivePreview'
import { acapSyncLiveOverlayTextHeight } from '../overlay/AcApOverlayDrawUtil'
import { AcApMeasureDrawCmd } from './AcApMeasureDrawCmd'
import { MEASUREMENT_LIVE_LAYER } from './AcApMeasurementStore'
import { AcApMeasureAngleEntity } from './entity'

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
 * Rubber-band jig for picking arm1: solid HTML preview from vertex to cursor.
 */
class AcApMeasureArm1Jig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _vertex: AcGePoint3dLike
  private readonly _preview: AcApHtmlLivePreview
  private readonly _color: AcCmColor
  private _cursor: AcGePoint3dLike

  constructor(view: AcEdBaseView, vertex: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._vertex = vertex
    this._cursor = vertex
    this._color = color

    this._preview = new AcApHtmlLivePreview(
      view as AcTrView2d,
      `live-angle-arm1-${Date.now()}`,
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
        this._vertex,
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
 * Preview jig for picking arm2: dashed arm1 + solid arm2 on one HTML canvas,
 * plus a live angle badge.
 */
class AcApMeasureAngleJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _vertex: AcGePoint3dLike
  private readonly _arm1: AcGePoint3dLike
  private readonly _db: AcDbDatabase
  private readonly _badge: AcTrHtmlBadge
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _badgeId: string
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _arm2: AcGePoint3dLike

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    vertex: AcGePoint3dLike,
    arm1: AcGePoint3dLike,
    color: AcCmColor
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._vertex = vertex
    this._arm1 = arm1
    this._arm2 = vertex
    this._color = color
    this._db = db

    this._badgeId = `live-angle-badge-${Date.now()}`
    this._htManager = this._view.htmlTransientManager
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: vertex,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: acapGetMeasurementFontSize(),
      // Keep the label slightly above the vertex (was -30px screen offset).
      transform: 'translate(-50%, calc(-50% - 30px))'
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
      `live-angle-arm2-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: AcGePoint3dLike) {
    this._arm2 = p
    this._color = acapGetMeasurementColor(this._db)
    this._badge.setColor(this._color)
    const style = acapGetCurrentMeasurementStyle(this._db)
    this._badge.setFontSize(style.fontSize)
    acapSyncLiveOverlayTextHeight(this._view, [this._badge], style)

    const lineWidth = acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLiveSegment(
        ctx,
        view,
        this._vertex,
        this._arm1,
        this._color,
        lineWidth,
        { dashed: true }
      )
      acapStrokeLiveSegment(
        ctx,
        view,
        this._vertex,
        this._arm2,
        this._color,
        lineWidth
      )
    })

    const deg = calcAngleDeg(this._vertex, this._arm1, p)
    this._badge.setText(formatMeasurementAngle(this._db, (deg * Math.PI) / 180))
    this._badge.setPosition(this._vertex)
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.acapDispose()
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Command that measures the angle between two arms sharing a common vertex.
 *
 * Prompts the user to pick three world points: the vertex, a point on the
 * first arm, and a point on the second arm. Interactive preview is HTML-only
 * (canvas strokes + badge). Committed overlay is placed via
 * {@link placeAngleMeasurement}.
 */
export class AcApMeasureAngleCmd extends AcApMeasureDrawCmd {
  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)

    await this.withMeasureInput(context, async () => {
      // Pick vertex
      const vertexPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureAngle.vertex')
      )
      const vertexResult = await editor.getPoint(vertexPrompt)
      if (vertexResult.status !== AcEdPromptStatus.OK) return
      const vertex = vertexResult.value!

      // Pick first arm endpoint (jig provides HTML rubber-band from vertex)
      const arm1Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureAngle.arm1')
      )
      arm1Prompt.useBasePoint = true
      arm1Prompt.jig = new AcApMeasureArm1Jig(context.view, vertex, color)
      const arm1Result = await editor.getPoint(arm1Prompt)
      if (arm1Result.status !== AcEdPromptStatus.OK) return
      const arm1 = arm1Result.value!

      // Pick second arm endpoint with live preview (dashed arm1 + solid arm2 + badge)
      const arm2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureAngle.arm2')
      )
      arm2Prompt.jig = new AcApMeasureAngleJig(
        context.view,
        db,
        vertex,
        arm1,
        color
      )

      const arm2Result = await editor.getPoint(arm2Prompt)
      if (arm2Result.status !== AcEdPromptStatus.OK) return
      const arm2 = arm2Result.value!

      placeAngleMeasurement(
        context.view as AcTrView2d,
        db,
        vertex,
        arm1,
        arm2,
        acapGetCurrentMeasurementStyle(db)
      )
    })
  }
}
