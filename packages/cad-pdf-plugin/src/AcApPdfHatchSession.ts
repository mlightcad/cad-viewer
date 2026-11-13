import { AcDbPredefinedAcadIsoPat } from '@mlightcad/data-model'

import type { PdfHatchInput } from './pdfHatchRecover'
import type { PdfRecognizedShape } from './recognition/pdfCurveRecognition'
import {
  acapPdfBoundaryAt,
  acapPdfFitHatch,
  acapPdfMatchHatch,
  type PdfHatchMatch,
  type PdfHatchPatternRequest,
  type PdfRecognizedHatch
} from './recognition/pdfHatchRecognition'
import type { PdfRecPoint } from './recognition/pdfRecGeometry'

/** Lowest precision of a hatch shown as a good match. */
export const PDF_HATCH_GOOD_PRECISION = 0.95
/** Lowest recall of a hatch shown as a good match. */
export const PDF_HATCH_GOOD_RECALL = 0.9

/**
 * Pattern choice of a row: `predefined:<name>` for a library pattern,
 * `user` / `user2` for single / crossed user-defined lines, `custom` for the
 * pattern the recognition measured.
 */
export type PdfHatchPatternKey = string

/** Key of single user-defined lines. */
export const PDF_HATCH_USER_KEY = 'user'
/** Key of crossed user-defined lines. */
export const PDF_HATCH_USER_DOUBLE_KEY = 'user2'
/** Key of the measured custom pattern. */
export const PDF_HATCH_CUSTOM_KEY = 'custom'

/** One hatch under review. */
export interface PdfHatchRow<Id> {
  /** Stable id for the UI (rows are never reordered, only appended). */
  readonly key: number
  hatch: PdfRecognizedHatch
  /** How well {@link hatch} re-draws the strokes inside its boundary. */
  match: PdfHatchMatch
  /** Whether the hatch is created on Apply. */
  included: boolean
  /** Entities every item of which the hatch re-draws (erased on Apply). */
  consumed: Id[]
  /** The strokes showed no trace of the chosen pattern (placed by guess). */
  guessed: boolean
  /** The hatch as first found; a custom pattern can only be restored. */
  readonly original: PdfRecognizedHatch
  /** Added by the user from a picked point. */
  readonly added: boolean
}

/** Size and angle of a row's pattern, for editing. */
export interface PdfHatchParams {
  /** Pattern scale (library) or line spacing (user-defined). */
  size: number
  /** Angle in degrees. */
  angle: number
}

/** Input of {@link AcApPdfHatchSession}. */
export interface AcApPdfHatchSessionInput<Id> {
  input: PdfHatchInput<Id>
  /** Tolerance the hatches were recognized with. */
  tolerance: number
  /** Recognized hatches (their `items` index `input.items`). */
  hatches: PdfRecognizedHatch[]
}

const DEG = Math.PI / 180

/**
 * State of a `pdfhatch` review: the recovered hatches, which of them to
 * create, and their patterns. UI-free, so the panel stays a thin view.
 *
 * Every change of pattern or size refits the hatch to the strokes and
 * scores it again; a hatch only replaces the entities it re-draws
 * completely, so a poor choice leaves strokes in place instead of losing
 * them.
 */
export class AcApPdfHatchSession<Id> {
  readonly rows: PdfHatchRow<Id>[] = []
  readonly tolerance: number
  private readonly input: PdfHatchInput<Id>
  /** Items per entity, to tell whether a hatch re-draws all of one. */
  private readonly itemCount = new Map<Id, number>()
  private nextKey = 0

