/**
 * Recognizes exploded dimensions (arrowheads or ticks, dimension line,
 * extension lines and text) in imported PDF geometry.
 *
 * Pure geometry: callers describe lines, closed polylines, circles and texts
 * with plain data, so the recognizer is unit-testable without the data model.
 *
 * Pipeline:
 * 1. Features — terminators (closed/open arrows, ticks, dots), value texts.
 * 2. Hypotheses — each dimension kind is anchored on its most telling
 *    feature (a pair of opposed terminators, an arrow on a circle, an arc
 *    with tangent arrows, a row of coordinate labels).
 * 3. Evidence — every hypothesis is scored (`pdfDimScoring.ts`).
 * 4. Resolution — conflicting hypotheses (sharing a terminator, text or
 *    dimension line) are resolved best-first, twice: the second round uses
 *    the drawing scale and sizes the confident ones agree on.
 */

import {
  PdfDimGrid,
  pdfDimLerp,
  pdfDimLineAngle,
  pdfDimMedian,
  pdfDimPointSegmentDistance,
  pdfDimSegmentBox,
  pdfDimUnit
} from './pdfDimPrimitives.js'
import {
  PdfDimEvidence,
  type PdfDimProfile,
  pdfDimResolve,
  type PdfDimScored
} from './pdfDimScoring.js'
import {
  pdfDimArrowFromPolygon,
  pdfDimOpenArrows,
  type PdfDimTerminator,
  pdfDimTicks
} from './pdfDimTerminators.js'
import { cross, dist, dot, type PdfRecPoint, sub } from './pdfRecGeometry.js'

/** A straight segment (line, or one segment of a polyline). */
export interface PdfDimSegment<Id = unknown> {
  id: Id
  p0: PdfRecPoint
  p1: PdfRecPoint
}

/** A closed polyline that may be an arrowhead. */
export interface PdfDimPolygon<Id = unknown> {
  id: Id
  /** Vertices without the repeated closing point. */
  vertices: PdfRecPoint[]
}

/** A circle or arc a radial dimension may point at. */
export interface PdfDimCurve<Id = unknown> {
  center: PdfRecPoint
  radius: number
  /** Source entity, when known (small circles may be dot terminators). */
  id?: Id
  /** For arcs: start / end angle (radians, counterclockwise). */
  startAngle?: number
  endAngle?: number
  /** True for a filled disc. */
  filled?: boolean
}

/** An arc that may be the dimension arc of an angular dimension. */
export interface PdfDimArc<Id = unknown> {
  id: Id
  center: PdfRecPoint
  radius: number
  /** Start angle in radians; the arc runs counterclockwise to `endAngle`. */
  startAngle: number
  endAngle: number
}

/** A text that may be a dimension value. */
export interface PdfDimText<Id = unknown> {
  id: Id
  text: string
  /** Center of the text box. */
  center: PdfRecPoint
  height: number
  /** Baseline direction in radians, when known. */
  rotation?: number
  /**
   * Extra entity ids that form exploded stroke text beyond {@link id}
   * (each stroke is its own line/polyline).
   */
  extraIds?: Id[]
}

/**
 * Exploded stroke text whose characters are not yet known. Linear recognition
 * may still claim it and use the measured length as the value.
 */
export interface PdfDimUnreadText<Id = unknown> {
  id: Id
  extraIds: Id[]
  center: PdfRecPoint
  height: number
  rotation?: number
}

/** Shapes to search, in model-space coordinates. */
export interface PdfDimInput<Id = unknown> {
  segments: PdfDimSegment<Id>[]
  polygons: PdfDimPolygon<Id>[]
  curves: PdfDimCurve<Id>[]
  texts: PdfDimText<Id>[]
  /** Arcs that may carry angular dimensions. Optional. */
  arcs?: PdfDimArc<Id>[]
  /**
   * Stroke clusters that look like dimension text but have no readable
   * value yet. Used only as a linear-dimension fallback.
   */
  unreadTexts?: PdfDimUnreadText<Id>[]
}

/** Fields every recognized dimension carries. */
interface PdfDimCommon<Id> {
  text: PdfDimText<Id>
  /** Terminator size; 0 without terminators. */
  arrowSize: number
  /** Source shapes the dimension replaces. */
  consumed: Id[]
  /** Final evidence score (set by {@link recognizePdfDimensions}). */
  score?: number
  /** Names of the evidence items behind {@link score}. */
  evidence?: string[]
  /**
   * True when the value text could not be read and {@link text} holds the
   * measured paper length as a stand-in. The dimension should then show
   * its own measurement (times DIMLFAC), not this text.
   */
  measuredText?: boolean
}

/** A recognized linear (rotated or aligned) dimension. */
export interface PdfLinearDimension<Id = unknown> extends PdfDimCommon<Id> {
  kind: 'linear' | 'aligned'
  /** First extension line origin (object side). */
  xLine1: PdfRecPoint
  /** Second extension line origin (object side). */
  xLine2: PdfRecPoint
  /** A point on the dimension line. */
  dimLinePoint: PdfRecPoint
  /** Dimension line direction in radians, in `[0, π)`. */
  rotation: number
  /** Distance between the terminators. */
  measured: number
  /** How far extension lines run past the dimension line. */
  extensionBeyond: number
  /** True when the terminators are architectural ticks. */
  ticks: boolean
  /**
   * True when the arrowheads sit outside the extension lines (tips point
   * toward each other). False for the usual inside arrows (pointing apart).
   */
  arrowsOut: boolean
  /** Terminator kind at the ends (default: closed arrows, or ticks). */
  terminator?: 'closed' | 'open' | 'tick' | 'dot' | 'none'
  /** Extension line ids found at each end (may be shared with neighbours). */
  extensionIds?: [Id | undefined, Id | undefined]
  /**
   * Where the text sits when the drawing placed it beyond the extension
   * lines, with the dimension line running out to it. Unset for text at its
   * home position.
   */
  textPosition?: PdfRecPoint
  /**
   * True when the label is a symbol (`a`, `e mini`) drawn as strokes that
   * could not be read. The strokes stay as drawn and the dimension shows no
   * text of its own ({@link text} is a single space, which suppresses it).
   */
  labelKept?: boolean
  /**
   * Dimension line drawn past outside arrows (from a tip, away from the
   * span). The dim block only draws the line between the arrows, so these
   * are added back; the side running out to {@link textPosition} is not
   * listed (the block draws that run).
   */
  outsideTails?: Array<{ from: PdfRecPoint; to: PdfRecPoint }>
}

/** A recognized radius or diameter dimension. */
export interface PdfRadialDimension<Id = unknown> extends PdfDimCommon<Id> {
  kind: 'radius' | 'diameter'
  center: PdfRecPoint
  /** Point on the curve the arrow touches. */
  chordPoint: PdfRecPoint
  radius: number
  /** Distance from the chord point to the text. */
  leaderLength: number
  /** Radius or diameter, matching `kind`. */
  measured: number
  /** True when the leader had a jog (large-radius dimension). */
  jogged?: boolean
  /**
   * Straight dimension-line pieces the source drew along the radius line
   * (the leader out to the text, the stub behind an outside far arrow).
   * They are consumed with the dimension, so the dim block draws any of
   * them it does not draw itself.
   */
  outsideLines?: Array<{ from: PdfRecPoint; to: PdfRecPoint }>
}

/** A recognized angular dimension (three-point form). */
export interface PdfAngularDimension<Id = unknown> extends PdfDimCommon<Id> {
  kind: 'angular'
  center: PdfRecPoint
  /** A point on the first leg (object side). */
  xLine1: PdfRecPoint
  /** A point on the second leg (object side). */
  xLine2: PdfRecPoint
  /** Midpoint of the dimension arc. */
  arcPoint: PdfRecPoint
  /** Measured angle in degrees. */
  measured: number
}

/** A recognized arc length dimension. */
export interface PdfArcLengthDimension<Id = unknown> extends PdfDimCommon<Id> {
  kind: 'arcLength'
  center: PdfRecPoint
  /** Ends of the measured arc (object side). */
  xLine1: PdfRecPoint
  xLine2: PdfRecPoint
  /** Midpoint of the dimension arc. */
  arcPoint: PdfRecPoint
  /** Arc length of the dimension arc's sweep at the object radius. */
  measured: number
}

/** A recognized ordinate dimension. */
export interface PdfOrdinateDimension<Id = unknown> extends PdfDimCommon<Id> {
  kind: 'ordinate'
  /** Origin the coordinates are measured from. */
  origin: PdfRecPoint
  /** Feature point being measured (object end of the leader). */
  definingPoint: PdfRecPoint
  /** Text end of the leader. */
  leaderEndPoint: PdfRecPoint
  /** True for an X coordinate (vertical leader). */
  useXAxis: boolean
  /** Coordinate distance from the origin. */
  measured: number
}

export type PdfDimensionCandidate<Id = unknown> =
  | PdfLinearDimension<Id>
  | PdfRadialDimension<Id>
  | PdfAngularDimension<Id>
  | PdfArcLengthDimension<Id>
  | PdfOrdinateDimension<Id>

/** Tuning for {@link recognizePdfDimensions}. */
export interface PdfDimensionOptions {
  /** Geometric tolerance. Default: 2 % of the median arrow size. */
  tolerance?: number
  /** Angular tolerance in radians. Default 3°. */
  angleTolerance?: number
  /**
   * `review` (default) keeps every plausible dimension for a person to
   * check; `import` keeps only well-supported ones.
   */
  profile?: PdfDimProfile
  /** Receives one line per hypothesis before resolution (diagnostics). */
  debug?: (line: string) => void
}

/**
 * Reads an arrowhead from a closed triangle: the sharpest corner is the tip,
 * the others form the base. Rejects shapes that are not slender triangles.
 */
export function pdfArrowFromPolygon(
  vertices: PdfRecPoint[]
): { tip: PdfRecPoint; direction: PdfRecPoint; size: number } | undefined {
  return pdfDimArrowFromPolygon(vertices)
}

/**
 * First number in a dimension text: `Ø25` → 25, `1,200` → 1200, `R12.5` →
 * 12.5, `2x Ø6` → 6, `1/2` → 0.5, `3'-6"` → 42 (inches), `45°` → 45,
 * `25±0.1` → 25. Returns `undefined` when there is no number.
 */
