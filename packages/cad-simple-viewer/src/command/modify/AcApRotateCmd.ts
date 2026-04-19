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
  AcEdPromptAngleOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  eventBus
} from '../../editor'
import { AcApI18n } from '../../i18n'

const ANGLE_EPSILON = 1e-9

/**
 * Static preview jig used while ROTATE asks for supporting inputs such as
 * reference points. It keeps cloned source entities visible without mutating
 * database entities.
 */
class AcApRotateStaticJig<T> extends AcEdPreviewJig<T> {
  private _view: AcEdBaseView
  private _previewEntities: AcDbEntity[]

  /**
   * Creates a static transient preview for prompts that do not modify geometry.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   */
  constructor(view: AcEdBaseView, sourceEntities: AcDbEntity[]) {
    super(view)
    this._view = view
    this._previewEntities = sourceEntities
      .map(entity => entity.clone())
      .filter((entity): entity is AcDbEntity => !!entity)
  }

  /**
   * Gets the first preview entity so the jig can integrate with the editor API.
   *
   * @returns First transient preview entity, or `null` when cloning failed.
   */
  get entity(): AcDbEntity | null {
    return this._previewEntities[0] ?? null
  }

  /**
   * Accepts prompt updates without changing geometry because this preview is static.
   *
   * @param _value - Prompt value supplied by the editor, ignored by this jig.
   */
  update(_value: T) {
    // Static preview only.
  }

  /**
   * Adds the cloned entities to the view as transient preview graphics.
   */
  override render(): void {
    if (this._previewEntities.length === 0) return
    this._view.addTransientEntity(this._previewEntities)
  }

  /**
   * Removes every transient preview entity from the view.
   */
  override end(): void {
    this._previewEntities.forEach(entity =>
      this._view.removeTransientEntity(entity.objectId)
    )
  }
}

/**
 * ROTATE preview jig.
 *
 * It clones source entities once and applies only the incremental delta angle
 * to those clones as the cursor moves, so database entities remain unchanged
 * until command commit.
 */
class AcApRotatePreviewJig extends AcEdPreviewJig<number> {
  private _view: AcEdBaseView
  private _basePoint: AcGePoint3d
  private _previewEntities: AcDbEntity[]
  private _lastAngleRad: number = 0
  private _referenceAngleDeg: number

  /**
   * Creates a dynamic ROTATE preview jig.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   * @param basePoint - Rotation base point.
   * @param referenceAngleDeg - Reference angle in degrees used for reference-based rotation prompts.
   */
  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    referenceAngleDeg: number = 0
  ) {
    super(view)
    this._view = view
    this._basePoint = new AcGePoint3d(basePoint)
    this._referenceAngleDeg = referenceAngleDeg
    this._previewEntities = sourceEntities
      .map(entity => entity.clone())
      .filter((entity): entity is AcDbEntity => !!entity)
  }

  /**
   * Gets the first transient preview entity required by the jig API.
   *
   * @returns First preview entity, or `null` when cloning failed.
   */
  get entity(): AcDbEntity | null {
    return this._previewEntities[0] ?? null
  }

  /**
   * Applies only the incremental rotation delta to preview clones.
   *
   * @param angleDeg - Current angle input in degrees from the editor prompt.
   */
  update(angleDeg: number) {
    if (this._previewEntities.length === 0) return

    const angleRad = ((angleDeg - this._referenceAngleDeg) * Math.PI) / 180
    const deltaRad = angleRad - this._lastAngleRad
    if (Math.abs(deltaRad) < ANGLE_EPSILON) return

    const matrix = AcApRotateCmd.createRotationMatrix(this._basePoint, deltaRad)
    this._previewEntities.forEach(entity => entity.transformBy(matrix))
    this._lastAngleRad = angleRad
  }

  /**
   * Adds rotated preview clones to the view as transient geometry.
   */
  override render(): void {
    if (this._previewEntities.length === 0) return
    this._view.addTransientEntity(this._previewEntities)
  }

  /**
   * Removes transient preview clones from the view.
   */
  override end(): void {
    this._previewEntities.forEach(entity =>
      this._view.removeTransientEntity(entity.objectId)
    )
  }
}

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
  static createRotationMatrix(basePoint: AcGePoint3dLike, angleRad: number) {
    return new AcGeMatrix3d()
      .makeTranslation(basePoint.x, basePoint.y, basePoint.z)
      .multiply(new AcGeMatrix3d().makeRotationZ(angleRad))
      .multiply(
        new AcGeMatrix3d().makeTranslation(
          -basePoint.x,
          -basePoint.y,
          -basePoint.z
        )
      )
  }

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
    eventBus.emit('message', {
      message: AcApI18n.t(`jig.rotate.invalid.${key}`),
      type: 'warning'
    })
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
    if (Math.hypot(dx, dy) < ANGLE_EPSILON) return undefined
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

    const matrix = AcApRotateCmd.createRotationMatrix(
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
        entity.transformBy(matrix)
        entity.triggerModifiedEvent()
      })
    }

    selectionSet.clear()
  }
}
