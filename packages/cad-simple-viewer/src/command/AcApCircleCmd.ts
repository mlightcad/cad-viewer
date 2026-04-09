import { AcDbCircle, AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../editor'
import { AcApI18n } from '../i18n'

const EPSILON = 1e-9

interface CircleDefinition {
  center: AcGePoint3dLike
  radius: number
}

type CircleKeywordKey = 'threeP' | 'twoP' | 'diameter'

function createFallbackCircle(point: AcGePoint3dLike): CircleDefinition {
  return {
    center: { x: point.x, y: point.y, z: 0 },
    radius: 1e-6
  }
}

function addKeyword(
  prompt: AcEdPromptPointOptions | AcEdPromptDistanceOptions,
  key: CircleKeywordKey
) {
  prompt.keywords.add(
    AcApI18n.t(`jig.circle.keywords.${key}.display`),
    AcApI18n.t(`jig.circle.keywords.${key}.global`),
    AcApI18n.t(`jig.circle.keywords.${key}.local`)
  )
}

function applyCircleDefinition(
  entity: AcDbCircle,
  definition: CircleDefinition
) {
  entity.center = definition.center
  entity.radius = definition.radius
}

function createCircleFromCenterRadius(
  center: AcGePoint3dLike,
  radius: number
): CircleDefinition | undefined {
  if (!Number.isFinite(radius) || radius <= EPSILON) return undefined
  return {
    center: { x: center.x, y: center.y, z: 0 },
    radius
  }
}

function createCircleFromTwoPoints(
  first: AcGePoint3dLike,
  second: AcGePoint3dLike
): CircleDefinition | undefined {
  const dx = second.x - first.x
  const dy = second.y - first.y
  const diameter = Math.hypot(dx, dy)
  if (diameter <= EPSILON) return undefined
  return {
    center: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      z: 0
    },
    radius: diameter / 2
  }
}

function createCircleFromThreePoints(
  p1: AcGePoint3dLike,
  p2: AcGePoint3dLike,
  p3: AcGePoint3dLike
): CircleDefinition | undefined {
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  const x3 = p3.x
  const y3 = p3.y

  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
  if (Math.abs(d) <= EPSILON) return undefined

  const ux =
    ((x1 * x1 + y1 * y1) * (y2 - y3) +
      (x2 * x2 + y2 * y2) * (y3 - y1) +
      (x3 * x3 + y3 * y3) * (y1 - y2)) /
    d
  const uy =
    ((x1 * x1 + y1 * y1) * (x3 - x2) +
      (x2 * x2 + y2 * y2) * (x1 - x3) +
      (x3 * x3 + y3 * y3) * (x2 - x1)) /
    d

  const radius = Math.hypot(ux - x1, uy - y1)
  if (!Number.isFinite(radius) || radius <= EPSILON) return undefined
  return {
    center: { x: ux, y: uy, z: 0 },
    radius
  }
}

/**
 * Dynamic radius preview jig used by center-based circle workflows.
 */
export class AcApCircleJig extends AcEdPreviewJig<number> {
  /**
   * Transient circle entity reused during radius preview.
   */
  private _circle: AcDbCircle

  /**
   * Creates a circle jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  /**
   * Gets transient circle entity displayed by the jig.
   */
  get entity(): AcDbCircle {
    return this._circle
  }

  /**
   * Updates preview radius.
   *
   * @param radius - Dynamic radius value from prompt input.
   */
  update(radius: number) {
    this._circle.radius = radius
  }
}

/**
 * Dynamic point-based circle preview jig used by 2P/3P workflows.
 */
class AcApCircleDynamicJig extends AcEdPreviewJig<AcGePoint3dLike> {
  /**
   * Transient circle entity reused across cursor updates.
   */
  private _circle: AcDbCircle
  /**
   * Callback that maps cursor point to circle definition.
   */
  private _builder: (point: AcGePoint3dLike) => CircleDefinition | undefined

  /**
   * Creates dynamic circle preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Cursor point to circle definition resolver.
   * @param fallback - Initial valid fallback circle.
   */
  constructor(
    view: AcEdBaseView,
    builder: (point: AcGePoint3dLike) => CircleDefinition | undefined,
    fallback: CircleDefinition
  ) {
    super(view)
    this._circle = new AcDbCircle(fallback.center, fallback.radius)
    this._builder = builder
  }

  /**
   * Gets transient circle entity displayed by the jig.
   */
  get entity(): AcDbCircle {
    return this._circle
  }