export function parsePdfDimensionValue(text: string): number | undefined {
  let t = text
    .replace(/\\[A-Za-z][^;]*;/g, '')
    .replace(/[{}]/g, '')
    .replace(/%%[cdp]/gi, ' ')
    .trim()
  // Multiplicity prefix: "2x", "4X", "2-" before the real value.
  t = t.replace(/^\d+\s*[xX×]\s*/, '').replace(/^\d+\s*-\s*(?=[^\d])/, '')
  const feetInches =
    /(\d+)\s*'\s*-?\s*(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+))?\s*"?/.exec(t)
  if (feetInches && /'/.test(t)) {
    const feet = Number(feetInches[1])
    const inches = feetInches[2] ? Number(feetInches[2]) : 0
    const frac =
      feetInches[3] && feetInches[4]
        ? Number(feetInches[3]) / Number(feetInches[4])
        : 0
    return feet * 12 + inches + frac
  }
  const fraction = /(\d+)?\s*(\d+)\/(\d+)/.exec(t)
  if (fraction && !/\d[.,]\d/.test(t)) {
    const whole = fraction[1] ? Number(fraction[1]) : 0
    const den = Number(fraction[3])
    if (den > 0) return whole + Number(fraction[2]) / den
  }
  const match = /\d+(?:[.,]\d+)*/.exec(t.replace(/\s+/g, ''))
  if (!match) return undefined
  let raw = match[0]
  if (/^\d{1,3}(,\d{3})+$/.test(raw)) raw = raw.replace(/,/g, '')
  else raw = raw.replace(',', '.')
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : undefined
}

/** Classifies a dimension text prefix. */
function radialKind(text: string): 'radius' | 'diameter' | undefined {
  const t = text.trim().replace(/^\d+\s*[xX×]\s*/, '')
  if (/^(Ø|⌀|ø|%%c|%%C|\\U\+2205)/.test(t)) return 'diameter'
  if (/^R\s*\d/i.test(t)) return 'radius'
  return undefined
}

/** Whether a text is an arc length value (`⌒` / `∩` prefix). */
function isArcLengthText(text: string): boolean {
  return /^\s*[⌒∩︵]/.test(text)
}

/** Whether a text is a plain value a linear dimension can show. */
function isLinearValueText(text: string): boolean {
  if (parsePdfDimensionValue(text) === undefined) return false
  // Thread callouts (M20) and radial / angular values are not lengths, but
  // a linear dimension may legitimately carry them (Ø40 across a shaft).
  return !/°/.test(text)
}

/** Entity ids that a dimension value text replaces. */
export function pdfDimTextIds<Id>(text: PdfDimText<Id>): Id[] {
  return text.extraIds && text.extraIds.length > 0
    ? [text.id, ...text.extraIds]
    : [text.id]
}

/** Compact decimal for a measured length used as a stroke-text fallback. */
function formatMeasuredLength(length: number): string {
  if (!Number.isFinite(length) || length <= 0) return '0'
  const rounded = Math.round(length)
  if (Math.abs(length - rounded) <= Math.max(length * 1e-6, 1e-6)) {
    return String(rounded)
  }
  const text = length.toFixed(4).replace(/\.?0+$/, '')
  return text.length > 0 ? text : String(length)
}

