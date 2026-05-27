import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGeTol,
  TAU
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Preview jig that dynamically updates a polyline while the user is acquiring
 * the *next* point.
 *
 * Responsibilities:
 * - Keep the already-confirmed vertices visible.
 * - Add a transient "current" vertex that follows the cursor.
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
  private _baseCount: number
  private _hasTemp: boolean = false
  private _appliedBulge?: number

  /**
   * Creates a polyline jig.
   *
   * @param view - The associated view
   */
  /**
   * Create a polyline preview jig for point acquisition.
   *
   * @param view - The associated view for transient rendering.
   * @param points - Confirmed polyline vertices.
   * @param bulges - Bulge values aligned with `points`.
   * @param currentBulge - Optional fixed bulge used for the preview segment.
   * @param bulgeProvider - Optional function to compute bulge based on the
   *                        current cursor point.
   */
  constructor(
    view: AcEdBaseView,
    points: AcGePoint2d[],
    bulges: (number | undefined)[],
    currentBulge?: number,
    bulgeProvider?: (endPoint: AcGePoint2dLike) => number | undefined
  ) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._points = points
    this._bulges = bulges
    this._currentBulge = currentBulge
    this._bulgeProvider = bulgeProvider
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
   * - A single temporary vertex representing the current cursor position.
   */
  update(point: AcGePoint2dLike) {
    if (this._baseCount === 0) return

    if (this._hasTemp) {
      this._polyline.removeVertexAt(this._baseCount)
      this._hasTemp = false
    }

    const lastIndex = this._baseCount - 1
    const dynamicBulge = this._bulgeProvider?.(point)
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
      new AcGePoint2d(point),
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

  /**
   * Bulge for the complementary arc on the same circle (same endpoints and start
   * tangent): included angle `2π - |θ|` instead of `θ`.
   *
   * @param bulge - Bulge of the current arc segment.
   * @returns Bulge for the other arc on the same circle.
   */
  private complementBulge(bulge: number) {
    if (AcGeTol.equalToZero(bulge)) return bulge
    const sweep = 4 * Math.atan(bulge)
    const sign = Math.sign(sweep) || 1
    const complementSweep = sign * (Math.PI * 2 - Math.abs(sweep))
    if (AcGeTol.equalToZero(complementSweep)) return bulge
    return Math.tan(complementSweep / 4)
  }

  /**
   * Bulge used when Ctrl is pressed during PLINE arc: the complementary arc on the
   * opposite side of the chord (negated complement). This matches AutoCAD — the
   * rest of the circle, bulging to the other side of the current segment.
   *
   * @param bulge - Bulge of the current arc segment.
   * @returns Bulge for the Ctrl-toggle preview/result.
   */
  private flipArcBulgeForCtrl(bulge: number) {
    return -this.complementBulge(bulge)
  }

  /**
   * Arc center from chord endpoints and bulge (polyline arc convention).
   */
  private computeArcCenterFromBulge(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    bulge: number
  ) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const chord = Math.hypot(dx, dy)
    if (AcGeTol.isNonPositive(chord)) return undefined

    const mx = (start.x + end.x) / 2
    const my = (start.y + end.y) / 2
    const ux = -dy / chord
    const uy = dx / chord
    const offset = (chord / 2) * bulge
    return { x: mx + ux * offset, y: my + uy * offset }
  }

  /**
   * Forward tangent at a point on a circular arc, from center and sweep direction.
   */
  private getGeometricTangentAtPoint(
    point: AcGePoint2dLike,
    center: AcGePoint2dLike,
    ccw: boolean
  ) {
    const vx = point.x - center.x
    const vy = point.y - center.y
    return ccw ? Math.atan2(-vy, vx) : Math.atan2(vy, -vx)
  }

  /**
   * Tangent direction (radians) at the end of an arc segment, along polyline flow.
   */
  private getArcTangentAtEnd(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    bulge: number
  ) {
    const center = this.computeArcCenterFromBulge(start, end, bulge)
    if (!center) return undefined
    return this.getGeometricTangentAtPoint(end, center, bulge >= 0)
  }

  /**
   * Incoming tangent at the last vertex (direction of the previous segment).
   */
  private getIncomingTangentRadians(
    points: AcGePoint2d[],
    bulges: (number | undefined)[]
  ) {
    if (points.length < 2) return 0

    const start = points[points.length - 1]
    const prev = points[points.length - 2]
    const prevBulge = bulges[points.length - 2]
    if (prevBulge == null || AcGeTol.equalToZero(prevBulge)) {
      return Math.atan2(start.y - prev.y, start.x - prev.x)
    }
    const exitTangent = this.getArcTangentAtEnd(prev, start, prevBulge)
    return exitTangent ?? Math.atan2(start.y - prev.y, start.x - prev.x)
  }

  /**
   * Bulge for an arc through `start` and `end` that is tangent to `tangentRad` at `start`.
   */
  private computeBulgeFromTangentDirection(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    tangentRad: number
  ) {
    const tx = Math.cos(tangentRad)
    const ty = Math.sin(tangentRad)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const nx = -ty
    const ny = tx
    const denominator = 2 * (dx * nx + dy * ny)
    if (AcGeTol.equalToZero(denominator)) return undefined

    const lambda = (dx * dx + dy * dy) / denominator
    if (!Number.isFinite(lambda)) return undefined

    const center = {
      x: start.x + nx * lambda,
      y: start.y + ny * lambda
    }
    return this.computeBulgeFromCenterWithTangent(
      start,
      end,
      center,
      tangentRad
    )
  }

  /**
   * Bulge from a known center, sweeping in the direction that matches `tangentRad`
   * at `start` (including included angles greater than 180°).
   *
   * Orientation follows the same rule as {@link createArcFromStartEndDirection} in
   * `AcApArcCmd`: compare the incoming tangent with the start radius vector.
   */
  private computeBulgeFromCenterWithTangent(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    center: AcGePoint2dLike,
    tangentRad: number
  ) {
    const v1x = start.x - center.x
    const v1y = start.y - center.y
    const v2x = end.x - center.x
    const v2y = end.y - center.y
    const tx = Math.cos(tangentRad)
    const ty = Math.sin(tangentRad)
    const chordX = end.x - start.x
    const chordY = end.y - start.y

    const crossStartTangent = v1x * ty - v1y * tx
    let ccw: boolean
    if (AcGeTol.isPositive(Math.abs(crossStartTangent))) {
      ccw = crossStartTangent > 0
    } else {
      const chordCrossTangent = chordX * ty - chordY * tx
      ccw = chordCrossTangent >= 0
    }

    const startAngle = Math.atan2(v1y, v1x)
    const endAngle = Math.atan2(v2y, v2x)

    let sweep: number
    if (ccw) {
      sweep = endAngle - startAngle
      if (AcGeTol.isNonPositive(sweep)) sweep += Math.PI * 2
    } else {
      sweep = startAngle - endAngle
      if (AcGeTol.isNonPositive(sweep)) sweep += Math.PI * 2
    }
    if (!AcGeTol.great(TAU - sweep, 0)) return undefined

    return ccw ? Math.tan(sweep / 4) : -Math.tan(sweep / 4)
  }

  /**
   * Bulge for an arc with a fixed included angle that is tangent at `start`.
   */
  private computeBulgeFromTangentAndIncludedAngle(
    start: AcGePoint2dLike,
    end: AcGePoint2dLike,
    tangentRad: number,
    includedAngleRad: number
  ) {
    const tx = Math.cos(tangentRad)
    const ty = Math.sin(tangentRad)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const nx = -ty
    const ny = tx
    const denominator = 2 * (dx * nx + dy * ny)
    if (AcGeTol.equalToZero(denominator)) return undefined

    const lambda = (dx * dx + dy * dy) / denominator
    if (!Number.isFinite(lambda)) return undefined

    const center = {
      x: start.x + nx * lambda,
      y: start.y + ny * lambda
    }
    const referenceBulge = this.computeBulgeFromCenterWithTangent(
      start,
      end,
      center,
      tangentRad
    )
    if (referenceBulge == null) return undefined

    const requested = Math.tan(includedAngleRad / 4)
    if (!Number.isFinite(requested)) return undefined
    return Math.sign(referenceBulge) * Math.abs(requested)
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
    if (AcGeTol.equalToZero(det)) return undefined

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
    AcApDocManager.instance.editor.resetInputToggles()
    const points: AcGePoint2d[] = []
    const bulges: (number | undefined)[] = []
    let closed = false
    const applyArcDirection = (bulge?: number) => {
      if (bulge == null) return bulge
      const toggles = AcApDocManager.instance.editor.getInputToggles()
      return toggles.ctrlArcFlip ? this.flipArcBulgeForCtrl(bulge) : bulge
    }
    const computeBulgeFromCenter = (
      start: AcGePoint2dLike,
      end: AcGePoint2dLike,
      center: AcGePoint2dLike
    ) => this.computeBulgeFromCenter(start, end, center)
    const computeBulgeFromThreePoints = (
      start: AcGePoint2dLike,
      mid: AcGePoint2dLike,
      end: AcGePoint2dLike
    ) => this.computeBulgeFromThreePoints(start, mid, end)
    const computeBulgeFromRadius = (
      start: AcGePoint2dLike,
      end: AcGePoint2dLike,
      radius: number
    ) => this.computeBulgeFromRadius(start, end, radius)
    const getIncomingTangent = () =>
      this.getIncomingTangentRadians(points, bulges)
    const computeDefaultArcBulge = (end: AcGePoint2dLike) => {
      const start = getCurrentPoint()
      if (!start) return undefined
      return this.computeBulgeFromTangentDirection(
        start,
        end,
        getIncomingTangent()
      )
    }
    const computeBulgeFromTangentAndIncludedAngle = (
      start: AcGePoint2dLike,
      end: AcGePoint2dLike,
      tangentRad: number,
      includedAngleRad: number
    ) =>
      this.computeBulgeFromTangentAndIncludedAngle(
        start,
        end,
        tangentRad,
        includedAngleRad
      )
    const createStaticJig = <T>() =>
      new AcApPolylineStaticJig<T>(context.view, points, bulges)
    const createPreviewJig = (
      currentBulge?: number,
      bulgeProvider?: (endPoint: AcGePoint2dLike) => number | undefined
    ) =>
      new AcApPolylineJig(
        context.view,
        points,
        bulges,
        currentBulge,
        bulgeProvider
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
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'Arc') {
            this.machine.setState(new ArcState(this.machine))
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
          endPrompt.jig = createPreviewJig(undefined, end =>
            applyArcDirection(
              computeBulgeFromTangentAndIncludedAngle(
                startPoint,
                end,
                tangent,
                angleRad
              )
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const angleBulge = computeBulgeFromTangentAndIncludedAngle(
            startPoint,
            endResult.value!,
            tangent,
            angleRad
          )
          if (angleBulge === undefined) return 'continue'
          setSegmentBulge(applyArcDirection(angleBulge))
          appendPoint(endResult.value!)
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
              computeBulgeFromCenter(startPoint, end, centerResult.value!)
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = computeBulgeFromCenter(
            startPoint,
            endResult.value!,
            centerResult.value!
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
              computeBulgeFromThreePoints(startPoint, secondResult.value!, end)
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = computeBulgeFromThreePoints(
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
              computeBulgeFromRadius(startPoint, end, radiusResult.value ?? 0)
            )
          )
          const endResult =
            await AcApDocManager.instance.editor.getPoint(endPrompt)
          if (shouldFinish(endResult.status)) return 'finish'

          const bulge = computeBulgeFromRadius(
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