  /**
   * Recomputes preview circle from current cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: AcGePoint3dLike) {
    const definition = this._builder(point)
    if (!definition) return
    applyCircleDefinition(this._circle, definition)
  }
}

/**
 * Command to create one circle.
 */
export class AcApCircleCmd extends AcEdCommand {
  /**
   * Creates CIRCLE command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supports center/radius, center/diameter, two-point and three-point
   * circle creation through a prompt state machine.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    let circle: CircleDefinition | undefined

    type CircleState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type StepResult = AcEdPromptStateStep

    /**
     * State-machine entry node:
     * pick center point directly, or switch to 2P/3P branches.
     */
    class EntryState implements CircleState {
      /**
       * Creates entry state handler.
       *
       * @param cmd - Owning CIRCLE command instance.
       * @param machine - Prompt state machine used for state transitions.
       */
      constructor(
        private cmd: AcApCircleCmd,
        private machine: AcEdPromptStateMachine<
          AcEdPromptPointOptions,
          AcEdPromptPointResult
        >
      ) {}

      /**
       * Builds first prompt for center-or-options input.
       *
       * @returns Configured point prompt with `3P` and `2P` keywords.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.circle.centerOrOptions')
        )
        addKeyword(prompt, 'threeP')
        addKeyword(prompt, 'twoP')
        return prompt
      }

      /**
       * Handles entry step result and dispatches to selected branch.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          circle = await this.cmd.runCenterFlow(context, result.value!)
          return 'finish'
        }
        if (result.status !== AcEdPromptStatus.Keyword) return 'finish'

        const keyword = result.stringResult ?? ''
        if (keyword === '3P') {
          this.machine.setState(
            new ThreePointFirstState(this.cmd, this.machine)
          )
          return 'continue'
        }
        if (keyword === '2P') {
          this.machine.setState(new TwoPointFirstState(this.cmd, this.machine))
          return 'continue'
        }
        return 'finish'
      }
    }

    /**
     * State-machine node for selecting first point in 2P workflow.
     */
    class TwoPointFirstState implements CircleState {
      /**
       * Creates 2P first-point state handler.
       *
       * @param cmd - Owning CIRCLE command instance.
       * @param machine - Prompt state machine used for state transitions.
       */
      constructor(
        private cmd: AcApCircleCmd,
        private machine: AcEdPromptStateMachine<
          AcEdPromptPointOptions,
          AcEdPromptPointResult
        >
      ) {}

      /**
       * Builds prompt for first 2P endpoint.
       *
       * @returns Configured point prompt.
       */
      buildPrompt() {
        return new AcEdPromptPointOptions(
          AcApI18n.t('jig.circle.twoPointFirst')
        )
      }

      /**
       * Handles first 2P point and moves to second-point state.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status !== AcEdPromptStatus.OK) return 'finish'
        this.machine.setState(new TwoPointSecondState(this.cmd, result.value!))
        return 'continue'
      }
    }

    /**
     * State-machine node for second point in 2P workflow.
     */
    class TwoPointSecondState implements CircleState {
      /**
       * Creates 2P second-point state handler.
       *
       * @param cmd - Owning CIRCLE command instance.
       * @param firstPoint - First 2P endpoint captured in previous step.
       */
      constructor(
        private cmd: AcApCircleCmd,
        private firstPoint: AcGePoint3dLike
      ) {}

      /**
       * Builds prompt for second 2P endpoint with dynamic preview.
       *
       * @returns Configured point prompt.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.circle.twoPointSecond')
        )
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = new AcGePoint3d(this.firstPoint)
        prompt.jig = new AcApCircleDynamicJig(
          context.view,
          point => createCircleFromTwoPoints(this.firstPoint, point),
          createFallbackCircle(this.firstPoint)
        )
        return prompt
      }

      /**
       * Handles second 2P point and finalizes circle output.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          circle = this.cmd.createFromTwoPoints(this.firstPoint, result.value!)
        }
        return 'finish'
      }
    }

    /**
     * State-machine node for selecting first point in 3P workflow.
     */
    class ThreePointFirstState implements CircleState {
      /**
       * Creates 3P first-point state handler.
       *
       * @param cmd - Owning CIRCLE command instance.
       * @param machine - Prompt state machine used for state transitions.
       */
      constructor(
        private cmd: AcApCircleCmd,
        private machine: AcEdPromptStateMachine<
          AcEdPromptPointOptions,
          AcEdPromptPointResult
        >
      ) {}

      /**
       * Builds prompt for first 3P point.
       *
       * @returns Configured point prompt.
       */
      buildPrompt() {
        return new AcEdPromptPointOptions(
          AcApI18n.t('jig.circle.threePointFirst')
        )
      }

      /**
       * Handles first 3P point and advances to second-point state.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status !== AcEdPromptStatus.OK) return 'finish'
        this.machine.setState(
          new ThreePointSecondState(this.cmd, this.machine, result.value!)
        )
        return 'continue'
      }
    }

    /**
     * State-machine node for selecting second point in 3P workflow.
     */
    class ThreePointSecondState implements CircleState {
      /**
       * Creates 3P second-point state handler.
       *
       * @param cmd - Owning CIRCLE command instance.
       * @param machine - Prompt state machine used for state transitions.
       * @param firstPoint - First 3P point captured in previous step.
       */
      constructor(
        private cmd: AcApCircleCmd,
        private machine: AcEdPromptStateMachine<
          AcEdPromptPointOptions,
          AcEdPromptPointResult
        >,
        private firstPoint: AcGePoint3dLike
      ) {}

