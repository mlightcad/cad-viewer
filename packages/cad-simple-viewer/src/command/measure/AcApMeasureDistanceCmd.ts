import {
  AcCmColor,
  AcDbDatabase,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'
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
  formatMeasurementLength,
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
import { AcApMeasureDistanceEntity } from './entity'

/** Returns the 2D Euclidean distance between two world points. */
function calcDist(p1: AcGePoint3dLike, p2: AcGePoint3dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Commit a distance measurement overlay (also used when importing a sidecar).
 */
export function placeDistanceMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  p1: AcGePoint3dLike,
  p2: AcGePoint3dLike,
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  AcApMeasureDistanceEntity.create(p1, p2, style, options).commit(view, db)
}

/**
 * Preview jig for the distance measurement command.
 *
 * Renders a live HTML rubber-band segment and length badge (no AcDb preview).
 */
export class AcApMeasureDistanceJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _p1: AcGePoint3dLike
  private readonly _db: AcDbDatabase
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _badge: AcTrHtmlBadge
  private readonly _badgeId: string
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor
  private _p2: AcGePoint3dLike

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    p1: AcGePoint3dLike,
    color: AcCmColor
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._p1 = p1
    this._p2 = p1
    this._db = db
    this._color = color

    this._badgeId = `live-dist-badge-${Date.now()}`
    this._htManager = this._view.htmlTransientManager
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: p1,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: acapGetMeasurementFontSize()
    })
    this._htManager.add(this._badge)
    acapSyncLiveOverlayTextHeight(
      this._view,
      [this._badge],
      acapGetCurrentMeasurementStyle(this._db)
    )
    // `add()` applies layout visibility and would force the empty capsule on.
    this._badge.object.visible = false

    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-dist-stroke-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p2: AcGePoint3dLike) {
    this._p2 = p2
    this._color = acapGetMeasurementColor(this._db)
    this._badge.setColor(this._color)
    const style = acapGetCurrentMeasurementStyle(this._db)
    this._badge.setFontSize(style.fontSize)
    acapSyncLiveOverlayTextHeight(this._view, [this._badge], style)

    const dist = calcDist(this._p1, p2)
    const lineWidth = acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLiveSegment(
        ctx,
        view,
        this._p1,
        this._p2,
        this._color,
        lineWidth,
        { arrow: 'both' }
      )
    })

    if (dist < 0.0001) {
      this._badge.object.visible = false
      return
    }

    this._badge.setText(formatMeasurementLength(this._db, dist))
    this._badge.setPosition({
      x: (this._p1.x + p2.x) / 2,
      y: (this._p1.y + p2.y) / 2
    })
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.acapDispose()
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Command that measures the straight-line distance between two points.
 *
 * Prompts for two world points, then commits a measurement overlay.
 * Interactive preview is HTML-only (canvas stroke + badge).
 */
export class AcApMeasureDistanceCmd extends AcApMeasureDrawCmd {
  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)

    await this.withMeasureInput(context, async () => {
      const p1Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureDistance.firstPoint')
      )
      const p1Result = await editor.getPoint(p1Prompt)
      if (p1Result.status !== AcEdPromptStatus.OK) return
      const p1 = p1Result.value!

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureDistance.secondPoint')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.basePoint = new AcGePoint3d(p1)
      p2Prompt.jig = new AcApMeasureDistanceJig(context.view, db, p1, color)
      const p2Result = await editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      placeDistanceMeasurement(
        context.view as AcTrView2d,
        db,
        p1,
        p2,
        acapGetCurrentMeasurementStyle(db)
      )
    })
  }
}
