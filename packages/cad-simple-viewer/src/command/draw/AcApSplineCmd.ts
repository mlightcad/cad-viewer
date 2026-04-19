import {
  AcDbSpline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

type AcApSplineMethod = 'fit' | 'cv'
type AcApSplineKnotsType = 'chord' | 'sqrtChord' | 'uniform'
type AcApSplineKnotParameterization = 'Uniform' | 'Chord' | 'SqrtChord'

interface AcApSplineSettings {
  method: AcApSplineMethod
  knotsType: AcApSplineKnotsType
  degree: number
}

/**
 * Dynamic preview jig for SPLINE command.
 *
 * Reuses a transient spline entity and rebuilds it on each cursor move.
 */
export class AcApSplineJig extends AcEdPreviewJig<AcGePoint2dLike> {
  /**
   * Transient spline entity shown during preview.
   */
  private _spline: AcDbSpline
  /**
   * Fixed accepted points collected so far.
   */
  private _points: AcGePoint2d[]
  /**
   * Current spline construction settings.
   */
  private _settings: AcApSplineSettings
  /**
   * Whether final spline should be closed.
   */
  private _closed: boolean

  /**
   * Creates a dynamic spline preview jig.
   *
   * @param view - Active editor view.
   * @param points - Accepted points before the dynamic cursor point.
   * @param settings - Current method/degree/knots settings.
   * @param closed - Closed flag used for preview behavior.
   */
  constructor(
    view: AcEdBaseView,
    points: AcGePoint2d[],
    settings: AcApSplineSettings,
    closed: boolean
  ) {
    super(view)
    this._points = points
    this._settings = settings
    this._closed = closed
    this._spline = this.createSpline(points)
  }

  /**
   * Gets transient spline entity used by this jig.
   */
  get entity(): AcDbSpline {
    return this._spline
  }

  /**
   * Rebuilds preview spline by combining fixed points with cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: AcGePoint2dLike) {
    const dynamicPoint = new AcGePoint2d(point)
    const lastPoint = this._points[this._points.length - 1]
    const hasDistinctDynamicPoint =
      !lastPoint || !isNearlySamePoint2d(lastPoint, dynamicPoint)
    const newPoints = hasDistinctDynamicPoint
      ? [...this._points, dynamicPoint]
      : [...this._points]
    try {
      this.rebuildSpline(newPoints)
    } catch {
      // Keep the command alive even when temporary preview points
      // produce a degenerate interpolation system.
      this.rebuildSpline(this._points)
    }
  }

  /**
   * Creates initial spline entity from current settings.
   *
   * @param points - Initial fixed points.
   * @returns New spline entity.
   */
  private createSpline(points: AcGePoint2d[]): AcDbSpline {
    return buildSplineEntity(points, this._settings, this._closed)
  }

  /**
   * Rebuilds existing transient spline without replacing entity instance.
   *
   * @param points - Point list used for rebuild.
   */
  private rebuildSpline(points: AcGePoint2d[]) {
    if (points.length < 2) {
      const defaultPoints = [new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 1, 0)]
      const defaultDegree = 1
      const defaultKnots = createKnots(defaultPoints.length, defaultDegree)
      this._spline.rebuild(
        defaultPoints,
        defaultKnots,
        undefined,
        defaultDegree
      )
      return
    }

    const points3d = points.map(p => new AcGePoint3d(p.x, p.y, 0))
    const degree = resolveSplineDegree(points3d.length, this._settings)
    const isClosed = this._closed && points3d.length >= 3

    if (this._settings.method === 'fit') {
      this._spline.rebuild(
        points3d,
        mapKnotsTypeToParameterization(this._settings.knotsType),
        degree,
        isClosed
      )
      return
    }

    const knots = createKnots(points3d.length, degree)
    this._spline.rebuild(points3d, knots, undefined, degree, false)
    if (isClosed) {
      this._spline.closed = true
    }
  }
}

/**
 * Command to create one spline.
 */