/** Whether `ratio` is within 1 % of 1, 2, 2.5 or 5 × 10ⁿ. */
function isNiceScaleRatio(ratio: number): boolean {
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
 * Keeps a stroke-read value only when it agrees with the measured length or
 * a clear drawing scale. Over-segmented outline digits often read as "111"
 * and must not become DIMLFAC = 2.
 */
function reconcileLinearDimText<Id>(
  text: PdfDimText<Id>,
  measured: number
): PdfDimText<Id> {
  if (!(measured > 0)) return text
  // Leave annotated values alone (`44mm`, tolerances, …); only rewrite plain
  // numeric / R / Ø / ° readings that look like a bad stroke OCR.
  if (!/^[Øø⌀R]?\s*\d+([.,]\d+)?\s*°?$/i.test(text.text.trim())) return text
  const value = parsePdfDimensionValue(text.text)
  const digits = text.text.replace(/\D/g, '')
  if (value === undefined || (digits.length >= 2 && /^1+$/.test(digits))) {
    return { ...text, text: formatMeasuredLength(measured) }
  }
  const ratio = value / measured
  if (Math.abs(ratio - 1) <= 0.05) return text
  if (isNiceScaleRatio(ratio)) return text
  return { ...text, text: formatMeasuredLength(measured) }
}

/** A value text or an unread placeholder found near a hypothesis. */
interface TextPick<Id> {
  text: PdfDimText<Id>
  unread: boolean
}

/** Internal hypothesis: a candidate plus what the scorer needs. */
type Hypothesis<Id> = PdfDimScored<Id> & {
  build: () => PdfDimensionCandidate<Id>
  /** Segment pieces the dimension replaces (polylines come in pieces). */
  claims?: PdfDimSegment<Id>[]
}

/** Context shared by the recognizers of one run. */
interface Context<Id> {
  input: PdfDimInput<Id>
  tol: number
  sinTol: number
  refSize: number
  segGrid: PdfDimGrid<PdfDimSegment<Id>>
  textGrid: PdfDimGrid<PdfDimText<Id>>
  unreadGrid: PdfDimGrid<PdfDimUnreadText<Id>>
  /** Polygon ids that are arrows (never extension or dimension lines). */
  terminatorIds: Set<Id>
}

/**
 * Finds linear, aligned, radius, diameter, angular, arc length and ordinate
 * dimensions.
 *
 * @param input - Candidate shapes.
 * @param options - Tolerances and profile.
 */
export function recognizePdfDimensions<Id>(
  input: PdfDimInput<Id>,
  options: PdfDimensionOptions = {}
): PdfDimensionCandidate<Id>[] {
  const profile = options.profile ?? 'review'
  const arrows: PdfDimTerminator<Id>[] = []
  for (const polygon of input.polygons) {
    const arrow = pdfDimArrowFromPolygon(polygon.vertices)
    if (arrow) arrows.push({ kind: 'closed', ids: [polygon.id], ...arrow })
  }
  const textHeights = input.texts.map(t => t.height).filter(h => h > 0)
  const refSize =
    pdfDimMedian(arrows.map(a => a.size)) || pdfDimMedian(textHeights) || 1
  const tol = options.tolerance ?? Math.max(refSize * 0.02, 1e-6)
  const angleTol = options.angleTolerance ?? (3 * Math.PI) / 180
  const sinTol = Math.sin(angleTol)

  const segGrid = new PdfDimGrid<PdfDimSegment<Id>>(refSize * 4)
  for (const s of input.segments) {
    segGrid.add(s, pdfDimSegmentBox(s.p0, s.p1, tol))
  }
  const textGrid = new PdfDimGrid<PdfDimText<Id>>(refSize * 4)
  for (const t of input.texts) {
    textGrid.add(t, pdfDimSegmentBox(t.center, t.center, t.height))
  }
  const unreadGrid = new PdfDimGrid<PdfDimUnreadText<Id>>(refSize * 4)
  for (const t of input.unreadTexts ?? []) {
    unreadGrid.add(t, pdfDimSegmentBox(t.center, t.center, t.height))
  }
  // Open arrows are looked for among short strokes, which also hold glyph
  // strokes (the corners of V, A, 4 ...). A real one is as large as the
  // drawing's other arrows and has a dimension line leaving its tip.
  const shortLimit = Math.max(pdfDimMedian(textHeights), refSize) * 1.5
  const openArrows = pdfDimOpenArrows(input.segments, shortLimit, tol).filter(
    open =>
      (arrows.length === 0 ||
        (open.size >= refSize * 0.6 && open.size <= refSize * 1.6)) &&
      segGrid.near(open.tip, tol * 2).some(s => {
        if (open.ids.includes(s.id)) return false
        if (dist(s.p0, s.p1) <= open.size * 2) return false
        const su = pdfDimUnit(sub(s.p1, s.p0))
        return (
          Math.abs(cross(su, open.direction!)) <= sinTol &&
          Math.min(dist(s.p0, open.tip), dist(s.p1, open.tip)) <= tol * 2
        )
      })
  )
  const terminatorIds = new Set<Id>()
  for (const a of arrows) a.ids.forEach(id => terminatorIds.add(id))
  for (const a of openArrows) a.ids.forEach(id => terminatorIds.add(id))
  const dots = dotTerminators(input, refSize)
  for (const d of dots) d.ids.forEach(id => terminatorIds.add(id))

  const ctx: Context<Id> = {
    input,
    tol,
    sinTol,
    refSize,
    segGrid,
    textGrid,
    unreadGrid,
    terminatorIds
  }

  const hypotheses: Hypothesis<Id>[] = [
    ...angularAndArcLength(ctx, [...arrows, ...openArrows]),
    ...radial(ctx, [...arrows, ...openArrows]),
    ...linearFromTerminators(ctx, [...arrows, ...openArrows, ...dots]),
    ...linearFromTicks(ctx, shortLimit),
    ...bareLinear(ctx),
    ...ordinate(ctx)
  ]
  if (options.debug) {
    for (const h of hypotheses) {
      const b = h.build()
      options.debug(
        `${b.kind} measured=${b.measured.toFixed(2)} text=${JSON.stringify(b.text.text)} base=${h.evidence.score} ${h.evidence.items.join(',')} strong=${h.strongEnough} exclusive=${h.exclusive.length}`
      )
    }
  }
  const accepted = pdfDimResolve(hypotheses, profile)
  // A polyline is split into pieces sharing its id; it may only be erased
  // when accepted dimensions claim every piece (an object outline whose one
  // edge doubles as an extension line must stay).
  const piecesOf = new Map<Id, number>()
  for (const s of input.segments) {
    piecesOf.set(s.id, (piecesOf.get(s.id) ?? 0) + 1)
  }
  const claimed = new Map<Id, Set<PdfDimSegment<Id>>>()
  for (const { candidate } of accepted) {
    for (const s of candidate.claims ?? []) {
      let set = claimed.get(s.id)
      if (!set) claimed.set(s.id, (set = new Set()))
      set.add(s)
    }
  }
  const partial = (id: Id) => {
    const pieces = piecesOf.get(id) ?? 0
    return pieces > 1 && (claimed.get(id)?.size ?? 0) < pieces
  }
  // Shared shapes (an extension line of chained dimensions) are replaced
  // once: the first dimension to list one consumes it.
  const consumedOnce = new Set<Id>()
  return accepted.map(({ candidate, evidence }) => {
    const built = candidate.build()
    built.score = Math.round(evidence.score * 100) / 100
    built.evidence = evidence.items
    built.consumed = built.consumed.filter(id => {
      if (consumedOnce.has(id) || partial(id)) return false
      consumedOnce.add(id)
      return true
    })
    return built
  })
}

/** Small circles or filled discs used as dot terminators. */
function dotTerminators<Id>(
  input: PdfDimInput<Id>,
  refSize: number
): PdfDimTerminator<Id>[] {
  return input.curves
    .filter(
      c =>
        c.id !== undefined &&
        c.startAngle === undefined &&
        c.radius > 0 &&
        c.radius <= refSize * 0.6 &&
        c.radius >= refSize * 0.08
    )
    .map(c => ({
      kind: 'dot' as const,
      ids: [c.id as Id],
      tip: c.center,
      size: c.radius
    }))
}

/** Nearest acceptable value text (or unread placeholder) to `near`. */
function findText<Id>(
  ctx: Context<Id>,
  near: PdfRecPoint,
  maxDistance: number,
  accept: (t: {
    center: PdfRecPoint
    height: number
    text?: string
  }) => boolean,
  measured?: number
): TextPick<Id> | undefined {
  let best: PdfDimText<Id> | undefined
  let bestDistance = maxDistance
  for (const t of ctx.textGrid.near(near, maxDistance)) {
    if (!accept(t)) continue
    const d = dist(t.center, near)
    if (d <= bestDistance) {
      bestDistance = d
      best = t
    }
  }
  if (best) return { text: best, unread: false }
  if (measured === undefined) return undefined
  let unread: PdfDimUnreadText<Id> | undefined
  bestDistance = maxDistance
  for (const t of ctx.unreadGrid.near(near, maxDistance)) {
    if (!accept(t)) continue
    const d = dist(t.center, near)
    if (d <= bestDistance) {
      bestDistance = d
      unread = t
    }
  }
  if (!unread) return undefined
  return {
    text: {
      id: unread.id,
      text: formatMeasuredLength(measured),
      center: unread.center,
      height: unread.height,
      rotation: unread.rotation,
      extraIds: unread.extraIds
    },
    unread: true
  }
}

/** Text direction parallel to `u` (either sense), when the text has one. */
function textAlong<Id>(text: PdfDimText<Id>, u: PdfRecPoint): boolean {
  if (text.rotation === undefined) return false
  const t = { x: Math.cos(text.rotation), y: Math.sin(text.rotation) }
  return Math.abs(cross(t, u)) <= Math.sin((5 * Math.PI) / 180)
}

/**
 * Collinear segments covering a span between `a` and `b` (the dimension
 * line, possibly split by the text), plus pieces in the arrow tails.
 */
function dimLinePieces<Id>(
  ctx: Context<Id>,
  a: PdfRecPoint,
  b: PdfRecPoint,
  tail: number
): {
  ids: Id[]
  tails: Id[]
  segments: PdfDimSegment<Id>[]
  covered: number
} {
  const u = pdfDimUnit(sub(b, a))
  const n = { x: -u.y, y: u.x }
  const length = dist(a, b)
  const ids: Id[] = []
  // Pieces wholly outside the span: arrow tails of outside arrows, or the
  // span of a stacked neighbour on the same line. Shared, never exclusive.
  const tails: Id[] = []
  const segments: PdfDimSegment<Id>[] = []
  let covered = 0
  const box = pdfDimSegmentBox(a, b, tail + ctx.tol * 2)
  for (const s of ctx.segGrid.query(box)) {
    if (ctx.terminatorIds.has(s.id)) continue
    const r0 = sub(s.p0, a)
    const r1 = sub(s.p1, a)
    if (
      Math.abs(dot(r0, n)) > ctx.tol * 2 ||
      Math.abs(dot(r1, n)) > ctx.tol * 2
    ) {
      continue
    }
    const lo = Math.min(dot(r0, u), dot(r1, u))
    const hi = Math.max(dot(r0, u), dot(r1, u))
    const overlap = Math.min(hi, length) - Math.max(lo, 0)
    const inTails = lo >= -tail && hi <= length + tail
    // Pieces running far past the span belong to something else (an object
    // edge the dimension line happens to continue).
    if (lo < -tail - ctx.tol * 4 || hi > length + tail + ctx.tol * 4) continue
    if (overlap <= ctx.tol * 4) {
      if (inTails) {
        tails.push(s.id)
        segments.push(s)
      }
      continue
    }
    covered += Math.max(0, overlap)
    ids.push(s.id)
    segments.push(s)
  }
  return { ids, tails, segments, covered: length > 0 ? covered / length : 0 }
}

/** Extension line through `tip` perpendicular to `u` (or along `dir`). */
function extensionAt<Id>(
  ctx: Context<Id>,
  tip: PdfRecPoint,
  dir: PdfRecPoint,
  exclude: { ids: Set<Id>; segments: Set<PdfDimSegment<Id>> },
  textSide: number,
  arrowSize: number,
  textHeight: number
):
  | {
      id: Id
      segment: PdfDimSegment<Id>
      origin: PdfRecPoint
      beyond: number
      reach: number
      through: boolean
      /** Duplicate extension pieces lying within the chosen one. */
      covered: PdfDimSegment<Id>[]
    }
  | undefined {
  const n = dir
  const maxTipGap = Math.max(ctx.refSize * 2, arrowSize * 2, textHeight * 1.5)
  const minReach = Math.max(arrowSize * 2, textHeight, ctx.refSize * 2)
  let best:
    | {
        id: Id
        segment: PdfDimSegment<Id>
        origin: PdfRecPoint
        beyond: number
        proximity: number
        reach: number
        rank: number
        through: boolean
        lo: number
        hi: number
      }
    | undefined
  // Extension pieces ending at the tip, as intervals along `n`.
  const pieces: { segment: PdfDimSegment<Id>; lo: number; hi: number }[] = []
  for (const s of ctx.segGrid.near(tip, maxTipGap + ctx.tol * 2)) {
    // Pieces of one polyline share an id; the dimension line's own pieces
    // are excluded by object so an extension drawn in the same path counts.
    if (exclude.segments.has(s) || exclude.ids.has(s.id)) continue
    if (ctx.terminatorIds.has(s.id)) continue
    const su = pdfDimUnit(sub(s.p1, s.p0))
    if (Math.abs(cross(su, n)) > ctx.sinTol) continue
    if (Math.abs(cross(su, sub(tip, s.p0))) > ctx.tol * 2) continue
    const t0 = dot(sub(s.p0, tip), n)
    const t1 = dot(sub(s.p1, tip), n)
    if (Math.min(t0, t1) > ctx.tol * 2 || Math.max(t0, t1) < -ctx.tol * 2) {
      if (Math.min(Math.abs(t0), Math.abs(t1)) > maxTipGap) continue
    }
    const d0 = Math.abs(t0)
    const d1 = Math.abs(t1)
    const tipNear0 = d0 <= maxTipGap
    const tipNear1 = d1 <= maxTipGap
    let origin: PdfRecPoint
    let nearT: number
    let farT: number
    let rank: number
    let through = false
    if (tipNear0 || tipNear1) {
      const nearIs0 = tipNear0 && (!tipNear1 || d0 <= d1)
      nearT = nearIs0 ? t0 : t1
      farT = nearIs0 ? t1 : t0
      origin = nearIs0 ? s.p1 : s.p0
      // Extension lines reach the dimension line. One that does outranks
      // a line stopping short of it (an object edge ending near the tip,
      // which the dimension must not take); a long one beats a short one.
      // A piece reaching less than half an arrow past the tip is only the
      // DIMEXE overhang left after de-duplication: last resort.
      const reachesLine =
        Math.min(t0, t1) <= ctx.tol * 2 && Math.max(t0, t1) >= -ctx.tol * 2
      const farReach = Math.abs(farT)
      rank =
        reachesLine && farReach < arrowSize * 0.5
          ? 5
          : (reachesLine ? 0 : 2) + (farReach >= minReach ? 0 : 1)
    } else {
      // Both ends far from the tip: an object edge the extension line is
      // drawn over (or was merged into). It confirms the extension, and
      // its text-side end is the best origin guess, but the edge itself
      // must survive: it is never consumed.
      const on0 = Math.sign(t0) === textSide
      const on1 = Math.sign(t1) === textSide
      if (!on0 && !on1) continue
      const use0 = on0 && (!on1 || d0 >= d1)
      farT = use0 ? t0 : t1
      nearT = use0 ? t1 : t0
      origin = use0 ? s.p0 : s.p1
      rank = 4
      through = true
    }
    const reach = Math.abs(farT)
    if (!(reach > ctx.tol)) continue
    const lo = Math.min(t0, t1)
    const hi = Math.max(t0, t1)
    if (!through) pieces.push({ segment: s, lo, hi })
    const over =
      !through && Math.sign(nearT) !== Math.sign(farT) && Math.sign(nearT) !== 0
        ? Math.min(Math.abs(nearT), maxTipGap)
        : 0
    const proximity = Math.abs(nearT)
    if (
      !best ||
      rank < best.rank ||
      (rank === best.rank && reach > best.reach + ctx.tol) ||
      (rank === best.rank &&
        Math.abs(reach - best.reach) <= ctx.tol &&
        proximity < best.proximity)
    ) {
      best = {
        id: s.id,
        segment: s,
        origin,
        beyond: over,
        proximity,
        reach,
        rank,
        through,
        lo,
        hi
      }
    }
  }
  if (!best) return undefined
  // Chained or baseline dimensions often draw their extension lines over
  // each other (origins a hair apart). Pieces the chosen extension covers
  // would be left behind as stray lines.
  const chosen = best
  const covered = chosen.through
    ? []
    : pieces
        .filter(
          p =>
            p.segment !== chosen.segment &&
            p.lo >= chosen.lo - ctx.tol * 2 &&
            p.hi <= chosen.hi + ctx.tol * 2
        )
        .map(p => p.segment)
  return {
    id: chosen.id,
    segment: chosen.segment,
    origin: chosen.origin,
    beyond: chosen.beyond,
    reach: chosen.reach,
    through: chosen.through,
    covered
  }
}

/** Linear dimensions anchored on a pair of opposed terminators. */
function linearFromTerminators<Id>(
  ctx: Context<Id>,
  terminators: PdfDimTerminator<Id>[]
): Hypothesis<Id>[] {
  const out: Hypothesis<Id>[] = []
  const grid = new PdfDimGrid<PdfDimTerminator<Id>>(ctx.refSize * 8)
  for (const t of terminators) grid.add(t, pdfDimSegmentBox(t.tip, t.tip))
  // Pairs live on a common line; enumerate candidates from each terminator
  // along its own axis (dots have none and pair with directed ones only).
  const index = new Map(terminators.map((t, i) => [t, i]))
  const directed = terminators.filter(t => t.direction)
  // Dimension spans rarely exceed the page; but most terminators pair with
  // a neighbour on their own axis, so look along it only.
  const reach = maxSpan(ctx)
  for (const a of directed) {
    const ai = index.get(a)!
    for (const b of axisNeighbours(grid, a, reach, ctx)) {
      if (a === b) continue
      // Each unordered pair once: directed-directed pairs from the lower
      // index only.
      if (b.direction && index.get(b)! < ai) continue
      // Dots are much smaller than arrows; only like terminators compare.
      if (
        a.kind === b.kind &&
        Math.max(a.size, b.size) > Math.min(a.size, b.size) * 1.6
      ) {
        continue
      }
      const d = sub(b.tip, a.tip)
      const length = Math.hypot(d.x, d.y)
      if (length <= ctx.tol * 4) continue
      const u = pdfDimUnit(d)
      if (Math.abs(cross(a.direction!, u)) > ctx.sinTol) continue
      if (b.direction) {
        if (Math.abs(cross(b.direction, u)) > ctx.sinTol) continue
        // Pointing apart (inside arrows) or toward each other (outside).
        if (dot(a.direction!, u) * dot(b.direction, u) >= 0) continue
      } else if (b.kind !== 'dot') {
        continue
      }
      out.push(...linearHypotheses(ctx, a, b, length, u))
    }
  }
  return out
}

/** Longest span worth pairing: the extent of the input. */
function maxSpan<Id>(ctx: Context<Id>): number {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of ctx.input.segments) {
    for (const p of [s.p0, s.p1]) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  const size = Math.hypot(maxX - minX, maxY - minY)
  return Number.isFinite(size) && size > 0 ? size : ctx.refSize * 1000
}

/**
 * Terminators on `a`'s axis line within `reach`: walks the grid cells along
 * the axis in both directions instead of testing every terminator.
 */
function axisNeighbours<Id>(
  grid: PdfDimGrid<PdfDimTerminator<Id>>,
  a: PdfDimTerminator<Id>,
  reach: number,
  ctx: Context<Id>
): PdfDimTerminator<Id>[] {
  const u = a.direction!
  const step = ctx.refSize * 4
  const pad = Math.max(ctx.tol * 4, reach * ctx.sinTol, step * 0.5)
  const out = new Set<PdfDimTerminator<Id>>()
  // Thin boxes along the axis; widen with distance for the angle tolerance.
  for (let t = -reach; t <= reach; t += step) {
    const p0 = { x: a.tip.x + u.x * t, y: a.tip.y + u.y * t }
    const p1 = { x: a.tip.x + u.x * (t + step), y: a.tip.y + u.y * (t + step) }
    const w = Math.min(pad, Math.abs(t) * ctx.sinTol + ctx.tol * 4)
    for (const b of grid.query(pdfDimSegmentBox(p0, p1, w))) out.add(b)
  }
  return [...out]
}

/** Builds the hypothesis for a terminator pair (shared by arrows/ticks). */
function linearHypotheses<Id>(
  ctx: Context<Id>,
  a: PdfDimTerminator<Id>,
  b: PdfDimTerminator<Id>,
  length: number,
  u: PdfRecPoint,
  knownLine?: PdfDimSegment<Id>
): Hypothesis<Id>[] {
  const valued = linearHypothesis(ctx, a, b, length, u, knownLine)
  const out = valued.hypothesis ? [valued.hypothesis] : []
  // A real value text nearby belongs to the valued reading; a label variant
  // would only hide it.
  if (!valued.realValue) {
    const labelled = labelledLinearHypothesis(ctx, a, b, length, u, knownLine)
    if (labelled) out.push(labelled)
  }
  return out
}

/** Linear hypothesis read from a value text. */
function linearHypothesis<Id>(
  ctx: Context<Id>,
  a: PdfDimTerminator<Id>,
  b: PdfDimTerminator<Id>,
  length: number,
  u: PdfRecPoint,
  knownLine?: PdfDimSegment<Id>
): { hypothesis?: Hypothesis<Id>; realValue: boolean } {
  const n = { x: -u.y, y: u.x }
  const mid = pdfDimLerp(a.tip, b.tip, 0.5)
  const accept = (t: {
    center: PdfRecPoint
    height: number
    text?: string
  }) => {
    if (t.text !== undefined && !isLinearValueText(t.text)) return false
    const rel = sub(t.center, a.tip)
    const along = dot(rel, u)
    const across = Math.abs(dot(rel, n))
    return (
      across <= t.height * 2.5 &&
      across >= t.height * 0.1 &&
      along >= -length * 0.5 - t.height * 4 &&
      along <= length * 1.5 + t.height * 4
    )
  }
  // Text may sit past either arrow (DIMTIX off on a short span, or a
  // prefixed value pushed outside); `accept` bounds the band.
  const pick = findText(
    ctx,
    mid,
    Math.max(length * 1.1, ctx.refSize * 6),
    accept,
    length
  )
  if (!pick) return { realValue: false }
  // Real PDF text that disagrees was written that way on purpose (a
  // reference or not-to-scale value); only stroke OCR may be overruled.
  const fromStrokes = (pick.text.extraIds?.length ?? 0) > 0 || pick.unread
  const realValue = !fromStrokes
  // Unread text stands in for a value only on a span the drawing would
  // label with a number: wider than the terminators that bound it. A short
  // span between two arrows labelled with letters ("a", "e mini") is a
  // symbolic size, which the measured length would wrongly replace; the
  // labelled variant keeps such a label instead.
  const minSpan = Math.max(a.size, b.size) * 3
  if (pick.unread && length < minSpan) return { realValue }
  const text = pick.unread
    ? pick.text
    : reconcileLinearDimText(pick.text, length)
  // A reading rewritten to the measured length was a misread: it is no
  // evidence for the dimension, and must not vote for the drawing scale.
  const misread = !pick.unread && text.text !== pick.text.text
  const unread = pick.unread || misread

  const evidence = new PdfDimEvidence()
  const ticks = a.kind === 'tick'
  evidence.add('terminator', 2)
  const tail = Math.max(a.size, b.size) * 4
  const line = dimLinePieces(ctx, a.tip, b.tip, tail)
  if (knownLine && !line.segments.includes(knownLine)) {
    line.ids.push(knownLine.id)
    line.segments.push(knownLine)
  }
  const arrowsOutEarly = a.direction !== undefined && dot(a.direction, u) > 0
  // Outside arrows carry the dimension line in their tails.
  const hasLine =
    line.ids.length > 0 || (arrowsOutEarly && line.tails.length > 0)
  if (hasLine) evidence.add('dimLine')
  if (unread) evidence.add('unreadText')
  else evidence.add('numericText')
  if (textAlong(text, u)) evidence.add('textAligned')
  const along = dot(sub(text.center, a.tip), u)
  if (along >= 0 && along <= length) evidence.add('textCentred')

  const arrowsOut = a.direction !== undefined && dot(a.direction, u) > 0
  const consumedSet = {
    ids: new Set<Id>([...a.ids, ...b.ids, ...pdfDimTextIds(text)]),
    segments: new Set(line.segments)
  }
  const textSide = Math.sign(dot(sub(text.center, mid), n)) || 1
  const e1 = extensionAt(
    ctx,
    a.tip,
    n,
    consumedSet,
    textSide,
    a.size,
    text.height
  )
  const e2 = extensionAt(
    ctx,
    b.tip,
    n,
    consumedSet,
    textSide,
    b.size,
    text.height
  )
  const extensions = [e1, e2].filter(e => e !== undefined)
  // Object edges the extension lines are drawn over stay in the drawing.
  const owned = extensions.filter(e => !e.through)
  evidence.add('extension', extensions.length)
  evidence.add(
    'extensionBeyond',
    extensions.filter(e => e!.beyond > ctx.tol).length
  )
  const xLine1 = e1?.origin ?? a.tip
  const xLine2 = e2?.origin ?? b.tip
  // Aligned when the extension origins line up with the dimension line and
  // it is not axis-parallel.
  const rotation = pdfDimLineAngle(u)
  const axis =
    Math.abs(Math.sin(2 * rotation)) < Math.sin((0.5 * Math.PI) / 180)
  const originsParallel =
    dist(xLine1, xLine2) > ctx.tol &&
    Math.abs(cross(pdfDimUnit(sub(xLine2, xLine1)), u)) <= ctx.sinTol
  const kind: 'linear' | 'aligned' =
    !axis && originsParallel ? 'aligned' : 'linear'
  // Text placed beyond an extension line with the dimension line running
  // out under it: keep it there and take that run with the dimension.
  const span = line.segments.filter(s => line.ids.includes(s.id))
  const outside = outsideText(ctx, a, b, length, u, text, span)
  const exclusive = [
    ...a.ids,
    ...b.ids,
    ...pdfDimTextIds(text),
    ...line.ids,
    ...(outside?.ids ?? [])
  ]
  const value = unread ? undefined : parsePdfDimensionValue(text.text)
  const strongEnough =
    (!unread || (extensions.length === 2 && hasLine && length >= minSpan)) &&
    (!misread || fromStrokes)
  const hypothesis: Hypothesis<Id> = {
    exclusive,
    evidence,
    value,
    measured: length,
    unread,
    arrowSize: ticks ? 0 : a.size,
    textHeight: text.height,
    strongEnough,
    span: length,
    claims: [
      ...line.segments.filter(s => line.ids.includes(s.id)),
      ...(arrowsOut ? line.segments : []),
      ...owned.flatMap(e => [e.segment, ...e.covered]),
      ...(outside?.segments ?? [])
    ],
    build: () => {
      const extIds = owned.flatMap(e => [e.id, ...e.covered.map(c => c.id)])
      // Outside arrows own their tails; inside arrows leave neighbours'
      // pieces alone.
      const tailIds = arrowsOut ? line.tails : []
      return {
        kind,
        xLine1,
        xLine2,
        dimLinePoint: a.tip,
        rotation,
        measured: length,
        text,
        arrowSize: a.kind === 'dot' ? b.size : a.size,
        extensionBeyond: Math.max(e1?.beyond ?? 0, e2?.beyond ?? 0),
        ticks,
        arrowsOut,
        terminator:
          a.kind === 'tick'
            ? 'tick'
            : a.kind === 'open'
              ? 'open'
              : b.kind === 'dot'
                ? 'dot'
                : 'closed',
        extensionIds: [e1?.id, e2?.id],
        textPosition: outside ? text.center : undefined,
        outsideTails: arrowsOut
          ? outsideTails(ctx, a, b, length, u, line, outside && text.center)
          : undefined,
        measuredText: unread,
        consumed: [...exclusive, ...extIds, ...tailIds],
        score: 0,
        evidence: []
      }
    }
  }
  return { hypothesis, realValue }
}

/**
 * Collinear runs leaving the ends of a dimension line: the dimension line
 * continued past an arrow out to text placed beyond the extension lines.
 * `beforeReach` / `afterReach` are how far they reach past `a` / `b`.
 */
function dimLineRuns<Id>(
  ctx: Context<Id>,
  a: PdfDimTerminator<Id>,
  b: PdfDimTerminator<Id>,
  length: number,
  u: PdfRecPoint,
  own: PdfDimSegment<Id>[]
): {
  before: PdfDimSegment<Id>[]
  after: PdfDimSegment<Id>[]
  beforeReach: number
  afterReach: number
} {
  const n = { x: -u.y, y: u.x }
  const reach = Math.max(ctx.refSize * 30, length * 3)
  const p0 = { x: a.tip.x - u.x * reach, y: a.tip.y - u.y * reach }
  const p1 = { x: b.tip.x + u.x * reach, y: b.tip.y + u.y * reach }
  const out = {
    before: [] as PdfDimSegment<Id>[],
    after: [] as PdfDimSegment<Id>[],
    beforeReach: 0,
    afterReach: 0
  }
  const slack = ctx.tol * 4
  for (const s of ctx.segGrid.query(pdfDimSegmentBox(p0, p1, ctx.tol * 2))) {
    if (ctx.terminatorIds.has(s.id) || own.includes(s)) continue
    const r0 = sub(s.p0, a.tip)
    const r1 = sub(s.p1, a.tip)
    if (
      Math.abs(dot(r0, n)) > ctx.tol * 2 ||
      Math.abs(dot(r1, n)) > ctx.tol * 2
    ) {
      continue
    }
    const lo = Math.min(dot(r0, u), dot(r1, u))
    const hi = Math.max(dot(r0, u), dot(r1, u))
    // Starts at the tip, or at the back of an outside arrow.
    if (lo >= length - slack && lo <= length + b.size + slack && hi > lo) {
      out.after.push(s)
      out.afterReach = Math.max(out.afterReach, hi - length)
    } else if (hi <= slack && hi >= -a.size - slack && lo < hi) {
      out.before.push(s)
      out.beforeReach = Math.max(out.beforeReach, -lo)
    }
  }
  return out
}

/**
 * Extents of the dimension line drawn past outside arrows, skipping the
 * side that runs out to `textPosition`.
 */
function outsideTails<Id>(
  ctx: Context<Id>,
  a: PdfDimTerminator<Id>,
  b: PdfDimTerminator<Id>,
  length: number,
  u: PdfRecPoint,
  line: { ids: Id[]; tails: Id[]; segments: PdfDimSegment<Id>[] },
  textPosition?: PdfRecPoint
): Array<{ from: PdfRecPoint; to: PdfRecPoint }> {
  const slack = ctx.tol * 4
  let before = 0
  let after = 0
  for (const s of line.segments) {
    if (!line.tails.includes(s.id) || line.ids.includes(s.id)) continue
    const t0 = dot(sub(s.p0, a.tip), u)
    const t1 = dot(sub(s.p1, a.tip), u)
    const lo = Math.min(t0, t1)
    const hi = Math.max(t0, t1)
    if (hi <= slack) before = Math.max(before, -lo)
    else if (lo >= length - slack) after = Math.max(after, hi - length)
  }
  const textAt = textPosition ? dot(sub(textPosition, a.tip), u) : undefined
  const out: Array<{ from: PdfRecPoint; to: PdfRecPoint }> = []
  if (before > slack && !(textAt !== undefined && textAt < 0)) {
    out.push({
      from: a.tip,
      to: { x: a.tip.x - u.x * before, y: a.tip.y - u.y * before }
    })
  }
  if (after > slack && !(textAt !== undefined && textAt > length)) {
    out.push({
      from: b.tip,
      to: { x: b.tip.x + u.x * after, y: b.tip.y + u.y * after }
    })
  }
  return out
}

/**
 * The run of dimension line out to `text` when the text sits beyond `a` or
 * `b` on the dimension line's extension (AutoCAD DIMTMOVE 0).
 */
function outsideText<Id>(
  ctx: Context<Id>,
  a: PdfDimTerminator<Id>,
  b: PdfDimTerminator<Id>,
  length: number,
  u: PdfRecPoint,
  text: { center: PdfRecPoint; height: number },
  own: PdfDimSegment<Id>[]
): { ids: Id[]; segments: PdfDimSegment<Id>[] } | undefined {
  const along = dot(sub(text.center, a.tip), u)
  if (along >= -ctx.tol && along <= length + ctx.tol) return undefined
  const pad = text.height * 2
  const runs = dimLineRuns(ctx, a, b, length, u, own)
  const after = along > length
  const segments = after ? runs.after : runs.before
  const reach = after ? runs.afterReach : runs.beforeReach
  const past = after ? along - length : -along
  // The run must lead to the text, not stop short of it or run far past.
  if (segments.length === 0 || past > reach + pad || reach > past + pad * 4) {
    return undefined
  }
  return { ids: segments.map(s => s.id), segments }
}

/** Longest symbolic label read as a dimension text. */
const MAX_LABEL_LENGTH = 24

/**
 * A dimension labelled with a symbol instead of a value ("a", "e mini",
 * "E maxi" in a weld detail). Such labels are usually stroke text the digit
 * reader cannot read, and the span is often shorter than its arrows, so the
 * value path rejects them. Complete geometry (both terminators, the
 * dimension line and both extension lines) makes the dimension certain; the
 * label is kept: real text becomes the text override, unread strokes stay
 * as drawn and the dimension text is suppressed.
 */
function labelledLinearHypothesis<Id>(
  ctx: Context<Id>,
  a: PdfDimTerminator<Id>,
  b: PdfDimTerminator<Id>,
  length: number,
  u: PdfRecPoint,
  knownLine?: PdfDimSegment<Id>
): Hypothesis<Id> | undefined {
  if (a.kind === 'dot' || b.kind === 'dot') return undefined
  const n = { x: -u.y, y: u.x }
  const tail = Math.max(a.size, b.size) * 4
  const line = dimLinePieces(ctx, a.tip, b.tip, tail)
  if (knownLine && !line.segments.includes(knownLine)) {
    line.ids.push(knownLine.id)
    line.segments.push(knownLine)
  }
  const arrowsOut = a.direction !== undefined && dot(a.direction, u) > 0
  const hasLine = line.ids.length > 0 || (arrowsOut && line.tails.length > 0)
  if (!hasLine) return undefined
  // Arrow tails count as runs: the label may sit just past one.
  const runs = dimLineRuns(
    ctx,
    a,
    b,
    length,
    u,
    line.segments.filter(s => line.ids.includes(s.id))
  )
  const before = Math.max(runs.beforeReach, a.size)
  const after = Math.max(runs.afterReach, b.size)
  const accept = (t: {
    center: PdfRecPoint
    height: number
    text?: string
    extraIds?: Id[]
  }) => {
    const strokes = (t.extraIds?.length ?? 0) > 0
    if (t.text !== undefined && !strokes && !isSymbolicLabel(t.text)) {
      return false
    }
    const rel = sub(t.center, a.tip)
    const along = dot(rel, u)
    const across = Math.abs(dot(rel, n))
    return (
      across <= t.height * 2.5 &&
      along >= -before - t.height * 3 &&
      along <= length + after + t.height * 3
    )
  }
  // Look from where the label usually sits: the end of a run out of the
  // span, else the middle.
  const near =
    runs.afterReach > 0 && runs.afterReach >= runs.beforeReach
      ? { x: b.tip.x + u.x * after, y: b.tip.y + u.y * after }
      : runs.beforeReach > 0
        ? { x: a.tip.x - u.x * before, y: a.tip.y - u.y * before }
        : pdfDimLerp(a.tip, b.tip, 0.5)
  const pick = findText(
    ctx,
    near,
    Math.max(length + before + after, ctx.refSize * 6),
    accept,
    length
  )
  if (!pick) return undefined
  const kept = pick.unread || (pick.text.extraIds?.length ?? 0) > 0
  const labelIds = pdfDimTextIds(pick.text)
  const textSide = Math.sign(dot(sub(pick.text.center, a.tip), n)) || 1
  const consumedSet = {
    ids: new Set<Id>([...a.ids, ...b.ids, ...labelIds]),
    segments: new Set(line.segments)
  }
  const e1 = extensionAt(ctx, a.tip, n, consumedSet, textSide, a.size, 0)
  const e2 = extensionAt(ctx, b.tip, n, consumedSet, textSide, b.size, 0)
  if (!e1 || !e2) return undefined
  const owned = [e1, e2].filter(e => !e.through)
  const evidence = new PdfDimEvidence()
  evidence.add('terminator', 2)
  evidence.add('dimLine')
  evidence.add('extension', 2)
  evidence.add('extensionBeyond', [e1, e2].filter(e => e.beyond > 0).length)
  evidence.add('unreadText')
  // The run out to the label belongs to the dimension.
  const along = dot(sub(pick.text.center, a.tip), u)
  const outside =
    along > length ? runs.after : along < 0 ? runs.before : undefined
  const runIds = outside?.map(s => s.id) ?? []
  const runEnd =
    along > length
      ? {
          x: b.tip.x + u.x * runs.afterReach,
          y: b.tip.y + u.y * runs.afterReach
        }
      : {
          x: a.tip.x - u.x * runs.beforeReach,
          y: a.tip.y - u.y * runs.beforeReach
        }
  // Kept strokes need no text room: end the dimension line where the
  // drawing did. A real label sits where it was drawn.
  const textPosition =
    outside && outside.length > 0
      ? kept
        ? runEnd
        : pick.text.center
      : undefined
  const text: PdfDimText<Id> = kept ? { ...pick.text, text: ' ' } : pick.text
  const exclusive = [...a.ids, ...b.ids, ...labelIds, ...line.ids, ...runIds]
  const rotation = pdfDimLineAngle(u)
  const axis =
    Math.abs(Math.sin(2 * rotation)) < Math.sin((0.5 * Math.PI) / 180)
  // As for valued dimensions: aligned measures origin to origin, so only
  // origins in line with the dimension line make one.
  const originsParallel =
    dist(e1.origin, e2.origin) > ctx.tol &&
    Math.abs(cross(pdfDimUnit(sub(e2.origin, e1.origin)), u)) <= ctx.sinTol
  const kind: 'linear' | 'aligned' =
    !axis && originsParallel ? 'aligned' : 'linear'
  return {
    exclusive,
    evidence,
    measured: length,
    unread: true,
    arrowSize: a.kind === 'tick' ? 0 : a.size,
    textHeight: pick.text.height,
    strongEnough: true,
    span: length,
    claims: [
      ...line.segments.filter(s => line.ids.includes(s.id)),
      ...(arrowsOut ? line.segments : []),
      ...owned.flatMap(e => [e.segment, ...e.covered]),
      ...(outside ?? [])
    ],
    build: () => ({
      kind,
      xLine1: e1.origin,
      xLine2: e2.origin,
      dimLinePoint: a.tip,
      rotation,
      measured: length,
      text,
      arrowSize: a.size,
      extensionBeyond: Math.max(e1.beyond, e2.beyond),
      ticks: a.kind === 'tick',
      arrowsOut,
      terminator:
        a.kind === 'tick' ? 'tick' : a.kind === 'open' ? 'open' : 'closed',
      extensionIds: [e1.id, e2.id],
      textPosition,
      outsideTails: arrowsOut
        ? outsideTails(ctx, a, b, length, u, line, textPosition)
        : undefined,
      labelKept: kept,
      consumed: [
        ...a.ids,
        ...b.ids,
        ...line.ids,
        ...runIds,
        ...(arrowsOut ? line.tails : []),
        ...owned.flatMap(e => [e.id, ...e.covered.map(c => c.id)]),
        ...(kept ? [] : labelIds)
      ],
      score: 0,
      evidence: []
    })
  }
}

/** Whether `text` reads as a symbolic size label ("a", "e mini"). */
function isSymbolicLabel(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_LABEL_LENGTH &&
    !/[\r\n]/.test(trimmed) &&
    /[A-Za-zÀ-ʯͰ-ӿ一-鿿]/.test(trimmed) &&
    parsePdfDimensionValue(trimmed) === undefined
  )
}