  constructor(options: AcApPdfHatchSessionInput<Id>) {
    this.input = options.input
    this.tolerance = options.tolerance
    for (const owner of this.input.owners) {
      this.itemCount.set(owner, (this.itemCount.get(owner) ?? 0) + 1)
    }
    for (const hatch of options.hatches) {
      const consumed = this.consumedBy(hatch.items)
      if (consumed.length === 0) continue
      // The recognition proved its items; the score is for display.
      const match = {
        ...acapPdfMatchHatch(this.input.items, hatch, this.tolerance),
        items: hatch.items
      }
      this.rows.push({
        key: this.nextKey++,
        hatch,
        match,
        included: true,
        consumed,
        guessed: false,
        original: hatch,
        added: false
      })
    }
  }

  /** Rows created on Apply. */
  get readyRows(): PdfHatchRow<Id>[] {
    return this.rows.filter(row => row.included && row.consumed.length > 0)
  }

  /** Entities erased on Apply, each once. */
  get erasedIds(): Id[] {
    return [...new Set(this.readyRows.flatMap(row => row.consumed))]
  }

  /** Every entity some row may replace (hidden while previewing). */
  get strokeIds(): Id[] {
    return [...new Set(this.rows.flatMap(row => row.consumed))]
  }

  /** Whether a row re-draws its strokes well enough to trust it. */
  isGood(row: PdfHatchRow<Id>): boolean {
    return (
      !row.guessed &&
      row.match.precision >= PDF_HATCH_GOOD_PRECISION &&
      row.match.recall >= PDF_HATCH_GOOD_RECALL
    )
  }

  /** Entity whose layer and colour the hatch of `row` takes. */
  sourceOf(row: PdfHatchRow<Id>): Id | undefined {
    const first = row.hatch.items[0]
    return first === undefined ? undefined : this.input.owners[first]
  }

  setIncluded(row: PdfHatchRow<Id>, included: boolean) {
    row.included = included
  }

  /** Pattern choices for `row`, in display order. */
  patternKeys(row: PdfHatchRow<Id>): PdfHatchPatternKey[] {
    const keys: PdfHatchPatternKey[] = []
    if (row.original.pattern.type === 'custom') keys.push(PDF_HATCH_CUSTOM_KEY)
    keys.push(PDF_HATCH_USER_KEY, PDF_HATCH_USER_DOUBLE_KEY)
    for (const pattern of AcDbPredefinedAcadIsoPat.patterns) {
      keys.push(`predefined:${pattern.name}`)
    }
    return keys
  }

  /** Current pattern choice of `row`. */
  patternKey(row: PdfHatchRow<Id>): PdfHatchPatternKey {
    const pattern = row.hatch.pattern
    if (pattern.type === 'predefined') return `predefined:${pattern.name}`
    if (pattern.type === 'userDefined') {
      return pattern.double ? PDF_HATCH_USER_DOUBLE_KEY : PDF_HATCH_USER_KEY
    }
    return PDF_HATCH_CUSTOM_KEY
  }

  /** Size and angle, or `undefined` for a measured custom pattern. */
  params(row: PdfHatchRow<Id>): PdfHatchParams | undefined {
    const pattern = row.hatch.pattern
    if (pattern.type === 'custom') return undefined
    return {
      size: pattern.type === 'predefined' ? pattern.scale : pattern.spacing,
      angle: normalizeDegrees(pattern.angle / DEG)
    }
  }

  /**
   * Switches `row` to another pattern and measures its size and angle on
   * the strokes.
   *
   * @returns Whether the row changed.
   */
  setPattern(row: PdfHatchRow<Id>, key: PdfHatchPatternKey): boolean {
    if (key === PDF_HATCH_CUSTOM_KEY) {
      if (row.original.pattern.type !== 'custom') return false
      this.restore(row)
      return true
    }
    const request = requestOf(key)
    return request ? this.refit(row, request) : false
  }

