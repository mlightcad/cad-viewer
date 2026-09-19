/**
 * Unit tests for the MTEXT inline-format parser and the run-based text
 * layout engine (text-mode PDF export).
 *
 * The headline regression is the handle-8A8 leak: `\pxqc;` paragraph
 * properties used to be mangled into literal "xqc;" text by the old
 * case-insensitive `\P` strip. These tests lock the full pipeline instead:
 * paragraphs carry justification, runs carry per-run style, stacks position
 * numerator/denominator/rule per mtext-renderer semantics, and baselines
 * advance by `5/3 × lineSpaceFactor × height`.
 */
import { AcGiMTextFlowDirection, type AcGiMTextData } from '@mlightcad/data-model'

import { parseMText } from '../src/renderer/AcPdfMTextParser'
import { layoutMText } from '../src/renderer/AcPdfTextLayout'

/** Deterministic metrics: CJK chars one em wide, Latin half an em. */
const measure = (text: string, size: number) =>
  [...text].reduce(
    (sum, ch) => sum + (ch.charCodeAt(0) > 0x2e7f ? size : 0.5 * size),
    0
  )

function makeData(overrides: Partial<AcGiMTextData>): AcGiMTextData {
  return {
    text: '',
    height: 4,
    width: Infinity,
    widthFactor: 1,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    drawingDirection: AcGiMTextFlowDirection.LEFT_TO_RIGHT,
    attachmentPoint: 1,
    ...overrides
  } as AcGiMTextData
}

describe('parseMText', () => {
  it('parses the handle-8A8 fixture without leaking paragraph codes', () => {
    const raw =
      '{\\pxqc;\\T1.1;左视图}{\\T1.1;\\P}{\\pxqc;\\T1.1;（2:1）}'
    const paragraphs = parseMText(raw, { size: 4, hScale: 1 })

    // The single `\P` terminates the first paragraph: two text paragraphs.
    expect(paragraphs).toHaveLength(2)
    // No "xqc" may survive in any emitted text.
    for (const paragraph of paragraphs) {
      for (const segment of paragraph.segments) {
        if (segment.text !== undefined) {
          expect(segment.text).not.toContain('xqc')
        }
      }
    }
    // Each paragraph carries its own `\pxqc;` justification.
    expect(paragraphs[0].justify).toBe('center')
    expect(paragraphs[1].justify).toBe('center')
    expect(paragraphs[0].segments[0].text).toBe('左视图')
    expect(paragraphs[0].segments[0].style.tracking).toBeCloseTo(1.1)
    expect(paragraphs[1].segments[0].text).toBe('（2:1）')
  })

  it('resets paragraph justification after \\P', () => {
    const paragraphs = parseMText('\\pxqc;a\\Pb', { size: 4, hScale: 1 })
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].justify).toBe('center')
    expect(paragraphs[1].justify).toBeUndefined()
  })

  it('restores every style property at the closing brace', () => {
    const paragraphs = parseMText('{\\H8;大}小', { size: 4, hScale: 1 })
    const segments = paragraphs[0].segments
    expect(segments).toHaveLength(2)
    expect(segments[0].text).toBe('大')
    expect(segments[0].style.size).toBe(8)
    expect(segments[1].text).toBe('小')
    expect(segments[1].style.size).toBe(4)
  })

  it('never mutates styles already held by emitted segments', () => {
    const paragraphs = parseMText('\\H8;大\\H4;小', { size: 4, hScale: 1 })
    const segments = paragraphs[0].segments
    expect(segments[0].style.size).toBe(8)
    expect(segments[1].style.size).toBe(4)
  })

  it('parses stacked fractions and tolerances with their divider', () => {
    const fraction = parseMText('\\S1/2;', { size: 4, hScale: 1 })
    expect(fraction[0].segments[0].stack?.divider).toBe('/')
    expect(fraction[0].segments[0].stack?.num[0].text).toBe('1')
    expect(fraction[0].segments[0].stack?.den[0].text).toBe('2')

    const tolerance = parseMText('\\S+0.1^-0.1;', { size: 4, hScale: 1 })
    expect(tolerance[0].segments[0].stack?.divider).toBe('^')
    expect(tolerance[0].segments[0].stack?.num[0].text).toBe('+0.1')
    expect(tolerance[0].segments[0].stack?.den[0].text).toBe('-0.1')
  })

  it('tracks decoration toggles across runs', () => {
    const paragraphs = parseMText('a\\Lb\\lc', { size: 4, hScale: 1 })
    const segments = paragraphs[0].segments
    expect(segments[0].text).toBe('a')
    expect(segments[0].style.underline).toBe(false)
    expect(segments[1].text).toBe('b')
    expect(segments[1].style.underline).toBe(true)
    expect(segments[2].text).toBe('c')
    expect(segments[2].style.underline).toBe(false)
  })

  it('expands %% control codes during layout', () => {
    const layout = layoutMText({
      data: makeData({ text: '%%c50' }),
      measure
    })
    expect(layout.lines[0].text).toBe('Ø50')
  })
})

