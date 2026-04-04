import {
  AcDbSpline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d
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

export class AcApSplineJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _spline: AcDbSpline
  private _points: AcGePoint2d[]

  constructor(view: AcEdBaseView, points: AcGePoint2d[]) {
    super(view)
    this._points = points
    this._spline = this.createSpline(points)
  }

  get entity(): AcDbSpline {
    return this._spline
  }

  update(point: AcGePoint2dLike) {
    const newPoints = [...this._points, new AcGePoint2d(point)]
    this.rebuildSpline(newPoints)
  }

  private createSpline(points: AcGePoint2d[]): AcDbSpline {
    if (points.length < 2) {
      const defaultPoints = [new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 1, 0)]
      const degree = 1
      const knots = createKnots(defaultPoints.length, degree)
      return new AcDbSpline(defaultPoints, knots, undefined, degree, false)
    }

    const points3d = points.map(p => new AcGePoint3d(p.x, p.y, 0))
    const degree = Math.min(3, Math.max(1, points3d.length - 1))
    const knots = createKnots(points3d.length, degree)
    return new AcDbSpline(points3d, knots, undefined, degree, false)
  }

  private rebuildSpline(points: AcGePoint2d[]) {
    if (points.length < 2) {
      const defaultPoints = [new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 1, 0)]
      const degree = 1
      const knots = createKnots(defaultPoints.length, degree)
      this._spline.rebuild(defaultPoints, knots, undefined, degree, false)
    } else {
      const points3d = points.map(p => new AcGePoint3d(p.x, p.y, 0))
      const degree = Math.min(3, Math.max(1, points3d.length - 1))
      const knots = createKnots(points3d.length, degree)
      this._spline.rebuild(points3d, knots, undefined, degree, false)
    }
  }
}

/**
 * Command to create one spline.
 */
export class AcApSplineCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const points: AcGePoint2d[] = []
    let currentPoint: AcGePoint2dLike | undefined

    // Get first point
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.spline.firstPoint')
    )
    currentPoint =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
    if (currentPoint) {
      points.push(new AcGePoint2d(currentPoint))

      // Get subsequent points until user presses Enter
      while (true) {
        const nextPointPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.spline.nextPoint')
        )
        nextPointPrompt.useDashedLine = true
        nextPointPrompt.useBasePoint = true
        nextPointPrompt.jig = new AcApSplineJig(context.view, points)

        try {
          currentPoint =
            await AcApDocManager.instance.editor.getPoint(nextPointPrompt)
          if (currentPoint) {
            points.push(new AcGePoint2d(currentPoint))
          } else {
            // User pressed Enter, exit loop
            break
          }
        } catch {
          // User canceled, exit loop
          break
        }
      }

      // Create spline if we have at least two points
      if (points.length >= 2) {
        const db = context.doc.database
        const points3d = points.map(p => new AcGePoint3d(p.x, p.y, 0))

        // For cubic spline (degree 3), we need at least 4 control points
        // If we have less than 4 points, use a lower degree
        const degree = Math.min(3, Math.max(1, points3d.length - 1))

        const knots = createKnots(points3d.length, degree)
        const spline = new AcDbSpline(points3d, knots, undefined, degree, false)
        db.tables.blockTable.modelSpace.appendEntity(spline)
      }
    }
  }
}

function createKnots(numControlPoints: number, degree: number): number[] {
  const knots: number[] = []
  const numKnots = numControlPoints + degree + 1

  for (let i = 0; i < numKnots; i++) {
    if (i < degree + 1) {
      knots.push(0)
    } else if (i >= numKnots - degree - 1) {
      knots.push(1)
    } else {
      knots.push((i - degree) / (numControlPoints - degree))
    }
  }

  return knots
}