/** Tick dimensions: two ticks on one dimension line. */
function linearFromTicks<Id>(
  ctx: Context<Id>,
  shortLimit: number
): Hypothesis<Id>[] {
  const ticks = pdfDimTicks(ctx.input.segments, shortLimit, ctx.tol)
  const out: Hypothesis<Id>[] = []
  const byLine = new Map<PdfDimSegment<Id>, typeof ticks>()
  for (const t of ticks) {
    const list = byLine.get(t.line)
    if (list) list.push(t)
    else byLine.set(t.line, [t])
  }
  for (const [line, list] of byLine) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        // AutoCAD ticks at both ends slant the same way.
        if (a.stroke && b.stroke && Math.abs(cross(a.stroke, b.stroke)) > 0.1) {
          continue
        }
        const length = dist(a.tip, b.tip)
        if (length <= ctx.tol * 4) continue
        out.push(
          ...linearHypotheses(
            ctx,
            a,
            b,
            length,
            pdfDimUnit(sub(b.tip, a.tip)),
            line
          )
        )
      }
    }
  }
  return out
}

/**
 * Dimensions drawn without terminators: a dimension line whose ends lie
 * inside perpendicular extension lines that run past it (DIMEXE), with a
 * value text beside it. Extension lines must continue past the dimension
 * line so rectangle corners do not match.
 */
