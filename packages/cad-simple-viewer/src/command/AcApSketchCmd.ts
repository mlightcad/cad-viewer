import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint2dLike
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

// Minimum distance between points to add a new vertex (in world units)
const MIN_DISTANCE = 0.1

/**
 * Calculates the distance between two points
 */
function distance(p1: AcGePoint2dLike, p2: AcGePoint2dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export class AcApSketchJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _polyline: AcDbPolyline
  private _points: AcGePoint2d[]
  private _lastPoint: AcGePoint2d | null = null

  /**
   * Creates a sketch jig.
   *
   * @param view - The associated view
   * @param start - The first point
   */
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._points = [new AcGePoint2d(start)]
    this._lastPoint = new AcGePoint2d(start)

    // Add the first point to the polyline
    this._polyline.addVertexAt(0, this._points[0])
  }

  get entity(): AcDbPolyline {
    return this._polyline
  }

  /**
   * Gets all accumulated points
   */
  get points(): AcGePoint2d[] {
    return this._points
  }

  update(currentPoint: AcGePoint2dLike) {
    if (this._lastPoint === null) {
      return
    }

    const current = new AcGePoint2d(currentPoint)
    const dist = distance(this._lastPoint, current)

    // Only add a new point if the distance is significant enough
    if (dist >= MIN_DISTANCE) {
      this._points.push(current)
      this._lastPoint = current
      this._polyline.addVertexAt(this._points.length, current)
    }
  }
}

/**
 * Command to create a sketch line using polyline.
 * After specifying the first point, continuously tracks mouse movement
 * and adds points to the polyline until the user specifies the second point.
 */
export class AcApSketchCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext) {
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.sketch.firstPoint')
    )
    const firstPoint =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)

    const jig = new AcApSketchJig(context.view, firstPoint)

    const secondPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.sketch.nextPoint')
    )
    secondPointPrompt.jig = jig
    secondPointPrompt.useDashedLine = false
    secondPointPrompt.useBasePoint = true
    const secondPoint =
      await AcApDocManager.instance.editor.getPoint(secondPointPrompt)

    // Always add the final point
    const points = jig.points
    const lastPoint = points[points.length - 1]
    const finalPoint = new AcGePoint2d(secondPoint)

    // Only add if it's different from the last point
    if (distance(lastPoint, finalPoint) > 0.01) {
      points.push(finalPoint)
    }

    // Create the final polyline
    const db = context.doc.database
    const polyline = new AcDbPolyline()
    for (let i = 0; i < points.length; i++) {
      polyline.addVertexAt(i, points[i])
    }
    db.tables.blockTable.modelSpace.appendEntity(polyline)
  }
}
