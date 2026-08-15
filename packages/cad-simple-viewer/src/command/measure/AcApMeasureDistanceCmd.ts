import {
  AcCmColor,
  AcDbDatabase,
  AcDbLine,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
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
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementColor,
  acapGetMeasurementFontSize,
  acapGetMeasurementLineWeight,
  type AcApMeasurementStyle,
  formatMeasurementLength
} from '../../util'
import { AcTrView2d } from '../../view'
import { AcApMeasureDistanceEntity } from './entity'
import { MEASUREMENT_LIVE_LAYER } from './AcApMeasurementStore'

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
 * Renders a live rubber-band line from the fixed first point to the current
 * cursor position. The badge showing the live distance is rendered by the
 * jig itself and is removed when the jig ends — it is intentionally short-lived
 * and intrinsic to the interactive input UX.
 */
export class AcApMeasureDistanceJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine
  private _p1: AcGePoint3dLike
  private _db: AcDbDatabase
  private _htManager: AcTrHtmlTransientManager
  private _badge: AcTrHtmlBadge
  private readonly _badgeId: string

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    p1: AcGePoint3dLike,
    color: AcCmColor
  ) {
    super(view)
    this._p1 = p1
    this._db = db
    this._line = new AcDbLine(p1, p1)
    this._line.color = color
    this._line.lineWeight = acapGetMeasurementLineWeight()

    this._badgeId = `live-dist-badge-${Date.now()}`
    this._htManager = (view as AcTrView2d).htmlTransientManager
    this._badge = new AcTrHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: p1,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: (view as AcTrView2d).activeLayoutBtrId,
      fontSize: acapGetMeasurementFontSize()
    })
    this._badge.object.visible = false
    this._htManager.add(this._badge)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p2: AcGePoint3dLike) {
    this._line.endPoint = p2
    this._line.color = acapGetMeasurementColor(this._db)
    this._line.lineWeight = acapGetMeasurementLineWeight()
    this._badge.setColor(this._line.color)
    this._badge.setFontSize(acapGetMeasurementFontSize())

    const dist = calcDist(this._p1, p2)
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
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Command that measures the straight-line distance between two points.
 *
 * Prompts the user to pick two world points, then registers a transient CAD
 * line between them. Persistent DOM overlays (dots + badge) are placed via
 * {@link AcTrHtmlTransientManager} using CSS2DObject, so they track zoom/pan
 * automatically without manual viewChanged listeners.
 */
export class AcApMeasureDistanceCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = acapGetMeasurementColor(db)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
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
    )
  }
}