function bareLinear<Id>(ctx: Context<Id>): Hypothesis<Id>[] {
  const out: Hypothesis<Id>[] = []
  for (const line of ctx.input.segments) {
    if (ctx.terminatorIds.has(line.id)) continue
    const length = dist(line.p0, line.p1)
    if (length <= ctx.tol * 4) continue
    const u = pdfDimUnit(sub(line.p1, line.p0))
    const n = { x: -u.y, y: u.x }
    const crossing = (end: PdfRecPoint) => {
      for (const s of ctx.segGrid.near(end, ctx.tol * 2)) {
        if (s === line) continue
        const su = pdfDimUnit(sub(s.p1, s.p0))
        if (Math.abs(dot(su, u)) > ctx.sinTol) continue
        if (Math.abs(cross(su, sub(end, s.p0))) > ctx.tol * 2) continue
        const t0 = dot(sub(s.p0, end), n)
        const t1 = dot(sub(s.p1, end), n)
        if (
          Math.min(t0, t1) >= -ctx.tol * 2 ||
          Math.max(t0, t1) <= ctx.tol * 2
        ) {
          continue
        }
        const farIsP0 = Math.abs(t0) >= Math.abs(t1)
        const beyond = Math.abs(farIsP0 ? t1 : t0)
        // DIMEXE overhang is short; a long run past the line is a crossing
        // object edge, not an extension line.
        if (beyond > Math.max(ctx.refSize * 1.5, length * 0.25)) continue
        return {
          id: s.id,
          segment: s,
          origin: farIsP0 ? s.p0 : s.p1,
          side: Math.sign(farIsP0 ? t0 : t1),
          beyond
        }
      }
      return undefined
    }
    const e1 = crossing(line.p0)
    const e2 = crossing(line.p1)
    if (!e1 || !e2 || e1.id === e2.id) continue
    const mid = pdfDimLerp(line.p0, line.p1, 0.5)
    const accept = (t: {
      center: PdfRecPoint
      height: number
      text?: string
    }) => {
      if (t.text !== undefined && !isLinearValueText(t.text)) return false
      const rel = sub(t.center, line.p0)
      const along = dot(rel, u)
      return (
        Math.abs(dot(rel, n)) <= t.height * 2.5 &&
        along >= -t.height * 4 &&
        along <= length + t.height * 4
      )
    }
    const pick = findText(
      ctx,
      mid,
      Math.max(length * 0.75, ctx.refSize * 6),
      accept,
      length
    )
    if (!pick) continue
    const text = pick.unread
      ? pick.text
      : reconcileLinearDimText(pick.text, length)
    const unread = pick.unread || text.text !== pick.text.text
    const evidence = new PdfDimEvidence()
    evidence.add('dimLine')
    evidence.add('extension', 2)
    evidence.add('extensionBeyond', 2)
    if (unread) evidence.add('unreadText')
    else evidence.add('numericText')
    if (textAlong(text, u)) evidence.add('textAligned')
    const sameSide = e1.side === e2.side
    const exclusive = [line.id, ...pdfDimTextIds(text)]
    const value = unread ? undefined : parsePdfDimensionValue(text.text)
    out.push({
      exclusive,
      evidence,
      value,
      measured: length,
      unread,
      arrowSize: 0,
      textHeight: text.height,
      // Without terminators only a value that matches the drawing scale
      // makes the dimension certain enough for an unattended import.
      strongEnough: !unread && sameSide,
      claims: [line, e1.segment, e2.segment],
      span: length,
      build: () => ({
        kind: 'linear',
        xLine1: sameSide ? e1.origin : line.p0,
        xLine2: sameSide ? e2.origin : line.p1,
        dimLinePoint: line.p0,
        rotation: pdfDimLineAngle(u),
        measured: length,
        text,
        arrowSize: 0,
        extensionBeyond: sameSide ? Math.max(e1.beyond, e2.beyond) : 0,
        ticks: false,
        arrowsOut: false,
        terminator: 'none',
        extensionIds: [e1.id, e2.id],
        measuredText: unread,
        consumed: [...exclusive, e1.id, e2.id],
        score: 0,
        evidence: []
      })
    })
  }
  return out
}

