/**
 * Recovers pattern hatches from the loose stroke segments a PDF holds.
 *
 * CAD programs (AutoCAD included) write a pattern hatch to PDF as plain
 * strokes that are already clipped to the hatch boundary, so an import sees
 * thousands of short lines. This module finds groups of segments that form
 * a regular pattern, matches them against the `acadiso.pat` library (or a
 * user-defined single / double pattern), recovers a boundary and accepts
 * the hatch only when re-drawing it reproduces the source segments.
 *
 * Pure data in, pure data out: entity construction happens in
 * `AcApPdfImportConvertor`.
 */

import {
  type AcDbPatPattern,
  AcDbPredefinedAcadIsoPat
} from '@mlightcad/data-model'
import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

import type { PdfImportShapeItem } from '../pdfImportShapes'
import type { PdfRecognizedShape } from './pdfCurveRecognition'
import type { PdfRecPoint } from './pdfRecGeometry'

/**
 * One hatch pattern line in drawing coordinates, in the DXF convention:
 * `angle` in radians already includes the pattern angle, `offset` is the
 * world vector to the next parallel line and lengths are scaled.
 */
export interface PdfHatchDefinitionLine {
  angle: number
  base: PdfRecPoint
  offset: PdfRecPoint
  dashLengths: number[]
}

/** Pattern of a recognized hatch. */
export type PdfRecognizedHatchPattern =
  | {
      type: 'predefined'
      /** Pattern name in `acadiso.pat` (e.g. `ANSI31`). */
      name: string
      scale: number
      /** Pattern angle in radians. */
      angle: number
    }
  | {
      type: 'userDefined'
      /** Line angle in radians. */
      angle: number
      /** Distance between lines in drawing units. */
      spacing: number
      /** Second family at 90 degrees (cross-hatch). */
      double: boolean
    }

/** A hatch rebuilt from PDF segments. */
export interface PdfRecognizedHatch {
  /** Closed boundary shapes; the hatch fills them even-odd. */
  boundary: PdfRecognizedShape[]
  pattern: PdfRecognizedHatchPattern
  /** Explicit definition lines (what the hatch draws). */
  definitionLines: PdfHatchDefinitionLine[]
  /** Indices of the shape items the hatch replaces, ascending. */
  items: number[]
  layerName?: string
  color?: string
  lineWidth?: number
}

/** Tuning for {@link acapPdfRecognizeHatches}. */
export interface PdfHatchRecognitionOptions {
  /**
   * Distance tolerance in drawing units for "this point is on that line".
   * Default `0.05` (0.05 mm on an unscaled import).
   */
  tolerance?: number
  /** Fewest segments a hatch may have. Default `8`. */
  minSegments?: number
  /** Fewest parallel lines in the main line family. Default `3`. */
  minLines?: number
  /**
   * Share of the source segment length the hatch must reproduce, in
   * `[0, 1]`. Default `0.9`.
   */
  minRecall?: number
  /**
   * Share of the re-drawn hatch length that must lie on source segments,
   * in `[0, 1]`. Default `0.95`: a hatch must not draw what the PDF lacks.
   */
  minPrecision?: number
  /** Pattern library to match. Default `acadiso.pat`. */
  patterns?: readonly AcDbPatPattern[]
}

/** Result of {@link acapPdfRecognizeHatches}. */
export interface PdfHatchRecognitionResult {
  hatches: PdfRecognizedHatch[]
  /** Indices of shape items absorbed into a hatch. */
  consumed: Set<number>
}

/**
 * Recognizes pattern hatches among placed shape items.
 *
 * Only unfilled, undashed straight lines take part. Segments a hatch does
 * not reproduce stay as they are, so a failed recognition changes nothing.
 *
 * @param items - Placed shapes in paint order (from `buildPdfImportShapes`).
 * @param options - Tolerances and thresholds.
 * @param clipPaths - Clip loops by {@link PdfImportShapeItem.clipPath} id,
 * placed like the items. A clip around a hatch is a boundary candidate.
 */
export function acapPdfRecognizeHatches(
  items: readonly PdfImportShapeItem[],
  options?: PdfHatchRecognitionOptions,
  clipPaths?: readonly (readonly PdfRecPoint[][])[]
): PdfHatchRecognitionResult {
  const opts = resolveOptions(options)
  const hatches: PdfRecognizedHatch[] = []
  const consumed = new Set<number>()
  const library = patternSignatures(opts.patterns)
  const closedShapes = collectClosedShapes(items)

  for (const group of groupCandidates(items, opts.tolerance)) {
    const accept = (region: Seg[]): boolean => {
      const hatch = recognizeRegion(
        region,
        group.all,
        library,
        closedShapes,
        clipPaths,
        opts,
        items
      )
      if (!hatch) return false
      const kept = hatch.items.filter(index => !consumed.has(index))
      if (kept.length < opts.minSegments) return false
      for (const index of kept) consumed.add(index)
      const first = items[kept[0]]
      hatches.push({
        ...hatch,
        items: kept,
        layerName: first.layerName,
        color: first.color,
        lineWidth: first.lineWidth
      })
      return true
    }
    for (const region of findRegions(group.long, opts)) {
      if (region.some(seg => consumed.has(seg.index))) continue
      if (accept(region)) continue
      // Hatches of one colour that touch can end up in one region; peel
      // off one regular run of parallel lines at a time.
      let rest = region
      for (let round = 0; round < MAX_SPLITS; round++) {
        const run = dominantProgression(rest, opts)
        // The whole region already failed as one piece.
        if (!run || (round === 0 && run.length === region.length)) break
        accept(run)
        const taken = new Set(run)
        rest = rest.filter(seg => !taken.has(seg) && !consumed.has(seg.index))
        if (rest.length < opts.minSegments) break
      }
    }
  }
  return { hatches, consumed }
}

// ---------------------------------------------------------------------------
// Options and shared types

type ResolvedOptions = Required<
  Omit<PdfHatchRecognitionOptions, 'patterns'>
> & {
  patterns: readonly AcDbPatPattern[]
}

function resolveOptions(options?: PdfHatchRecognitionOptions): ResolvedOptions {
  const tolerance = options?.tolerance
  return {
    tolerance: tolerance !== undefined && tolerance > 0 ? tolerance : 0.05,
    minSegments: Math.max(2, options?.minSegments ?? 8),
    minLines: Math.max(2, options?.minLines ?? 3),
    minRecall: options?.minRecall ?? 0.9,
    minPrecision: options?.minPrecision ?? 0.95,
    patterns: options?.patterns ?? AcDbPredefinedAcadIsoPat.patterns
  }
}

/** A candidate straight segment. */
interface Seg {
  index: number
  a: PdfRecPoint
  b: PdfRecPoint
  len: number
  /** Direction angle in `[0, π)`. */
  theta: number
}

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Segments too short for a reliable direction (corner stubs). */
const SHORT_FACTOR = 4
/** Angle gap that splits two direction clusters (radians). */
const ANGLE_GAP = (0.5 * Math.PI) / 180
/** Most translation hypotheses scored per pattern. */
const MAX_TRANSLATIONS = 400
/** Segments sampled to score a translation. */
const SCORE_SAMPLE = 64
/** Lowest sample score worth a full verification. */
const MIN_SCORE = 0.8

// ---------------------------------------------------------------------------
// Step 1: candidates

