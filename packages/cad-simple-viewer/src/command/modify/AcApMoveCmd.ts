import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdBatchedPreview,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptSelectionOptions,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * MOVE preview jig.
 *
 * Large selections reuse GPU-resident batched geometry and update one preview
 * transform per frame. Smaller selections keep the legacy transient clone path.
 */
class AcApMovePreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _basePoint: AcGePoint3d
  private _batchPreview: AcEdBatchedPreview
  private _previewEntities: AcDbEntity[] = []
  private _lastDisplacement: AcGePoint3d

  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike
  ) {
    super(view)
    this._view = view
    this._basePoint = new AcGePoint3d(basePoint)
    this._lastDisplacement = new AcGePoint3d(0, 0, 0)
    this._batchPreview = new AcEdBatchedPreview(
      view,
      sourceEntities.map(entity => entity.objectId)
    )
    if (!this._batchPreview.useBatchPreview) {
      this._previewEntities = sourceEntities
        .map(entity => entity.clone())
        .filter((entity): entity is AcDbEntity => !!entity)
    }
  }

  update(point: AcGePoint3dLike) {
    const displacement = new AcGePoint3d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y,
      point.z - this._basePoint.z
    )

    if (this._batchPreview.useBatchPreview) {
      const matrix = new AcGeMatrix3d().makeTranslation(
        displacement.x,
        displacement.y,
        displacement.z
      )
      this._batchPreview.updateMatrix(this._view, matrix)
      this._lastDisplacement = displacement
      return
    }

    if (this._previewEntities.length === 0) return

    const delta = new AcGePoint3d(
      displacement.x - this._lastDisplacement.x,
      displacement.y - this._lastDisplacement.y,
      displacement.z - this._lastDisplacement.z
    )
    const hasDelta = delta.x !== 0 || delta.y !== 0 || delta.z !== 0
    if (!hasDelta) return

    const matrix = new AcGeMatrix3d().makeTranslation(delta.x, delta.y, delta.z)
    this._previewEntities.forEach(entity => entity.transformBy(matrix))
    this._lastDisplacement = displacement
  }

  override render(): void {
    if (this._batchPreview.useBatchPreview) {
      this._batchPreview.updateMatrix(
        this._view,
        new AcGeMatrix3d().makeTranslation(
          this._lastDisplacement.x,
          this._lastDisplacement.y,
          this._lastDisplacement.z
        )
      )
      return
    }
    if (this._previewEntities.length === 0) return
    this._view.addTransientEntity(this._previewEntities)
  }

  override end(): void {
    this._batchPreview.dispose(this._view)
    this._previewEntities.forEach(entity =>
      this._view.removeTransientEntity(entity.objectId)
    )
  }
}

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
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<MoveStep> {
        if (result.status === AcEdPromptStatus.OK) {
          basePoint = new AcGePoint3d(result.value!)
          this.machine.setState(new SecondPointState(this.machine))
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