describe('layoutMText', () => {
  it('keeps baseline-centered glyphs finite when width is Infinity', () => {
    const layout = layoutMText({
      data: makeData({
        text: 'H',
        height: 0.7,
        width: Infinity,
        attachmentPoint: 11
      }),
      measure
    })
    expect(layout.lines).toHaveLength(1)
    expect(layout.lines[0].text).toBe('H')
    expect(Number.isFinite(layout.lines[0].dx)).toBe(true)
    expect(Number.isFinite(layout.lines[0].dy)).toBe(true)
    expect(layout.lines[0].dy).toBe(0)
    expect(layout.lines[0].dx).toBeCloseTo(-layout.lines[0].width / 2)
  })
  it('lays out the 8A8 fixture centered with 5/3 baseline spacing', () => {
    const layout = layoutMText({
      data: makeData({
        text: '{\\pxqc;\\T1.1;左视图}{\\T1.1;\\P}{\\pxqc;\\T1.1;（2:1）}',
        height: 4,
        width: 18.08,
        attachmentPoint: 5
      }),
      measure
    })

    // The single `\P` splits into two lines; both stay inside the 18.08
    // column, centered by their `\pxqc;` justification.
    expect(layout.lines.map(line => line.text)).toEqual(['左视图', '（2:1）'])
    const step = (5 / 3) * 4
    expect(layout.lines[0].dy - layout.lines[1].dy).toBeCloseTo(step)
    // MiddleCenter pins the frame at [-9.04, 9.04]; 左视图 (12 × 1.1)
    // centers inside it.
    expect(layout.lines[0].dx).toBeCloseTo(-18.08 / 2 + (18.08 - 13.2) / 2)
    expect(layout.lines[0].width).toBeCloseTo(13.2)
    // CJK chars wrap per char, so each glyph is its own run carrying the
    // `\T1.1` tracking and entity size.
    for (const run of layout.lines[0].runs) {
      expect(run.tracking).toBeCloseTo(1.1)
      expect(run.size).toBe(4)
    }
    expect(layout.lines[0].runs[0].width).toBeCloseTo(4 * 1.1)
  })

  it('positions stacked fraction runs and the rule per mtext-renderer', () => {
    const layout = layoutMText({
      data: makeData({ text: '\\S1/2;', height: 4 }),
      measure
    })
    const runs = layout.lines[0].runs
    // Numerator: full size, raised; denominator below the baseline; rule
    // spans the stacked advance. fs = D = 4.
    expect(runs[0].text).toBe('1')
    expect(runs[0].dy).toBeCloseTo(-0.7 * 4 + 1.3 * 4)
    expect(runs[1].text).toBe('2')
    expect(runs[1].dy).toBeCloseTo(-1.6 * 4 + 1.3 * 4)
    expect(runs[2].bar?.dy).toBeCloseTo(-0.8 * 4 + 0.3 * 4)
    expect(runs[2].bar?.dx1).toBeCloseTo(2)
  })

  it('scales tolerance stacks to 0.7 without a rule', () => {
    const layout = layoutMText({
      data: makeData({ text: '\\S+0.1^-0.1;', height: 4 }),
      measure
    })
    const runs = layout.lines[0].runs.filter(run => run.text !== '')
    for (const run of runs) {
      expect(run.size).toBeCloseTo(0.7 * 4)
      expect(run.bar).toBeUndefined()
    }
    expect(runs[0].dy).toBeCloseTo(-0.6 * 4 + 1.3 * 4)
    expect(runs[1].dy).toBeCloseTo(-1.3 * 4 + 1.3 * 4)
  })

  it('honors the line space factor on baseline advances', () => {
    const layout = layoutMText({
      data: makeData({ text: 'a\\Pb', height: 4, lineSpaceFactor: 1.5 }),
      measure
    })
    expect(layout.lines[0].dy - layout.lines[1].dy).toBeCloseTo(1.5 * (5 / 3) * 4)
  })

  it('keeps attachment frame anchoring under paragraph justification', () => {
    const layout = layoutMText({
      data: makeData({
        text: '\\pxql;ab',
        height: 4,
        width: 100,
        attachmentPoint: 5
      }),
      measure
    })
    // MiddleCenter pins the 100-wide frame at [-50, 50]; `\pxql` only
    // left-aligns the line inside the frame, so it starts at the frame
    // origin -50 rather than the anchor.
    expect(layout.lines[0].dx).toBeCloseTo(-50)
  })

  it('draws decoration rules with run text and width', () => {
    const layout = layoutMText({
      data: makeData({ text: '\\Lab\\lc', height: 4 }),
      measure
    })
    const runs = layout.lines[0].runs
    expect(runs[0].underline).toBe(true)
    // 'ab' = 2 latin glyphs × 0.5em × size 4.
    expect(runs[0].width).toBeCloseTo(4)
    expect(runs[1].underline).toBeUndefined()
  })
})
