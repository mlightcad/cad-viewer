import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n'
import { AcApPdfTextCmd } from './AcApPdfTextCmd'
import { acapPdfNiceScale, pdfEntitiesToDimInput } from './pdfDimensionConvert'
import { acapPdfPrepareDimStrokeTexts } from './pdfDimStrokeTexts'
import {
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from './recognition/pdfDimensionPattern'

/**
 * `pdfscale`: calibrates imported PDF geometry to real-world units.
 *
 * PDF drawings are usually printed at a scale (1:50, 1:100, ...), so a
 * 1 pt = 25.4/72 mm import is rarely 1:1. The user picks two points of a
 * known distance (typically the ends of a dimension) and types the true
 * length; the selection is scaled uniformly about the first point. When the
 * selection contains exploded dimensions, the scale their texts imply
 * pre-fills the real length.
 */
export class AcApPdfScaleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Computes the uniform scale factor from a measured and a real length.
   *
   * @returns The factor, or `undefined` when either length is not positive.
   */
  static scaleFactor(measured: number, real: number): number | undefined {
    if (!(measured > 0) || !(real > 0)) return undefined
    return real / measured
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdfscale'
    })
    if (!resolved) return
    const editor = AcApDocManager.instance.editor
    // Exploded dimensions in the selection reveal the drawing scale: their
    // texts divided by their measured lengths.
    const byId = new Map(
      resolved.ids.map((id, i) => [id, resolved.entities[i]] as const)
    )
    const dimInput = pdfEntitiesToDimInput(byId)
    acapPdfPrepareDimStrokeTexts(
      dimInput,
      byId,
      AcApPdfTextCmd.glyphDictionary
    )
    const suggested = suggestPdfDimensionScale(
      recognizePdfDimensions(dimInput)
    )
    const dimensionScale =
      suggested !== undefined ? acapPdfNiceScale(suggested) : undefined
    const selectionSet = context.view.selectionSet

    const firstPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.pdfscale.firstPoint')
    )
    const first = await editor.getPoint(firstPrompt)
    if (first.status !== AcEdPromptStatus.OK || !first.value) {
      selectionSet.clear()
      return
    }
    const base = new AcGePoint3d(first.value)

    const secondPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.pdfscale.secondPoint')
    )
    secondPrompt.useBasePoint = true
    secondPrompt.useDashedLine = true
    secondPrompt.basePoint = base
    const second = await editor.getPoint(secondPrompt)
    if (second.status !== AcEdPromptStatus.OK || !second.value) {
      selectionSet.clear()
      return
    }

    const measured = Math.hypot(
      second.value.x - base.x,
      second.value.y - base.y
    )
    if (!(measured > 0)) {
      this.notify(AcApI18n.t('jig.pdfscale.zeroDistance'), 'warning')
      selectionSet.clear()
      return
    }

    const lengthPrompt = new AcEdPromptDoubleOptions(
      dimensionScale !== undefined
        ? acapPdfT('jig.pdfscale.realLengthFromDimensions', {
            measured: formatNumber(measured),
            scale: formatNumber(dimensionScale)
          })
        : acapPdfT('jig.pdfscale.realLength', {
            measured: formatNumber(measured)
          })
    )
    lengthPrompt.allowNegative = false
    lengthPrompt.allowZero = false
    if (dimensionScale !== undefined) {
      lengthPrompt.defaultValue = Number(
        (measured * dimensionScale).toPrecision(10)
      )
      lengthPrompt.useDefaultValue = true
      lengthPrompt.allowNone = true
    }
    const length = await editor.getDouble(lengthPrompt)
    const realLength =
      length.status === AcEdPromptStatus.OK
        ? length.value
        : length.status === AcEdPromptStatus.None &&
            dimensionScale !== undefined
          ? lengthPrompt.defaultValue
          : undefined
    if (realLength == null) {
      selectionSet.clear()
      return
    }

    const factor = AcApPdfScaleCmd.scaleFactor(measured, realLength)
    if (factor === undefined) {
      selectionSet.clear()
      return
    }
    const matrix = new AcGeMatrix3d()
      .makeTranslation(base.x, base.y, base.z)
      .multiply(new AcGeMatrix3d().makeScale(factor, factor, factor))
      .multiply(new AcGeMatrix3d().makeTranslation(-base.x, -base.y, -base.z))
    const count = context.doc.entityService.transformEntities(
      resolved.entities,
      matrix
    )
    selectionSet.clear()
    this.notify(
      acapPdfT('jig.pdfscale.applied', {
        count,
        factor: formatNumber(factor)
      })
    )
  }
}

function formatNumber(value: number) {
  return Number(value.toPrecision(6)).toString()
}