interface CandidateGroup {
  /** Segments long enough to define a direction. */
  long: Seg[]
  /** Every candidate segment of the group, short ones included. */
  all: Seg[]
}

function groupCandidates(
  items: readonly PdfImportShapeItem[],
  tolerance: number
): CandidateGroup[] {
  const groups = new Map<string, CandidateGroup>()
  items.forEach((item, index) => {
    const shape = item.shape
    if (shape.kind !== 'line' || item.filled || item.dashPattern) return
    const dx = shape.end.x - shape.start.x
    const dy = shape.end.y - shape.start.y
    const len = Math.hypot(dx, dy)
    if (!(len > tolerance * 0.1)) return
    let theta = Math.atan2(dy, dx)
    if (theta < 0) theta += Math.PI
    if (theta >= Math.PI) theta -= Math.PI
    const seg: Seg = { index, a: shape.start, b: shape.end, len, theta }
    // A hatch has one layer, colour and pen width.
    const key = `${item.layerName ?? ''}|${item.color ?? ''}|${(item.lineWidth ?? 0).toFixed(3)}`
    let group = groups.get(key)
    if (!group) {
      group = { long: [], all: [] }
      groups.set(key, group)
    }
    group.all.push(seg)
    if (len >= tolerance * SHORT_FACTOR) group.long.push(seg)
  })
  return [...groups.values()]
}

// ---------------------------------------------------------------------------
// Step 2 and 3: direction clusters, parallel lines, spatial regions

interface Cluster {
  theta: number
  segs: Seg[]
}

function clusterByAngle(segs: Seg[]): Cluster[] {
  const sorted = [...segs].sort((p, q) => p.theta - q.theta)
  const clusters: Seg[][] = []
  for (const seg of sorted) {
    const last = clusters[clusters.length - 1]
    if (last && seg.theta - last[last.length - 1].theta <= ANGLE_GAP) {
      last.push(seg)
    } else {
      clusters.push([seg])
    }
  }
  // 0 and π are the same direction.
  if (clusters.length > 1) {
    const first = clusters[0]
    const last = clusters[clusters.length - 1]
    if (first[0].theta + Math.PI - last[last.length - 1].theta <= ANGLE_GAP) {
      clusters[0] = [...last, ...first]
      clusters.pop()
    }
  }
  return clusters.map(list => ({ theta: meanAngle(list), segs: list }))
}

/** Length-weighted mean direction in `[0, π)` (doubled-angle average). */
function meanAngle(segs: readonly Seg[]): number {
  let sx = 0
  let sy = 0
  for (const seg of segs) {
    sx += seg.len * Math.cos(2 * seg.theta)
    sy += seg.len * Math.sin(2 * seg.theta)
  }
  let theta = Math.atan2(sy, sx) / 2
  if (theta < 0) theta += Math.PI
  return theta
}

interface LinePos {
  c: number
  segs: { seg: Seg; s0: number; s1: number }[]
}

/** Groups parallel segments into lines by their perpendicular offset. */
function linesOf(segs: readonly Seg[], theta: number, tol: number): LinePos[] {
  const ux = Math.cos(theta)
  const uy = Math.sin(theta)
  const entries = segs.map(seg => {
    const c = -uy * (seg.a.x + seg.b.x) * 0.5 + ux * (seg.a.y + seg.b.y) * 0.5
    const p = ux * seg.a.x + uy * seg.a.y
    const q = ux * seg.b.x + uy * seg.b.y
    return { seg, c, s0: Math.min(p, q), s1: Math.max(p, q) }
  })
  entries.sort((p, q) => p.c - q.c)
  const lines: LinePos[] = []
  let sum = 0
  let lastC = -Infinity
  for (const entry of entries) {
    const last = lines[lines.length - 1]
    const item = { seg: entry.seg, s0: entry.s0, s1: entry.s1 }
    // Chain neighbours: PDF rounding spreads one line over a few offsets.
    if (last && entry.c - lastC <= tol) {
      last.segs.push(item)
      sum += entry.c
      last.c = sum / last.segs.length
    } else {
      lines.push({ c: entry.c, segs: [item] })
      sum = entry.c
    }
    lastC = entry.c
  }
  for (const line of lines) line.segs.sort((p, q) => p.s0 - q.s0)
  return lines
}

class UnionFind {
  private parent: number[]
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i)
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]]
      i = this.parent[i]
    }
    return i
  }
  union(a: number, b: number) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[ra] = rb
  }
}

/** Lines scanned past a segment for its nearest overlapping neighbour. */
const NEIGHBOUR_SCAN = 256
/** Largest jump between neighbouring gaps that still links (gap ratio). */
const GAP_RATIO = 2.5
/** Share of the shorter segment two neighbours must overlap to link. */
const MIN_OVERLAP = 0.3
/** Segments shorter than this share of the median length do not link. */
const SHORT_LINK = 0.25

/**
 * Spatially connected runs of parallel segments within one cluster.
 *
 * Several hatches of one colour interleave in offset order, so each segment
 * links to its nearest parallel neighbour whose extent overlaps, not to the
 * next line overall. A link is kept only when its gap fits the gaps around
 * it, so a lone parallel line far from a hatch does not join it.
 */
