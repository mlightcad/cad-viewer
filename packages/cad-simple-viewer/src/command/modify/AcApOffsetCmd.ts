import {
  AcDbCurve,
  AcDbEntity,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeTol
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptDoubleResult,
  AcEdPromptEntityOptions,
  AcEdPromptEntityResult,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Union of prompt option types used across the OFFSET state machine.
 *
 * Each OFFSET step builds one of these option objects before delegating to
 * the editor's distance, entity, or point prompt APIs.
 */
type OffsetPromptOptions =
  | AcEdPromptDistanceOptions
  | AcEdPromptEntityOptions
  | AcEdPromptPointOptions

/**
 * Union of prompt result types returned by OFFSET state handlers.
 *
 * The active state narrows this union before reading status and payload fields.
 */
type OffsetPromptResult =
  | AcEdPromptDoubleResult
  | AcEdPromptEntityResult
  | AcEdPromptPointResult

/**
 * Type guard that checks whether an entity can participate in OFFSET.
 *
 * Only {@link AcDbCurve} instances support side detection and offset curve
 * generation; other entity types are rejected during selection.
 *
 * @param entity - Database entity resolved from the user's selection.
 * @returns `true` when `entity` is an offset-capable curve.
 */
function isOffsettableCurve(
  entity: AcDbEntity | undefined
): entity is AcDbCurve {
  return entity instanceof AcDbCurve
}

/**
 * Copies display and layer traits from a source entity onto an offset result.
 *
 * Offset geometry is created as new curve instances, so this helper ensures
 * the generated curves inherit the visual properties of the original.
 *
 * @param source - Original curve selected for offsetting.
 * @param target - Newly created offset curve that should match `source`.
 */
function copyEntityTraits(source: AcDbEntity, target: AcDbEntity) {
  target.layer = source.layer
  target.color = source.color.clone()
  target.lineType = source.lineType
  target.lineWeight = source.lineWeight
  target.linetypeScale = source.linetypeScale
  target.transparency = source.transparency
  target.visibility = source.visibility
}

/**
 * Builds one or more offset curves on the side indicated by a pick point.
 *
 * The side is resolved from the source curve geometry, the absolute distance is
 * applied with the correct sign, and display traits are copied onto each result.
 * Any geometric failure is swallowed and reported as an empty result set.
 *
 * @param curve - Source curve to offset.
 * @param offsetDistance - Absolute offset distance in drawing units.
 * @param sidePoint - Point used to determine which side of the curve to offset toward.
 * @returns Offset curve instances ready for preview or commit, or an empty array on failure.
 */
function buildOffsetCurves(
  curve: AcDbCurve,
  offsetDistance: number,
  sidePoint: AcGePoint3dLike
) {
  try {
    const side = curve.getOffsetSideAtPoint(sidePoint)
    const offsetCurves = curve.getOffsetCurves(offsetDistance * side)
    offsetCurves.forEach(offsetCurve => copyEntityTraits(curve, offsetCurve))
    return offsetCurves
  } catch {
    return []
  }
}

/**
 * OFFSET side preview jig.
 *
 * The selected side changes as the cursor crosses the source curve. Since the
 * offset methods return fresh curve instances, this jig replaces its transient
 * preview set on each update instead of transforming a single cached entity.
 */
class AcApOffsetPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _curve: AcDbCurve
  private _distance: number
  private _previewCurves: AcDbCurve[] = []
  private _renderedIds: string[] = []

  /**
   * Creates a transient OFFSET preview jig for side selection.
   *
   * @param view - Active editor view that owns transient preview entities.
   * @param curve - Source curve whose offset geometry should be previewed.
   * @param distance - Offset distance already confirmed by the user.
   */
  constructor(view: AcEdBaseView, curve: AcDbCurve, distance: number) {
    super(view)
    this._view = view
    this._curve = curve
    this._distance = distance
  }

  /**
   * Gets the first preview entity so the jig can satisfy the editor API contract.
   *
   * @returns First transient offset curve, or `null` when no preview exists yet.
   */
  get entity(): AcDbEntity | null {
    return this._previewCurves[0] ?? null
  }

  /**
   * Rebuilds the transient offset curves for the current cursor side.
   *
   * Existing preview entities are removed from the view before new geometry is
   * generated because offset APIs return fresh curve instances each time.
   *
   * @param point - Current cursor point used to determine offset side.
   */
  update(point: AcGePoint3dLike) {
    this.clearRendered()
    this._previewCurves = buildOffsetCurves(this._curve, this._distance, point)
  }

  /**
   * Adds the current offset preview curves to the view as transient geometry.
   */
  override render() {
    if (this._previewCurves.length === 0) return
    this._view.addTransientEntity(this._previewCurves)
    this._renderedIds = this._previewCurves.map(entity => entity.objectId)
  }

  /**
   * Removes every transient preview curve from the view when the prompt ends.
   */
  override end() {
    this.clearRendered()
  }

  /**
   * Removes previously rendered transient entities and clears their tracked ids.
   *
   * Called before each preview rebuild so stale offset curves do not remain
   * visible after the cursor crosses to the opposite side.
   */
  private clearRendered() {
    this._renderedIds.forEach(id => this._view.removeTransientEntity(id))
    this._renderedIds = []
  }
}

