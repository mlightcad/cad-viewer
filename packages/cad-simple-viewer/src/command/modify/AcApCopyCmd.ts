import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

type CopyMode = 'Single' | 'Multiple'

interface CopyPreviewItem {
  entity: AcDbEntity
  factor: number
  lastDisplacement: AcGePoint3d
}

interface CopyArrayPlacement {
  copyCount: number
  endPoint: AcGePoint3d
  fitMode: boolean
}

/**
 * COPY preview jig.
 *
 * It clones the source entities once and keeps those transient copies moving
 * with the cursor. For array previews, each clone batch uses a different
 * displacement multiplier so users can see the full result before committing.
 */
class AcApCopyPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _basePoint: AcGePoint3d
  private _copyCount: number
  private _fitMode: boolean
  private _previewItems: CopyPreviewItem[]

  /**
   * Creates a transient COPY preview jig.
   *
   * @param view - Active editor view that owns transient preview entities.
   * @param sourceEntities - Original entities used as clone sources.
   * @param basePoint - Copy base point from which cursor displacement is measured.
   * @param copyCount - Number of preview placements to show.
   * @param fitMode - Whether copies should be evenly distributed between base and end points.
   */
  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    copyCount: number = 1,
    fitMode: boolean = false
  ) {
    super(view)
    this._view = view
    this._basePoint = new AcGePoint3d(basePoint)
    this._copyCount = Math.max(0, copyCount)
    this._fitMode = fitMode
    this._previewItems = []

    for (let factor = 1; factor <= this._copyCount; factor++) {
      sourceEntities
        .map(entity => entity.clone())
        .filter((entity): entity is AcDbEntity => !!entity)
        .forEach(entity => {
          this._previewItems.push({
            entity,
            factor,
            lastDisplacement: new AcGePoint3d(0, 0, 0)
          })
        })
    }
  }

  /**
   * Gets the first preview entity so the jig can satisfy the editor API contract.
   *
   * @returns First transient clone, or `null` when nothing could be cloned.
   */
  get entity(): AcDbEntity | null {
    return this._previewItems[0]?.entity ?? null
  }

  /**
   * Moves each transient clone to its latest preview displacement.
   *
   * The input point is interpreted as the current placement point. Each preview
   * batch then applies either a direct multiple of the displacement or a
   * normalized fit displacement, depending on the current array mode.
   *
   * @param point - Current cursor point supplied by the prompt/jig system.
   */
  update(point: AcGePoint3dLike) {
    if (this._previewItems.length === 0) return

    const displacement = new AcGePoint3d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y,
      point.z - this._basePoint.z
    )

    this._previewItems.forEach(item => {
      const desired = this.scaleDisplacement(displacement, item.factor)
      const delta = new AcGePoint3d(
        desired.x - item.lastDisplacement.x,
        desired.y - item.lastDisplacement.y,
        desired.z - item.lastDisplacement.z
      )
      if (delta.x === 0 && delta.y === 0 && delta.z === 0) return

      item.entity.transformBy(
        new AcGeMatrix3d().makeTranslation(delta.x, delta.y, delta.z)
      )
      item.lastDisplacement = desired
    })
  }

  /**
   * Adds all preview clones to the view as transient geometry.
   */
  override render(): void {
    if (this._previewItems.length === 0) return
    this._view.addTransientEntity(this._previewItems.map(item => item.entity))
  }

  /**
   * Removes every transient preview clone from the view.
   */
  override end(): void {
    this._previewItems.forEach(item =>
      this._view.removeTransientEntity(item.entity.objectId)
    )
  }

  /**
   * Computes the displacement assigned to one preview copy.
   *
   * @param displacement - Raw cursor displacement from the base point.
   * @param factor - One-based copy index used to scale the displacement.
   * @returns Scaled displacement for the indexed preview clone.
   */
  private scaleDisplacement(displacement: AcGePoint3d, factor: number) {
    const scale =
      this._fitMode && this._copyCount > 0 ? factor / this._copyCount : factor

    return new AcGePoint3d(
      displacement.x * scale,
      displacement.y * scale,
      displacement.z * scale
    )
  }
}