function clusterComponents(cluster: Cluster, tol: number): Seg[][] {
  const lines = linesOf(cluster.segs, cluster.theta, tol)
  type Entry = { seg: Seg; s0: number; s1: number; id: number }
  const rows: Entry[][] = []
  let id = 0
  for (const line of lines) {
    rows.push(line.segs.map(e => ({ ...e, id: id++ })))
  }
  // Gaps to the nearest neighbour that overlaps (same hatch) and to the
  // nearest one that merely touches (staggered dashes such as bricks).
  const fwd = new Array<number>(id).fill(Infinity)
  const bwd = new Array<number>(id).fill(Infinity)
  const touchFwd = new Array<number>(id).fill(Infinity)
  const touchBwd = new Array<number>(id).fill(Infinity)
  const links: { a: number; b: number; gap: number }[] = []
  // Corner stubs overlap a neighbouring hatch as much as their own, so
  // they do not link; verification picks them up afterwards.
  const lengths = cluster.segs.map(seg => seg.len).sort((p, q) => p - q)
  const minLinkLength = lengths[Math.floor(lengths.length / 2)] * SHORT_LINK
  const linkable = (e: Entry) => e.s1 - e.s0 >= minLinkLength

  for (let i = 0; i < rows.length; i++) {
    for (const entry of rows[i]) {
      if (!linkable(entry)) continue
      let touched = false
      for (let j = i + 1; j < rows.length && j - i <= NEIGHBOUR_SCAN; j++) {
        const gap = lines[j].c - lines[i].c
        if (!touched) {
          const slack = gap * 2 + tol
          const near = overlapping(rows[j], entry.s0 - slack, entry.s1 + slack)
          if (near.length > 0) {
            touched = true
            touchFwd[entry.id] = gap
            for (const hit of near) {
              touchBwd[hit.id] = Math.min(touchBwd[hit.id], gap)
            }
          }
        }
        // Lines of one hatch overlap along their length; lines of two
        // hatches that only meet at a shared edge do not.
        const hits = overlapping(rows[j], entry.s0, entry.s1).filter(
          hit =>
            linkable(hit) &&
            Math.min(hit.s1, entry.s1) - Math.max(hit.s0, entry.s0) >=
              MIN_OVERLAP * Math.min(hit.s1 - hit.s0, entry.s1 - entry.s0)
        )
        if (hits.length === 0) continue
        fwd[entry.id] = gap
        for (const hit of hits) {
          bwd[hit.id] = Math.min(bwd[hit.id], gap)
          links.push({ a: entry.id, b: hit.id, gap })
        }
        break
      }
    }
  }

  const uf = new UnionFind(id)
  for (const { a, b, gap } of links) {
    const around = Math.min(bwd[a], fwd[b])
    if (!Number.isFinite(around) || gap <= around * GAP_RATIO) uf.union(a, b)
  }
  // Each stub joins the component of its nearest overlapping long segment:
  // one attachment cannot bridge two hatches.
  for (let i = 0; i < rows.length; i++) {
    for (const entry of rows[i]) {
      if (linkable(entry)) continue
      let best: { id: number; gap: number } | undefined
      for (const dir of [-1, 1]) {
        for (
          let j = i + dir;
          j >= 0 && j < rows.length && Math.abs(j - i) <= NEIGHBOUR_SCAN;
          j += dir
        ) {
          const gap = Math.abs(lines[j].c - lines[i].c)
          if (best && gap >= best.gap) break
          const hit = overlapping(rows[j], entry.s0 - tol, entry.s1 + tol).find(
            linkable
          )
          if (hit) {
            best = { id: hit.id, gap }
            break
          }
        }
      }
      if (best) uf.union(entry.id, best.id)
    }
  }
  const localGap = (e: Entry) => {
    const own = Math.min(fwd[e.id], bwd[e.id])
    return Number.isFinite(own) ? own : Math.min(touchFwd[e.id], touchBwd[e.id])
  }
  // Dashes of one line belong together when their gaps match the spacing.
  for (const row of rows) {
    for (let k = 0; k + 1 < row.length; k++) {
      const p = row[k]
      const q = row[k + 1]
      const local = Math.max(localGap(p), localGap(q))
      if (Number.isFinite(local) && q.s0 - p.s1 <= local * GAP_RATIO + tol) {
        uf.union(p.id, q.id)
      }
    }
  }

  const byRoot = new Map<number, Seg[]>()
  for (const row of rows) {
    for (const entry of row) {
      const root = uf.find(entry.id)
      const list = byRoot.get(root)
      if (list) list.push(entry.seg)
      else byRoot.set(root, [entry.seg])
    }
  }
  return [...byRoot.values()]
}

/** Entries of a row (sorted by `s0`) whose extent meets `[lo, hi]`. */
function overlapping<T extends { s0: number; s1: number }>(
  row: readonly T[],
  lo: number,
  hi: number
): T[] {
  const out: T[] = []
  for (const entry of row) {
    if (entry.s0 > hi) break
    if (entry.s1 >= lo) out.push(entry)
  }
  return out
}

function segsBox(segs: readonly Seg[]): Box {
  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  }
  for (const seg of segs) {
    for (const p of [seg.a, seg.b]) {
      if (p.x < box.minX) box.minX = p.x
      if (p.y < box.minY) box.minY = p.y
      if (p.x > box.maxX) box.maxX = p.x
      if (p.y > box.maxY) box.maxY = p.y
    }
  }
  return box
}

function boxArea(box: Box, pad: number): number {
  return Math.max(box.maxX - box.minX, pad) * Math.max(box.maxY - box.minY, pad)
}

function overlapArea(p: Box, q: Box): number {
  const w = Math.min(p.maxX, q.maxX) - Math.max(p.minX, q.minX)
  const h = Math.min(p.maxY, q.maxY) - Math.max(p.minY, q.minY)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * Candidate hatch regions: components of every direction cluster, merged
 * across directions when their boxes overlap (cross-hatch, bricks, ...).
 */
function findRegions(segs: Seg[], opts: ResolvedOptions): Seg[][] {
  if (segs.length < opts.minSegments) return []
  const components: { segs: Seg[]; box: Box }[] = []
  for (const cluster of clusterByAngle(segs)) {
    if (cluster.segs.length < 2) continue
    for (const comp of clusterComponents(cluster, opts.tolerance)) {
      if (comp.length < 2) continue
      components.push({ segs: comp, box: segsBox(comp) })
    }
  }
  components.sort((p, q) => q.segs.length - p.segs.length)
  const regions: { segs: Seg[]; box: Box }[] = []
  for (const comp of components) {
    const pad = opts.tolerance
    const target = regions.find(region => {
      const shared = overlapArea(region.box, comp.box)
      return (
        shared >=
        0.5 * Math.min(boxArea(region.box, pad), boxArea(comp.box, pad))
      )
    })
    if (target) {
      target.segs.push(...comp.segs)
      target.box = segsBox(target.segs)
    } else {
      regions.push({ segs: [...comp.segs], box: comp.box })
    }
  }
  return regions
    .map(region => region.segs)
    .filter(region => region.length >= opts.minSegments)
}

/** Most runs peeled off one mixed region. */
const MAX_SPLITS = 4

/**
 * Segments of the largest direction cluster that lie on its most common
 * arithmetic progression of offsets (one hatch out of several mixed ones).
 */
function dominantProgression(
  region: Seg[],
  opts: ResolvedOptions
): Seg[] | undefined {
  const tol = opts.tolerance
  const cluster = clusterByAngle(region).sort(
    (p, q) => q.segs.length - p.segs.length
  )[0]
  if (!cluster || cluster.segs.length < opts.minSegments) return undefined
  const lines = linesOf(cluster.segs, cluster.theta, tol)
  const period = votedSpacing(lines, tol)
  if (!period) return undefined

  // Grow chains of lines one spacing apart (re-anchored at every line, so
  // rounding does not drift) and keep the longest.
  const reach = Math.max(tol * 2, period * 0.02)
  const find = (target: number) => {
    let lo = 0
    let hi = lines.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (lines[mid].c < target - reach) lo = mid + 1
      else if (lines[mid].c > target + reach) hi = mid - 1
      else return mid
    }
    return -1
  }
  const walk = (start: number, dir: number) => {
    const out: number[] = []
    let current = lines[start].c
    for (;;) {
      let next = -1
      for (let m = 1; m <= 3 && next < 0; m++)
        next = find(current + dir * m * period)
      if (next < 0) return out
      out.push(next)
      current = lines[next].c
    }
  }
  let chain: number[] = []
  const step = Math.max(1, Math.floor(lines.length / 12))
  for (let seed = 0; seed < lines.length; seed += step) {
    const candidate = [...walk(seed, -1).reverse(), seed, ...walk(seed, 1)]
    if (candidate.length > chain.length) chain = candidate
  }
  if (chain.length < opts.minLines) return undefined

  // Keep the pieces of each chain line that overlap the neighbouring chain
  // lines: another hatch may share an offset somewhere else.
  const rows = chain.map(i => lines[i].segs)
  const run: Seg[] = []
  rows.forEach((row, r) => {
    const neighbours = [...(rows[r - 1] ?? []), ...(rows[r + 1] ?? [])]
    for (const entry of row) {
      const len = entry.s1 - entry.s0
      const linked = neighbours.some(
        other =>
          Math.min(other.s1, entry.s1) - Math.max(other.s0, entry.s0) >=
          MIN_OVERLAP * Math.min(len, other.s1 - other.s0)
      )
      if (linked) run.push(entry.seg)
    }
  })
  return run.length >= opts.minSegments ? run : undefined
}