/**
 * Command to create offset copies of curve entities.
 *
 * The workflow follows the common AutoCAD OFFSET flow:
 * 1) specify an offset distance,
 * 2) select one curve,
 * 3) pick the side for the new curve while previewing the result,
 * 4) repeat selection until Enter/Escape.
 */
export class AcApOffsetCmd extends AcEdCommand {
  /** Last successfully used offset distance, reused as the default on the next run. */
  private static _lastDistance?: number

  /**
   * Creates the OFFSET command and marks it as a review-mode command.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Runs the OFFSET command through a three-step prompt state machine.
   *
   * The machine loops on curve selection after each successful offset so users
   * can create multiple offsets at the same distance without re-entering it.
   * Pressing Enter at distance entry reuses the previous distance when available.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const blockTable = context.doc.database.tables.blockTable
    const annotation = new AcApAnnotation(context.doc.database)
    let offsetDistance: number | undefined
    let currentCurve: AcDbCurve | undefined

    /** Prompt state contract shared by every OFFSET workflow step. */
    type OffsetState = AcEdPromptState<OffsetPromptOptions, OffsetPromptResult>
    /** Next-step directive returned by OFFSET state handlers. */
    type OffsetStep = AcEdPromptStateStep
    /** State machine that orchestrates distance, selection, and side prompts. */
    type OffsetMachine = AcEdPromptStateMachine<
      OffsetPromptOptions,
      OffsetPromptResult
    >

    /**
     * First OFFSET step: prompt for the offset distance.
     *
     * Reuses {@link AcApOffsetCmd._lastDistance} as the default when the user
     * presses Enter without typing a new value.
     */
    class DistanceState implements OffsetState {
      /**
       * Creates the distance-entry state.
       *
       * @param machine - Parent state machine used to transition to selection.
       */
      constructor(private machine: OffsetMachine) {}

      /**
       * Builds the distance prompt with optional default distance and rubber-band base point.
       *
       * @returns Configured distance prompt options for the editor.
       */
      buildPrompt() {
        const lastDistance = AcApOffsetCmd._lastDistance
        const message =
          lastDistance != null
            ? `${AcApI18n.t('jig.offset.distance')} <${lastDistance}>`
            : AcApI18n.t('jig.offset.distance')
        const prompt = new AcEdPromptDistanceOptions(message)
        prompt.useBasePoint = false
        prompt.useDashedLine = true
        prompt.allowZero = false
        prompt.allowNegative = false
        if (lastDistance != null) {
          prompt.defaultValue = lastDistance
          prompt.useDefaultValue = true
          prompt.allowNone = true
        }
        return prompt
      }

      /**
       * Validates the entered distance and advances to curve selection.
       *
       * Invalid, non-finite, or non-positive distances show a warning and end
       * the command. A valid distance is stored for reuse on subsequent runs.
       *
       * @param result - Distance prompt result from the editor.
       * @returns `'continue'` to move to selection, or `'finish'` to exit.
       */
      handleResult(result: OffsetPromptResult): OffsetStep {
        if (!(result instanceof AcEdPromptDoubleResult)) return 'finish'
        if (result.status !== AcEdPromptStatus.OK || result.value == null) {
          return 'finish'
        }
        if (
          !Number.isFinite(result.value) ||
          AcGeTol.isNonPositive(result.value)
        ) {
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t('jig.offset.invalidDistance'),
            'warning'
          )
          return 'finish'
        }