/**
 * Command to copy selected entities by cloning and translating them.
 *
 * Supported AutoCAD-like workflow:
 * 1) Select entities (or reuse preselection),
 * 2) Specify base point or choose `Displacement` / `Mode` / `Multiple`,
 * 3) Specify placement point, or create an evenly spaced array,
 * 4) Append cloned copies without modifying the originals.
 */
export class AcApCopyCmd extends AcEdCommand {
  private static _defaultMode: CopyMode = 'Multiple'

  /**
   * Creates the COPY command and marks it as a review-mode command.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Adds one localized keyword entry to a point/keyword prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword.
   * @param key - Translation key suffix describing which keyword to add.
   */
  private addKeyword(
    prompt: AcEdPromptPointOptions | AcEdPromptKeywordOptions,
    key: 'array' | 'displacement' | 'fit' | 'mode' | 'multiple' | 'single'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.copy.keywords.${key}.display`),
      AcApI18n.t(`jig.copy.keywords.${key}.global`),
      AcApI18n.t(`jig.copy.keywords.${key}.local`)
    )
  }

  /**
   * Computes the vector from a copy base point to a target point.
   *
   * @param basePoint - Copy base point.
   * @param targetPoint - Destination point selected by the user.
   * @returns Translation vector that moves a clone from base to target.
   */
  private computeDisplacement(
    basePoint: AcGePoint3dLike,
    targetPoint: AcGePoint3dLike
  ) {
    return new AcGePoint3d(
      targetPoint.x - basePoint.x,
      targetPoint.y - basePoint.y,
      targetPoint.z - basePoint.z
    )
  }

  /**
   * Scales a displacement for one copy in a repeated copy/array operation.
   *
   * @param displacement - Raw placement displacement from the base point.
   * @param factor - One-based copy index.
   * @param copyCount - Total number of copies to generate.
   * @param fitMode - Whether indexed copies should be distributed across the full span.
   * @returns Displacement assigned to the requested copy index.
   */
  private scaleDisplacement(
    displacement: AcGePoint3dLike,
    factor: number,
    copyCount: number,
    fitMode: boolean
  ) {
    const scale = fitMode && copyCount > 0 ? factor / copyCount : factor
    return new AcGePoint3d(
      displacement.x * scale,
      displacement.y * scale,
      displacement.z * scale
    )
  }

  /**
   * Clones source entities and translates each clone batch into its final position.
   *
   * @param sourceEntities - Entities to duplicate.
   * @param displacement - Raw placement displacement from base point to end point.
   * @param copyCount - Number of translated copy batches to produce.
   * @param fitMode - Whether batches should be distributed evenly across the full displacement.
   * @returns Newly cloned and transformed entities ready to append to model space.
   */
  private buildCopies(
    sourceEntities: AcDbEntity[],
    displacement: AcGePoint3dLike,
    copyCount: number = 1,
    fitMode: boolean = false
  ) {
    const copies: AcDbEntity[] = []

    for (let factor = 1; factor <= copyCount; factor++) {
      const batch = sourceEntities
        .map(entity => entity.clone())
        .filter((entity): entity is AcDbEntity => !!entity)
      const stepDisplacement = this.scaleDisplacement(
        displacement,
        factor,
        copyCount,
        fitMode
      )
      const matrix = new AcGeMatrix3d().makeTranslation(
        stepDisplacement.x,
        stepDisplacement.y,
        stepDisplacement.z
      )
      batch.forEach(entity => entity.transformBy(matrix))
      copies.push(...batch)
    }

    return copies
  }

  /**
   * Prompts the user to choose between single-copy and repeated-copy behavior.
   *
   * @param currentMode - Mode shown as the current default in the prompt.
   * @returns Selected mode, the current mode on empty input, or `undefined` on cancel/error.
   */
  private async promptCopyMode(currentMode: CopyMode) {
    const prompt = new AcEdPromptKeywordOptions(
      `${AcApI18n.t('jig.copy.modePrompt')} <${currentMode}>`
    )
    prompt.allowNone = true
    this.addKeyword(prompt, 'single')
    this.addKeyword(prompt, 'multiple')

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.None) {
      return currentMode
    }
    if (result.status !== AcEdPromptStatus.OK) {
      return undefined
    }

    const keyword = result.stringResult ?? ''
    if (keyword === 'Single' || keyword === 'Multiple') {
      return keyword
    }
    return currentMode
  }

  /**
   * Collects array placement settings for the `Array` COPY option.
   *
   * The routine first asks for the number of items, then asks for the final
   * placement point. If the user chooses `Fit`, the returned placement marks
   * copies as evenly distributed across the overall span.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities used to build the transient preview.
   * @param basePoint - Array start point shared by all placements.
   * @returns Array placement settings, or `undefined` when input is canceled.
   */
  private async promptArrayPlacement(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3d
  ): Promise<CopyArrayPlacement | undefined> {
    const itemCountPrompt = new AcEdPromptIntegerOptions(
      AcApI18n.t('jig.copy.arrayItemCount'),
      2
    )
    itemCountPrompt.lowerLimit = 2
    itemCountPrompt.allowNegative = false
    itemCountPrompt.allowZero = false

    const itemCountResult =
      await AcApDocManager.instance.editor.getInteger(itemCountPrompt)
    if (itemCountResult.status !== AcEdPromptStatus.OK) {
      return undefined
    }

    const itemCount = itemCountResult.value ?? 2
    const copyCount = Math.max(1, itemCount - 1)

    while (true) {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.copy.arraySecondPointOrFit')
      )
      this.addKeyword(pointPrompt, 'fit')
      pointPrompt.useBasePoint = true
      pointPrompt.useDashedLine = true
      pointPrompt.basePoint = basePoint
      pointPrompt.jig = new AcApCopyPreviewJig(
        context.view,
        sourceEntities,
        basePoint,
        copyCount
      )

      const pointResult =
        await AcApDocManager.instance.editor.getPoint(pointPrompt)
      if (pointResult.status === AcEdPromptStatus.OK) {
        return {
          copyCount,
          endPoint: new AcGePoint3d(pointResult.value!),
          fitMode: false
        }
      }

      if (
        pointResult.status === AcEdPromptStatus.Keyword &&
        pointResult.stringResult === 'Fit'
      ) {
        const fitPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.copy.arrayFitSecondPoint')
        )
        fitPrompt.useBasePoint = true
        fitPrompt.useDashedLine = true
        fitPrompt.basePoint = basePoint
        fitPrompt.jig = new AcApCopyPreviewJig(
          context.view,
          sourceEntities,
          basePoint,
          copyCount,
          true
        )

        const fitResult =
          await AcApDocManager.instance.editor.getPoint(fitPrompt)
        if (fitResult.status === AcEdPromptStatus.OK) {
          return {
            copyCount,
            endPoint: new AcGePoint3d(fitResult.value!),
            fitMode: true
          }
        }
      }

      return undefined
    }
  }

  /**
   * Runs the placement loop that repeatedly creates copies until the command ends.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities selected for copying.
   * @param basePoint - Base/displacement point used by the current copy session.
   * @param copyMode - Whether the loop should stop after one placement or continue.
   * @param useDisplacementPrompt - Whether prompt text should describe displacement instead of second point placement.
   */
  private async executeCopyLoop(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3d,
    copyMode: CopyMode,
    useDisplacementPrompt: boolean = false
  ) {
    const blockTable = context.doc.database.tables.blockTable

    while (true) {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t(
          useDisplacementPrompt
            ? 'jig.copy.displacementOrArray'
            : 'jig.copy.secondPointOrArray'
        )
      )
      this.addKeyword(pointPrompt, 'array')
      pointPrompt.useBasePoint = true
      pointPrompt.useDashedLine = true
      pointPrompt.basePoint = basePoint
      pointPrompt.allowNone = copyMode === 'Multiple'
      pointPrompt.jig = new AcApCopyPreviewJig(
        context.view,
        sourceEntities,
        basePoint
      )

      const pointResult =
        await AcApDocManager.instance.editor.getPoint(pointPrompt)
      if (pointResult.status === AcEdPromptStatus.OK) {
        const copies = this.buildCopies(
          sourceEntities,
          this.computeDisplacement(basePoint, pointResult.value!)
        )
        if (copies.length > 0) {
          blockTable.modelSpace.appendEntity(copies)
        }
        if (copyMode === 'Single') return
        continue
      }

      if (
        pointResult.status === AcEdPromptStatus.Keyword &&
        pointResult.stringResult === 'Array'
      ) {
        const placement = await this.promptArrayPlacement(
          context,
          sourceEntities,
          basePoint
        )
        if (!placement) continue

        const copies = this.buildCopies(
          sourceEntities,
          this.computeDisplacement(basePoint, placement.endPoint),
          placement.copyCount,
          placement.fitMode
        )
        if (copies.length > 0) {
          blockTable.modelSpace.appendEntity(copies)
        }
        if (copyMode === 'Single') return
        continue
      }

      return
    }
  }

  /**
   * Executes COPY using AutoCAD-like selection, base-point, and placement prompts.
   *
   * Existing selection is reused when available; otherwise the command requests
   * a new selection. The command then resolves copy mode/base point options and
   * appends cloned entities into model space for each accepted placement.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const annotation = new AcApAnnotation(context.doc.database)
    const blockTable = context.doc.database.tables.blockTable

    const selectionIds =
      selectionSet.count > 0
        ? selectionSet.ids
        : ((
            await AcApDocManager.instance.editor.getSelection(
              new AcEdPromptSelectionOptions(AcApI18n.sysCmdPrompt('copy'))
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

    let copyMode = AcApCopyCmd._defaultMode
    let basePoint: AcGePoint3d | undefined
    let useDisplacementPrompt = false

    while (!basePoint) {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.copy.basePointOrOptions')
      )
      pointPrompt.allowNone = true
      this.addKeyword(pointPrompt, 'displacement')
      this.addKeyword(pointPrompt, 'mode')
      if (copyMode !== 'Multiple') {
        this.addKeyword(pointPrompt, 'multiple')
      }

      const pointResult =
        await AcApDocManager.instance.editor.getPoint(pointPrompt)
      if (pointResult.status === AcEdPromptStatus.OK) {
        basePoint = new AcGePoint3d(pointResult.value!)
        break
      }

      if (pointResult.status === AcEdPromptStatus.None) {
        basePoint = new AcGePoint3d(0, 0, 0)
        useDisplacementPrompt = true
        break
      }

      if (pointResult.status !== AcEdPromptStatus.Keyword) {
        selectionSet.clear()
        return
      }

      const keyword = pointResult.stringResult ?? ''
      if (keyword === 'Displacement') {
        basePoint = new AcGePoint3d(0, 0, 0)
        useDisplacementPrompt = true
        break
      }

      if (keyword === 'Multiple') {
        copyMode = 'Multiple'
        continue
      }

      if (keyword !== 'Mode') {
        selectionSet.clear()
        return
      }

      const modeResult = await this.promptCopyMode(copyMode)
      if (!modeResult) {
        selectionSet.clear()
        return
      }
      copyMode = modeResult
      AcApCopyCmd._defaultMode = modeResult
    }

    await this.executeCopyLoop(
      context,
      sourceEntities,
      basePoint,
      copyMode,
      useDisplacementPrompt
    )
    selectionSet.clear()
  }
}
