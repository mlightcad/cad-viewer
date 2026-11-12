import {
  type AcApContext,
  AcApI18n,
  acapZoomToVisible,
  AcEdCommand,
  AcEdOpenMode,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import {
  type AcDbEntity,
  type AcDbHatch,
  type AcDbObjectId
} from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n'
import { acapPdfAskKeyword } from './acapPdfPrompts'
import {
  acapPdfCreateRecoveredHatch,
  acapPdfHatchPatternLabel,
  acapPdfRecoverHatches,
  pdfEntitiesToHatchInput,
  type PdfRecoveredHatch
} from './pdfHatchRecover'

/** Space around a hatch framed during the review, as a share of its size. */
const FOCUS_MARGIN = 0.3

interface Candidate {
  found: PdfRecoveredHatch<AcDbObjectId>
  entity: AcDbHatch
}

/**
 * `pdfhatch`: turns the loose strokes a PDF made of a pattern hatch back
 * into a hatch object.
 *
 * 1. Select the strokes together with the lines around them (a crossing
 *    window over the hatched area is enough).
 * 2. Strokes that form a regular pattern are matched against `acadiso.pat`,
 *    a user-defined single or crossed pattern, or else measured as a custom
 *    pattern. The boundary comes from closed shapes in the selection or the
 *    faces the selected line work encloses.
 * 3. The hatches are previewed in place of their strokes; convert all of
 *    them, none, or review them one by one.
 *
 * A hatch is accepted only when re-drawing it reproduces its strokes, and
 * only entities it re-draws completely are erased.
 */
export class AcApPdfHatchCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdfhatch'
    })
    if (!resolved) return
    context.view.selectionSet.clear()

    const entityById = new Map<AcDbObjectId, AcDbEntity>()
    resolved.entities.forEach((entity, i) =>
      entityById.set(resolved.ids[i], entity)
    )
    const input = pdfEntitiesToHatchInput(entityById)
    const { hatches } = acapPdfRecoverHatches(input)

    const db = context.doc.database
    const candidates: Candidate[] = []
    for (const found of hatches) {
      if (found.consumed.length === 0) continue
      const entity = acapPdfCreateRecoveredHatch(
        db,
        found.hatch,
        entityById.get(found.consumed[0])
      )
      if (entity) candidates.push({ found, entity })
    }
    if (candidates.length === 0) {
      this.notify(AcApI18n.t('jig.pdfhatch.noHatches'), 'warning')
      return
    }

    const accepted = await this.confirm(context, candidates)
    if (!accepted || accepted.length === 0) return

    db.tables.blockTable.modelSpace.appendEntity(
      accepted.map(candidate => candidate.entity)
    )
    const erased = accepted.flatMap(candidate => candidate.found.consumed)
    context.doc.entityService.eraseEntities(erased)
    this.notify(
      acapPdfT('jig.pdfhatch.summary', {
        count: accepted.length,
        patterns: patternList(accepted),
        strokes: erased.length
      })
    )
  }

  /**
   * Shows the hatches in place of their strokes and asks which to keep.
   *
   * @returns The accepted candidates, or `undefined` when cancelled.
   */
  private async confirm(
    context: AcApContext,
    candidates: Candidate[]
  ): Promise<Candidate[] | undefined> {
    const view = context.view
    const hidden = candidates.flatMap(candidate => candidate.found.consumed)
    const previews = candidates.map(candidate => candidate.entity)
    let focused: AcDbObjectId[] = []
    // The reviewed hatch shows its own strokes highlighted on top.
    const focus = (ids: AcDbObjectId[]) => {
      if (focused.length > 0) {
        view.unhighlight(focused)
        for (const id of focused) view.setEntitySceneVisible(id, false)
      }
      focused = ids
      if (focused.length > 0) {
        for (const id of focused) view.setEntitySceneVisible(id, true)
        view.highlight(focused)
      }
    }
    // The strokes are hidden so the preview shows the drawing as it will
    // look once they are replaced.
    for (const id of hidden) view.setEntitySceneVisible(id, false)
    view.addTransientEntity(previews)
    try {
      const mode = await acapPdfAskKeyword(
        acapPdfT('jig.pdfhatch.convertAll', {
          count: candidates.length,
          patterns: patternList(candidates)
        }),
        ['yes', 'no', 'review'],
        'yes'
      )
      if (mode === undefined || mode === 'no') return undefined
      if (mode === 'yes') return candidates

      const accepted: Candidate[] = []
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i]
        focus(candidate.found.consumed)
        const box = candidate.entity.geometricExtents
        if (box && Number.isFinite(box.min.x)) {
          acapZoomToVisible(view, box, FOCUS_MARGIN, undefined)
        }
        const answer = await acapPdfAskKeyword(
          acapPdfT('jig.pdfhatch.convertOne', {
            index: i + 1,
            count: candidates.length,
            pattern: describe(candidate)
          }),
          ['yes', 'no', 'all', 'exit'],
          'yes'
        )
        if (answer === undefined) return undefined
        if (answer === 'yes') accepted.push(candidate)
        if (answer === 'all') {
          accepted.push(...candidates.slice(i))
          break
        }
        if (answer === 'exit') break
      }
      return accepted
    } finally {
      focus([])
      for (const entity of previews) view.removeTransientEntity(entity.objectId)
      for (const id of hidden) view.setEntitySceneVisible(id, true)
    }
  }
}

/** `ANSI31 ×2, AR-B816` for the prompts and the summary. */
function patternList(candidates: Candidate[]): string {
  const counts = new Map<string, number>()
  for (const { found } of candidates) {
    const label = acapPdfHatchPatternLabel(found.hatch)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => (count > 1 ? `${label} ×${count}` : label))
    .join(', ')
}

/** Pattern, scale and angle of one hatch for the review prompt. */
function describe(candidate: Candidate): string {
  const pattern = candidate.found.hatch.pattern
  const label = acapPdfHatchPatternLabel(candidate.found.hatch)
  if (pattern.type === 'custom') return label
  const angle = Number(((pattern.angle * 180) / Math.PI).toFixed(2))
  const size =
    pattern.type === 'predefined'
      ? Number(pattern.scale.toPrecision(4))
      : Number(pattern.spacing.toPrecision(4))
  return `${label} ${size} / ${angle}°`
}
