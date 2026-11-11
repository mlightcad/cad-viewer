import {
  AcDbDatabase,
  AcDbMText,
  AcDbText,
  AcGiMTextAttachmentPoint
} from '@mlightcad/data-model'

import { AcApPdfTextSession, type PdfTextRow } from '../src/AcApPdfTextSession'
import { PDF_SHX_TEXT_STYLE } from '../src/pdfImportEntities'
import type { PdfTextFontKind } from '../src/recognition/pdfTextFontKind'
import { textLine } from './helpers/pdfTextLines'

const fontKind = (font: string): PdfTextFontKind | undefined =>
  font.toLowerCase() === 'simkai' ? 'mesh' : 'shx'

function row(
  id: string,
  x: number,
  y: number,
  text: string,
  options: Partial<PdfTextRow<string>> & { count?: number } = {}
): PdfTextRow<string> {
  const { count = [...text.replace(/\s/g, '')].length || 1, ...rest } = options
  return {
    line: textLine(id, x, y, count),
    kind: 'shx',
    text,
    source: 'ocr',
    included: !!text,
    ...rest
  }
}

function session(rows: PdfTextRow<string>[]) {
  return new AcApPdfTextSession({ db: new AcDbDatabase(), fontKind, rows })
}

describe('AcApPdfTextSession merging', () => {
  it('merges selected rows into one MTEXT row and splits them back', () => {
    const s = session([
      row('x', 0, 5, 'OTHER'),
      row('a', 0, 0, 'A'),
      row('b', 0.8, 0, 'B'),
      row('c', 1.6, 0, 'C')
    ])
    expect(s.merge([3, 1, 2])).toBe(1)
    expect(s.rows).toHaveLength(2)
    const merged = s.rows[1]
    expect(merged.text).toBe('ABC')
    expect(merged.merge?.parts.map(part => part.text)).toEqual(['A', 'B', 'C'])
    expect(merged.line.strokes).toHaveLength(3)

    const entity = s.createEntity(merged)
    expect(entity).toBeInstanceOf(AcDbMText)
    const mtext = entity as AcDbMText
    expect(mtext.contents).toBe('ABC')
    expect(mtext.styleName).toBe(PDF_SHX_TEXT_STYLE)
    expect(mtext.height).toBeCloseTo(1)
    // Bottom-left at the ink bottom of the (last) line, like a TEXT at its
    // baseline: the viewer anchors MTEXT on the drawn glyphs.
    expect(mtext.attachmentPoint).toBe(AcGiMTextAttachmentPoint.BottomLeft)
    expect(mtext.location.x).toBeCloseTo(0)
    expect(mtext.location.y).toBeCloseTo(0)
    expect(mtext.width).toBe(0)
    // Rows that were not merged stay TEXT.
    expect(s.createEntity(s.rows[0])).toBeInstanceOf(AcDbText)

    expect(s.split(1)).toEqual([1, 2, 3])
    expect(s.rows.map(item => item.text)).toEqual(['OTHER', 'A', 'B', 'C'])
  })

  it('writes stacked lines as paragraphs with their measured spacing', () => {
    const s = session([row('u', 0, 0, 'UP'), row('l', 0, -2, 'LO{W}')])
    s.merge([0, 1])
    const merged = s.rows[0]
    expect(merged.text).toBe('UP\nLO{W}')
    s.setSize('shx', { autoWidth: false, widthFactor: 0.8 })
    const mtext = s.createEntity(merged) as AcDbMText
    expect(mtext.contents).toBe('{\\W0.8;UP}\\P{\\W0.8;LO\\{W\\}}')
    expect(mtext.lineSpacingStyle).toBe(2)
    // Baselines 2 apart at height 1: 2 / (5/3).
    expect(mtext.lineSpacingFactor).toBeCloseTo(1.2)
  })

  it('fits each paragraph width with \\W when auto-fit is on', () => {
    const s = session([row('a', 0, 0, 'AB'), row('b', 0, -2, 'CD')])
    s.merge([0, 1])
    // Natural width 0.7 for lines 1.4 wide: factor 2.
    const mtext = s.createEntity(s.rows[0], () => 0.7) as AcDbMText
    expect(mtext.contents).toBe('{\\W2;AB}\\P{\\W2;CD}')
  })

  it('merges adjacent characters on a baseline automatically', () => {
    const s = session([
      row('a', 0, 0, 'A'),
      row('b', 0.8, 0, 'B'),
      row('c', 1.6, 0, 'C'),
      row('far', 20, 0, 'FAR'),
      row('d', 0, -3, 'D'),
      row('e', 0.8, -3, 'E')
    ])
    expect(s.mergeAdjacent()).toBe(2)
    expect(s.rows.map(item => item.text).sort()).toEqual(['ABC', 'DE', 'FAR'])
    expect(s.rows.filter(item => item.merge)).toHaveLength(2)
  })

  it('keeps unread parts visible and fills merged rows from glyphs', () => {
    const s = session([
      row('a', 0, 0, 'A'),
      row('b', 0.8, 0, '', { source: 'unread', count: 1 })
    ])
    s.merge([0, 1])
    const merged = s.rows[0]
    expect(merged).toMatchObject({ text: 'A', source: 'unread' })
    // Partial text of an unread merge is replaced once glyphs read it all.
    expect(s.fillUnread(() => undefined)).toEqual([])
    expect(s.rows[0].text).toBe('A')
    expect(s.fillUnread(() => 'AB')).toEqual([0])
    expect(s.rows[0]).toMatchObject({ text: 'AB', source: 'dictionary' })

    s.setText(0, 'AC')
    expect(s.learnable).toEqual([{ line: merged.line, text: 'AC' }])
  })

  it('learns a merged block of several lines only through unchanged parts', () => {
    const s = session([
      row('u', 0, 0, 'UP', { source: 'typed' }),
      row('l', 0, -2, 'LOW')
    ])
    s.merge([0, 1])
    const merged = s.rows[0]
    expect(merged.source).toBe('typed')
    expect(s.learnable.map(item => item.text)).toEqual(['UP'])
    s.setText(0, 'UP\nLAW')
    expect(s.learnable).toEqual([])
  })

  it('merging a merged row merges its parts', () => {
    const s = session([
      row('a', 0, 0, 'A'),
      row('b', 0.8, 0, 'B'),
      row('c', 1.6, 0, 'C')
    ])
    s.merge([0, 1])
    s.merge([0, 1])
    expect(s.rows).toHaveLength(1)
    expect(s.rows[0].text).toBe('ABC')
    expect(s.rows[0].merge?.parts).toHaveLength(3)
  })
})
