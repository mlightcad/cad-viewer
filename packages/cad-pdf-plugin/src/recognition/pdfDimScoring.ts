/**
 * Evidence scoring and conflict resolution for dimension hypotheses.
 *
 * Every recognizer proposes candidates with a score built from the features
 * it found. Candidates sharing a non-shareable shape (terminator, value text,
 * dimension line) conflict; the best ones win. A second round re-scores
 * every candidate with what the confident ones agree on (drawing scale,
 * arrow size, text height), so outliers drop out.
 */

import { pdfDimMedian } from './pdfDimPrimitives.js'

/** Weights of the evidence items (one place to tune them). */
export const PDF_DIM_WEIGHTS = {
  /** Each matched terminator (arrow, tick, dot). */
  terminator: 3,
  /** A dimension line segment between the terminators. */
  dimLine: 2,
  /** Each extension line found. */
  extension: 1.5,
  /** Extension line runs past the dimension line (DIMEXE). */
  extensionBeyond: 0.5,
  /** Value text parses as a number. */
  numericText: 2,
  /** Text runs along the dimension line. */
  textAligned: 1,
  /** Text sits beside the middle of the span. */
  textCentred: 1,
  /** Value agrees with the measured size at the drawing scale. */
  scaleAgrees: 3,
  /** Value disagrees with the measured size at any common scale. */
  scaleDisagrees: -3,
  /** Text could not be read; the measured size stands in for it. */
  unreadText: -1,
  /** Terminator or text size is an outlier for the drawing. */
  sizeOutlier: -2,
  /** Radial: text carries an R / Ø prefix. */
  radialPrefix: 2,
  /** Radial: arrow points along the radius. */
  radialArrow: 3
} as const

/** Accept thresholds per profile. */
export const PDF_DIM_THRESHOLDS = {
  /** `pdfdim` with a review panel: lenient, the user decides. */
  review: 5,
  /** Automatic import: strict, nobody reviews. */
  import: 8
} as const

/** Recognition profile. */
export type PdfDimProfile = keyof typeof PDF_DIM_THRESHOLDS

/** Accumulates evidence for one candidate. */
export class PdfDimEvidence {
  score = 0
  readonly items: string[] = []

  add(name: keyof typeof PDF_DIM_WEIGHTS, times = 1) {
    if (times === 0) return
    this.score += PDF_DIM_WEIGHTS[name] * times
    this.items.push(times === 1 ? name : `${name}×${times}`)
  }

  clone(): PdfDimEvidence {
    const copy = new PdfDimEvidence()
    copy.score = this.score
    copy.items.push(...this.items)
    return copy
  }
}

/** What the scorer needs from a candidate. */
export interface PdfDimScored<Id> {
  /** Shapes no other accepted candidate may use. */
  exclusive: Id[]
  /** Base evidence from the recognizer. */
  evidence: PdfDimEvidence
  /** Numeric value read from the text, when any. */
  value?: number
  /** Size the value should match (length, radius, ...), before scaling. */
  measured: number
  /** True when the value is an angle (never scales). */
  angle?: boolean
  /** True when the value was invented from the measured size. */
  unread?: boolean
  /**
   * True when the value may follow its own scale (R / Ø callouts are often
   * written at true size on a scaled sheet): a clean ratio is then no
   * contradiction, only a missing confirmation.
   */
  ownScale?: boolean
  /** Terminator size (0 when none). */
  arrowSize: number
  textHeight: number
  /** Kind-specific must-haves for the import profile. */
  strongEnough: boolean
  /** Tie-break: shorter spans first keeps chained dimensions apart. */
  span: number
}

/** Global priors measured from confident candidates. */
export interface PdfDimPriors {
  scale?: number
  arrowSize?: number
  textHeight?: number
}

/** Whether `ratio` is within 1 % of 1, 2, 2.5 or 5 × 10ⁿ. */
export function pdfDimIsNiceScale(ratio: number): boolean {
  if (!(ratio > 0)) return false
  const exponent = Math.floor(Math.log10(ratio))
  for (const e of [exponent - 1, exponent, exponent + 1]) {
    for (const m of [1, 2, 2.5, 5]) {
      const nice = m * 10 ** e
      if (Math.abs(nice - ratio) <= ratio * 0.01) return true
    }
  }
  return false
}

/**
 * Most common value / measured ratio (clustered within 1 %), from
 * candidates whose value was actually read.
 */