export class AcApSplineCmd extends AcEdCommand {
  /**
   * Creates SPLINE command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Uses a point-prompt state machine to support Fit/CV workflows, dynamic
   * method switching, undo, close, and option prompts.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    type StepResult = AcEdPromptStateStep
    type SplineState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type SplineStateMachine = AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >

    const points: AcGePoint2d[] = []
    const settings: AcApSplineSettings = {
      method: 'fit',
      knotsType: 'chord',
      degree: 3
    }
    let closed = false

    const appendPoint = (point: AcGePoint2dLike) => {
      points.push(new AcGePoint2d(point))
    }
    const undoLast = () => {
      if (points.length <= 1) return
      points.pop()
    }
    const getCurrentPoint = () => points[points.length - 1]
    const canClose = () => points.length >= 3

    const createPreviewJig = () =>
      new AcApSplineJig(context.view, points, settings, closed)

    const createStaticJig = <T>() =>
      new AcApSplineStaticJig<T>(context.view, points, settings, closed)

    const promptMethod = async () => {
      const methodPrompt = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.spline.methodPrompt')
      )
      methodPrompt.keywords.add(
        AcApI18n.t('jig.spline.keywords.fit.display'),
        AcApI18n.t('jig.spline.keywords.fit.global'),
        AcApI18n.t('jig.spline.keywords.fit.local')
      )
      methodPrompt.keywords.add(
        AcApI18n.t('jig.spline.keywords.cv.display'),
        AcApI18n.t('jig.spline.keywords.cv.global'),
        AcApI18n.t('jig.spline.keywords.cv.local')
      )
      const methodResult =
        await AcApDocManager.instance.editor.getKeywords(methodPrompt)
      if (methodResult.status !== AcEdPromptStatus.OK) return false

      if (methodResult.stringResult === 'Fit') {
        settings.method = 'fit'
      } else if (methodResult.stringResult === 'CV') {
        settings.method = 'cv'
      }
      return true
    }

    const promptKnotsType = async () => {
      const knotsPrompt = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.spline.knotsPrompt')
      )
      knotsPrompt.jig = createStaticJig<string>()
      knotsPrompt.keywords.add(
        AcApI18n.t('jig.spline.keywords.chord.display'),
        AcApI18n.t('jig.spline.keywords.chord.global'),
        AcApI18n.t('jig.spline.keywords.chord.local')
      )
      knotsPrompt.keywords.add(
        AcApI18n.t('jig.spline.keywords.sqrtChord.display'),
        AcApI18n.t('jig.spline.keywords.sqrtChord.global'),
        AcApI18n.t('jig.spline.keywords.sqrtChord.local')
      )
      knotsPrompt.keywords.add(
        AcApI18n.t('jig.spline.keywords.uniform.display'),
        AcApI18n.t('jig.spline.keywords.uniform.global'),
        AcApI18n.t('jig.spline.keywords.uniform.local')
      )

      const knotsResult =
        await AcApDocManager.instance.editor.getKeywords(knotsPrompt)
      if (knotsResult.status !== AcEdPromptStatus.OK) return false

      if (knotsResult.stringResult === 'Chord') {
        settings.knotsType = 'chord'
      } else if (knotsResult.stringResult === 'SqrtChord') {
        settings.knotsType = 'sqrtChord'
      } else if (knotsResult.stringResult === 'Uniform') {
        settings.knotsType = 'uniform'
      }
      return true
    }

    const promptDegree = async () => {
      const degreePrompt = new AcEdPromptIntegerOptions(
        AcApI18n.t('jig.spline.degreePrompt'),
        1,
        10
      )
      degreePrompt.jig = createStaticJig<number>()
      const degreeResult =
        await AcApDocManager.instance.editor.getInteger(degreePrompt)
      if (degreeResult.status !== AcEdPromptStatus.OK) return false

      const degree = Math.floor(degreeResult.value ?? settings.degree)
      settings.degree = Math.max(1, degree)
      return true
    }

    const applyCommonPromptOptions = (prompt: AcEdPromptPointOptions) => {
      prompt.useDashedLine = true
      prompt.useBasePoint = true
      const basePoint = getCurrentPoint()
      if (basePoint) {
        prompt.basePoint = new AcGePoint3d(basePoint)
      }
      prompt.jig = createPreviewJig()
    }

    /**
     * State-machine node for Fit-point workflow.
     */
    class FitState implements SplineState {
      /**
       * Creates Fit state.
       *
       * @param machine - Owning prompt state machine.
       */
      constructor(private machine: SplineStateMachine) {}

