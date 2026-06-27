import { AcGePoint3d } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApEntityService } from '../../service'
import { AcApMovePreviewJig } from './AcApMovePreviewJig'

/**
 * Command to move selected entities by a displacement vector.
 */
export class AcApMoveCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const resolved = await AcApEntityService.resolveSelectedEntities(context, {
      promptKey: 'move'
    })
    if (!resolved) return

    const { entities: sourceEntities } = resolved

    let basePoint: AcGePoint3d | undefined
    let displacement: AcGePoint3d | undefined

    type MoveState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type MoveStep = AcEdPromptStateStep
    type MoveMachine = AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >

    const createDisplacementKeyword = (prompt: AcEdPromptPointOptions) => {
      prompt.keywords.add(
        AcApI18n.t('jig.move.keywords.displacement.display'),
        AcApI18n.t('jig.move.keywords.displacement.global'),
        AcApI18n.t('jig.move.keywords.displacement.local')
      )
    }

    class BasePointState implements MoveState {
      constructor(private machine: MoveMachine) {}

      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.move.basePointOrDisplacement')
        )
        createDisplacementKeyword(prompt)
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<MoveStep> {
        if (result.status === AcEdPromptStatus.OK) {
          basePoint = new AcGePoint3d(result.value!)
          this.machine.setState(new SecondPointState(this.machine))
          return 'continue'
        }

        if (result.status === AcEdPromptStatus.None) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        if (
          result.status === AcEdPromptStatus.Keyword &&
          result.stringResult === 'Displacement'
        ) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        return 'finish'
      }
    }

    class SecondPointState implements MoveState {
      constructor(private machine: MoveMachine) {}

      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.move.secondPointOrDisplacement')
        )
        createDisplacementKeyword(prompt)
        if (basePoint) {
          prompt.useBasePoint = true
          prompt.useDashedLine = true
          prompt.basePoint = basePoint
          prompt.jig = new AcApMovePreviewJig(
            context.view,
            sourceEntities,
            basePoint
          )
        }
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<MoveStep> {
        if (result.status === AcEdPromptStatus.OK && basePoint) {
          const secondPoint = new AcGePoint3d(result.value!)
          displacement = AcApEntityService.computeDisplacement(
            basePoint,
            secondPoint
          )
          return 'finish'
        }

        if (
          result.status === AcEdPromptStatus.Keyword &&
          result.stringResult === 'Displacement'
        ) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        return 'finish'
      }
    }

    class DisplacementState implements MoveState {
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.move.displacement')
        )
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = new AcGePoint3d(0, 0, 0)
        prompt.jig = new AcApMovePreviewJig(
          context.view,
          sourceEntities,
          prompt.basePoint
        )
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<MoveStep> {
        if (result.status === AcEdPromptStatus.OK) {
          displacement = new AcGePoint3d(result.value!)
        }
        return 'finish'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new BasePointState(machine))
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    if (!displacement) {
      selectionSet.clear()
      return
    }

    AcApEntityService.translateEntities(
      context.doc.database,
      sourceEntities,
      displacement
    )
    selectionSet.clear()
  }
}