/** Most common spacing among nearby parallel lines (mean of its votes). */
function votedSpacing(lines: LinePos[], tol: number): number | undefined {
  const bin = tol * 2
  const votes = new Map<number, number[]>()
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length && j <= i + 6; j++) {
      const d = lines[j].c - lines[i].c
      if (d <= bin) continue
      const key = Math.round(d / bin)
      const list = votes.get(key)
      if (list) list.push(d)
      else votes.set(key, [d])
    }
  }
  let best: number[] | undefined
  for (const key of votes.keys()) {
    // Neighbouring bins share one spacing split by rounding.
    const merged = [
      ...(votes.get(key - 1) ?? []),
      ...(votes.get(key) ?? []),
      ...(votes.get(key + 1) ?? [])
    ]
    if (!best || merged.length > best.length) best = merged
  }
  if (!best || best.length === 0) return undefined
  return best.reduce((sum, d) => sum + d, 0) / best.length
}

// ---------------------------------------------------------------------------
// Measured signature of a region

interface MeasuredFamily {
  theta: number
  segs: Seg[]
  /** Distinct perpendicular offsets, ascending. */
  offsets: number[]
  /** Fundamental perpendicular period of the offsets. */
  period: number
  /** Distinct offsets within one period. */
  residues: number
  /** The family's segments, nearest the region centre first. */
  byCenter: Seg[]
}

function measureFamilies(region: Seg[], tol: number): MeasuredFamily[] {
  const box = segsBox(region)
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  // Segments near the centre are least likely clipped by the boundary.
  const centerDistance = (seg: Seg) =>
    Math.hypot((seg.a.x + seg.b.x) / 2 - cx, (seg.a.y + seg.b.y) / 2 - cy)
  const families: MeasuredFamily[] = []
  for (const cluster of clusterByAngle(region)) {
    const offsets = linesOf(cluster.segs, cluster.theta, tol).map(l => l.c)
    if (offsets.length < 2) continue
    const period = fundamentalPeriod(offsets, tol)
    if (!period) continue
    families.push({
      theta: cluster.theta,
      segs: cluster.segs,
      offsets,
      period,
      residues: countResidues(offsets, period, tol),
      byCenter: cluster.segs
        .map(seg => ({ seg, d: centerDistance(seg) }))
        .sort((p, q) => p.d - q.d)
        .map(entry => entry.seg)
    })
  }
  return families.sort((p, q) => q.segs.length - p.segs.length)
}

/** Smallest period that maps most offsets onto other offsets. */
function fundamentalPeriod(offsets: number[], tol: number): number | undefined {
  const n = offsets.length
  const has = (value: number) => {
    let lo = 0
    let hi = n - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (offsets[mid] < value - tol) lo = mid + 1
      else if (offsets[mid] > value + tol) hi = mid - 1
      else return true
    }
    return false
  }
  const ref = Math.floor(n / 2)
  const candidates: number[] = []
  for (let m = 1; m <= 8; m++) {
    if (ref + m < n) candidates.push(offsets[ref + m] - offsets[ref])
    if (ref - m >= 0) candidates.push(offsets[ref] - offsets[ref - m])
  }
  candidates.sort((p, q) => p - q)
  const last = offsets[n - 1]
  for (const period of candidates) {
    if (!(period > tol * 2)) continue
    let tested = 0
    let hit = 0
    for (const c of offsets) {
      if (c + period > last + tol) break
      tested++
      if (has(c + period)) hit++
    }
    if (tested > 0 && hit / tested >= 0.8) {
      return refinePeriod(offsets, period, tol)
    }
  }
  return undefined
}

/**
 * Least-squares period over every line on the main residue: one gap is
 * off by the PDF rounding, which would add up across a large hatch.
 */
function refinePeriod(offsets: number[], period: number, tol: number): number {
  const ref = offsets[Math.floor(offsets.length / 2)]
  let n = 0
  let sk = 0
  let sc = 0
  let skk = 0
  let skc = 0
  for (const c of offsets) {
    const k = Math.round((c - ref) / period)
    if (Math.abs(c - ref - k * period) > tol * 2) continue
    n++
    sk += k
    sc += c
    skk += k * k
    skc += k * c
  }
  const den = n * skk - sk * sk
  if (n < 3 || !(Math.abs(den) > 0)) return period
  const slope = (n * skc - sk * sc) / den
  return slope > 0 && Math.abs(slope - period) <= period * 0.05 ? slope : period
}

function countResidues(offsets: number[], period: number, tol: number): number {
  const residues = offsets
    .map(c => ((c % period) + period) % period)
    .sort((p, q) => p - q)
  let count = 0
  let last = -Infinity
  for (const r of residues) {
    if (r - last > tol * 2) {
      count++
      last = r
    }
  }
  // The first and last residue may be one value split by the wrap.
  if (
    count > 1 &&
    residues[0] + period - residues[residues.length - 1] <= tol * 2
  ) {
    count--
  }
  return Math.max(1, count)
}

// ---------------------------------------------------------------------------
// Pattern library signatures

interface PatternGroup {
  /** Direction in `[0, π)`, radians. */
  angle: number
  period: number
  residues: number
}

interface PatternSignature {
  pattern: AcDbPatPattern
  order: number
  groups: PatternGroup[]
  dashed: boolean
}

const DEG = Math.PI / 180

function patternSignatures(
  patterns: readonly AcDbPatPattern[]
): PatternSignature[] {
  const out: PatternSignature[] = []
  patterns.forEach((pattern, order) => {
    if (pattern.lines.length === 0) return
    // Dots need point strokes the import does not keep as lines.
    if (pattern.lines.some(line => line.dashes.some(d => d === 0))) return
    const groups: { angle: number; lines: typeof pattern.lines }[] = []
    for (const line of pattern.lines) {
      const angle = normalizeDirection(line.angle * DEG)
      const group = groups.find(g => directionDelta(g.angle, angle) < 1e-4)
      if (group) group.lines.push(line)
      else groups.push({ angle, lines: [line] })
    }
    const signature: PatternGroup[] = []
    for (const group of groups) {
      const period = Math.max(...group.lines.map(l => Math.abs(l.deltaY)))
      if (!(period > 0)) return
      // Perpendicular offset of each line's origin, in the group direction.
      const nx = -Math.sin(group.angle)
      const ny = Math.cos(group.angle)
      const offsets = group.lines.map(l => {
        const c = nx * l.originX + ny * l.originY
        return ((c % period) + period) % period
      })
      signature.push({
        angle: group.angle,
        period,
        residues: countResidues(offsets, period, period * 1e-3)
      })
    }
    out.push({
      pattern,
      order,
      groups: signature,
      dashed: pattern.lines.some(line => line.dashes.length > 0)
    })
  })
  return out
}

function normalizeDirection(angle: number): number {
  let a = angle % Math.PI
  if (a < 0) a += Math.PI
  return a
}

/** Smallest difference between two directions (mod π). */
function directionDelta(p: number, q: number): number {
  const d = Math.abs(normalizeDirection(p) - normalizeDirection(q))
  return Math.min(d, Math.PI - d)
}

