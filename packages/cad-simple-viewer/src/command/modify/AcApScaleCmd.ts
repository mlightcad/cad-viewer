import { AcDbEntity, AcGePoint3d, AcGeTol } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { resolveSelectedEntities } from '../../service'
import { createScaleMatrix } from '../../util/AcApGeTransform'
import { AcApScalePreviewJig, AcApScaleStaticJig } from './AcApScalePreviewJig'

/**
 * Result of the SCALE factor prompts.
 */
export interface AcApScaleInput {
  /** Whether scaled copies are created and the originals kept. */
  copyMode: boolean
  /** Uniform scale factor applied around the base point. */
  factor: number
}

type AcApScaleKeyword = 'copy' | 'reference' | 'points'

/**
 * Command to enlarge or reduce selected entities uniformly around a base
 * point, mirroring AutoCAD `SCALE`.
 *
 * Supported workflow:
 * 1) Select entities (or reuse preselection),
 * 2) Specify base point,
 * 3) Specify scale factor (typed, or dragged as the cursor distance from the
 *    base point), or choose `Copy` / `Reference`,
 * 4) `Reference` asks for a reference length (typed or two points) and a new
 *    length (typed, dragged from the base point, or `Points`); the factor is
 *    `newLength / referenceLength`,
 * 5) Apply the scale to the originals or append scaled copies.
 *
 * Like AutoCAD, the scale factor, reference length and new length are
 * remembered for the session and offered as defaults (`<1.0000>` initially),
 * so pressing Enter at a prompt reuses the previous value.
 */
export class AcApScaleCmd extends AcEdCommand {
  /** Last scale factor, offered as default on the next run. */
  private static _lastFactor = 1
  /** Last reference length used by the `Reference` option. */
  private static _lastReferenceLength = 1
  /** Last new length used by the `Reference` option. */
  private static _lastNewLength = 1

  /**
   * Creates the SCALE command. Drawing geometry may only be scaled in Write mode.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Builds a world-space uniform scale matrix around a given base point.
   *
   * @param basePoint - Scale origin.
   * @param factor - Uniform scale factor.
   * @returns Composite transform that scales around `basePoint`.
   */
  static createScaleMatrix = createScaleMatrix

  /**
   * Resets the remembered defaults. Intended for tests.
   */
  static resetDefaults() {
    AcApScaleCmd._lastFactor = 1
    AcApScaleCmd._lastReferenceLength = 1
    AcApScaleCmd._lastNewLength = 1
  }

  /**
   * Adds one localized SCALE keyword to a prompt.
   *
   * @param prompt - Prompt that should expose the keyword.
   * @param key - Translation key suffix describing which keyword to add.
   */
  private addKeyword(prompt: AcEdPromptDistanceOptions, key: AcApScaleKeyword) {
    prompt.keywords.add(
      AcApI18n.t(`jig.scale.keywords.${key}.display`),
      AcApI18n.t(`jig.scale.keywords.${key}.global`),
      AcApI18n.t(`jig.scale.keywords.${key}.local`)
    )
  }

  /**
   * Creates a positive, non-zero length prompt with a remembered default.
   *
   * @param messageKey - `jig.scale.*` message key.
   * @param defaultValue - Value accepted when the user presses Enter.
   * @param basePoint - Optional base point measured from while dragging.
   */
  private createLengthPrompt(
    messageKey: string,
    defaultValue: number,
    basePoint?: AcGePoint3d
  ) {
    const prompt = new AcEdPromptDistanceOptions(
      AcApI18n.t(`jig.scale.${messageKey}`)
    )
    if (basePoint) {
      prompt.useBasePoint = true
      prompt.basePoint = basePoint
    }
    prompt.useDashedLine = true
    // AutoCAD: "Value must be positive and nonzero."
    prompt.allowZero = false
    prompt.allowNegative = false
    prompt.useDefaultValue = true
    prompt.defaultValue = defaultValue
    return prompt
  }

  /**
   * Returns whether a length is usable as a scale input.
   *
   * @param value - Length to validate.
   */
  private isValidLength(value: number | undefined): value is number {
    return value != null && Number.isFinite(value) && AcGeTol.isPositive(value)
  }