      /**
       * Builds prompt for second 3P point.
       *
       * @returns Configured point prompt.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.circle.threePointSecond')
        )
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = new AcGePoint3d(this.firstPoint)
        return prompt
      }

      /**
       * Handles second 3P point and advances to third-point state.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status !== AcEdPromptStatus.OK) return 'finish'
        this.machine.setState(
          new ThreePointThirdState(this.cmd, this.firstPoint, result.value!)
        )
        return 'continue'
      }
    }

    /**
     * State-machine node for selecting final point in 3P workflow.
     */
    class ThreePointThirdState implements CircleState {
      /**
       * Creates 3P third-point state handler.
       *
       * @param cmd - Owning CIRCLE command instance.
       * @param firstPoint - First 3P point.
       * @param secondPoint - Second 3P point.
       */
      constructor(
        private cmd: AcApCircleCmd,
        private firstPoint: AcGePoint3dLike,
        private secondPoint: AcGePoint3dLike
      ) {}

      /**
       * Builds prompt for final 3P point with dynamic preview.
       *
       * @returns Configured point prompt.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.circle.threePointThird')
        )
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = new AcGePoint3d(this.secondPoint)
        prompt.jig = new AcApCircleDynamicJig(
          context.view,
          point =>
            createCircleFromThreePoints(
              this.firstPoint,
              this.secondPoint,
              point
            ),
          createFallbackCircle(this.firstPoint)
        )
        return prompt
      }

      /**
       * Handles final 3P point and finalizes circle output.
       *
       * @param result - Point prompt result.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          circle = this.cmd.createFromThreePoints(
            this.firstPoint,
            this.secondPoint,
            result.value!
          )
        }
        return 'finish'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new EntryState(this, machine))
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    if (!circle) return
    context.doc.database.tables.blockTable.modelSpace.appendEntity(
      new AcDbCircle(circle.center, circle.radius)
    )
  }

  /**
   * Runs center-based workflow:
   * center -> radius OR center -> diameter.
   *
   * @param context - Current application/document context.
   * @param center - Picked center point.
   * @returns Resolved circle definition, or `undefined` on cancel/invalid input.
   */
  private async runCenterFlow(context: AcApContext, center: AcGePoint3dLike) {
    const radiusPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.circle.radiusOrDiameter')
    )
    addKeyword(radiusPrompt, 'diameter')
    radiusPrompt.allowZero = false
    radiusPrompt.useBasePoint = true
    radiusPrompt.useDashedLine = true
    radiusPrompt.basePoint = new AcGePoint3d(center)
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radiusResult =
      await AcApDocManager.instance.editor.getDistance(radiusPrompt)
    if (radiusResult.status === AcEdPromptStatus.OK) {
      return createCircleFromCenterRadius(center, radiusResult.value ?? 0)
    }
    if (
      radiusResult.status === AcEdPromptStatus.Keyword &&
      radiusResult.stringResult === 'Diameter'
    ) {
      return await this.promptDiameterCircle(context, center)
    }
    return undefined
  }

  /**
   * Prompts diameter input in center-based workflow.
   *
   * @param context - Current application/document context.
   * @param center - Circle center point.
   * @returns Circle definition, or `undefined` when canceled/invalid.
   */
  private async promptDiameterCircle(
    context: AcApContext,
    center: AcGePoint3dLike
  ) {
    const diameterPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.circle.diameter')
    )
    diameterPrompt.allowZero = false
    diameterPrompt.useBasePoint = true
    diameterPrompt.useDashedLine = true
    diameterPrompt.basePoint = new AcGePoint3d(center)
    diameterPrompt.jig = new AcApCircleJig(context.view, center)
    const diameterResult =
      await AcApDocManager.instance.editor.getDistance(diameterPrompt)
    if (diameterResult.status !== AcEdPromptStatus.OK) return undefined
    const radius = (diameterResult.value ?? 0) / 2
    return createCircleFromCenterRadius(center, radius)
  }

  /**
   * Creates circle definition from two points.
   *
   * @param first - First point of diameter.
   * @param second - Second point of diameter.
   * @returns Circle definition, or `undefined` when points are invalid.
   */
  private createFromTwoPoints(first: AcGePoint3dLike, second: AcGePoint3dLike) {
    return createCircleFromTwoPoints(first, second)
  }

  /**
   * Creates circle definition from three points.
   *
   * @param p1 - First point on circle.
   * @param p2 - Second point on circle.
   * @param p3 - Third point on circle.
   * @returns Circle definition, or `undefined` when points are degenerate.
   */
  private createFromThreePoints(
    p1: AcGePoint3dLike,
    p2: AcGePoint3dLike,
    p3: AcGePoint3dLike
  ) {
    return createCircleFromThreePoints(p1, p2, p3)
  }
}
