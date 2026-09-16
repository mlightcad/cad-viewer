/**
 * MTEXT/TEXT layout engine for text-mode PDF export.
 *
 * Consumes the inline-format parse trees produced by {@link parseMText} and
 * positions them as styled runs inside wrapped lines: per-run height (`\H`),
 * width factor (`\W`), tracking (`\T`), oblique (`\Q`), color, font,
 * underline/overline/strikethrough, stacked fractions and tolerances (`\S`),
 * and paragraph justification (`\pxql|qc|qr;`). Baselines advance by the CAD
 * single-spacing distance `5/3 × height × lineSpaceFactor`; wrapping breaks
 * against the entity's column width.
 */
import {
  type AcGiMTextData,
  AcGiMTextFlowDirection} from '@mlightcad/data-model'

import {
  type AcPdfMTextJustify,
  type AcPdfMTextParagraph,
  type AcPdfMTextSegment,
  type AcPdfMTextStack,
  type AcPdfMTextStyle,
  parseMText} from './AcPdfMTextParser'
import type { AcPdfRgb } from './AcPdfStyle'

/** Baseline-to-baseline distance of single-spaced text, in heights. */
export const LINE_SPACING_RATIO = 5 / 3
/** Approximate ascender/descender extents of a text line, as height fractions. */
export const ASCENT_RATIO = 0.75
export const DESCENT_RATIO = 0.25
/** Decoration rule offsets relative to a run's baseline, in run sizes. */
export const UNDERLINE_OFFSET_RATIO = -0.05
export const OVERLINE_OFFSET_RATIO = 1.05
export const STRIKE_OFFSET_RATIO = 0.3
/** Glyph scale of `\S a^b;` tolerance stacks relative to the current size. */
export const TOLERANCE_SCALE = 0.7
/** Fallback per-character advance (in sizes) when no font metrics exist. */
const CHAR_FALLBACK_RATIO = 0.5

/**
 * One styled run of glyphs inside a laid-out line. Text-local `dx` is the
 * in-line pen offset from the line origin; `dy` is the offset from the
 * line's baseline (positive = up). Runs with empty `text` carry only a
 * stacked-fraction rule in `bar`.
 */
export interface AcPdfTextLayoutRun {
  text: string
  dx: number
  dy: number
  /** Advance width of this run in drawing units (hScale/tracking applied). */
  width: number
  /** Glyph height in drawing units. */
  size: number
  /** Width factor (style factor × `\W`). */
  hScale: number
  /** `\T` tracking: 1 = default advance, 1.1 = +10% per glyph. */
  tracking: number
  /** `\Q` oblique (shear) angle in degrees. */
  obliqueDeg: number
  /** `\C`/`\c` color override; `undefined` keeps the entity color. */
  rgb?: AcPdfRgb
  /** `\F` font override (raw CAD font name). */
  font?: string
  underline?: boolean
  overline?: boolean
  strike?: boolean
  /** Fraction rule drawn by this run: span and baseline offset, text-local. */
  bar?: { dx0: number; dx1: number; dy: number }
}

/**
 * One laid-out line: runs at pen positions relative to the line origin,
 * whose baseline sits at text-local `(dx, dy)` from the entity anchor.
 */
export interface AcPdfTextLayoutLine {
  runs: AcPdfTextLayoutRun[]
  /** Plain text of all runs (coverage checks, ActualText, diagnostics). */
  text: string
  /** Baseline origin relative to the entity anchor, text-local. */
  dx: number
  dy: number
  /** Total advance width in drawing units. */
  width: number
}

/**
 * Layout result before entity placement: the renderer rotates `dx/dy` by the
 * entity frame and wraps the extents into the entity box.
 */
export interface AcPdfTextLayout {
  lines: AcPdfTextLayoutLine[]
  /** Per-line advance width in drawing units. */
  lineWidths: number[]
  /** Widest laid-out line, in drawing units. */
  maxWidth: number
  /** Full block height including ascender/descender slack. */
  blockHeight: number
}

export interface AcPdfTextLayoutParams {
  data: AcGiMTextData
  /**
   * Measures `text` at `size` in drawing units for the given raw font name
   * (the entity font when omitted), WITHOUT width factor or tracking — the
   * layout applies both itself. Return `undefined` when no metrics exist.
   */
  measure: (text: string, size: number, font?: string) => number | undefined
}

