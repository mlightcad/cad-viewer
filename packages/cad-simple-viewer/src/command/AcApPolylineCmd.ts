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
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../editor'
import { AcApI18n } from '../i18n'

export class AcApPolylineJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _polyline: AcDbPolyline
  private _points: AcGePoint2d[]

  /**
   * Creates a polyline jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, points: AcGePoint2d[]) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._points = points
    this.updatePoints()
  }

  get entity(): AcDbPolyline {
    return this._polyline
  }

  update(point: AcGePoint2dLike) {
    const newPoints = [...this._points, new AcGePoint2d(point)]
    this._polyline.reset(false)
    newPoints.forEach((p, index) => {
      this._polyline.addVertexAt(index, p)
    })
  }

  private updatePoints() {
    this._polyline.reset(false)
    this._points.forEach((p, index) => {
      this._polyline.addVertexAt(index, p)
    })
  }
}

/**
 * Command to create one polyline.
 */
export class AcApPolylineCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const points: AcGePoint2d[] = []
    let currentPoint: AcGePoint2dLike | undefined

    // Get first point
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.polyline.firstPoint')
    )
    const firstPointResult =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
    if (firstPointResult.status !== AcEdPromptStatus.OK) return
    currentPoint = firstPointResult.value!
    points.push(new AcGePoint2d(currentPoint))

    // Get subsequent points until user presses Enter
    while (true) {
      const nextPointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.polyline.nextPoint')
      )
      nextPointPrompt.useDashedLine = true
      nextPointPrompt.useBasePoint = true
      nextPointPrompt.jig = new AcApPolylineJig(context.view, points)

      try {
        const nextPointResult =
          await AcApDocManager.instance.editor.getPoint(nextPointPrompt)
        if (nextPointResult.status !== AcEdPromptStatus.OK) {
          // User canceled or pressed Enter, exit loop
          break
        }
        currentPoint = nextPointResult.value!
        points.push(new AcGePoint2d(currentPoint))
      } catch {
        // User canceled, exit loop
        break
      }
    }

    // Create polyline if we have at least two points
    if (points.length >= 2) {
      const db = context.doc.database
      const polyline = new AcDbPolyline()
      points.forEach((p, index) => {
        polyline.addVertexAt(index, p)
      })
      db.tables.blockTable.modelSpace.appendEntity(polyline)
    }
  }
}
