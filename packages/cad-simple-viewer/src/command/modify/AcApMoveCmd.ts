import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptSelectionOptions,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApMovePreviewJig } from './AcApMovePreviewJig'

/**
 * Command to move selected entities by a displacement vector.
 *
 * Behavior (AutoCAD-like):
 * 1) Select entities (or reuse preselection),
 * 2) Specify base point or choose `Displacement`,
 * 3) Specify second point (or displacement point),
 * 4) Apply translation to all selected entities.
 */
export class AcApMoveCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const annotation = new AcApAnnotation(context.doc.database)
    const blockTable = context.doc.database.tables.blockTable

    const selectionIds =
      selectionSet.count > 0
        ? selectionSet.ids
        : ((
            await AcApDocManager.instance.editor.getSelection(
              new AcEdPromptSelectionOptions(AcApI18n.sysCmdPrompt('move'))
            )
          ).value?.ids ?? [])

    if (selectionIds.length === 0) return

    const ids =
      context.doc.openMode == AcEdOpenMode.Review
        ? annotation.filterAnnotationEntities(selectionIds)
        : selectionIds
    if (ids.length === 0) {
      selectionSet.clear()
      return
    }

    const sourceEntities = ids
      .map(id => blockTable.getEntityById(id))
      .filter((entity): entity is AcDbEntity => !!entity)
    if (sourceEntities.length === 0) {
      selectionSet.clear()
      return
    }

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
        // AutoCAD MOVE: Enter at base point switches to displacement from origin.
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
        // AutoCAD MOVE: Enter at second point ends without applying a move.
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<MoveStep> {
        if (result.status === AcEdPromptStatus.OK && basePoint) {
          const secondPoint = new AcGePoint3d(result.value!)
          displacement = new AcGePoint3d(
            secondPoint.x - basePoint.x,
            secondPoint.y - basePoint.y,
            secondPoint.z - basePoint.z
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
        // AutoCAD MOVE: Enter at displacement prompt ends without applying a move.
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

    const matrix = new AcGeMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      displacement.z
    )
    sourceEntities.forEach(entity => {
      const opened = context.doc.database.openEntityForWrite(entity)
      if (!opened) return
      opened.transformBy(matrix)
      opened.triggerModifiedEvent()
    })
    selectionSet.clear()
  }
}