  /**
   * Prompts for the reference length of the `Reference` option, either typed
   * or picked as the distance between two points.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities kept visible by the static preview.
   * @returns Reference length, or `undefined` when canceled.
   */
  private async promptReferenceLength(
    context: AcApContext,
    sourceEntities: AcDbEntity[]
  ): Promise<number | undefined> {
    const prompt = this.createLengthPrompt(
      'referenceLength',
      AcApScaleCmd._lastReferenceLength
    )
    prompt.jig = new AcApScaleStaticJig<number>(context.view, sourceEntities)
    const result = await AcApDocManager.instance.editor.getDistance(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined
    if (!this.isValidLength(result.value)) {
      this.notify(AcApI18n.t('jig.scale.invalid.length'), 'warning')
      return undefined
    }
    return result.value
  }

  /**
   * Prompts for the new length of the `Reference` option. The length is
   * dragged from the base point, typed, or picked from two points (`Points`).
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities selected for scaling.
   * @param basePoint - Scale base point.
   * @param referenceLength - Length that maps to a scale factor of `1`.
   * @returns New length, or `undefined` when canceled.
   */
  private async promptNewLength(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3d,
    referenceLength: number
  ): Promise<number | undefined> {
    const prompt = this.createLengthPrompt(
      'newLengthOrPoints',
      AcApScaleCmd._lastNewLength,
      basePoint
    )
    this.addKeyword(prompt, 'points')
    prompt.jig = new AcApScalePreviewJig(
      context.view,
      sourceEntities,
      basePoint,
      referenceLength
    )

    const result = await AcApDocManager.instance.editor.getDistance(prompt)
    let value: number | undefined
    if (result.status === AcEdPromptStatus.OK) {
      value = result.value
    } else if (
      result.status === AcEdPromptStatus.Keyword &&
      result.stringResult === 'Points'
    ) {
      // Without a base point the distance prompt asks for two points.
      const pointsPrompt = this.createLengthPrompt(
        'newLengthFirstPoint',
        AcApScaleCmd._lastNewLength
      )
      pointsPrompt.jig = new AcApScaleStaticJig<number>(
        context.view,
        sourceEntities
      )
      const pointsResult =
        await AcApDocManager.instance.editor.getDistance(pointsPrompt)
      if (pointsResult.status !== AcEdPromptStatus.OK) return undefined
      value = pointsResult.value
    } else {
      return undefined
    }

    if (!this.isValidLength(value)) {
      this.notify(AcApI18n.t('jig.scale.invalid.length'), 'warning')
      return undefined
    }
    return value
  }

  /**
   * Prompts for the scale factor and the optional `Copy` / `Reference` modes.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities selected for scaling.
   * @param basePoint - Scale base point.
   * @returns Scale settings, or `undefined` when input is canceled.
   */
  async promptScale(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3d
  ): Promise<AcApScaleInput | undefined> {
    let copyMode = false

    while (true) {
      const prompt = this.createLengthPrompt(
        'scaleFactorOrOptions',
        AcApScaleCmd._lastFactor,
        basePoint
      )
      this.addKeyword(prompt, 'copy')
      this.addKeyword(prompt, 'reference')
      prompt.jig = new AcApScalePreviewJig(
        context.view,
        sourceEntities,
        basePoint
      )

      const result = await AcApDocManager.instance.editor.getDistance(prompt)
      if (result.status === AcEdPromptStatus.OK) {
        if (!this.isValidLength(result.value)) {
          this.notify(AcApI18n.t('jig.scale.invalid.factor'), 'warning')
          continue
        }
        AcApScaleCmd._lastFactor = result.value
        return { copyMode, factor: result.value }
      }

      if (result.status !== AcEdPromptStatus.Keyword) return undefined

      const keyword = result.stringResult ?? ''
      if (keyword === 'Copy') {
        copyMode = true
        this.notify(AcApI18n.t('jig.scale.copyMessage'))
        continue
      }

      if (keyword !== 'Reference') return undefined

      const referenceLength = await this.promptReferenceLength(
        context,
        sourceEntities
      )
      if (referenceLength == null) return undefined

      const newLength = await this.promptNewLength(
        context,
        sourceEntities,
        basePoint,
        referenceLength
      )
      if (newLength == null) return undefined

      AcApScaleCmd._lastReferenceLength = referenceLength
      AcApScaleCmd._lastNewLength = newLength
      const factor = newLength / referenceLength
      AcApScaleCmd._lastFactor = factor
      return { copyMode, factor }
    }
  }

  /**
   * Executes SCALE using selection reuse, base-point input, and scale prompts.
   *
   * The command scales the original entities in place unless the user chooses
   * `Copy`, in which case scaled clones are appended to model space instead.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'scale'
    })
    if (!resolved) return

    const { entities: sourceEntities } = resolved

    const basePointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.scale.basePoint')
    )
    basePointPrompt.jig = new AcApScaleStaticJig<AcGePoint3d>(
      context.view,
      sourceEntities
    )
    // AutoCAD SCALE: Enter at base point cancels without scaling.
    basePointPrompt.allowNone = true
    const basePointResult =
      await AcApDocManager.instance.editor.getPoint(basePointPrompt)
    if (basePointResult.status !== AcEdPromptStatus.OK) {
      selectionSet.clear()
      return
    }

    const basePoint = new AcGePoint3d(basePointResult.value!)
    const scale = await this.promptScale(context, sourceEntities, basePoint)
    if (!scale) {
      selectionSet.clear()
      return
    }

    const entityService = context.doc.entityService
    if (scale.copyMode) {
      entityService.cloneAndTransform(
        sourceEntities,
        createScaleMatrix(basePoint, scale.factor),
        { regenerateDimensions: true }
      )
    } else if (!AcGeTol.equalToZero(scale.factor - 1)) {
      entityService.scaleEntities(sourceEntities, basePoint, scale.factor)
    }

    selectionSet.clear()
  }
}