// ---------------------------------------------------------------------------
// Hypotheses

interface Hypothesis {
  name?: string
  order: number
  rotation: number
  scale: number
  lines: AcDbPatPattern['lines']
  /** Measured family for each pattern line. */
  families: MeasuredFamily[]
  userDefined?: { double: boolean; spacing: number }
}

function relClose(p: number, q: number, rel: number, abs: number): boolean {
  return Math.abs(p - q) <= Math.max(rel * Math.max(p, q), abs)
}

function matchPattern(
  sig: PatternSignature,
  families: MeasuredFamily[],
  tol: number,
  extent: number
): Hypothesis[] {
  if (sig.groups.length !== families.length) return []
  const anchor = families[0]
  const out: Hypothesis[] = []
  for (const group of sig.groups) {
    if (group.residues !== anchor.residues) continue
    const scale = anchor.period / group.period
    const base = anchor.theta - group.angle
    // A dashed pattern turned half a turn is a different drawing.
    const rotations = sig.dashed ? [base, base + Math.PI] : [base]
    for (const rotation of rotations) {
      const mapping = new Map<PatternGroup, MeasuredFamily>()
      let ok = true
      for (const g of sig.groups) {
        const family = families.find(
          f =>
            directionDelta(f.theta, g.angle + rotation) < ANGLE_GAP &&
            f.residues === g.residues &&
            relClose(f.period, g.period * scale, 0.03, tol * 2)
        )
        if (!family || [...mapping.values()].includes(family)) {
          ok = false
          break
        }
        mapping.set(g, family)
      }
      if (!ok) continue
      out.push({
        name: sig.pattern.name,
        order: sig.order,
        rotation: snapAngle(rotation, tol, extent),
        scale: snapScale(scale, tol, extent),
        lines: sig.pattern.lines,
        families: sig.pattern.lines.map(line => {
          const angle = normalizeDirection(line.angle * DEG)
          const g = sig.groups.find(
            gr => directionDelta(gr.angle, angle) < 1e-4
          )!
          return mapping.get(g)!
        })
      })
    }
  }
  return out
}

/** Single or crossed parallel lines that no library pattern explains. */
function userDefinedHypothesis(
  families: MeasuredFamily[],
  tol: number,
  extent: number
): Hypothesis | undefined {
  if (families.some(f => f.residues !== 1)) return undefined
  const [first, second] = families
  const line = (angle: number) => ({
    angle,
    originX: 0,
    originY: 0,
    deltaX: 0,
    deltaY: 1,
    dashes: [] as number[],
    sourceLine: 0
  })
  if (families.length === 1) {
    return {
      order: Infinity,
      rotation: snapAngle(first.theta, tol, extent),
      scale: first.period,
      lines: [line(0)],
      families: [first],
      userDefined: { double: false, spacing: first.period }
    }
  }
  if (
    families.length === 2 &&
    Math.abs(directionDelta(first.theta, second.theta) - Math.PI / 2) <
      ANGLE_GAP &&
    relClose(first.period, second.period, 0.03, tol * 2)
  ) {
    const rotation = snapAngle(Math.min(first.theta, second.theta), tol, extent)
    const lower = first.theta <= second.theta ? first : second
    const upper = lower === first ? second : first
    return {
      order: Infinity,
      rotation,
      scale: lower.period,
      lines: [line(0), line(90)],
      families: [lower, upper],
      userDefined: { double: true, spacing: lower.period }
    }
  }
  return undefined
}

/**
 * Rounds to a whole or half degree when the turn moves no point of the
 * region (size `extent`) by more than half the tolerance.
 */
function snapAngle(angle: number, tol: number, extent: number): number {
  let a = angle % (Math.PI * 2)
  if (a < 0) a += Math.PI * 2
  const half = Math.round((a / DEG) * 2) / 2
  if (Math.abs(half * DEG - a) * extent <= tol * 0.5) a = (half % 360) * DEG
  return a
}

/**
 * Rounds to 2 or 3 significant digits when the change shifts no line of
 * the region (size `extent`) by more than half the tolerance.
 */
function snapScale(scale: number, tol: number, extent: number): number {
  for (const digits of [2, 3]) {
    const rounded = Number(scale.toPrecision(digits))
    if ((Math.abs(rounded - scale) / scale) * extent <= tol * 0.5) {
      return rounded
    }
  }
  return scale
}

/** World definition lines of a hypothesis, translated by `t`. */
function definitionLines(
  hyp: Hypothesis,
  t: PdfRecPoint
): PdfHatchDefinitionLine[] {
  const cr = Math.cos(hyp.rotation)
  const sr = Math.sin(hyp.rotation)
  return hyp.lines.map(line => {
    const turn = Math.PI * 2
    const angle = (((line.angle * DEG + hyp.rotation) % turn) + turn) % turn
    const ox = line.originX * hyp.scale
    const oy = line.originY * hyp.scale
    const dx = line.deltaX * hyp.scale
    const dy = line.deltaY * hyp.scale
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return {
      angle,
      base: { x: cr * ox - sr * oy + t.x, y: sr * ox + cr * oy + t.y },
      offset: { x: c * dx - s * dy, y: s * dx + c * dy },
      dashLengths: line.dashes.map(d => d * hyp.scale)
    }
  })
}

// ---------------------------------------------------------------------------
// Translation: which offset puts the pattern on the measured segments

interface LineFrame {
  ux: number
  uy: number
  spacing: number
  /** Along-line shift per line index (`offset.x` in line space). */
  shiftPerLine: number
  period: number
  /** Start of each drawn dash within one period. */
  dashes: { start: number; length: number }[]
}

function lineFrame(line: PdfHatchDefinitionLine): LineFrame {
  const ux = Math.cos(line.angle)
  const uy = Math.sin(line.angle)
  // Offset in line space (matches tessellateHatchPattern).
  const lx = ux * line.offset.x + uy * line.offset.y
  const ly = -uy * line.offset.x + ux * line.offset.y
  const spacing = Math.abs(ly) > 1e-9 ? ly : Math.hypot(lx, ly)
  const dashes: { start: number; length: number }[] = []
  let cursor = 0
  for (const value of line.dashLengths) {
    if (value > 0) dashes.push({ start: cursor, length: value })
    cursor += Math.abs(value)
  }
  return {
    ux,
    uy,
    spacing,
    shiftPerLine: Math.abs(ly) > 1e-9 ? lx : 0,
    period: cursor,
    dashes
  }
}

/** True when `p` lies on a drawn part of `line` (within `tol`). */
function onLine(
  p: PdfRecPoint,
  line: PdfHatchDefinitionLine,
  frame: LineFrame,
  tol: number
): boolean {
  const dx = p.x - line.base.x
  const dy = p.y - line.base.y
  const x = frame.ux * dx + frame.uy * dy
  const y = -frame.uy * dx + frame.ux * dy
  const k = Math.round(y / frame.spacing)
  if (Math.abs(y - k * frame.spacing) > tol) return false
  if (frame.dashes.length === 0 || !(frame.period > 0)) return true
  const pos = x - k * frame.shiftPerLine
  const phase = ((pos % frame.period) + frame.period) % frame.period
  for (const dash of frame.dashes) {
    for (const shifted of [phase, phase - frame.period, phase + frame.period]) {
      if (
        shifted >= dash.start - tol &&
        shifted <= dash.start + dash.length + tol
      ) {
        return true
      }
    }
  }
  return false
}

