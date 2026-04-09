import { AcDbLine, AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
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
} from '../editor'
import { AcApI18n } from '../i18n'

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
 * Command to create one line.
 */
export class AcApLineCmd extends AcEdCommand {
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
    const points: AcGePoint3d[] = []
    let closed = false
    const appendPoint = (point: AcGePoint3dLike) => {
      points.push(new AcGePoint3d(point))
    }
    const undoLast = () => {
      if (points.length <= 1) return
      points.pop()
    }
    const getCurrentPoint = () => points[points.length - 1]

    const startPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.line.firstPoint')
    )
    const startPointResult =
      await AcApDocManager.instance.editor.getPoint(startPointPrompt)
    if (startPointResult.status !== AcEdPromptStatus.OK) return
    appendPoint(startPointResult.value!)

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
          appendPoint(result.value!)
          return 'continue'
        }
        if (result.status === AcEdPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'Undo') {
            undoLast()
            return 'continue'
          }
          if (keyword === 'Close' && points.length > 1) {
            closed = true
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

    const db = context.doc.database
    if (closed && points.length > 1) {
      appendPoint(points[0])
    }

    for (let index = 0; index < points.length - 1; index++) {
      const startPoint = points[index]
      const endPoint = points[index + 1]
      db.tables.blockTable.modelSpace.appendEntity(
        new AcDbLine(startPoint, endPoint)
      )
    }
  }
}