/**
 * Radius / diameter dimensions: an arrow whose tip lies on a circle and
 * points along its radius, with a value text nearby (an `R` / `Ø` prefix, or
 * a plain number equal to the radius or diameter). Leaders with a Z-shaped
 * jog are large-radius (jogged) dimensions.
 */
function radial<Id>(
  ctx: Context<Id>,
  arrows: PdfDimTerminator<Id>[]
): Hypothesis<Id>[] {
  const out: Hypothesis<Id>[] = []
  const curves = ctx.input.curves.filter(c => c.radius > ctx.refSize * 0.5)
  const curveGrid = new PdfDimGrid<PdfDimCurve<Id>>(ctx.refSize * 8)
  for (const c of curves) {
    curveGrid.add(c, {
      minX: c.center.x - c.radius,
      minY: c.center.y - c.radius,
      maxX: c.center.x + c.radius,
      maxY: c.center.y + c.radius
    })
  }
  for (const arrow of arrows) {
    // Grid boxes are the circles' bounding squares, which contain every
    // point of the circle, so a small query at the tip finds it.
    for (const curve of curveGrid.near(arrow.tip, ctx.tol * 2)) {
      const radialV = sub(arrow.tip, curve.center)
      const r = Math.hypot(radialV.x, radialV.y)
      if (Math.abs(r - curve.radius) > ctx.tol * 2 || r === 0) continue
      const ru = pdfDimUnit(radialV)
      if (Math.abs(cross(arrow.direction!, ru)) > ctx.sinTol) continue
      // Leader: segments touching the tip, then the chain they continue.
      // An arrow pointing in from outside has its leader behind its base.
      let leaders = leaderChain(ctx, arrow.tip, ru)
      if (leaders.ids.length === 0 || dot(arrow.direction!, ru) < 0) {
        const base = {
          x: arrow.tip.x - arrow.direction!.x * arrow.size,
          y: arrow.tip.y - arrow.direction!.y * arrow.size
        }
        const outside = leaderChain(ctx, base, ru)
        if (outside.ids.length > 0) {
          leaders = {
            ids: [...leaders.ids, ...outside.ids],
            segments: [...leaders.segments, ...outside.segments],
            end: outside.end,
            jogged: outside.jogged
          }
        }
      }
      const farEnd = leaders.end
      const accept = (t: {
        center: PdfRecPoint
        height: number
        text?: string
      }) => t.text !== undefined && parsePdfDimensionValue(t.text) !== undefined
      const pick = findText(
        ctx,
        farEnd,
        // Without a traced leader the text can be a long way off the arrow.
        Math.max(
          ctx.refSize * (leaders.ids.length > 0 ? 8 : 12),
          dist(farEnd, arrow.tip) * 0.5
        ),
        accept
      )
      if (!pick) continue
      const text = pick.text
      const prefixed = radialKind(text.text)
      const value = parsePdfDimensionValue(text.text)
      let kind = prefixed
      if (!kind && value !== undefined) {
        // No prefix: decide by which of r / 2r the value matches.
        kind =
          Math.abs(value - curve.radius * 2) < Math.abs(value - curve.radius)
            ? 'diameter'
            : 'radius'
      }
      if (!kind) continue
      const evidence = new PdfDimEvidence()
      evidence.add('radialArrow')
      if (prefixed) evidence.add('radialPrefix')
      evidence.add('numericText')
      if (leaders.ids.length > 0) evidence.add('dimLine')
      // A diameter drawn across the circle has a second arrow on the far
      // side pointing the other way, on the same line through the centre.
      const opposite = {
        x: 2 * curve.center.x - arrow.tip.x,
        y: 2 * curve.center.y - arrow.tip.y
      }
      const farArrow =
        kind === 'diameter'
          ? arrows.find(
              other =>
                other !== arrow &&
                dist(other.tip, opposite) <= ctx.tol * 4 &&
                dot(other.direction!, arrow.direction!) < -0.99
            )
          : undefined
      if (farArrow) evidence.add('terminator')
      // An outside far arrow (pointing in at the circle) trails a short
      // stub of dimension line behind its base.
      const farTail = farArrow
        ? arrowTail(ctx, farArrow, farArrow.size * 4)
        : []
      const exclusive = [
        ...arrow.ids,
        ...(farArrow?.ids ?? []),
        ...pdfDimTextIds(text),
        ...leaders.ids,
        ...farTail.map(s => s.id)
      ]
      const measured = kind === 'diameter' ? curve.radius * 2 : curve.radius
      out.push({
        exclusive,
        evidence,
        value,
        measured,
        arrowSize: arrow.size,
        textHeight: text.height,
        strongEnough: !!prefixed,
        ownScale: !!prefixed,
        claims: [...leaders.segments, ...farTail],
        span: measured,
        build: () => ({
          kind: kind!,
          center: curve.center,
          chordPoint: arrow.tip,
          radius: curve.radius,
          leaderLength: dist(arrow.tip, text.center),
          measured,
          text,
          arrowSize: arrow.size,
          jogged: leaders.jogged,
          outsideLines: [...leaders.segments, ...farTail]
            .filter(s => {
              const su = pdfDimUnit(sub(s.p1, s.p0))
              return (
                Math.abs(cross(su, ru)) <= ctx.sinTol &&
                Math.abs(cross(ru, sub(s.p0, curve.center))) <= ctx.tol * 2
              )
            })
            .map(s => ({ from: s.p0, to: s.p1 })),

          consumed: exclusive,
          score: 0,
          evidence: []
        })
      })
    }
  }
  return out
}

