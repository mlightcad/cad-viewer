import {
  arePdfTextLinesAdjacent,
  mergePdfTextLines
} from '../src/recognition/pdfTextMerge'
import { textLine } from './helpers/pdfTextLines'

describe('mergePdfTextLines', () => {
  it('joins single characters on one baseline into one line', () => {
    const result = mergePdfTextLines([
      { line: textLine('b', 0.8, 0, 1, Math.PI / 2), text: 'B' },
      { line: textLine('a', 0, 0), text: 'A' },
      { line: textLine('c', 1.6, 0), text: 'C' }
    ])
    expect(result.text).toBe('ABC')
    expect(result.paragraphs).toHaveLength(1)
    expect(result.line.glyphs).toHaveLength(3)
    expect(result.line.position.x).toBeCloseTo(0)
    expect(result.line.position.y).toBeCloseTo(0)
    expect(result.line.width).toBeCloseTo(2.2)
    expect(result.line.height).toBeCloseTo(1)
    expect(result.lineSpacing).toBe(0)
  })

  it('puts a space between words but not between CJK characters', () => {
    const words = mergePdfTextLines([
      { line: textLine('a', 0, 0, 2), text: 'AB' },
      { line: textLine('c', 3, 0, 2), text: 'CD' }
    ])
    expect(words.text).toBe('AB CD')

    const cjk = mergePdfTextLines([
      { line: textLine('a', 0, 0), text: '设' },
      { line: textLine('b', 2, 0), text: '计' }
    ])
    expect(cjk.text).toBe('设计')
  })

  it('stacks lines on different baselines as paragraphs, top first', () => {
    const result = mergePdfTextLines([
      { line: textLine('l', 0, -2, 3), text: 'LOW' },
      { line: textLine('u', 0, 0, 2), text: 'UP' }
    ])
    expect(result.text).toBe('UP\nLOW')
    expect(result.paragraphs.map(item => item.text)).toEqual(['UP', 'LOW'])
    expect(result.lineSpacing).toBeCloseTo(2)
    // Positioned at the baseline of the first (top) line.
    expect(result.line.position.y).toBeCloseTo(0)
  })
})

describe('arePdfTextLinesAdjacent', () => {
  it('links neighbours on one baseline and rejects distant or stacked ones', () => {
    const a = textLine('a', 0, 0, 3)
    expect(arePdfTextLinesAdjacent(a, textLine('b', 2.6, 0))).toBe(true)
    expect(arePdfTextLinesAdjacent(a, textLine('c', 6, 0))).toBe(false)
    expect(arePdfTextLinesAdjacent(a, textLine('d', 0, -2, 3))).toBe(false)
    // Lines in different directions are different texts.
    expect(
      arePdfTextLinesAdjacent(a, textLine('e', 2.6, 0, 3, Math.PI / 2))
    ).toBe(false)
  })
})