  /**
   * Places the row's pattern at the given size and angle (only the origin
   * is searched).
   *
   * @returns Whether the row changed.
   */
  setParams(row: PdfHatchRow<Id>, params: PdfHatchParams): boolean {
    if (!(params.size > 0) || !Number.isFinite(params.angle)) return false
    const pattern = row.hatch.pattern
    const angle = params.angle * DEG
    if (pattern.type === 'predefined') {
      return this.refit(row, {
        type: 'predefined',
        name: pattern.name,
        scale: params.size,
        angle
      })
    }
    if (pattern.type === 'userDefined') {
      return this.refit(row, {
        type: 'userDefined',
        double: pattern.double,
        spacing: params.size,
        angle
      })
    }
    return false
  }

  /**
   * Measures size and angle of the row's pattern again (after manual
   * edits); a custom pattern returns to what the recognition measured.
   */
  autoFit(row: PdfHatchRow<Id>): boolean {
    const key = this.patternKey(row)
    return this.setPattern(row, key)
  }

  /**
   * Adds a hatch for the closed area around `point`: the best fitting
   * pattern for the strokes inside it.
   *
   * @returns The new row, `'noBoundary'` when no closed area holds the
   * point, or `'noStrokes'` when no pattern explains strokes inside it.
   */
  addRegion(point: PdfRecPoint): PdfHatchRow<Id> | 'noBoundary' | 'noStrokes' {
    const boundary = acapPdfBoundaryAt(this.input.items, point, this.tolerance)
    if (!boundary) return 'noBoundary'
    const fit = acapPdfFitHatch(this.input.items, boundary, undefined, {
      tolerance: this.tolerance
    })
    if (!fit || fit.match.items.length === 0) return 'noStrokes'
    const consumed = this.consumedBy(fit.match.items)
    if (consumed.length === 0) return 'noStrokes'
    const row: PdfHatchRow<Id> = {
      key: this.nextKey++,
      hatch: fit.hatch,
      match: fit.match,
      included: true,
      consumed,
      guessed: !fit.fitted,
      original: fit.hatch,
      added: true
    }
    this.rows.push(row)
    return row
  }

  /** Boundary shapes of `row` (for framing it in the drawing). */
  boundaryOf(row: PdfHatchRow<Id>): readonly PdfRecognizedShape[] {
    return row.hatch.boundary
  }

  private refit(
    row: PdfHatchRow<Id>,
    request: PdfHatchPatternRequest
  ): boolean {
    const fit = acapPdfFitHatch(this.input.items, row.hatch.boundary, request, {
      tolerance: this.tolerance
    })
    if (!fit) return false
    row.hatch = fit.hatch
    row.match = fit.match
    row.guessed = !fit.fitted
    row.consumed = this.consumedBy(fit.match.items)
    return true
  }

  private restore(row: PdfHatchRow<Id>) {
    row.hatch = row.original
    row.match = {
      ...acapPdfMatchHatch(this.input.items, row.original, this.tolerance),
      items: row.original.items
    }
    row.guessed = false
    row.consumed = this.consumedBy(row.original.items)
  }

  /** Entities all of whose items are among `items`. */
  private consumedBy(items: readonly number[]): Id[] {
    const taken = new Map<Id, number>()
    for (const index of items) {
      const owner = this.input.owners[index]
      taken.set(owner, (taken.get(owner) ?? 0) + 1)
    }
    // A polyline whose other segments are line work stays as it is.
    return [...taken.entries()]
      .filter(([owner, count]) => count === this.itemCount.get(owner))
      .map(([owner]) => owner)
  }
}

function requestOf(
  key: PdfHatchPatternKey
): PdfHatchPatternRequest | undefined {
  if (key === PDF_HATCH_USER_KEY) return { type: 'userDefined', double: false }
  if (key === PDF_HATCH_USER_DOUBLE_KEY) {
    return { type: 'userDefined', double: true }
  }
  const prefix = 'predefined:'
  if (key.startsWith(prefix)) {
    return { type: 'predefined', name: key.slice(prefix.length) }
  }
  return undefined
}

function normalizeDegrees(angle: number): number {
  const a = ((angle % 360) + 360) % 360
  return Number(a.toFixed(4)) % 360
}