function segOnPattern(
  seg: Seg,
  lines: PdfHatchDefinitionLine[],
  frames: LineFrame[],
  tol: number
): boolean {
  const mid = { x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 }
  for (let i = 0; i < lines.length; i++) {
    if (directionDelta(lines[i].angle, seg.theta) > ANGLE_GAP) continue
    if (
      onLine(mid, lines[i], frames[i], tol) &&
      onLine(seg.a, lines[i], frames[i], tol) &&
      onLine(seg.b, lines[i], frames[i], tol)
    ) {
      return true
    }
  }
  return false
}

function sampleSegs(segs: readonly Seg[], count: number): Seg[] {
  if (segs.length <= count) return [...segs]
  const step = segs.length / count
  const out: Seg[] = []
  for (let i = 0; i < count; i++) out.push(segs[Math.floor(i * step)])
  return out
}

/** Best translation for a hypothesis, with its sample score. */
function estimateTranslation(
  hyp: Hypothesis,
  region: Seg[],
  tol: number
): { t: PdfRecPoint; score: number } | undefined {
  const lines0 = definitionLines(hyp, { x: 0, y: 0 })

  type Half = { nx: number; ny: number; value: number }
  const halves: Half[] = []
  const fulls: PdfRecPoint[] = []
  lines0.forEach((line, i) => {
    const family = hyp.families[i]
    const frame = lineFrame(line)
    const nx = -frame.uy
    const ny = frame.ux
    const ordered = family.byCenter
    const startOf = (seg: Seg) =>
      frame.ux * seg.a.x + frame.uy * seg.a.y <=
      frame.ux * seg.b.x + frame.uy * seg.b.y
        ? seg.a
        : seg.b
    // Put the segment on line k = 0: its perpendicular offset fixes n·t.
    const perp = (seg: Seg) =>
      nx * ((seg.a.x + seg.b.x) / 2 - line.base.x) +
      ny * ((seg.a.y + seg.b.y) / 2 - line.base.y)
    if (frame.dashes.length === 0) {
      for (const seg of ordered.slice(0, 3)) {
        halves.push({ nx, ny, value: perp(seg) })
      }
      return
    }
    // A whole dash also fixes where along the line the pattern starts.
    for (const dash of frame.dashes) {
      const matches = ordered
        .filter(seg => Math.abs(seg.len - dash.length) <= tol * 2)
        .slice(0, 2)
      for (const seg of matches) {
        const start = startOf(seg)
        const along =
          frame.ux * (start.x - line.base.x) +
          frame.uy * (start.y - line.base.y) -
          dash.start
        const across = perp(seg)
        fulls.push({
          x: frame.ux * along + nx * across,
          y: frame.uy * along + ny * across
        })
      }
    }
  })

  const candidates: PdfRecPoint[] = [...fulls]
  for (
    let i = 0;
    i < halves.length && candidates.length < MAX_TRANSLATIONS;
    i++
  ) {
    for (let j = i + 1; j < halves.length; j++) {
      const p = halves[i]
      const q = halves[j]
      const det = p.nx * q.ny - p.ny * q.nx
      if (Math.abs(det) < 1e-6) continue
      candidates.push({
        x: (p.value * q.ny - q.value * p.ny) / det,
        y: (p.nx * q.value - q.nx * p.value) / det
      })
      if (candidates.length >= MAX_TRANSLATIONS) break
    }
  }
  // Parallel continuous lines only: the along-line shift does not matter.
  if (candidates.length === 0) {
    for (const half of halves) {
      candidates.push({ x: half.nx * half.value, y: half.ny * half.value })
    }
  }

  const sample = sampleSegs(region, SCORE_SAMPLE)
  let best: { t: PdfRecPoint; score: number } | undefined
  for (const t of candidates.slice(0, MAX_TRANSLATIONS)) {
    const lines = definitionLines(hyp, t)
    const frames = lines.map(lineFrame)
    let hit = 0
    for (const seg of sample) {
      if (segOnPattern(seg, lines, frames, tol)) hit++
    }
    const score = hit / sample.length
    if (!best || score > best.score) best = { t, score }
    if (score === 1) break
  }
  return best
}

// ---------------------------------------------------------------------------
// Step 4: boundaries

interface ClosedShape {
  index: number
  shape: PdfRecognizedShape
  outline: PdfRecPoint[]
  box: Box
}

/** Closed outlines that can bound a hatch. */
function collectClosedShapes(
  items: readonly PdfImportShapeItem[]
): ClosedShape[] {
  const out: ClosedShape[] = []
  items.forEach((item, index) => {
    const outline = shapeOutline(item.shape)
    if (!outline || outline.length < 3) return
    out.push({ index, shape: item.shape, outline, box: pointsBox(outline) })
  })
  return out
}

const CURVE_STEPS = 72

/** Polygon of a closed shape, or `undefined` for open shapes. */
function shapeOutline(shape: PdfRecognizedShape): PdfRecPoint[] | undefined {
  switch (shape.kind) {
    case 'circle': {
      const out: PdfRecPoint[] = []
      for (let i = 0; i < CURVE_STEPS; i++) {
        const a = (i / CURVE_STEPS) * Math.PI * 2
        out.push({
          x: shape.center.x + shape.radius * Math.cos(a),
          y: shape.center.y + shape.radius * Math.sin(a)
        })
      }
      return out
    }
    case 'ellipse': {
      if (Math.abs(shape.endAngle - shape.startAngle - Math.PI * 2) > 1e-9) {
        return undefined
      }
      const mx = shape.majorAxis.x
      const my = shape.majorAxis.y
      const out: PdfRecPoint[] = []
      for (let i = 0; i < CURVE_STEPS; i++) {
        const a = (i / CURVE_STEPS) * Math.PI * 2
        const cos = Math.cos(a)
        const sin = Math.sin(a) * shape.radiusRatio
        out.push({
          x: shape.center.x + mx * cos - my * sin,
          y: shape.center.y + my * cos + mx * sin
        })
      }
      return out
    }
    case 'polyline': {
      if (!shape.closed || shape.vertices.length < 2) return undefined
      const v = shape.vertices
      const out: PdfRecPoint[] = []
      for (let i = 0; i < v.length; i++) {
        const a = v[i]
        const b = v[(i + 1) % v.length]
        out.push({ x: a.x, y: a.y })
        if (Math.abs(a.bulge) > 1e-12) {
          // Sample the bulge arc between a and b.
          const sweep = 4 * Math.atan(a.bulge)
          const chord = Math.hypot(b.x - a.x, b.y - a.y)
          const radius = chord / (2 * Math.sin(Math.abs(sweep) / 2))
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const h = radius * Math.cos(Math.abs(sweep) / 2) * Math.sign(a.bulge)
          const cx = mx - (h * (b.y - a.y)) / chord
          const cy = my + (h * (b.x - a.x)) / chord
          const start = Math.atan2(a.y - cy, a.x - cx)
          const steps = Math.max(2, Math.ceil((Math.abs(sweep) / Math.PI) * 18))
          for (let k = 1; k < steps; k++) {
            const t = start + (sweep * k) / steps
            out.push({
              x: cx + radius * Math.cos(t),
              y: cy + radius * Math.sin(t)
            })
          }
        }
      }
      return out.length >= 3 ? out : undefined
    }
    default:
      return undefined
  }
}

