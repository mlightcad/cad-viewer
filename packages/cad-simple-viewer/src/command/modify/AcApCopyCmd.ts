import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  scaleCopyDisplacement
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApCopyPreviewJig } from './AcApCopyPreviewJig'

type CopyMode = 'Single' | 'Multiple'

interface CopyArrayPlacement {
  copyCount: number
  endPoint: AcGePoint3d
  fitMode: boolean
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
    return scaleCopyDisplacement(displacement, factor, copyCount, fitMode)
  }

  /**
   * Appends cloned entities to model space and shows them immediately in the view.
   *
   * Database edits during an active command transaction may not reach the view
   * until the command ends. Explicit {@link AcEdBaseView.addEntity} keeps each
   * placement visible while the COPY loop continues. All placements still share
   * one undo mark from {@link AcEdCommand.trigger}.
   *
   * @param context - Active command context with database and view access
   * @param copies - Cloned entities to append and display
   */
  private appendCopies(context: AcApContext, copies: AcDbEntity[]) {
    if (copies.length === 0) {
      return
    }
    context.doc.database.tables.blockTable.modelSpace.appendEntity(copies)
    context.view.addEntity(copies)
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
      // AutoCAD COPY: Enter at placement prompt ends without adding another copy.
      pointPrompt.allowNone = true
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
        this.appendCopies(context, copies)
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
        this.appendCopies(context, copies)
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
      .map(id => context.doc.database.openEntityForRead(id))
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