      /**
       * Builds point prompt for fit workflow.
       *
       * @returns Configured point prompt with fit-related keywords.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.spline.nextPointWithFitOptions')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.method.display'),
          AcApI18n.t('jig.spline.keywords.method.global'),
          AcApI18n.t('jig.spline.keywords.method.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.knots.display'),
          AcApI18n.t('jig.spline.keywords.knots.global'),
          AcApI18n.t('jig.spline.keywords.knots.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.undo.display'),
          AcApI18n.t('jig.spline.keywords.undo.global'),
          AcApI18n.t('jig.spline.keywords.undo.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.close.display'),
          AcApI18n.t('jig.spline.keywords.close.global'),
          AcApI18n.t('jig.spline.keywords.close.local')
        )
        applyCommonPromptOptions(prompt)
        return prompt
      }

      /**
       * Handles fit-state prompt result and returns next state-machine action.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          appendPoint(result.value!)
          return 'continue'
        }

        if (result.status !== AcEdPromptStatus.Keyword) return 'finish'

        const keyword = result.stringResult ?? ''
        if (keyword === 'Method') {
          const changed = await promptMethod()
          if (!changed) return 'finish'
          if (settings.method === 'cv') {
            this.machine.setState(new CvState(this.machine))
          }
          return 'continue'
        }
        if (keyword === 'Knots') {
          const changed = await promptKnotsType()
          return changed ? 'continue' : 'finish'
        }
        if (keyword === 'Undo') {
          undoLast()
          return 'continue'
        }
        if (keyword === 'Close' && canClose()) {
          closed = true
          return 'finish'
        }

        return 'continue'
      }
    }

    /**
     * State-machine node for control-vertex workflow.
     */
    class CvState implements SplineState {
      /**
       * Creates CV state.
       *
       * @param machine - Owning prompt state machine.
       */
      constructor(private machine: SplineStateMachine) {}

      /**
       * Builds point prompt for CV workflow.
       *
       * @returns Configured point prompt with CV-related keywords.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.spline.nextPointWithCvOptions')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.method.display'),
          AcApI18n.t('jig.spline.keywords.method.global'),
          AcApI18n.t('jig.spline.keywords.method.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.degree.display'),
          AcApI18n.t('jig.spline.keywords.degree.global'),
          AcApI18n.t('jig.spline.keywords.degree.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.undo.display'),
          AcApI18n.t('jig.spline.keywords.undo.global'),
          AcApI18n.t('jig.spline.keywords.undo.local')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.spline.keywords.close.display'),
          AcApI18n.t('jig.spline.keywords.close.global'),
          AcApI18n.t('jig.spline.keywords.close.local')
        )
        applyCommonPromptOptions(prompt)
        return prompt
      }

      /**
       * Handles CV-state prompt result and returns next state-machine action.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          appendPoint(result.value!)
          return 'continue'
        }

        if (result.status !== AcEdPromptStatus.Keyword) return 'finish'

        const keyword = result.stringResult ?? ''
        if (keyword === 'Method') {
          const changed = await promptMethod()
          if (!changed) return 'finish'
          if (settings.method === 'fit') {
            this.machine.setState(new FitState(this.machine))
          }
          return 'continue'
        }
        if (keyword === 'Degree') {
          const changed = await promptDegree()
          return changed ? 'continue' : 'finish'
        }
        if (keyword === 'Undo') {
          undoLast()
          return 'continue'
        }
        if (keyword === 'Close' && canClose()) {
          closed = true
          return 'finish'
        }

        return 'continue'
      }
    }

    // Get first point or choose method
    while (points.length === 0) {
      const firstPointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.spline.firstPointWithOptions')
      )
      firstPointPrompt.keywords.add(
        AcApI18n.t('jig.spline.keywords.method.display'),
        AcApI18n.t('jig.spline.keywords.method.global'),
        AcApI18n.t('jig.spline.keywords.method.local')
      )
      const firstPointResult =
        await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
      if (firstPointResult.status === AcEdPromptStatus.OK) {
        appendPoint(firstPointResult.value!)
        break
      }
      if (
        firstPointResult.status === AcEdPromptStatus.Keyword &&
        firstPointResult.stringResult === 'Method'
      ) {
        const changed = await promptMethod()
        if (!changed) return
        continue
      }
      return
    }

    // Get subsequent points until user presses Enter
    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(
      settings.method === 'fit' ? new FitState(machine) : new CvState(machine)
    )
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    // Create spline if we have at least two points
    if (points.length >= 2) {
      const db = context.doc.database
      const spline = buildSplineEntity(points, settings, closed)
      db.tables.blockTable.modelSpace.appendEntity(spline)
    }
  }
}

/**
 * Static spline preview jig used by non-point option prompts.
 *
 * @typeParam T - Prompt value type bound to this jig.
 */
class AcApSplineStaticJig<T> extends AcEdPreviewJig<T> {
  /**
   * Transient spline entity built once for static preview.
   */
  private _spline: AcDbSpline