/**
 * Dimension-line stub behind an arrow's base, running away from the tip
 * (no longer than `maxLength`).
 */
function arrowTail<Id>(
  ctx: Context<Id>,
  arrow: PdfDimTerminator<Id>,
  maxLength: number
): PdfDimSegment<Id>[] {
  const dir = arrow.direction
  if (!dir) return []
  const base = {
    x: arrow.tip.x - dir.x * arrow.size,
    y: arrow.tip.y - dir.y * arrow.size
  }
  const out: PdfDimSegment<Id>[] = []
  for (const s of ctx.segGrid.near(base, ctx.tol * 2)) {
    if (ctx.terminatorIds.has(s.id)) continue
    const near0 = dist(s.p0, base) <= ctx.tol * 2
    const near1 = dist(s.p1, base) <= ctx.tol * 2
    if (!near0 && !near1) continue
    const far = near0 ? s.p1 : s.p0
    const run = sub(far, base)
    const length = Math.hypot(run.x, run.y)
    if (length > maxLength + ctx.tol) continue
    // Behind the base: opposite to the arrow's direction.
    if (Math.abs(cross(pdfDimUnit(run), dir)) > ctx.sinTol) continue
    if (dot(run, dir) >= 0) continue
    out.push(s)
  }
  return out
}

/**
 * Follows a leader from `start`: segments chained end to end, optionally
 * with a jog (two parallel runs joined by a short oblique piece) and a
 * landing along the text.
 */
function leaderChain<Id>(
  ctx: Context<Id>,
  start: PdfRecPoint,
  radialU: PdfRecPoint
): {
  ids: Id[]
  segments: PdfDimSegment<Id>[]
  end: PdfRecPoint
  jogged: boolean
} {
  const ids: Id[] = []
  let end = start
  let jogged = false
  const used = new Set<PdfDimSegment<Id>>()
  let previous: PdfDimSegment<Id> | undefined
  for (let step = 0; step < 4; step++) {
    let next: { s: PdfDimSegment<Id>; far: PdfRecPoint } | undefined
    for (const s of ctx.segGrid.near(end, ctx.tol * 2)) {
      if (used.has(s) || ctx.terminatorIds.has(s.id)) continue
      const near0 = dist(s.p0, end) <= ctx.tol * 2
      const near1 = dist(s.p1, end) <= ctx.tol * 2
      const onSeg =
        step === 0 && pdfDimPointSegmentDistance(end, s.p0, s.p1) <= ctx.tol * 2
      if (!near0 && !near1 && !onSeg) continue
      const far = near0
        ? s.p1
        : near1
          ? s.p0
          : dist(s.p0, end) > dist(s.p1, end)
            ? s.p0
            : s.p1
      if (step === 0) {
        const su = pdfDimUnit(sub(far, end))
        if (Math.abs(cross(su, radialU)) > ctx.sinTol) continue
      }
      next = { s, far }
      break
    }
    if (!next) break
    if (step > 0) {
      const prev = previous
      if (prev) {
        const pu = pdfDimUnit(sub(prev.p1, prev.p0))
        const nu = pdfDimUnit(sub(next.s.p1, next.s.p0))
        const angle = Math.acos(Math.min(1, Math.abs(dot(pu, nu))))
        if (angle > Math.PI / 8 && angle < (3 * Math.PI) / 8) jogged = true
      }
    }
    used.add(next.s)
    previous = next.s
    ids.push(next.s.id)
    end = next.far
  }
  return { ids, segments: [...used], end, jogged }
}

/**
 * Angular and arc length dimensions: an arc with an arrow at each end
 * pointing along it. A `°` text (or a value equal to the sweep) makes it
 * angular; an `⌒` prefix, or a value equal to a concentric object arc's
 * length, makes it an arc length.
 */
