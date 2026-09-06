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
  acapMeasurementCanvasLineWidth,
  formatMeasurementLength,
  MEASUREMENT_LINE_WEIGHT
} from '../../util'
import { AcTrView2d } from '../../view'
import {
  AcApHtmlLivePreview,
  acapStrokeLivePolyline
} from '../overlay/AcApHtmlLivePreview'
import { acapSyncLiveOverlayTextHeight } from '../overlay/AcApOverlayDrawUtil'
import { placeDistanceMeasurement } from './AcApMeasureDistanceCmd'
import { AcApMeasureDrawCmd } from './AcApMeasureDrawCmd'
import { runMeasurementEdit } from './AcApMeasurementHistory'
import { MEASUREMENT_LIVE_LAYER } from './AcApMeasurementStore'
import { newMeasureOverlayId } from './entity/AcApMeasureEntity'

/** Returns the 2D Euclidean distance between two world points. */
function calcDist(p1: AcGePoint3dLike, p2: AcGePoint3dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Midpoint of a segment. */
function midOf(a: AcGePoint3dLike, b: AcGePoint3dLike): AcGePoint3dLike {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0 }
}

/** Snapshot a pick so later getPoint mutations cannot collapse earlier vertices. */
function clonePoint(p: AcGePoint3dLike): AcGePoint3dLike {
  return { x: p.x, y: p.y, z: p.z ?? 0 }
}

/**
 * Preview jig for the continuous distance measurement command.
 *
 * Renders live HTML rubber-band segments and a length badge at each midpoint
 * (no AcDb preview). Confirmed vertices stay in `points`; `update` adds the
 * rubber-band to the cursor.
 */
export class AcApMeasureContinuousJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcTrView2d
  private readonly _points: AcGePoint3dLike[]
  private readonly _db: AcDbDatabase
  private readonly _htManager: AcTrHtmlTransientManager
  private readonly _badges: AcTrHtmlBadge[] = []
  private readonly _preview: AcApHtmlLivePreview
  private _color: AcCmColor

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    points: AcGePoint3dLike[],
    color: AcCmColor
  ) {
    super(view)
    this._view = view as AcTrView2d
    this._points = points
    this._db = db
    this._color = color
    this._htManager = this._view.htmlTransientManager
    this._preview = new AcApHtmlLivePreview(
      this._view,
      `live-cont-stroke-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER,
      { alignToViewCanvas: true }
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(cursor: AcGePoint3dLike) {
    this._color = acapGetMeasurementColor(this._db)
    const style = acapGetCurrentMeasurementStyle(this._db)
    const lineWidth = acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    const vertices = [...this._points, cursor].map(clonePoint)
    this._preview.acapSetDraw((ctx, view) => {
      acapStrokeLivePolyline(ctx, view, vertices, this._color, lineWidth, {
        segmentArrows: true
      })
    })
    this.syncBadges(vertices, style.fontSize)
    if (this._badges.length > 0) {
      acapSyncLiveOverlayTextHeight(this._view, this._badges, style)
    }
  }

  /**
   * `getPoint` calls {@link end} after every accepted click. Keep the live
   * overlay so confirmed segments stay visible while picking the next vertex.
   * The command calls {@link disposePreview} when the whole chain finishes.
   */
  end() {
    super.end()
  }

  /** Removes the live polyline canvas and midpoint badges. */
  disposePreview() {
    this._preview.acapDispose()
    for (const badge of this._badges) {
      this._htManager.remove(badge.id)
    }
    this._badges.length = 0
  }

  /** Creates, updates, or hides per-segment live badges. */
  private syncBadges(vertices: AcGePoint3dLike[], fontSize: number) {
    const needed = Math.max(0, vertices.length - 1)
    while (this._badges.length < needed) {
      const badge = new AcTrHtmlBadge({
        id: `live-cont-badge-${Date.now()}-${this._badges.length}`,
        color: this._color,
        worldPosition: vertices[this._badges.length] ?? { x: 0, y: 0 },
        layer: MEASUREMENT_LIVE_LAYER,
        layoutId: this._view.activeLayoutBtrId,
        fontSize
      })
      this._htManager.add(badge)
      acapSyncLiveOverlayTextHeight(
        this._view,
        [badge],
        acapGetCurrentMeasurementStyle(this._db)
      )
      this._badges.push(badge)
    }
    while (this._badges.length > needed) {
      const badge = this._badges.pop()
      if (badge) this._htManager.remove(badge.id)
    }
    for (let i = 0; i < needed; i++) {
      const a = vertices[i]
      const b = vertices[i + 1]
      const dist = calcDist(a, b)
      const badge = this._badges[i]
      badge.setColor(this._color)
      badge.setFontSize(fontSize)
      if (dist < 0.0001) {
        badge.object.visible = false
        continue
      }
      badge.setText(formatMeasurementLength(this._db, dist))
      badge.setPosition(midOf(a, b))
      badge.object.visible = true
    }
  }
}

/**
 * Command that measures chained straight-line distances, like LINE.
 *
 * The user keeps picking the next vertex until Enter or Cancel. Each
 * consecutive pair is committed as a normal distance measurement.
 */
export class AcApMeasureContinuousCmd extends AcApMeasureDrawCmd {
  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)
    const points: AcGePoint3dLike[] = []

    await this.withMeasureInput(context, async () => {
      const p1Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measureContinuous.firstPoint')
      )
      const p1Result = await editor.getPoint(p1Prompt)
      if (p1Result.status !== AcEdPromptStatus.OK) return
      points.push(clonePoint(p1Result.value!))

      const jig = new AcApMeasureContinuousJig(context.view, db, points, color)
      try {
        while (points.length < 100) {
          const prompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.measureContinuous.nextPoint')
          )
          prompt.useBasePoint = true
          prompt.basePoint = new AcGePoint3d(points[points.length - 1])
          prompt.allowNone = true
          prompt.jig = jig
          const result = await editor.getPoint(prompt)
          if (result.status !== AcEdPromptStatus.OK) break
          const next = clonePoint(result.value!)
          const last = points[points.length - 1]!
          if (calcDist(last, next) < 1e-9) continue
          points.push(next)
        }
      } finally {
        jig.disposePreview()
      }
    })

    if (points.length < 2) return

    const view = context.view as AcTrView2d
    const style = acapGetCurrentMeasurementStyle(db)
    runMeasurementEdit(view, 'Create Measurement', () => {
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]!
        const b = points[i + 1]!
        if (calcDist(a, b) < 1e-4) continue
        placeDistanceMeasurement(view, db, a, b, style, {
          id: newMeasureOverlayId('dist')
        })
      }
    })
  }
}
