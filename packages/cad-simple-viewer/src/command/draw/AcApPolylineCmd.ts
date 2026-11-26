import {
  AcDbPolyline,
  acgeBulgeFromCenter,
  acgeBulgeFromStartEndDirection,
  acgeBulgeFromStartEndRadius,
  acgeBulgeFromThreePoints,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app/index.js'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import {
  acapPolylineArcFromTangentAndIncludedAngle,
  acapPolylineFlipArcBulgeForCtrl,
  acapPolylineIncomingTangentRadians,
  acapPolylinePointAlongTangent
} from './AcApPolylineArcGeom.js'

/**
 * Preview jig that dynamically updates a polyline while the user is acquiring
 * the *next* point.
 *
 * Responsibilities:
 * - Keep the already-confirmed vertices visible.
 * - Add a transient "current" vertex that follows the cursor (or a projected
 *   endpoint when `endPointProvider` is set, e.g. PLINE Angle).
 * - Update the bulge of the last confirmed vertex to preview arc/line changes.
 *
 * Why this jig exists:
 * - Point acquisition needs *live* geometry updates as the cursor moves.
 * - We update the polyline incrementally (add/remove a single temp vertex)
 *   instead of `reset()` to avoid flicker and preserve transient state.
 */
export class AcApPolylineJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _polyline: AcDbPolyline
  private _points: AcGePoint2d[]
  private _bulges: (number | undefined)[]
  private _currentBulge?: number
  private _bulgeProvider?: (endPoint: AcGePoint2dLike) => number | undefined
  private _endPointProvider?: (cursor: AcGePoint2dLike) => AcGePoint2dLike
  private _baseCount: number
  private _hasTemp: boolean = false
  private _appliedBulge?: number

  /**
   * Create a polyline preview jig for point acquisition.
   *
   * @param view - The associated view for transient rendering.
   * @param points - Confirmed polyline vertices.
   * @param bulges - Bulge values aligned with `points`.
   * @param currentBulge - Optional fixed bulge used for the preview segment.
   * @param bulgeProvider - Optional function to compute bulge based on the
   *                        current (possibly projected) end point.
   * @param endPointProvider - Optional cursor → endpoint map (Angle mode).
   */
  constructor(
    view: AcEdBaseView,
    points: AcGePoint2d[],
    bulges: (number | undefined)[],
    currentBulge?: number,
    bulgeProvider?: (endPoint: AcGePoint2dLike) => number | undefined,
    endPointProvider?: (cursor: AcGePoint2dLike) => AcGePoint2dLike
  ) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._points = points
    this._bulges = bulges
    this._currentBulge = currentBulge
    this._bulgeProvider = bulgeProvider
    this._endPointProvider = endPointProvider
    this._baseCount = points.length
    this._appliedBulge = this._bulges[this._baseCount - 1]
    this.addBaseVertices()
  }

  /**
   * The transient polyline entity being previewed.
   */
  get entity(): AcDbPolyline {
    return this._polyline
  }

  /**
   * Update the preview polyline as the cursor moves.
   *
   * This updates:
   * - The bulge of the last confirmed vertex (if needed).
   * - A single temporary vertex representing the current end point.
   */
  update(point: AcGePoint2dLike) {
    if (this._baseCount === 0) return

    if (this._hasTemp) {
      this._polyline.removeVertexAt(this._baseCount)
      this._hasTemp = false
    }

    const endPoint = this._endPointProvider?.(point) ?? point
    const lastIndex = this._baseCount - 1
    const dynamicBulge = this._bulgeProvider?.(endPoint)
    const desiredBulge =
      dynamicBulge ?? this._currentBulge ?? this._bulges[lastIndex]

    if (desiredBulge !== this._appliedBulge) {
      const lastPoint = this._points[lastIndex]
      this._polyline.removeVertexAt(lastIndex)
      this._polyline.addVertexAt(lastIndex, lastPoint, desiredBulge)
      this._appliedBulge = desiredBulge
    }

    this._polyline.addVertexAt(
      this._baseCount,
      new AcGePoint2d(endPoint),
      undefined
    )
    this._hasTemp = true
  }

  /**
   * Seed the preview entity with the confirmed vertices.
   */
  private addBaseVertices() {
    this._points.forEach((p, index) =>
      this._polyline.addVertexAt(index, p, this._bulges[index])
    )
  }
}

