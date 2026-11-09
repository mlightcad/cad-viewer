import {
  type AcApContext,
  AcApI18n,
  AcEdCommand,
  AcEdOpenMode,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import { type AcDbEntity, type AcDbObjectId } from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n'
import { acapPdfAskKeyword } from './acapPdfPrompts'
import {
  acapPdfCreateDimensions,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  pdfEntitiesToDimInput
} from './pdfDimensionConvert'
import {
  type PdfDimensionCandidate,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from './recognition/pdfDimensionPattern'

/**
 * `pdfdim`: turns exploded dimensions from a PDF back into dimension objects.
 *
 * 1. Select a region (a window around the dimensions is enough).
 * 2. Arrowheads (closed triangles) or architectural ticks, dimension lines,
 *    extension lines and value texts are recognized as linear, radius and
 *    diameter dimensions, and highlighted.
 * 3. Convert all of them, none, or review them one by one.
 *
 * Recovered dimensions use a `PDF_DIM` style whose text height, arrow size
 * and extension follow the PDF, and whose linear scale factor (DIMLFAC)
 * matches the scale the texts imply, so a 1:100 drawing still reads its
 * real values. A dimension whose text disagrees keeps it as an override.
 */
export class AcApPdfDimCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdfdim'
    })
    if (!resolved) return
    const selectionSet = context.view.selectionSet
    selectionSet.clear()

    const entityById = new Map<AcDbObjectId, AcDbEntity>()
    resolved.entities.forEach((entity, i) =>
      entityById.set(resolved.ids[i], entity)
    )
    const candidates = recognizePdfDimensions(pdfEntitiesToDimInput(entityById))
    if (candidates.length === 0) {
      this.notify(AcApI18n.t('jig.pdfdim.noDimensions'), 'warning')
      return
    }

    const scale = acapPdfNiceScale(suggestPdfDimensionScale(candidates) ?? 1)
    const accepted = await this.confirm(context, candidates, scale)
    selectionSet.clear()
    if (!accepted || accepted.length === 0) return

    const db = context.doc.database
    acapPdfEnsureDimStyle(db, accepted, scale)
    acapPdfCreateDimensions(
      db,
      accepted,
      scale,
      candidate => entityById.get(candidate.text.id)?.layer
    )
    context.doc.entityService.eraseEntities(
      accepted.flatMap(candidate => candidate.consumed)
    )
    this.notify(
      acapPdfT('jig.pdfdim.summary', {
        count: accepted.length,
        scale: formatScale(scale)
      })
    )
  }

  private async confirm(
    context: AcApContext,
    candidates: PdfDimensionCandidate<AcDbObjectId>[],
    scale: number
  ): Promise<PdfDimensionCandidate<AcDbObjectId>[] | undefined> {
    const selectionSet = context.view.selectionSet
    selectionSet.add(candidates.flatMap(candidate => candidate.consumed))
    const mode = await acapPdfAskKeyword(
      acapPdfT('jig.pdfdim.convertAll', {
        count: candidates.length,
        scale: formatScale(scale)
      }),
      ['yes', 'no', 'review'],
      'yes'
    )
    if (mode === undefined || mode === 'no') return undefined
    if (mode === 'yes') return candidates

    const accepted: PdfDimensionCandidate<AcDbObjectId>[] = []
    for (let i = 0; i < candidates.length; i++) {
      selectionSet.clear()
      selectionSet.add(candidates[i].consumed)
      const answer = await acapPdfAskKeyword(
        acapPdfT('jig.pdfdim.convertOne', {
          index: i + 1,
          count: candidates.length,
          text: candidates[i].text.text
        }),
        ['yes', 'no', 'all', 'exit'],
        'yes'
      )
      if (answer === undefined) return undefined
      if (answer === 'yes') accepted.push(candidates[i])
      if (answer === 'all') {
        accepted.push(...candidates.slice(i))
        break
      }
      if (answer === 'exit') break
    }
    return accepted
  }
}

function formatScale(scale: number) {
  return Number(scale.toPrecision(6)).toString()
}
