import { AcDbLine, AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Dynamic preview jig for LINE command.
 */
export class AcApLineJig extends AcEdPreviewJig<AcGePoint3dLike> {
  /**
   * Transient line entity reused during interactive preview.
   */
  private _line: AcDbLine

  /**
   * Creates a line jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, start: AcGePoint3dLike) {
    super(view)
    this._line = new AcDbLine(start, start)
  }

  /**
   * Gets transient line entity used by this jig.
   */
  get entity(): AcDbLine {
    return this._line
  }

  /**
   * Updates preview line endpoint from current cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: AcGePoint3dLike) {
    this._line.endPoint = point
  }
}

/**
 * Command to create chained line segments.
 *
 * Behavior is aligned with AutoCAD LINE:
 * - After the first point, each confirmed next point immediately creates one segment.
 * - `Undo` removes the last created segment.
 * - `Close` creates the closing segment to the first point and ends command.
 */
export class AcApLineCmd extends AcEdCommand {
  /**
   * Last endpoint created by LINE command.
   *
   * Used by "Continue" option at next LINE start.
   */
  private static _lastEndpoint?: AcGePoint3d

  /**
   * Creates LINE command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supports chained point input with `Undo` and `Close` options.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const db = context.doc.database
    const points: AcGePoint3d[] = []
    const createdSegments: AcDbLine[] = []
    const hasContinuePoint = () => !!AcApLineCmd._lastEndpoint
    const getContinuePoint = () =>
      AcApLineCmd._lastEndpoint
        ? new AcGePoint3d(AcApLineCmd._lastEndpoint)
        : undefined
    const syncLastEndpoint = () => {
      const current = getCurrentPoint()
      if (current) {
        AcApLineCmd._lastEndpoint = new AcGePoint3d(current)
      }
    }
    const appendPoint = (point: AcGePoint3dLike) => {
      points.push(new AcGePoint3d(point))
    }
    const getCurrentPoint = () => points[points.length - 1]
    const appendSegment = (endPoint: AcGePoint3dLike) => {
      const startPoint = getCurrentPoint()
      if (!startPoint) return
      const segment = new AcDbLine(new AcGePoint3d(startPoint), endPoint)
      db.tables.blockTable.modelSpace.appendEntity(segment)
      createdSegments.push(segment)
      appendPoint(endPoint)
    }
    const undoLastSegment = () => {
      if (createdSegments.length <= 0 || points.length <= 1) return
      createdSegments.pop()?.erase()
      points.pop()
    }
    const closeSegment = () => {
      if (points.length <= 1) return
      const first = points[0]
      const current = getCurrentPoint()
      if (!current) return
      const isSamePoint =
        first.x === current.x && first.y === current.y && first.z === current.z
      if (!isSamePoint) {
        appendSegment(first)
      }
    }

    const startPointPrompt = new AcEdPromptPointOptions(
      hasContinuePoint()
        ? AcApI18n.t('jig.line.firstPointOrContinue')
        : AcApI18n.t('jig.line.firstPoint')
    )
    if (hasContinuePoint()) {
      startPointPrompt.keywords.add(
        AcApI18n.t('jig.line.keywords.continue.display'),
        AcApI18n.t('jig.line.keywords.continue.global'),
        AcApI18n.t('jig.line.keywords.continue.local')
      )
    }
    const startPointResult =
      await AcApDocManager.instance.editor.getPoint(startPointPrompt)
    if (startPointResult.status === AcEdPromptStatus.OK) {
      appendPoint(startPointResult.value!)
    } else if (
      startPointResult.status === AcEdPromptStatus.Keyword &&
      startPointResult.stringResult === 'Continue' &&
      hasContinuePoint()
    ) {
      appendPoint(getContinuePoint()!)
    } else {
      return
    }

    type LineState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type StepResult = AcEdPromptStateStep
    /**
     * State-machine node that prompts for subsequent line points.
     */
    class NextPointState implements LineState {
      /**
       * Builds point prompt for the next vertex with dynamic line preview.
       *
       * @returns Configured point prompt with runtime keywords.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.line.nextPointWithOptions')
        )
        prompt.keywords.add(
          AcApI18n.t('jig.line.keywords.undo.display'),
          AcApI18n.t('jig.line.keywords.undo.global'),
          AcApI18n.t('jig.line.keywords.undo.local')
        )
        if (points.length > 1) {
          prompt.keywords.add(
            AcApI18n.t('jig.line.keywords.close.display'),
            AcApI18n.t('jig.line.keywords.close.global'),
            AcApI18n.t('jig.line.keywords.close.local')
          )
        }
        const basePoint = getCurrentPoint()
        if (basePoint) {
          prompt.useDashedLine = true
          prompt.useBasePoint = true
          prompt.basePoint = new AcGePoint3d(basePoint)
          prompt.jig = new AcApLineJig(context.view, basePoint)
        }
        return prompt
      }

      /**
       * Handles point/keyword input and controls loop continuation.
       *
       * @param result - Point prompt result for this step.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          appendSegment(result.value!)
          return 'continue'
        }
        if (result.status === AcEdPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'Undo') {
            undoLastSegment()
            return 'continue'
          }
          if (keyword === 'Close' && points.length > 1) {
            closeSegment()
            return 'finish'
          }
          return 'continue'
        }
        return 'finish'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new NextPointState())
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))
    syncLastEndpoint()
  }
}