        offsetDistance = result.value
        AcApOffsetCmd._lastDistance = result.value
        this.machine.setState(new SelectCurveState(this.machine))
        return 'continue'
      }
    }

    /**
     * Second OFFSET step: prompt for a single offsettable curve.
     *
     * Enter ends the command; invalid selections warn and remain in this state.
     */
    class SelectCurveState implements OffsetState {
      /**
       * Creates the curve-selection state.
       *
       * @param machine - Parent state machine used to transition to side picking.
       */
      constructor(private machine: OffsetMachine) {}

      /**
       * Builds the entity selection prompt for one curve.
       *
       * @returns Configured entity prompt options for the editor.
       */
      buildPrompt() {
        const prompt = new AcEdPromptEntityOptions(
          AcApI18n.t('jig.offset.selectObject')
        )
        prompt.allowNone = true
        prompt.allowObjectOnLockedLayer = true
        prompt.setRejectMessage(AcApI18n.t('jig.offset.invalidSelection'))
        return prompt
      }

      /**
       * Resolves the selected entity and advances to side-point picking when valid.
       *
       * In review mode, annotation-owned entities are filtered out before lookup.
       * Non-curve selections show a warning and keep prompting for another object.
       *
       * @param result - Entity prompt result from the editor.
       * @returns `'continue'` to pick a side or retry selection, or `'finish'` to exit.
       */
      handleResult(result: OffsetPromptResult): OffsetStep {
        if (!(result instanceof AcEdPromptEntityResult)) return 'finish'
        if (result.status === AcEdPromptStatus.None) return 'finish'
        if (result.status !== AcEdPromptStatus.OK || !result.objectId) {
          return 'finish'
        }

        const validIds =
          context.doc.openMode == AcEdOpenMode.Review
            ? annotation.filterAnnotationEntities([result.objectId])
            : [result.objectId]
        const entity = blockTable.getEntityById(validIds[0])
        if (!isOffsettableCurve(entity)) {
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t('jig.offset.invalidSelection'),
            'warning'
          )
          return 'continue'
        }

        currentCurve = entity
        this.machine.setState(new SidePointState(this.machine))
        return 'continue'
      }
    }

    /**
     * Third OFFSET step: pick the offset side and commit the new curve(s).
     *
     * A preview jig shows the offset result while the cursor moves. After a
     * successful commit, the workflow returns to curve selection.
     */
    class SidePointState implements OffsetState {
      /**
       * Creates the side-point state.
       *
       * @param machine - Parent state machine used to loop back to selection.
       */
      constructor(private machine: OffsetMachine) {}

      /**
       * Builds the side-point prompt and attaches the offset preview jig.
       *
       * Object snap is disabled so the pick reflects the intended side rather
       * than snapping to nearby geometry.
       *
       * @returns Configured point prompt options for the editor.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.offset.sidePoint')
        )
        prompt.allowNone = true
        prompt.disableOSnap = true
        if (currentCurve && offsetDistance != null) {
          const jig = new AcApOffsetPreviewJig(
            context.view,
            currentCurve,
            offsetDistance
          )
          jig.update({ ...context.view.curPos, z: 0 })
          jig.render()
          prompt.jig = jig
        }
        return prompt
      }

      /**
       * Creates offset geometry from the picked side and appends it to model space.
       *
       * When offset generation fails, a warning is shown and the command still
       * returns to curve selection so the user can try another object.
       *
       * @param result - Point prompt result from the editor.
       * @returns `'continue'` to select another curve, or `'finish'` to exit.
       */
      handleResult(result: OffsetPromptResult): OffsetStep {
        if (!(result instanceof AcEdPromptPointResult)) return 'finish'
        if (
          result.status !== AcEdPromptStatus.OK ||
          !result.value ||
          !currentCurve ||
          offsetDistance == null
        ) {
          return 'finish'
        }

        const offsetCurves = buildOffsetCurves(
          currentCurve,
          offsetDistance,
          new AcGePoint3d(result.value)
        )
        if (offsetCurves.length === 0) {
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t('jig.offset.offsetFailed'),
            'warning'
          )
        } else {
          blockTable.modelSpace.appendEntity(offsetCurves)
        }

        currentCurve = undefined
        this.machine.setState(new SelectCurveState(this.machine))
        return 'continue'
      }
    }

    const machine = new AcEdPromptStateMachine<
      OffsetPromptOptions,
      OffsetPromptResult
    >()
    machine.setState(new DistanceState(machine))
    await machine.run(prompt => {
      if (prompt instanceof AcEdPromptDistanceOptions) {
        return AcApDocManager.instance.editor.getDistance(prompt)
      }
      if (prompt instanceof AcEdPromptEntityOptions) {
        return AcApDocManager.instance.editor.getEntity(prompt)
      }
      return AcApDocManager.instance.editor.getPoint(prompt)
    })
  }
}
