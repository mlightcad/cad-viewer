import {
  AcDbEntity,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeTol
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptAngleOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  AcApRotatePreviewJig,
  AcApRotateStaticJig,
  createRotationMatrix
} from './AcApRotatePreviewJig'

/**
 * Command to rotate selected entities around a base point.
 *
 * Supported workflow:
 * 1) Select entities (or reuse preselection),
 * 2) Specify base point,
 * 3) Specify rotation angle, or choose `Copy` / `Reference`,
 * 4) Apply rotation to originals or append rotated copies.
 */
export class AcApRotateCmd extends AcEdCommand {
  /**
   * Creates the ROTATE command and marks it as a review-mode command.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Builds a world-space rotation matrix around a given base point.
   *
   * @param basePoint - Rotation origin.
   * @param angleRad - Rotation angle in radians.
   * @returns Composite transform that rotates around `basePoint`.
   */
  static createRotationMatrix = createRotationMatrix

  /**
   * Adds one localized ROTATE keyword to an angle prompt.
   *
   * @param prompt - Angle prompt that should expose the keyword.
   * @param key - Translation key suffix describing which keyword to add.
   */
  private addKeyword(
    prompt: AcEdPromptAngleOptions,
    key: 'copy' | 'reference' | 'points'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.rotate.keywords.${key}.display`),
      AcApI18n.t(`jig.rotate.keywords.${key}.global`),
      AcApI18n.t(`jig.rotate.keywords.${key}.local`)
    )
  }

  /**
   * Shows a localized warning for invalid reference-point input.
   *
   * @param key - Warning message key suffix.
   */
  private warnInvalidInput(key: 'referencePoints') {
    this.notify(AcApI18n.t(`jig.rotate.invalid.${key}`), 'warning')
  }

  /**
   * Computes the planar direction angle from one point to another.
   *
   * @param start - Start/reference point.
   * @param end - End/target point.
   * @returns Direction angle in degrees, or `undefined` when points are coincident.
   */
  private computeAngleDeg(
    start: AcGePoint3dLike,
    end: AcGePoint3dLike
  ): number | undefined {
    const dx = end.x - start.x
    const dy = end.y - start.y
    if (!AcGeTol.isPositive(Math.hypot(dx, dy))) return undefined
    return (Math.atan2(dy, dx) * 180) / Math.PI
  }

  /**
   * Prompts for a reference angle used by the ROTATE `Reference` option.
   *
   * The user can either enter the angle directly or define it from two points.
   * When the point-based definition is degenerate, the command warns and asks again.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities used to build transient preview geometry.
   * @param basePoint - Rotation base point shared by subsequent angle prompts.
   * @returns Reference angle in degrees, or `undefined` when input is canceled.
   */
  private async promptReferenceAngle(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3d
  ): Promise<number | undefined> {
    while (true) {
      const prompt = new AcEdPromptAngleOptions(
        AcApI18n.t('jig.rotate.referenceAngleOrPoints')
      )
      this.addKeyword(prompt, 'points')
      prompt.useBasePoint = true
      prompt.useDashedLine = true
      prompt.basePoint = basePoint
      prompt.allowNegative = true
      prompt.allowZero = true
      prompt.useDefaultValue = true
      prompt.defaultValue = 0
      prompt.jig = new AcApRotateStaticJig<number>(context.view, sourceEntities)

      const result = await AcApDocManager.instance.editor.getAngle(prompt)
      if (result.status === AcEdPromptStatus.OK) {
        return result.value ?? 0
      }
      if (
        result.status === AcEdPromptStatus.Keyword &&
        result.stringResult === 'Points'
      ) {
        const firstPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.rotate.firstReferencePoint')
        )
        firstPrompt.jig = new AcApRotateStaticJig<AcGePoint3d>(
          context.view,
          sourceEntities
        )
        const firstResult =
          await AcApDocManager.instance.editor.getPoint(firstPrompt)
        if (firstResult.status !== AcEdPromptStatus.OK) return undefined

        const secondPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.rotate.secondReferencePoint')
        )
        secondPrompt.useBasePoint = true
        secondPrompt.useDashedLine = true
        secondPrompt.basePoint = new AcGePoint3d(firstResult.value!)
        secondPrompt.jig = new AcApRotateStaticJig<AcGePoint3d>(
          context.view,
          sourceEntities
        )
        const secondResult =
          await AcApDocManager.instance.editor.getPoint(secondPrompt)
        if (secondResult.status !== AcEdPromptStatus.OK) return undefined

        const angle = this.computeAngleDeg(
          firstResult.value!,
          secondResult.value!
        )
        if (angle == null) {
          this.warnInvalidInput('referencePoints')
          continue
        }
        return angle
      }
      return undefined
    }
  }

  /**
   * Prompts for the final rotation angle and optional ROTATE sub-modes.
   *
   * The prompt supports `Copy` to preserve originals and `Reference` to derive
   * the final rotation from an existing angle and a new target angle.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities selected for rotation.
   * @param basePoint - Rotation base point.
   * @returns Rotation settings, or `undefined` when input is canceled.
   */
  private async promptRotationAngle(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3d
  ) {
    let copyMode = false

    while (true) {
      const prompt = new AcEdPromptAngleOptions(
        AcApI18n.t('jig.rotate.rotationAngleOrOptions')
      )
      this.addKeyword(prompt, 'copy')
      this.addKeyword(prompt, 'reference')
      prompt.useBasePoint = true
      prompt.useDashedLine = true
      prompt.basePoint = basePoint
      prompt.allowNegative = true
      prompt.allowZero = true
      // AutoCAD ROTATE: Enter at angle prompt ends without rotating.
      prompt.allowNone = true
      prompt.jig = new AcApRotatePreviewJig(
        context.view,
        sourceEntities,
        basePoint
      )

      const result = await AcApDocManager.instance.editor.getAngle(prompt)
      if (result.status === AcEdPromptStatus.OK) {
        return {
          copyMode,
          angleRad: ((result.value ?? 0) * Math.PI) / 180
        }
      }

      if (result.status !== AcEdPromptStatus.Keyword) return undefined

      const keyword = result.stringResult ?? ''
      if (keyword === 'Copy') {
        copyMode = true
        continue
      }

      if (keyword !== 'Reference') return undefined

      const referenceAngleDeg = await this.promptReferenceAngle(
        context,
        sourceEntities,
        basePoint
      )
      if (referenceAngleDeg == null) return undefined

      const newAnglePrompt = new AcEdPromptAngleOptions(
        AcApI18n.t('jig.rotate.newAngle')
      )
      newAnglePrompt.useBasePoint = true
      newAnglePrompt.useDashedLine = true
      newAnglePrompt.basePoint = basePoint
      newAnglePrompt.allowNegative = true
      newAnglePrompt.allowZero = true
      newAnglePrompt.allowNone = true
      newAnglePrompt.jig = new AcApRotatePreviewJig(
        context.view,
        sourceEntities,
        basePoint,
        referenceAngleDeg
      )

      const newAngleResult =
        await AcApDocManager.instance.editor.getAngle(newAnglePrompt)
      if (newAngleResult.status !== AcEdPromptStatus.OK) return undefined

      return {
        copyMode,
        angleRad:
          (((newAngleResult.value ?? 0) - referenceAngleDeg) * Math.PI) / 180
      }
    }
  }

  /**
   * Executes ROTATE using selection reuse, base-point input, and angle prompts.
   *
   * The command rotates the original entities in place unless the user chooses
   * `Copy`, in which case rotated clones are appended to model space instead.
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
              new AcEdPromptSelectionOptions(AcApI18n.sysCmdPrompt('rotate'))
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

    const basePointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.rotate.basePoint')
    )
    basePointPrompt.jig = new AcApRotateStaticJig<AcGePoint3d>(
      context.view,
      sourceEntities
    )
    // AutoCAD ROTATE: Enter at base point cancels without rotating.
    basePointPrompt.allowNone = true
    const basePointResult =
      await AcApDocManager.instance.editor.getPoint(basePointPrompt)
    if (basePointResult.status !== AcEdPromptStatus.OK) {
      selectionSet.clear()
      return
    }

    const basePoint = new AcGePoint3d(basePointResult.value!)
    const rotation = await this.promptRotationAngle(
      context,
      sourceEntities,
      basePoint
    )
    if (!rotation) {
      selectionSet.clear()
      return
    }

    const matrix = createRotationMatrix(
      basePoint,
      rotation.angleRad
    )

    if (rotation.copyMode) {
      const clones = sourceEntities
        .map(entity => entity.clone())
        .filter((entity): entity is AcDbEntity => !!entity)
      clones.forEach(entity => entity.transformBy(matrix))
      if (clones.length > 0) {
        blockTable.modelSpace.appendEntity(clones)
      }
    } else {
      sourceEntities.forEach(entity => {
        const opened = context.doc.database.openEntityForWrite(entity)
        if (!opened) return
        opened.transformBy(matrix)
        opened.triggerModifiedEvent()
      })
    }

    selectionSet.clear()
  }
}