export function pdfDimDominantScale<Id>(
  candidates: PdfDimScored<Id>[]
): number | undefined {
  const ratios = candidates
    .filter(
      c => !c.angle && !c.unread && c.value !== undefined && c.measured > 0
    )
    .map(c => c.value! / c.measured)
    .filter(r => Number.isFinite(r) && r > 0)
  if (ratios.length === 0) return undefined
  let best: number[] = []
  for (const r of ratios) {
    const cluster = ratios.filter(x => Math.abs(x - r) <= r * 0.01)
    if (cluster.length > best.length) best = cluster
  }
  return pdfDimMedian(best)
}

/** Decimal places written in `value` (2 for 12.54, 0 for 75). */
function decimalsIn(value: number): number {
  const text = String(value)
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

/** Score of `c` under `priors` (base evidence plus consistency). */
export function pdfDimScoreWithPriors<Id>(
  c: PdfDimScored<Id>,
  priors: PdfDimPriors
): PdfDimEvidence {
  const evidence = c.evidence.clone()
  if (c.value !== undefined && !c.unread && c.measured > 0) {
    const tolerance = (expected: number) => Math.max(expected * 0.005, 0.051)
    if (c.angle) {
      if (Math.abs(c.value - c.measured) <= 0.6) evidence.add('scaleAgrees')
      else evidence.add('scaleDisagrees')
    } else if (priors.scale !== undefined) {
      const expected = c.measured * priors.scale
      // Texts are rounded to DIMDEC places; half a unit in the last place
      // of the shown value still agrees (74.92 shown as "75").
      const shownStep = 0.5 * 10 ** -decimalsIn(c.value)
      if (
        Math.abs(c.value - expected) <= Math.max(tolerance(expected), shownStep)
      ) {
        evidence.add('scaleAgrees')
      } else if (!(c.ownScale && pdfDimIsNiceScale(c.value / c.measured))) {
        evidence.add('scaleDisagrees')
      }
    } else if (!pdfDimIsNiceScale(c.value / c.measured)) {
      evidence.add('scaleDisagrees')
    }
  }
  if (priors.arrowSize && c.arrowSize > 0) {
    const ratio = c.arrowSize / priors.arrowSize
    if (ratio < 0.6 || ratio > 1.6) evidence.add('sizeOutlier')
  }
  if (priors.textHeight && c.textHeight > 0) {
    const ratio = c.textHeight / priors.textHeight
    if (ratio < 0.5 || ratio > 2) evidence.add('sizeOutlier')
  }
  return evidence
}

/**
 * Picks a conflict-free set of candidates, best first.
 *
 * Round 1 accepts candidates on their own evidence and measures the priors;
 * round 2 re-scores all with those priors and selects again.
 *
 * @returns Accepted candidates with their final evidence.
 */
export function pdfDimResolve<Id, C extends PdfDimScored<Id>>(
  candidates: C[],
  profile: PdfDimProfile
): Array<{ candidate: C; evidence: PdfDimEvidence }> {
  const threshold = PDF_DIM_THRESHOLDS[profile]
  const select = (scoreOf: (c: C) => PdfDimEvidence) => {
    const scored = candidates.map(candidate => ({
      candidate,
      evidence: scoreOf(candidate)
    }))
    scored.sort(
      (a, b) =>
        b.evidence.score - a.evidence.score ||
        a.candidate.span - b.candidate.span
    )
    const taken = new Set<Id>()
    const accepted: typeof scored = []
    for (const item of scored) {
      if (item.evidence.score < threshold) break
      if (profile === 'import' && !item.candidate.strongEnough) continue
      // Unattended: a read value that contradicts the drawing scale means a
      // misread or a symbolic label (E maxi); the dimension would show a
      // wrong number.
      if (
        profile === 'import' &&
        item.evidence.items.includes('scaleDisagrees')
      ) {
        continue
      }
      if (item.candidate.exclusive.some(id => taken.has(id))) continue
      for (const id of item.candidate.exclusive) taken.add(id)
      accepted.push(item)
    }
    return accepted
  }

  const first = select(c => pdfDimScoreWithPriors(c, {}))
  const confident = first.map(item => item.candidate)
  const priors: PdfDimPriors = {
    scale: pdfDimDominantScale(confident),
    arrowSize:
      pdfDimMedian(confident.map(c => c.arrowSize).filter(s => s > 0)) ||
      undefined,
    textHeight:
      pdfDimMedian(confident.map(c => c.textHeight).filter(h => h > 0)) ||
      undefined
  }
  return select(c => pdfDimScoreWithPriors(c, priors))
}