function pointsBox(points: readonly PdfRecPoint[]): Box {
  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  }
  for (const p of points) {
    if (p.x < box.minX) box.minX = p.x
    if (p.y < box.minY) box.minY = p.y
    if (p.x > box.maxX) box.maxX = p.x
    if (p.y > box.maxY) box.maxY = p.y
  }
  return box
}

function distanceToSegment(
  p: PdfRecPoint,
  a: PdfRecPoint,
  b: PdfRecPoint
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

function onOutline(p: PdfRecPoint, outline: PdfRecPoint[], tol: number) {
  for (let i = 0; i < outline.length; i++) {
    if (
      distanceToSegment(p, outline[i], outline[(i + 1) % outline.length]) <= tol
    ) {
      return true
    }
  }
  return false
}

interface Boundary {
  shapes: PdfRecognizedShape[]
  polygons: PdfRecPoint[][]
}

/** Closed shapes on which the region's segments end. */
function boundaryFromShapes(
  region: Seg[],
  shapes: ClosedShape[],
  tol: number
): Boundary | undefined {
  const box = segsBox(region)
  const near = shapes.filter(
    s =>
      s.box.maxX >= box.minX - tol &&
      s.box.minX <= box.maxX + tol &&
      s.box.maxY >= box.minY - tol &&
      s.box.minY <= box.maxY + tol
  )
  if (near.length === 0) return undefined
  const hits = new Map<ClosedShape, number>()
  for (const seg of sampleSegs(region, 400)) {
    for (const p of [seg.a, seg.b]) {
      for (const s of near) {
        if (
          p.x < s.box.minX - tol ||
          p.x > s.box.maxX + tol ||
          p.y < s.box.minY - tol ||
          p.y > s.box.maxY + tol
        ) {
          continue
        }
        if (onOutline(p, s.outline, tol)) {
          hits.set(s, (hits.get(s) ?? 0) + 1)
        }
      }
    }
  }
  const chosen = [...hits.entries()]
    .filter(([, count]) => count >= 3)
    .map(([shape]) => shape)
  if (chosen.length === 0) return undefined
  const outer = pointsBox(chosen.flatMap(s => s.outline))
  if (
    outer.minX > box.minX + tol ||
    outer.minY > box.minY + tol ||
    outer.maxX < box.maxX - tol ||
    outer.maxY < box.maxY - tol
  ) {
    return undefined
  }
  return {
    shapes: chosen.map(s => s.shape),
    polygons: chosen.map(s => s.outline)
  }
}

function polygonsToBoundary(polygons: PdfRecPoint[][]): Boundary {
  return {
    shapes: polygons.map(polygon => ({
      kind: 'polyline',
      vertices: polygon.map(p => ({ x: p.x, y: p.y, bulge: 0 })),
      closed: true
    })),
    polygons
  }
}

/** Clip path every segment of the region was painted under. */
function boundaryFromClip(
  region: Seg[],
  items: readonly PdfImportShapeItem[],
  clipPaths: readonly (readonly PdfRecPoint[][])[] | undefined
): Boundary | undefined {
  if (!clipPaths) return undefined
  const id = items[region[0].index]?.clipPath
  if (id === undefined) return undefined
  if (region.some(seg => items[seg.index]?.clipPath !== id)) return undefined
  const loops = clipPaths[id]?.filter(loop => loop.length >= 3)
  if (!loops || loops.length === 0) return undefined
  return polygonsToBoundary(loops.map(loop => [...loop]))
}

/**
 * Boundary traced through the segment ends of one continuous family. Only
 * for regions every line crosses once (no holes, convex in that direction).
 */
function boundaryFromEnds(
  hyp: Hypothesis,
  lines: PdfHatchDefinitionLine[],
  tol: number
): Boundary | undefined {
  const index = lines.findIndex(line => line.dashLengths.length === 0)
  if (index < 0) return undefined
  const family = hyp.families[index]
  const theta = normalizeDirection(lines[index].angle)
  const rows = linesOf(family.segs, theta, tol)
  if (rows.length < 2) return undefined
  const ux = Math.cos(theta)
  const uy = Math.sin(theta)
  const starts: PdfRecPoint[] = []
  const ends: PdfRecPoint[] = []
  for (const row of rows) {
    // Touching collinear pieces form one crossing (segments are sorted).
    const s0 = row.segs[0].s0
    let s1 = row.segs[0].s1
    for (const entry of row.segs.slice(1)) {
      if (entry.s0 > s1 + tol) return undefined
      s1 = Math.max(s1, entry.s1)
    }
    // Half a tolerance past the ends: lines of another family that run
    // exactly along the edge then stay inside instead of on it.
    const a = s0 - tol / 2
    const b = s1 + tol / 2
    starts.push({ x: ux * a - uy * row.c, y: uy * a + ux * row.c })
    ends.push({ x: ux * b - uy * row.c, y: uy * b + ux * row.c })
  }
  // Cap half a spacing past the outer lines so they are not on the edge
  // (no line of this family lies in that strip).
  const half = family.period / 2
  const nx = -uy
  const ny = ux
  const shift = (p: PdfRecPoint, k: number) => ({
    x: p.x + nx * half * k,
    y: p.y + ny * half * k
  })
  const last = rows.length - 1
  const polygon = simplifyPolygon(
    [
      shift(starts[0], -1),
      ...starts,
      shift(starts[last], 1),
      shift(ends[last], 1),
      ...[...ends].reverse(),
      shift(ends[0], -1)
    ],
    tol * 0.1
  )
  if (polygon.length < 3) return undefined
  return polygonsToBoundary([polygon])
}

/**
 * Drops vertices that lie on the line between their kept neighbours
 * (one pass with a stack, then the seam where the ring closes).
 */
function simplifyPolygon(points: PdfRecPoint[], tol: number): PdfRecPoint[] {
  const out: PdfRecPoint[] = []
  for (const p of points) {
    while (
      out.length >= 2 &&
      distanceToSegment(out[out.length - 1], out[out.length - 2], p) <= tol
    ) {
      out.pop()
    }
    out.push(p)
  }
  let changed = true
  while (changed && out.length > 3) {
    changed = false
    const n = out.length
    if (distanceToSegment(out[n - 1], out[n - 2], out[0]) <= tol) {
      out.pop()
      changed = true
    } else if (distanceToSegment(out[0], out[n - 1], out[1]) <= tol) {
      out.shift()
      changed = true
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Step 6: verification

/** Where a segment lies on the pattern: line `key` from `s0` to `s1`. */
interface PatternSpan {
  key: string
  s0: number
  s1: number
}

/**
 * Every pattern line the segment lies on (both ends within `tol`), keyed by
 * definition line and line index, with its extent along that line.
 */
function patternSpans(
  a: PdfRecPoint,
  b: PdfRecPoint,
  lines: PdfHatchDefinitionLine[],
  frames: LineFrame[],
  tol: number
): PatternSpan[] {
  const out: PatternSpan[] = []
  for (let i = 0; i < lines.length; i++) {
    const { base } = lines[i]
    const { ux, uy, spacing } = frames[i]
    const ya = -uy * (a.x - base.x) + ux * (a.y - base.y)
    const yb = -uy * (b.x - base.x) + ux * (b.y - base.y)
    const k = Math.round((ya + yb) / 2 / spacing)
    if (Math.abs(ya - k * spacing) > tol || Math.abs(yb - k * spacing) > tol) {
      continue
    }
    const xa = ux * (a.x - base.x) + uy * (a.y - base.y)
    const xb = ux * (b.x - base.x) + uy * (b.y - base.y)
    out.push({ key: `${i}:${k}`, s0: Math.min(xa, xb), s1: Math.max(xa, xb) })
  }
  return out
}

/** Merged intervals per pattern line, for coverage queries. */
class SpanIndex {
  private merged = new Map<string, number[][]>()

  constructor(spans: Iterable<PatternSpan>, gap: number) {
    const byKey = new Map<string, number[][]>()
    for (const span of spans) {
      const list = byKey.get(span.key)
      if (list) list.push([span.s0, span.s1])
      else byKey.set(span.key, [[span.s0, span.s1]])
    }
    for (const [key, list] of byKey) {
      list.sort((p, q) => p[0] - q[0])
      const merged: number[][] = []
      for (const [s0, s1] of list) {
        const last = merged[merged.length - 1]
        if (last && s0 <= last[1] + gap) last[1] = Math.max(last[1], s1)
        else merged.push([s0, s1])
      }
      this.merged.set(key, merged)
    }
  }

  /** Length of `span` the indexed intervals cover. */
  covered(span: PatternSpan): number {
    const list = this.merged.get(span.key)
    if (!list) return 0
    // First interval that may end after s0.
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (list[mid][1] < span.s0) lo = mid + 1
      else hi = mid
    }
    let total = 0
    for (let i = lo; i < list.length && list[i][0] < span.s1; i++) {
      total += Math.max(
        0,
        Math.min(list[i][1], span.s1) - Math.max(list[i][0], span.s0)
      )
    }
    return total
  }

  /** Best covered length over the spans of one segment. */
  coveredBest(spans: PatternSpan[]): number {
    let best = 0
    for (const span of spans) best = Math.max(best, this.covered(span))
    return best
  }
}

interface Verified {
  matched: number[]
}

function verify(
  lines: PdfHatchDefinitionLine[],
  boundary: Boundary,
  region: Seg[],
  all: Seg[],
  opts: ResolvedOptions
): Verified | undefined {
  const tol = opts.tolerance
  const generated = tessellateHatchPattern(
    boundary.polygons,
    lines.map(line => ({
      ...line,
      base: { ...line.base },
      offset: { ...line.offset }
    })),
    0
  ).filter(seg => Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y) > tol)
  if (generated.length === 0) return undefined
  if (generated.length > region.length * 4 + 100) return undefined

  const frames = lines.map(lineFrame)
  const spansOf = (a: PdfRecPoint, b: PdfRecPoint) =>
    patternSpans(a, b, lines, frames, tol)
  const genSpans = generated.map(([a, b]) => spansOf(a, b))
  const regionSpans = region.map(seg => spansOf(seg.a, seg.b))
  // PDF rounding leaves hairline gaps between pieces of one line.
  const sourceIndex = new SpanIndex(regionSpans.flat(), tol)
  const genIndex = new SpanIndex(genSpans.flat(), tol)

  let genLength = 0
  let genCovered = 0
  generated.forEach(([a, b], i) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    genLength += len
    genCovered += Math.min(len, sourceIndex.coveredBest(genSpans[i]))
  })
  if (genCovered / genLength < opts.minPrecision) return undefined

  let srcLength = 0
  let srcCovered = 0
  region.forEach((seg, i) => {
    srcLength += seg.len
    srcCovered += Math.min(seg.len, genIndex.coveredBest(regionSpans[i]))
  })
  if (srcCovered / srcLength < opts.minRecall) return undefined

  // Every segment the hatch re-draws goes, short corner stubs included.
  const box = segsBox(region)
  const pad = tol * 2
  const matched: number[] = []
  for (const seg of all) {
    if (
      Math.max(seg.a.x, seg.b.x) < box.minX - pad ||
      Math.min(seg.a.x, seg.b.x) > box.maxX + pad ||
      Math.max(seg.a.y, seg.b.y) < box.minY - pad ||
      Math.min(seg.a.y, seg.b.y) > box.maxY + pad
    ) {
      continue
    }
    const covered = genIndex.coveredBest(spansOf(seg.a, seg.b))
    if (covered >= seg.len - tol * 2) matched.push(seg.index)
  }
  return { matched: matched.sort((p, q) => p - q) }
}

// ---------------------------------------------------------------------------
// Region driver

function recognizeRegion(
  region: Seg[],
  all: Seg[],
  library: PatternSignature[],
  closedShapes: ClosedShape[],
  clipPaths: readonly (readonly PdfRecPoint[][])[] | undefined,
  opts: ResolvedOptions,
  items: readonly PdfImportShapeItem[]
): Omit<PdfRecognizedHatch, 'layerName' | 'color' | 'lineWidth'> | undefined {
  const tol = opts.tolerance
  const families = measureFamilies(region, tol)
  if (families.length === 0) return undefined
  const anchorLines = families[0].offsets.length
  if (anchorLines < opts.minLines) return undefined
  const familySegs = families.flatMap(f => f.segs)

  const box = segsBox(familySegs)
  const extent = Math.hypot(box.maxX - box.minX, box.maxY - box.minY)
  const hypotheses: Hypothesis[] = []
  for (const sig of library) {
    hypotheses.push(...matchPattern(sig, families, tol, extent))
  }
  const user = userDefinedHypothesis(families, tol, extent)
  if (user) hypotheses.push(user)

  const scored: { hyp: Hypothesis; t: PdfRecPoint; score: number }[] = []
  for (const hyp of hypotheses) {
    const best = estimateTranslation(hyp, familySegs, tol)
    if (best && best.score >= MIN_SCORE) scored.push({ hyp, ...best })
  }
  // Best score first; then the pattern drawn closest to its own angle, and
  // library patterns (in library order) over user-defined lines.
  scored.sort(
    (p, q) =>
      Math.round((q.score - p.score) * 50) ||
      Math.round(rotationRank(p.hyp.rotation) - rotationRank(q.hyp.rotation)) ||
      p.hyp.order - q.hyp.order
  )

  for (const { hyp, t } of scored.slice(0, 4)) {
    const lines = definitionLines(hyp, t)
    const boundaries = [
      () => boundaryFromShapes(familySegs, closedShapes, tol),
      () => boundaryFromClip(familySegs, items, clipPaths),
      () => boundaryFromEnds(hyp, lines, tol)
    ]
    for (const make of boundaries) {
      const boundary = make()
      if (!boundary) continue
      const verified = verify(lines, boundary, familySegs, all, opts)
      if (!verified) continue
      return {
        boundary: boundary.shapes,
        pattern: hyp.userDefined
          ? {
              type: 'userDefined',
              angle: hyp.rotation,
              spacing: hyp.userDefined.spacing,
              double: hyp.userDefined.double
            }
          : {
              type: 'predefined',
              name: hyp.name ?? '',
              scale: hyp.scale,
              angle: hyp.rotation
            },
        definitionLines: lines,
        items: verified.matched
      }
    }
  }
  return undefined
}

function rotationRank(angle: number): number {
  const deg = angle / DEG
  return Math.min(deg, 360 - deg)
}