function angularAndArcLength<Id>(
  ctx: Context<Id>,
  arrows: PdfDimTerminator<Id>[]
): Hypothesis<Id>[] {
  const out: Hypothesis<Id>[] = []
  const tangentTol = Math.sin((10 * Math.PI) / 180)
  const arrowGrid = new PdfDimGrid<PdfDimTerminator<Id>>(ctx.refSize * 4)
  for (const a of arrows) arrowGrid.add(a, pdfDimSegmentBox(a.tip, a.tip))
  for (const arc of ctx.input.arcs ?? []) {
    const at = (angle: number) => ({
      x: arc.center.x + arc.radius * Math.cos(angle),
      y: arc.center.y + arc.radius * Math.sin(angle)
    })
    let sweep = arc.endAngle - arc.startAngle
    if (sweep <= 0) sweep += Math.PI * 2
    const ends = [at(arc.startAngle), at(arc.startAngle + sweep)]
    const endArrows = ends.map(end =>
      arrowGrid.near(end, ctx.tol * 4).find(a => {
        if (!a.direction || dist(a.tip, end) > ctx.tol * 4) return false
        const radialU = pdfDimUnit(sub(end, arc.center))
        return Math.abs(dot(a.direction, radialU)) <= tangentTol
      })
    )
    if (!endArrows[0] || !endArrows[1] || endArrows[0] === endArrows[1]) {
      continue
    }
    const arcPoint = at(arc.startAngle + sweep / 2)
    const accept = (t: {
      center: PdfRecPoint
      height: number
      text?: string
    }) => t.text !== undefined && parsePdfDimensionValue(t.text) !== undefined
    const pick = findText(
      ctx,
      arcPoint,
      Math.max(arc.radius * 0.8, ctx.refSize * 6),
      accept
    )
    if (!pick) continue
    const text = pick.text
    const value = parsePdfDimensionValue(text.text)
    const degrees = (sweep * 180) / Math.PI
    // Extension legs along the radius through each end.
    // Legs found along each radius. Only true extension lines are
    // replaced: they end just past the arc (DIMEXE) and stop short of the
    // centre (DIMEXO). Object edges the arc crosses stay; they only locate
    // the measured lines.
    const legIds: Id[] = []
    const legSegments = new Set<PdfDimSegment<Id>>()
    const leg = (end: PdfRecPoint): PdfRecPoint => {
      const radialU = pdfDimUnit(sub(end, arc.center))
      for (const s of ctx.segGrid.near(end, ctx.refSize * 2)) {
        if (legSegments.has(s) || s.id === arc.id) continue
        const su = pdfDimUnit(sub(s.p1, s.p0))
        if (Math.abs(cross(su, radialU)) > ctx.sinTol) continue
        if (Math.abs(cross(radialU, sub(s.p0, arc.center))) > ctx.tol * 2) {
          continue
        }
        if (pdfDimPointSegmentDistance(end, s.p0, s.p1) > ctx.refSize * 2) {
          continue
        }
        legSegments.add(s)
        const r0 = dist(s.p0, arc.center)
        const r1 = dist(s.p1, arc.center)
        const outer = Math.max(r0, r1)
        const inner = Math.min(r0, r1)
        const isExtension =
          outer - arc.radius <= ctx.refSize * 1.5 && inner > ctx.tol * 4
        if (isExtension) legIds.push(s.id)
        return r0 <= r1 ? s.p0 : s.p1
      }
      return end
    }
    const xLine1 = leg(ends[0])
    const xLine2 = leg(ends[1])
    const arcText = isArcLengthText(text.text)
    const degreeText = /°|%%d/i.test(text.text)
    // Arc length: concentric object arc inside, value matches its length.
    const objectRadius = Math.min(
      dist(xLine1, arc.center),
      dist(xLine2, arc.center)
    )
    const arcLength = sweep * objectRadius
    const isArcLength =
      arcText ||
      (!degreeText &&
        value !== undefined &&
        Math.abs(value - degrees) > 0.6 &&
        objectRadius > ctx.tol &&
        objectRadius < arc.radius - ctx.tol)
    const evidence = new PdfDimEvidence()
    evidence.add('terminator', 2)
    evidence.add('dimLine')
    evidence.add('numericText')
    evidence.add('extension', legIds.length)
    if (degreeText || arcText) evidence.add('radialPrefix')
    const exclusive = [
      arc.id,
      ...endArrows[0].ids,
      ...endArrows[1].ids,
      ...pdfDimTextIds(text)
    ]
    const common = {
      exclusive,
      evidence,
      value,
      arrowSize: endArrows[0].size,
      textHeight: text.height,
      strongEnough: degreeText || arcText,
      claims: [...legSegments].filter(s => legIds.includes(s.id))
    }
    if (isArcLength) {
      out.push({
        ...common,
        measured: arcLength,
        span: arcLength,
        build: () => ({
          kind: 'arcLength',
          center: arc.center,
          xLine1,
          xLine2,
          arcPoint,
          measured: arcLength,
          text,
          arrowSize: endArrows[0]!.size,
          consumed: [...exclusive, ...legIds],
          score: 0,
          evidence: []
        })
      })
    } else {
      out.push({
        ...common,
        measured: degrees,
        angle: true,
        span: arc.radius * sweep,
        build: () => ({
          kind: 'angular',
          center: arc.center,
          xLine1,
          xLine2,
          arcPoint,
          measured: degrees,
          text,
          arrowSize: endArrows[0]!.size,
          consumed: [...exclusive, ...legIds],
          score: 0,
          evidence: []
        })
      })
    }
  }
  return out
}

/**
 * Ordinate dimensions: value texts at the end of axis-parallel leaders
 * without terminators, in groups of two or more that share a leader
 * direction and agree on one origin and scale (values grow linearly with
 * position). A lone leader with a number is never an ordinate dimension.
 */
function ordinate<Id>(ctx: Context<Id>): Hypothesis<Id>[] {
  type Leader = {
    text: PdfDimText<Id>
    value: number
    ids: Id[]
    segment: PdfDimSegment<Id>
    feature: PdfRecPoint
    end: PdfRecPoint
    useXAxis: boolean
    coord: number
  }
  const leaders: Leader[] = []
  for (const text of ctx.input.texts) {
    const value = parsePdfDimensionValue(text.text)
    if (value === undefined || radialKind(text.text) || /°/.test(text.text)) {
      continue
    }
    // Text must run along the leader: rotation tells which axis.
    const rot = text.rotation ?? 0
    const vertical = Math.abs(Math.sin(rot)) > 0.99
    const horizontal = Math.abs(Math.sin(rot)) < 0.01
    if (!vertical && !horizontal) continue
    const dir = vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }
    // Leader end: a segment along `dir` ending near either end of the text.
    const reach = text.height * 4
    for (const s of ctx.segGrid.near(text.center, reach + text.height * 4)) {
      if (ctx.terminatorIds.has(s.id)) continue
      const su = pdfDimUnit(sub(s.p1, s.p0))
      if (Math.abs(cross(su, dir)) > ctx.sinTol) continue
      // The segment's axis passes through the text centre line.
      const offset = Math.abs(cross(dir, sub(text.center, s.p0)))
      if (offset > text.height * 0.8) continue
      const d0 = dist(s.p0, text.center)
      const d1 = dist(s.p1, text.center)
      const near = d0 < d1 ? s.p0 : s.p1
      const far = d0 < d1 ? s.p1 : s.p0
      if (Math.min(d0, d1) > reach) continue
      if (dist(far, near) < text.height * 2) continue
      // The segment points away from the text.
      if (dot(sub(far, near), sub(near, text.center)) <= 0) continue
      leaders.push({
        text,
        value,
        ids: [s.id],
        segment: s,
        feature: far,
        end: near,
        // A vertical leader marks an X coordinate.
        useXAxis: vertical,
        coord: vertical ? far.x : far.y
      })
      break
    }
  }
  const out: Hypothesis<Id>[] = []
  for (const useXAxis of [true, false]) {
    const group = leaders.filter(l => l.useXAxis === useXAxis)
    if (group.length < 2) continue
    // Fit value = scale·(coord − origin): try every pair, keep the largest
    // consistent set.
    let best: { members: Leader[]; scale: number; origin: number } | undefined
    // Ordinate labels line up in rows; a fit only needs pairs of nearby
    // leaders, so pair each with a few neighbours by coordinate (linear in
    // the group size instead of cubic).
    group.sort((p, q) => p.coord - q.coord)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length && j <= i + 4; j++) {
        const a = group[i]
        const b = group[j]
        const dc = b.coord - a.coord
        if (Math.abs(dc) < ctx.tol * 4) continue
        const scale = (b.value - a.value) / dc
        // Ordinate values grow away from the origin on one side only.
        if (!(Math.abs(scale) > 0)) continue
        const origin = a.coord - a.value / scale
        const members = group.filter(
          l =>
            Math.abs(l.value - scale * (l.coord - origin)) <=
            Math.max(Math.abs(l.value) * 0.005, 0.051)
        )
        if (!best || members.length > best.members.length) {
          best = { members, scale, origin }
        }
      }
    }
    // Any two numbers fit a line through two leaders; only a third leader
    // on the same line is evidence, and the slope must be a drawing scale.
    if (!best || best.members.length < 3) continue
    // Only positive scales: ordinate values are unsigned distances along
    // the axis away from the origin, and real layouts keep one side.
    if (!(best.scale > 0) || !isNiceScaleRatio(best.scale)) continue
    // A datum at 0 is the norm; values must be distinct coordinates.
    if (new Set(best.members.map(m => m.value)).size < best.members.length) {
      continue
    }
    const fit = best
    for (const member of fit.members) {
      const evidence = new PdfDimEvidence()
      evidence.add('dimLine')
      evidence.add('numericText')
      evidence.add('textAligned')
      evidence.add('scaleAgrees')
      evidence.add('extension', fit.members.length >= 3 ? 2 : 1)
      const exclusive = [...member.ids, ...pdfDimTextIds(member.text)]
      const originPoint = useXAxis
        ? { x: fit.origin, y: member.feature.y }
        : { x: member.feature.x, y: fit.origin }
      const measured = Math.abs(member.coord - fit.origin)
      out.push({
        exclusive,
        evidence,
        // The value is checked by the group fit already.
        value: undefined,
        measured,
        arrowSize: 0,
        textHeight: member.text.height,
        strongEnough: fit.members.length >= 3,
        claims: [member.segment],
        span: measured,
        build: () => ({
          kind: 'ordinate',
          origin: originPoint,
          definingPoint: member.feature,
          leaderEndPoint: member.end,
          useXAxis,
          measured,
          text: member.text,
          arrowSize: 0,
          consumed: exclusive,
          score: 0,
          evidence: []
        })
      })
    }
  }
  return out
}

/**
 * Most common text-value / measured-length ratio, i.e. the drawing scale the
 * PDF was printed at. Uses linear dimensions when there are any. Returns
 * `undefined` when no dimension has a numeric text.
 */
export function suggestPdfDimensionScale(
  dimensions: Array<
    Pick<PdfDimensionCandidate, 'kind' | 'measured'> & {
      text: { text: string }
    }
  >
): number | undefined {
  const linear = dimensions.filter(
    d => d.kind === 'linear' || d.kind === 'aligned'
  )
  const radial = dimensions.filter(
    d => d.kind === 'radius' || d.kind === 'diameter'
  )
  // Angles do not scale with the drawing, so they never vote; neither do
  // stand-in texts made from the measured length.
  const ratios = (linear.length > 0 ? linear : radial)
    .filter(d => !(d as { measuredText?: boolean }).measuredText)
    .map(d => {
      const value = parsePdfDimensionValue(d.text.text)
      return value !== undefined && d.measured > 0 ? value / d.measured : NaN
    })
    .filter(r => Number.isFinite(r) && r > 0)
  if (ratios.length === 0) return undefined
  let best: number[] = []
  for (const r of ratios) {
    const cluster = ratios.filter(x => Math.abs(x - r) <= r * 0.01)
    if (cluster.length > best.length) best = cluster
  }
  return pdfDimMedian(best)
}