interface WrapItem {
  style: AcPdfMTextStyle
  text?: string
  stack?: AcPdfMTextStack
}

type MeasureFn = AcPdfTextLayoutParams['measure']

/** Splits a run's text into wrap units: words for Latin, chars for CJK. */
function wrapUnits(line: string): string[] {
  const units: string[] = []
  let latin = ''
  const flushLatin = () => {
    if (latin !== '') {
      units.push(latin)
      latin = ''
    }
  }
  for (const char of line) {
    if (char === ' ') {
      flushLatin()
      units.push(' ')
    } else if (char.charCodeAt(0) > 0x2e7f) {
      // CJK and fullwidth ranges break anywhere.
      flushLatin()
      units.push(char)
    } else {
      latin += char
    }
  }
  flushLatin()
  return units
}

/** Advance of `text` for one style: metrics × width factor × tracking. */
function runAdvance(
  text: string,
  style: AcPdfMTextStyle,
  measure: MeasureFn
): number {
  const raw = measure(text, style.size, style.fontName)
  if (raw === undefined) {
    return (
      text.length * style.size * CHAR_FALLBACK_RATIO * style.hScale * style.tracking
    )
  }
  return raw * style.hScale * style.tracking
}

/** Total advance of a stack part (plain inline runs only). */
function segmentsWidth(
  segments: AcPdfMTextSegment[],
  measure: MeasureFn
): number {
  let total = 0
  for (const segment of segments) {
    if (segment.text !== undefined) {
      total += runAdvance(segment.text, segment.style, measure)
    }
  }
  return total
}

/**
 * Positions a stack part's inline runs along a shared baseline. `scale`
 * shrinks tolerance (`^`) glyph runs; widths and pen positions follow the
 * scaled size.
 */
function layoutInlineRuns(
  segments: AcPdfMTextSegment[],
  measure: MeasureFn,
  scale: number
): { runs: AcPdfTextLayoutRun[]; width: number } {
  const runs: AcPdfTextLayoutRun[] = []
  let pen = 0
  for (const segment of segments) {
    if (segment.text === undefined || segment.text === '') {
      continue
    }
    const style = segment.style
    const size = style.size * scale
    const width = runAdvance(segment.text, { ...style, size }, measure)
    runs.push({
      text: segment.text,
      dx: pen,
      dy: 0,
      width,
      size,
      hScale: style.hScale,
      tracking: style.tracking,
      obliqueDeg: style.obliqueDeg,
      rgb: style.rgb,
      font: style.fontName,
      underline: style.underline || undefined,
      overline: style.overline || undefined,
      strike: style.strike || undefined
    })
    pen += width
  }
  return { runs, width: pen }
}

/**
 * Lays out one `\S` stack into positioned runs at pen offset 0.
 *
 * Matches mtext-renderer semantics: tolerance stacks (`^`) paint at
 * `TOLERANCE_SCALE` without centering; fractions (`/`, `#`) paint at full
 * size, centered over the stacked width, with a horizontal rule — the stack
 * advance is the full-size maximum for every divider.
 */
function layoutStackRuns(
  style: AcPdfMTextStyle,
  stack: AcPdfMTextStack,
  entityHeight: number,
  measure: MeasureFn
): AcPdfTextLayoutRun[] {
  const fs = style.size
  const tolerance = stack.divider === '^'
  const scale = tolerance ? TOLERANCE_SCALE : 1
  const num = layoutInlineRuns(stack.num, measure, scale)
  const den = layoutInlineRuns(stack.den, measure, scale)
  const advance = Math.max(
    segmentsWidth(stack.num, measure),
    segmentsWidth(stack.den, measure)
  )
  const numDy = (tolerance ? -0.6 : -0.7) * fs + 1.3 * entityHeight
  const denDy = (tolerance ? -1.3 : -1.6) * fs + 1.3 * entityHeight
  const numOffset = tolerance ? 0 : (advance - num.width) / 2
  const denOffset = tolerance ? 0 : (advance - den.width) / 2
  const runs: AcPdfTextLayoutRun[] = []
  for (const run of num.runs) {
    runs.push({ ...run, dx: run.dx + numOffset, dy: numDy })
  }
  for (const run of den.runs) {
    runs.push({ ...run, dx: run.dx + denOffset, dy: denDy })
  }
  if (!tolerance && advance > 0) {
    runs.push({
      text: '',
      dx: 0,
      dy: 0,
      width: 0,
      size: fs,
      hScale: style.hScale,
      tracking: 1,
      obliqueDeg: 0,
      bar: { dx0: 0, dx1: advance, dy: -0.8 * fs + 0.3 * entityHeight }
    })
  }
  return runs
}