/**
 * Static preview jig used to keep the already-built polyline visible during
 * *non-point* prompts (angle, center, radius, etc.).
 *
 * Why this jig exists:
 * - Some prompts (like `getDouble`) don't update geometry, but the existing
 *   polyline should remain visible so the user doesn't lose context.
 * - Using a separate jig avoids coupling static rendering with the dynamic
 *   point-following behavior of {@link AcApPolylineJig}.
 *
 * In short:
 * - `AcApPolylineJig` is for live point tracking.
 * - `AcApPolylineStaticJig` is for "hold the drawing while asking other inputs".
 */
class AcApPolylineStaticJig<T> extends AcEdPreviewJig<T> {
  private _polyline: AcDbPolyline

  /**
   * Create a static polyline preview jig.
   *
   * @param view - The associated view for transient rendering.
   * @param points - Confirmed polyline vertices.
   * @param bulges - Bulge values aligned with `points`.
   */
  constructor(
    view: AcEdBaseView,
    points: AcGePoint2d[],
    bulges: (number | undefined)[]
  ) {
    super(view)
    this._polyline = new AcDbPolyline()
    points.forEach((p, index) =>
      this._polyline.addVertexAt(index, p, bulges[index])
    )
  }

  /**
   * The transient polyline entity being previewed.
   */
  get entity(): AcDbPolyline {
    return this._polyline
  }

