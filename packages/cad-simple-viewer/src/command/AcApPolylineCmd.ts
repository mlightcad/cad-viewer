import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../editor'
import { AcApI18n } from '../i18n'

export class AcApPolylineJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _polyline: AcDbPolyline
  private _points: AcGePoint2d[]
  private _bulges: (number | undefined)[]
  private _currentBulge?: number

  /**
   * Creates a polyline jig.
   *
   * @param view - The associated view
   */
  constructor(
    view: AcEdBaseView,
    points: AcGePoint2d[],
    bulges: (number | undefined)[],
    currentBulge?: number
  ) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._points = points
    this._bulges = bulges
    this._currentBulge = currentBulge
    this.updatePoints()
  }

  get entity(): AcDbPolyline {
    return this._polyline
  }

  update(point: AcGePoint2dLike) {
    const newPoints = [...this._points, new AcGePoint2d(point)]
    const newBulges = [...this._bulges]
    if (newPoints.length >= 2) {
      newBulges[newPoints.length - 2] = this._currentBulge
    }
    newBulges[newPoints.length - 1] = undefined
    this._polyline.reset(false)
    newPoints.forEach((p, index) =>
      this._polyline.addVertexAt(index, p, newBulges[index])
    )
  }

  private updatePoints() {
    this._polyline.reset(false)
    this._points.forEach((p, index) =>
      this._polyline.addVertexAt(index, p, this._bulges[index])
    )
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

  private computeBulgeFromCenter(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    center: AcGePoint2dLike
  ) {
    const v1x = start.x - center.x
    const v1y = start.y - center.y
    const v2x = end.x - center.x
    const v2y = end.y - center.y
    const cross = v1x * v2y - v1y * v2x
    const dot = v1x * v2x + v1y * v2y
    const angle = Math.atan2(cross, dot)
    if (!Number.isFinite(angle)) return undefined
    return Math.tan(angle / 4)
  }

  private computeCircleCenter(
    p1: AcGePoint2dLike,
    p2: AcGePoint2dLike,
    p3: AcGePoint2dLike
  ) {
    const x1 = p1.x
    const y1 = p1.y
    const x2 = p2.x
    const y2 = p2.y
    const x3 = p3.x
    const y3 = p3.y

    const a = x1 - x2
    const b = y1 - y2
    const c = x1 - x3
    const d = y1 - y3
    const e = (x1 * x1 - x2 * x2 + y1 * y1 - y2 * y2) / 2
    const f = (x1 * x1 - x3 * x3 + y1 * y1 - y3 * y3) / 2
    const det = a * d - b * c
    if (Math.abs(det) < 1e-9) return undefined

    const cx = (d * e - b * f) / det
    const cy = (-c * e + a * f) / det
    return new AcGePoint2d(cx, cy)
  }

  private computeBulgeFromThreePoints(
    start: AcGePoint2dLike,
    mid: AcGePoint2dLike,
    end: AcGePoint2dLike
  ) {
    const center = this.computeCircleCenter(start, mid, end)
    if (!center) return undefined
    return this.computeBulgeFromCenter(start, end, center)
  }

  private computeBulgeFromRadius(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    radius: number
  ) {
    const r = Math.abs(radius)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const chord = Math.hypot(dx, dy)
    if (chord === 0 || chord > 2 * r) return undefined

    const midx = (start.x + end.x) / 2
    const midy = (start.y + end.y) / 2
    const h = Math.sqrt(Math.max(0, r * r - (chord * chord) / 4))
    const ux = -dy / chord
    const uy = dx / chord
    const sign = radius >= 0 ? 1 : -1
    const cx = midx + ux * h * sign
    const cy = midy + uy * h * sign
    const center = new AcGePoint2d(cx, cy)
    return this.computeBulgeFromCenter(start, end, center)
  }

  async execute(context: AcApContext) {
    const points: AcGePoint2d[] = []
    let currentPoint: AcGePoint2dLike | undefined
    let arcMode = false
    const bulges: (number | undefined)[] = []
    const ARC_BULGE = 0.5

    // Get first point
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.polyline.firstPoint')
    )
    const firstPointResult =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
    if (firstPointResult.status !== AcEdPromptStatus.OK) return
    currentPoint = firstPointResult.value!
    points.push(new AcGePoint2d(currentPoint))
    bulges.push(undefined)

    // Get subsequent points until user presses Enter
    while (true) {
      const startPoint = currentPoint
      if (!startPoint) break

      const nextPointPrompt = new AcEdPromptPointOptions(
        arcMode
          ? AcApI18n.t('jig.polyline.nextPointWithArcOptions')
          : AcApI18n.t('jig.polyline.nextPointWithOptions')
      )
      if (arcMode) {
        nextPointPrompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.angle.display'),
          AcApI18n.t('jig.polyline.keywords.angle.global'),
          AcApI18n.t('jig.polyline.keywords.angle.local')
        )
        nextPointPrompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.center.display'),
          AcApI18n.t('jig.polyline.keywords.center.global'),
          AcApI18n.t('jig.polyline.keywords.center.local')
        )
        nextPointPrompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.secondPoint.display'),
          AcApI18n.t('jig.polyline.keywords.secondPoint.global'),
          AcApI18n.t('jig.polyline.keywords.secondPoint.local')
        )
        nextPointPrompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.radius.display'),
          AcApI18n.t('jig.polyline.keywords.radius.global'),
          AcApI18n.t('jig.polyline.keywords.radius.local')
        )
        nextPointPrompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.line.display'),
          AcApI18n.t('jig.polyline.keywords.line.global'),
          AcApI18n.t('jig.polyline.keywords.line.local')
        )
      } else {
        nextPointPrompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.arc.display'),
          AcApI18n.t('jig.polyline.keywords.arc.global'),
          AcApI18n.t('jig.polyline.keywords.arc.local')
        )
      }
      nextPointPrompt.keywords.add(
        AcApI18n.t('jig.polyline.keywords.undo.display'),
        AcApI18n.t('jig.polyline.keywords.undo.global'),
        AcApI18n.t('jig.polyline.keywords.undo.local')
      )
      nextPointPrompt.useDashedLine = true
      nextPointPrompt.useBasePoint = true
      if (currentPoint) {
        nextPointPrompt.basePoint = new AcGePoint3d(currentPoint)
      }
      nextPointPrompt.jig = new AcApPolylineJig(
        context.view,
        points,
        bulges,
        arcMode ? ARC_BULGE : undefined
      )

      try {
        const nextPointResult =
          await AcApDocManager.instance.editor.getPoint(nextPointPrompt)
        if (nextPointResult.status === AcEdPromptStatus.Keyword) {
          if (nextPointResult.stringResult === 'Arc') {
            arcMode = true
          } else if (nextPointResult.stringResult === 'Line') {
            arcMode = false
          } else if (nextPointResult.stringResult === 'Angle') {
            const anglePrompt = new AcEdPromptDoubleOptions(
              AcApI18n.t('jig.polyline.arcAngle')
            )
            const angleResult =
              await AcApDocManager.instance.editor.getDouble(anglePrompt)
            if (angleResult.status !== AcEdPromptStatus.OK) break

            const endPrompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.polyline.arcEndPoint')
            )
            endPrompt.useDashedLine = true
            endPrompt.useBasePoint = true
            endPrompt.basePoint = new AcGePoint3d(startPoint)
            const endResult =
              await AcApDocManager.instance.editor.getPoint(endPrompt)
            if (endResult.status !== AcEdPromptStatus.OK) break

            const angleRad = (angleResult.value ?? 0) * (Math.PI / 180)
            const bulge = Math.tan(angleRad / 4)
            bulges[points.length - 1] = bulge
            currentPoint = endResult.value!
            points.push(new AcGePoint2d(currentPoint))
            bulges.push(undefined)
          } else if (nextPointResult.stringResult === 'Center') {
            const centerPrompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.polyline.arcCenter')
            )
            const centerResult =
              await AcApDocManager.instance.editor.getPoint(centerPrompt)
            if (centerResult.status !== AcEdPromptStatus.OK) break

            const endPrompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.polyline.arcEndPoint')
            )
            endPrompt.useDashedLine = true
            endPrompt.useBasePoint = true
            endPrompt.basePoint = new AcGePoint3d(startPoint)
            const endResult =
              await AcApDocManager.instance.editor.getPoint(endPrompt)
            if (endResult.status !== AcEdPromptStatus.OK) break

            const bulge = this.computeBulgeFromCenter(
              startPoint,
              endResult.value!,
              centerResult.value!
            )
            if (bulge === undefined) continue
            bulges[points.length - 1] = bulge
            currentPoint = endResult.value!
            points.push(new AcGePoint2d(currentPoint))
            bulges.push(undefined)
          } else if (nextPointResult.stringResult === 'SecondPoint') {
            const secondPrompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.polyline.arcSecondPoint')
            )
            secondPrompt.useDashedLine = true
            secondPrompt.useBasePoint = true
            secondPrompt.basePoint = new AcGePoint3d(startPoint)
            const secondResult =
              await AcApDocManager.instance.editor.getPoint(secondPrompt)
            if (secondResult.status !== AcEdPromptStatus.OK) break

            const endPrompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.polyline.arcEndPoint')
            )
            endPrompt.useDashedLine = true
            endPrompt.useBasePoint = true
            endPrompt.basePoint = new AcGePoint3d(startPoint)
            const endResult =
              await AcApDocManager.instance.editor.getPoint(endPrompt)
            if (endResult.status !== AcEdPromptStatus.OK) break

            const bulge = this.computeBulgeFromThreePoints(
              startPoint,
              secondResult.value!,
              endResult.value!
            )
            if (bulge === undefined) continue
            bulges[points.length - 1] = bulge
            currentPoint = endResult.value!
            points.push(new AcGePoint2d(currentPoint))
            bulges.push(undefined)
          } else if (nextPointResult.stringResult === 'Radius') {
            const radiusPrompt = new AcEdPromptDoubleOptions(
              AcApI18n.t('jig.polyline.arcRadius')
            )
            const radiusResult =
              await AcApDocManager.instance.editor.getDouble(radiusPrompt)
            if (radiusResult.status !== AcEdPromptStatus.OK) break

            const endPrompt = new AcEdPromptPointOptions(
              AcApI18n.t('jig.polyline.arcEndPoint')
            )
            endPrompt.useDashedLine = true
            endPrompt.useBasePoint = true
            endPrompt.basePoint = new AcGePoint3d(startPoint)
            const endResult =
              await AcApDocManager.instance.editor.getPoint(endPrompt)
            if (endResult.status !== AcEdPromptStatus.OK) break

            const bulge = this.computeBulgeFromRadius(
              startPoint,
              endResult.value!,
              radiusResult.value ?? 0
            )
            if (bulge === undefined) continue
            bulges[points.length - 1] = bulge
            currentPoint = endResult.value!
            points.push(new AcGePoint2d(currentPoint))
            bulges.push(undefined)
          } else if (
            nextPointResult.stringResult === 'Undo' &&
            points.length > 1
          ) {
            points.pop()
            bulges.pop()
            bulges[bulges.length - 1] = undefined
            currentPoint = points[points.length - 1]
          }
          continue
        }
        if (nextPointResult.status !== AcEdPromptStatus.OK) {
          // User canceled or pressed Enter, exit loop
          break
        }
        currentPoint = nextPointResult.value!
        if (points.length > 0) {
          bulges[points.length - 1] = arcMode ? ARC_BULGE : undefined
        }
        points.push(new AcGePoint2d(currentPoint))
        bulges.push(undefined)
      } catch {
        // User canceled, exit loop
        break
      }
    }

    // Create polyline if we have at least two points
    if (points.length >= 2) {
      const db = context.doc.database
      const polyline = new AcDbPolyline()
      points.forEach((p, index) =>
        polyline.addVertexAt(index, p, bulges[index])
      )
      db.tables.blockTable.modelSpace.appendEntity(polyline)
    }
  }
}