/** Flattens a paragraph's segments into atomic wrap items. */
function paragraphItems(paragraph: AcPdfMTextParagraph): WrapItem[] {
  const items: WrapItem[] = []
  for (const segment of paragraph.segments) {
    if (segment.stack) {
      items.push({ style: segment.style, stack: segment.stack })
      continue
    }
    if (segment.text === undefined || segment.text === '') {
      continue
    }
    for (const unit of wrapUnits(segment.text)) {
      items.push({ style: segment.style, text: unit })
    }
  }
  return items
}

function itemWidth(item: WrapItem, measure: MeasureFn): number {
  if (item.stack) {
    return Math.max(
      segmentsWidth(item.stack.num, measure),
      segmentsWidth(item.stack.den, measure)
    )
  }
  return runAdvance(item.text ?? '', item.style, measure)
}

function trimTrailingSpaces(items: WrapItem[]): void {
  while (items.length > 0 && items[items.length - 1].text === ' ') {
    items.pop()
  }
}

/**
 * Lays out MTEXT/TEXT contents as styled runs.
 *
 * Handles paragraph breaks (`\P`, `\N`, real newlines), width-driven word
 * wrap, stacked fractions/tolerances, and attachment-point anchoring with
 * per-paragraph justification overrides.
 */
export function layoutMText(params: AcPdfTextLayoutParams): AcPdfTextLayout {
  const { data, measure } = params
  const height = data.height > 0 ? data.height : 1
  const hScale = data.widthFactor && data.widthFactor > 0 ? data.widthFactor : 1

  // The parser already expands `%%` symbol codes inline.
  const paragraphs = parseMText(data.text ?? '', {
    size: height,
    hScale
  })
  const step = (data.lineSpaceFactor ?? 1) * LINE_SPACING_RATIO * height
  const maxWidthLimit = data.width > 0 ? data.width : undefined

  // Wrap each paragraph against the column width, keeping its justification.
  const wrapped: Array<{ items: WrapItem[]; justify?: AcPdfMTextJustify }> = []
  for (const paragraph of paragraphs) {
    const items = paragraphItems(paragraph)
    if (items.length === 0) {
      wrapped.push({ items: [], justify: paragraph.justify })
      continue
    }
    if (maxWidthLimit === undefined) {
      trimTrailingSpaces(items)
      wrapped.push({ items, justify: paragraph.justify })
      continue
    }
    let current: WrapItem[] = []
    let currentWidth = 0
    for (const item of items) {
      const width = itemWidth(item, measure)
      const isSpace = item.text === ' '
      if (
        current.length > 0 &&
        !isSpace &&
        currentWidth + width > maxWidthLimit
      ) {
        trimTrailingSpaces(current)
        wrapped.push({ items: current, justify: paragraph.justify })
        current = []
        currentWidth = 0
      }
      if (isSpace && current.length === 0) {
        continue
      }
      current.push(item)
      currentWidth += width
    }
    trimTrailingSpaces(current)
    wrapped.push({ items: current, justify: paragraph.justify })
  }

  // Trim trailing empty lines (paragraph joiners produce them).
  while (wrapped.length > 1 && wrapped[wrapped.length - 1].items.length === 0) {
    wrapped.pop()
  }

  // Right-to-left flow (DXF drawing direction 2) draws each line's items
  // from right to left: reverse the item order and the characters inside
  // each text item; extents stay unchanged. Top-to-bottom / bottom-to-top
  // flows fall back to left-to-right layout.
  const rtl = data.drawingDirection === AcGiMTextFlowDirection.RIGHT_TO_LEFT

  const lines: AcPdfTextLayoutLine[] = wrapped.map(({ items }) => {
    const ordered = rtl
      ? [...items]
          .reverse()
          .map(item =>
            item.text !== undefined
              ? { ...item, text: [...item.text].reverse().join('') }
              : item
          )
      : items
    const runs: AcPdfTextLayoutRun[] = []
    let pen = 0
    let text = ''
    for (const item of ordered) {
      if (item.stack) {
        for (const run of layoutStackRuns(
          item.style,
          item.stack,
          height,
          measure
        )) {
          runs.push({ ...run, dx: run.dx + pen })
          if (run.text !== '') {
            text += run.text
          }
        }
      } else {
        const runText = item.text ?? ''
        runs.push({
          text: runText,
          dx: pen,
          dy: 0,
          width: itemWidth(item, measure),
          size: item.style.size,
          hScale: item.style.hScale,
          tracking: item.style.tracking,
          obliqueDeg: item.style.obliqueDeg,
          rgb: item.style.rgb,
          font: item.style.fontName,
          underline: item.style.underline || undefined,
          overline: item.style.overline || undefined,
          strike: item.style.strike || undefined
        })
        text += runText
      }
      pen += itemWidth(item, measure)
    }
    return { runs, text, dx: 0, dy: 0, width: pen }
  })

  const lineWidths = lines.map(line => line.width)
  const blockWidth = maxWidthLimit ?? Math.max(...lineWidths, 0)

  // Attachment point (DXF group 71 / TEXT extensions 10-12): horizontal
  // 0 left / 1 center / 2 right, vertical 0 top / 1 middle / 2 bottom /
  // 3 baseline.
  const attachment = data.attachmentPoint ?? 1
  const horizontal = (attachment - 1) % 3
  const vertical = Math.floor((attachment - 1) / 3)
  const defaultJustify: AcPdfMTextJustify =
    horizontal === 1 ? 'center' : horizontal === 2 ? 'right' : 'left'

  // Per-line extents from the runs' sizes and baseline offsets; empty lines
  // keep the entity-height defaults so blank paragraphs still take room.
  const ascents = lines.map(line => {
    let ascent = ASCENT_RATIO * height
    for (const run of line.runs) {
      if (run.text !== '') {
        ascent = Math.max(ascent, run.dy + ASCENT_RATIO * run.size)
      }
    }
    return ascent
  })
  const descents = lines.map(line => {
    let descent = DESCENT_RATIO * height
    for (const run of line.runs) {
      if (run.text !== '') {
        descent = Math.max(descent, -run.dy + DESCENT_RATIO * run.size)
      }
    }
    return descent
  })

  const lineCount = lines.length
  const blockHeight =
    (lineCount - 1) * step + ascents[0] + descents[lineCount - 1]
  // First-line baseline per vertical attachment: the block spans
  // `[baseline0 − ascent0, baseline0 − (N−1)·step + descentLast]`.
  let baseline0: number
  if (vertical === 0) {
    baseline0 = -ascents[0]
  } else if (vertical === 1) {
    baseline0 = blockHeight / 2 - ascents[0]
  } else if (vertical === 2) {
    baseline0 = (lineCount - 1) * step + descents[lineCount - 1]
  } else {
    // Baseline attachment (TEXT): the first line sits on the anchor.
    baseline0 = 0
  }

  // The laid-out frame spans `[0, blockWidth]`, pinned to the anchor by the
  // horizontal attachment; each line's justification offsets it within the
  // frame (`\pxq*` overrides the attachment default).
  const frameOrigin =
    horizontal === 1 ? -blockWidth / 2 : horizontal === 2 ? -blockWidth : 0
  lines.forEach((line, index) => {
    const justify = wrapped[index].justify ?? defaultJustify
    const justifyOffset =
      justify === 'center'
        ? (blockWidth - line.width) / 2
        : justify === 'right'
          ? blockWidth - line.width
          : 0
    line.dx = frameOrigin + justifyOffset
    line.dy = baseline0 - index * step
  })

  return {
    lines,
    lineWidths,
    maxWidth: Math.max(...lineWidths, 0),
    blockHeight
  }
}