  /**
   * No-op update. This jig keeps a static preview visible.
   */
  update(_value: T) {
    // Static preview: keep current polyline visible during prompts.
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
    AcApDocManager.instance.editor.resetInputToggles()
    const points: AcGePoint2d[] = []
    const bulges: (number | undefined)[] = []
    let closed = false
    const applyArcDirection = (bulge?: number) => {
      if (bulge == null) return bulge
      const toggles = AcApDocManager.instance.editor.getInputToggles()
      return toggles.ctrlArcFlip
        ? acapPolylineFlipArcBulgeForCtrl(bulge)
        : bulge
    }
    const getIncomingTangent = () =>
      acapPolylineIncomingTangentRadians(points, bulges)
    const computeDefaultArcBulge = (end: AcGePoint2dLike) => {
      const start = getCurrentPoint()
      if (!start) return undefined
      return acgeBulgeFromStartEndDirection(start, end, getIncomingTangent())
    }
    const createStaticJig = <T>() =>
      new AcApPolylineStaticJig<T>(context.view, points, bulges)
    const createPreviewJig = (
      currentBulge?: number,
      bulgeProvider?: (endPoint: AcGePoint2dLike) => number | undefined,
      endPointProvider?: (cursor: AcGePoint2dLike) => AcGePoint2dLike
    ) =>
      new AcApPolylineJig(
        context.view,
        points,
        bulges,
        currentBulge,
        bulgeProvider,
        endPointProvider
      )
    const getCurrentPoint = () => points[points.length - 1]
    const setSegmentBulge = (bulge?: number) => {
      if (points.length > 0) {
        bulges[points.length - 1] = bulge
      }
    }
    const appendPoint = (point: AcGePoint2dLike) => {
      points.push(new AcGePoint2d(point))
      bulges.push(undefined)
    }
    const undoLast = () => {
      if (points.length <= 1) return
      points.pop()
      bulges.pop()
      bulges[bulges.length - 1] = undefined
    }
    const shouldFinish = (status: AcEdPromptStatus) =>
      status !== AcEdPromptStatus.OK && status !== AcEdPromptStatus.Keyword

    type StepResult = AcEdPromptStateStep
    type PolylineState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type PolylineStateMachine = AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >

    class LineState implements PolylineState {
      constructor(private machine: PolylineStateMachine) {}

      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.polyline.nextPointWithOptions')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.arc.display'),
          AcApI18n.t('jig.polyline.keywords.arc.global'),
          AcApI18n.t('jig.polyline.keywords.arc.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.length.display'),
          AcApI18n.t('jig.polyline.keywords.length.global'),
          AcApI18n.t('jig.polyline.keywords.length.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.undo.display'),
          AcApI18n.t('jig.polyline.keywords.undo.global'),
          AcApI18n.t('jig.polyline.keywords.undo.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.close.display'),
          AcApI18n.t('jig.polyline.keywords.close.global'),
          AcApI18n.t('jig.polyline.keywords.close.local')
        )
        prompt.useDashedLine = true
        prompt.useBasePoint = true
        const basePoint = getCurrentPoint()
        if (basePoint) {
          prompt.basePoint = new AcGePoint3d(basePoint)
        }
        prompt.jig = createPreviewJig(undefined)
        // AutoCAD PLINE: Enter at "next point" ends the command without adding a vertex.
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'Arc') {
            this.machine.setState(new ArcState(this.machine))
          } else if (keyword === 'Length') {
            const startPoint = getCurrentPoint()
            if (!startPoint) return 'finish'
            const lengthPrompt = new AcEdPromptDistanceOptions(
              AcApI18n.t('jig.polyline.segmentLength')
            )
            lengthPrompt.allowZero = false
            lengthPrompt.allowNegative = false
            lengthPrompt.useBasePoint = true
            lengthPrompt.basePoint = new AcGePoint3d(startPoint)
            lengthPrompt.jig = createStaticJig<number>()
            const lengthResult =
              await AcApDocManager.instance.editor.getDistance(lengthPrompt)
            if (shouldFinish(lengthResult.status)) return 'finish'
            const next = acapPolylinePointAlongTangent(
              startPoint,
              getIncomingTangent(),
              lengthResult.value ?? 0
            )
            if (!next) return 'continue'
            setSegmentBulge(undefined)
            appendPoint(next)
          } else if (keyword === 'Undo') {
            undoLast()
          } else if (keyword === 'Close' && points.length > 1) {
            closed = true
            setSegmentBulge(undefined)
            return 'finish'
          }
          return 'continue'
        }

        if (result.status === AcEdPromptStatus.OK) {
          setSegmentBulge(undefined)
          appendPoint(result.value!)
          return 'continue'
        }

        return 'finish'
      }
    }

    class ArcState implements PolylineState {
      constructor(private machine: PolylineStateMachine) {}

      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.polyline.nextPointWithArcOptions')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.angle.display'),
          AcApI18n.t('jig.polyline.keywords.angle.global'),
          AcApI18n.t('jig.polyline.keywords.angle.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.center.display'),
          AcApI18n.t('jig.polyline.keywords.center.global'),
          AcApI18n.t('jig.polyline.keywords.center.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.direction.display'),
          AcApI18n.t('jig.polyline.keywords.direction.global'),
          AcApI18n.t('jig.polyline.keywords.direction.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.secondPoint.display'),
          AcApI18n.t('jig.polyline.keywords.secondPoint.global'),
          AcApI18n.t('jig.polyline.keywords.secondPoint.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.radius.display'),
          AcApI18n.t('jig.polyline.keywords.radius.global'),
          AcApI18n.t('jig.polyline.keywords.radius.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.line.display'),
          AcApI18n.t('jig.polyline.keywords.line.global'),
          AcApI18n.t('jig.polyline.keywords.line.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.undo.display'),
          AcApI18n.t('jig.polyline.keywords.undo.global'),
          AcApI18n.t('jig.polyline.keywords.undo.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.polyline.keywords.close.display'),
          AcApI18n.t('jig.polyline.keywords.close.global'),
          AcApI18n.t('jig.polyline.keywords.close.local')
        )
        prompt.useDashedLine = true
        prompt.useBasePoint = true
        const basePoint = getCurrentPoint()
        if (basePoint) {
          prompt.basePoint = new AcGePoint3d(basePoint)
        }
        prompt.jig = createPreviewJig(undefined, end =>
          applyArcDirection(computeDefaultArcBulge(end))
        )
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          const bulge = computeDefaultArcBulge(result.value!)
          if (bulge === undefined) return 'continue'
          setSegmentBulge(applyArcDirection(bulge))
          appendPoint(result.value!)
          return 'continue'
        }

        if (result.status !== AcEdPromptStatus.Keyword) return 'finish'

        const keyword = result.stringResult ?? ''
        if (keyword === 'Line') {
          this.machine.setState(new LineState(this.machine))
          return 'continue'
        }
        if (keyword === 'Undo') {
          undoLast()
          return 'continue'
        }
        if (keyword === 'Close' && points.length > 1) {
          closed = true
          setSegmentBulge(undefined)
          return 'finish'
        }

        const startPoint = getCurrentPoint()
        if (!startPoint) return 'finish'

        if (keyword === 'Angle') {
          const anglePrompt = new AcEdPromptDoubleOptions(
            AcApI18n.t('jig.polyline.arcAngle')
          )
          anglePrompt.jig = createStaticJig<number>()
          const angleResult =
            await AcApDocManager.instance.editor.getDouble(anglePrompt)
          if (shouldFinish(angleResult.status)) return 'finish'

          const endPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcEndPoint')
          )
          endPrompt.useDashedLine = true
          endPrompt.useBasePoint = true
          endPrompt.basePoint = new AcGePoint3d(startPoint)
          const angleRad = (angleResult.value ?? 0) * (Math.PI / 180)
          const tangent = getIncomingTangent()
          const resolveAngleSegment = (cursor: AcGePoint2dLike) => {
            const segment = acapPolylineArcFromTangentAndIncludedAngle(
              startPoint,
              cursor,
              tangent,
              angleRad
            )
            if (!segment) return undefined
            return {
              end: segment.end,
              bulge: applyArcDirection(segment.bulge)
            }
          }
          endPrompt.jig = createPreviewJig(
            undefined,
            end => {
              // `end` is already the projected endpoint from endPointProvider.
              const segment = acapPolylineArcFromTangentAndIncludedAngle(
                startPoint,
                // Reconstruct a cursor on the chord ray at this distance so
                // bulge matches the projected segment (same as resolve).
                end,
                tangent,
                angleRad
              )
              return applyArcDirection(segment?.bulge)
            },
            cursor => resolveAngleSegment(cursor)?.end ?? cursor
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const resolved = resolveAngleSegment(endResult.value!)
          if (!resolved || resolved.bulge == null) return 'continue'
          setSegmentBulge(resolved.bulge)
          appendPoint(resolved.end)
          return 'continue'
        }

        if (keyword === 'Center') {
          const centerPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcCenter')
          )
          centerPrompt.jig = createStaticJig<AcGePoint3d>()
          const centerResult =
            await AcApDocManager.instance.editor.getPoint(centerPrompt)
          if (shouldFinish(centerResult.status)) return 'finish'

          const endPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcEndPoint')
          )
          endPrompt.useDashedLine = true
          endPrompt.useBasePoint = true
          endPrompt.basePoint = new AcGePoint3d(startPoint)
          endPrompt.jig = createPreviewJig(undefined, end =>
            applyArcDirection(
              acgeBulgeFromCenter(startPoint, end, centerResult.value!)
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = acgeBulgeFromCenter(
            startPoint,
            endResult.value!,
            centerResult.value!
          )
          if (bulge === undefined) return 'continue'
          setSegmentBulge(applyArcDirection(bulge))
          appendPoint(endResult.value!)
          return 'continue'
        }

        if (keyword === 'Direction') {
          const directionPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcDirection')
          )
          directionPrompt.useDashedLine = true
          directionPrompt.useBasePoint = true
          directionPrompt.basePoint = new AcGePoint3d(startPoint)
          directionPrompt.jig = createStaticJig<AcGePoint3d>()
          const directionResult =
            await AcApDocManager.instance.editor.getPoint(directionPrompt)
          if (shouldFinish(directionResult.status)) return 'finish'

          const directionPoint = directionResult.value!
          const direction = Math.atan2(
            directionPoint.y - startPoint.y,
            directionPoint.x - startPoint.x
          )

          const endPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcEndPoint')
          )
          endPrompt.useDashedLine = true
          endPrompt.useBasePoint = true
          endPrompt.basePoint = new AcGePoint3d(startPoint)
          endPrompt.jig = createPreviewJig(undefined, end =>
            applyArcDirection(
              acgeBulgeFromStartEndDirection(startPoint, end, direction)
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = acgeBulgeFromStartEndDirection(
            startPoint,
            endResult.value!,
            direction
          )
          if (bulge === undefined) return 'continue'
          setSegmentBulge(applyArcDirection(bulge))
          appendPoint(endResult.value!)
          return 'continue'
        }

        if (keyword === 'SecondPoint') {
          const secondPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcSecondPoint')
          )
          secondPrompt.jig = createStaticJig<AcGePoint3d>()
          secondPrompt.useDashedLine = true
          secondPrompt.useBasePoint = true
          secondPrompt.basePoint = new AcGePoint3d(startPoint)
          const secondResult =
            await AcApDocManager.instance.editor.getPoint(secondPrompt)
          if (shouldFinish(secondResult.status)) return 'finish'

          const endPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcEndPoint')
          )
          endPrompt.useDashedLine = true
          endPrompt.useBasePoint = true
          endPrompt.basePoint = new AcGePoint3d(startPoint)
          endPrompt.jig = createPreviewJig(undefined, end =>
            applyArcDirection(
              acgeBulgeFromThreePoints(startPoint, secondResult.value!, end)
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = acgeBulgeFromThreePoints(
            startPoint,
            secondResult.value!,
            endResult.value!
          )
          if (bulge === undefined) return 'continue'
          setSegmentBulge(applyArcDirection(bulge))
          appendPoint(endResult.value!)
          return 'continue'
        }

        if (keyword === 'Radius') {
          const radiusPrompt = new AcEdPromptDoubleOptions(
            AcApI18n.t('jig.polyline.arcRadius')
          )
          radiusPrompt.jig = createStaticJig<number>()
          const radiusResult =
            await AcApDocManager.instance.editor.getDouble(radiusPrompt)
          if (shouldFinish(radiusResult.status)) return 'finish'

          const endPrompt = new AcEdPromptPointOptions(
            AcApI18n.t('jig.polyline.arcEndPoint')
          )
          endPrompt.useDashedLine = true
          endPrompt.useBasePoint = true
          endPrompt.basePoint = new AcGePoint3d(startPoint)
          endPrompt.jig = createPreviewJig(undefined, end =>
            applyArcDirection(
              acgeBulgeFromStartEndRadius(
                startPoint,
                end,
                radiusResult.value ?? 0
              )
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = acgeBulgeFromStartEndRadius(
            startPoint,
            endResult.value!,
            radiusResult.value ?? 0
          )
          if (bulge === undefined) return 'continue'
          setSegmentBulge(applyArcDirection(bulge))
          appendPoint(endResult.value!)
          return 'continue'
        }

        return 'continue'
      }
    }

    // Get first point
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.polyline.firstPoint')
    )
    const firstPointResult =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
    if (firstPointResult.status !== AcEdPromptStatus.OK) return
    appendPoint(firstPointResult.value!)

    // Get subsequent points until user presses Enter
    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new LineState(machine))
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    // Create polyline if we have at least two points
    if (points.length >= 2) {
      const db = context.doc.database
      const polyline = new AcDbPolyline()
      points.forEach((p, index) =>
        polyline.addVertexAt(index, p, bulges[index])
      )
      if (closed) {
        polyline.closed = true
      }
      db.tables.blockTable.modelSpace.appendEntity(polyline)
    }
  }
}