  /**
   * Creates static spline preview jig.
   *
   * @param view - Active editor view.
   * @param points - Current accepted spline points.
   * @param settings - Current method/degree/knots settings.
   * @param closed - Closed flag for preview.
   */
  constructor(
    view: AcEdBaseView,
    points: AcGePoint2d[],
    settings: AcApSplineSettings,
    closed: boolean
  ) {
    super(view)
    this._spline = buildSplineEntity(points, settings, closed)
  }

  /**
   * Gets transient static spline entity.
   */
  get entity(): AcDbSpline {
    return this._spline
  }

  /**
   * No-op update hook for static preview jig.
   *
   * @param _value - Prompt value (unused).
   */
  update(_value: T) {
    // Static preview only.
  }
}

function buildSplineEntity(
  points: AcGePoint2d[],
  settings: AcApSplineSettings,
  closed: boolean
) {
  if (points.length < 2) {
    const fallbackPoints = [new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 1, 0)]
    const fallbackDegree = 1
    const fallbackKnots = createKnots(fallbackPoints.length, fallbackDegree)
    return new AcDbSpline(
      fallbackPoints,
      fallbackKnots,
      undefined,
      fallbackDegree
    )
  }

  const points3dRaw = points.map(p => new AcGePoint3d(p.x, p.y, 0))
  const points3d =
    settings.method === 'fit'
      ? dedupeConsecutivePoints(points3dRaw)
      : points3dRaw
  if (points3d.length < 2) {
    const fallbackPoints = [new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 1, 0)]
    const fallbackDegree = 1
    const fallbackKnots = createKnots(fallbackPoints.length, fallbackDegree)
    return new AcDbSpline(
      fallbackPoints,
      fallbackKnots,
      undefined,
      fallbackDegree
    )
  }
  const degree = resolveSplineDegree(points3d.length, settings)
  const isClosed = closed && points3d.length >= 3

  if (settings.method === 'fit') {
    return new AcDbSpline(
      points3d,
      mapKnotsTypeToParameterization(settings.knotsType),
      degree,
      isClosed
    )
  }

  const knots = createKnots(points3d.length, degree)
  const spline = new AcDbSpline(points3d, knots, undefined, degree, false)
  if (isClosed) {
    spline.closed = true
  }
  return spline
}

function resolveSplineDegree(numPoints: number, settings: AcApSplineSettings) {
  const maxDegree = Math.max(1, numPoints - 1)
  if (settings.method === 'fit') {
    return Math.min(3, maxDegree)
  }
  return Math.min(Math.max(1, settings.degree), maxDegree)
}

function dedupeConsecutivePoints(points: AcGePoint3d[]) {
  if (points.length <= 1) return points
  const deduped: AcGePoint3d[] = [new AcGePoint3d(points[0])]
  for (let i = 1; i < points.length; i++) {
    const last = deduped[deduped.length - 1]
    const current = points[i]
    if (!isNearlySamePoint3d(last, current)) {
      deduped.push(new AcGePoint3d(current))
    }
  }
  return deduped
}

function isNearlySamePoint2d(a: AcGePoint2dLike, b: AcGePoint2dLike) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= 1e-9
}

function isNearlySamePoint3d(a: AcGePoint3d, b: AcGePoint3d) {
  const az = a.z ?? 0
  const bz = b.z ?? 0
  return Math.hypot(a.x - b.x, a.y - b.y, az - bz) <= 1e-9
}

function mapKnotsTypeToParameterization(
  knotsType: AcApSplineKnotsType
): AcApSplineKnotParameterization {
  switch (knotsType) {
    case 'chord':
      return 'Chord'
    case 'sqrtChord':
      return 'SqrtChord'
    case 'uniform':
    default:
      return 'Uniform'
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
