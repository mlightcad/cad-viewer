import { AcDbDatabase, AcDbTextStyleTableRecord } from '@mlightcad/data-model'

import {
  AcApPdfTextSession,
  PDF_MESH_TEXT_STYLE,
  type PdfTextRow
} from '../src/AcApPdfTextSession'
import { PDF_SHX_TEXT_STYLE } from '../src/pdfImportEntities'
import type { PdfTextLineCandidate } from '../src/recognition/pdfGlyphClustering'
import type { PdfTextFontKind } from '../src/recognition/pdfTextFontKind'

const SHX_FONTS = new Set(['txt', 'gbcbig', 'romans', 'hztxt'])
const fontKind = (font: string): PdfTextFontKind | undefined => {
  const name = font.toLowerCase()
  if (SHX_FONTS.has(name)) return 'shx'
  if (name === 'simsun' || name === 'simkai' || name === 'arial') return 'mesh'
  return undefined
}

function line(x: number, width = 10, height = 2): PdfTextLineCandidate<string> {
  return {
    strokes: [{ id: `s${x}`, points: [{ x, y: 0 }] }],
    glyphs: [],
    rotation: 0,
    position: { x, y: 0 },
    height,
    width
  }
}

function row(
  kind: PdfTextFontKind,
  text = 'AB',
  source: PdfTextRow<string>['source'] = 'ocr',
  x = 0
): PdfTextRow<string> {
  return { line: line(x), kind, text, source, included: !!text }
}

function addStyle(db: AcDbDatabase, name: string, font: string, bigFont = '') {
  db.tables.textStyleTable.add(
    new AcDbTextStyleTableRecord({
      name,
      standardFlag: 0,
      fixedTextHeight: 0,
      widthFactor: 1,
      obliqueAngle: 0,
      textGenerationFlag: 0,
      lastHeight: 2.5,
      font,
      bigFont
    })
  )
}

describe('AcApPdfTextSession', () => {
  it('suggests an SHX style for SHX lines and keeps a TrueType current style', () => {
    const db = new AcDbDatabase()
    // The default Standard style uses SimKai, a TrueType face.
    const session = new AcApPdfTextSession({
      db,
      fontKind,
      rows: [row('shx'), row('mesh', 'CD', 'ocr', 20)]
    })
    expect(session.kinds).toEqual(['shx', 'mesh'])
    expect(session.choice('shx')).toMatchObject({
      styleName: PDF_SHX_TEXT_STYLE,
      isNew: true,
      font: 'txt',
      bigFont: 'gbcbig'
    })
    expect(session.choice('mesh')).toMatchObject({
      styleName: db.textstyle,
      isNew: false
    })
    expect(PDF_MESH_TEXT_STYLE).toBe('PDF_simsun')
  })

  it('creates the chosen styles for the preview and removes them on cancel', () => {
    const db = new AcDbDatabase()
    const session = new AcApPdfTextSession({ db, fontKind, rows: [row('shx')] })
    const fonts = session.syncStyles()
    expect(fonts).toEqual(['txt', 'gbcbig'])
    const record = db.tables.textStyleTable.getAt(PDF_SHX_TEXT_STYLE)
    expect(record?.fileName).toBe('txt')
    expect(record?.bigFontFileName).toBe('gbcbig')

    session.restoreStyles()
    expect(db.tables.textStyleTable.has(PDF_SHX_TEXT_STYLE)).toBe(false)
  })

  it('validates new style names', () => {
    const db = new AcDbDatabase()
    addStyle(db, 'Notes', 'romans')
    const session = new AcApPdfTextSession({ db, fontKind, rows: [row('shx')] })
    expect(session.newStyle('shx', '  ')).toBe('empty')
    expect(session.newStyle('shx', 'a/b')).toBe('invalid')
    expect(session.newStyle('shx', 'notes')).toBe('exists')
    expect(session.newStyle('shx', 'Recovered')).toBeUndefined()
    expect(session.choice('shx')).toMatchObject({
      styleName: 'Recovered',
      isNew: true
    })
    session.syncStyles()
    expect(db.tables.textStyleTable.getAt('Recovered')?.fileName).toBe('txt')
    // Renaming the new style replaces the record created for the preview.
    session.newStyle('shx', 'Recovered2')
    session.syncStyles()
    expect(db.tables.textStyleTable.has('Recovered')).toBe(false)
    expect(db.tables.textStyleTable.has('Recovered2')).toBe(true)
  })

  it('restores the fonts of an existing style changed for the preview', () => {
    const db = new AcDbDatabase()
    addStyle(db, 'Notes', 'romans', 'hztxt')
    const session = new AcApPdfTextSession({ db, fontKind, rows: [row('shx')] })
    session.selectStyle('shx', 'Notes')
    expect(session.choice('shx')).toMatchObject({
      font: 'romans',
      bigFont: 'hztxt',
      isNew: false
    })
    expect(session.changesExistingStyle('shx')).toBe(false)

    session.setFont('shx', 'txt')
    expect(session.changesExistingStyle('shx')).toBe(true)
    session.syncStyles()
    expect(db.tables.textStyleTable.getAt('Notes')?.fileName).toBe('txt')

    session.restoreStyles()
    const notes = db.tables.textStyleTable.getAt('Notes')
    expect(notes?.fileName).toBe('romans')
    expect(notes?.bigFontFileName).toBe('hztxt')
  })

  it('edits styles inside a command transaction (records opened for write)', () => {
    const db = new AcDbDatabase()
    addStyle(db, 'Notes', 'romans', 'hztxt')
    // Commands run inside a recording transaction, where database records
    // may only change once opened for write.
    db.transactionManager.startTransaction()
    try {
      const session = new AcApPdfTextSession({
        db,
        fontKind,
        rows: [row('shx')]
      })
      session.syncStyles()
      expect(
        db.tables.textStyleTable.getAt(PDF_SHX_TEXT_STYLE)?.bigFontFileName
      ).toBe('gbcbig')

      session.setFont('shx', 'romans')
      session.syncStyles()
      expect(db.tables.textStyleTable.getAt(PDF_SHX_TEXT_STYLE)?.fileName).toBe(
        'romans'
      )

      session.selectStyle('shx', 'Notes')
      session.setFont('shx', 'txt')
      session.syncStyles()
      expect(db.tables.textStyleTable.getAt('Notes')?.fileName).toBe('txt')

      session.restoreStyles()
      expect(db.tables.textStyleTable.getAt('Notes')?.fileName).toBe('romans')
      expect(db.tables.textStyleTable.has(PDF_SHX_TEXT_STYLE)).toBe(false)
    } finally {
      db.transactionManager.commitTransaction()
    }
  })

  it('drops the big font when a TrueType font is chosen', () => {
    const db = new AcDbDatabase()
    const session = new AcApPdfTextSession({ db, fontKind, rows: [row('shx')] })
    session.setFont('shx', 'arial')
    expect(session.choice('shx').bigFont).toBe('')
  })

  it('applies height scale and fits the width factor', () => {
    const db = new AcDbDatabase()
    const target = row('shx')
    const session = new AcApPdfTextSession({ db, fontKind, rows: [target] })
    session.setSize('shx', { heightScale: 1.5 })
    // Natural width 5 for a line 10 wide: width factor 2.
    const measure = jest.fn(() => 5)
    const text = session.createText(target, measure)
    expect(text.height).toBeCloseTo(3)
    expect(text.widthFactor).toBeCloseTo(2)
    expect(text.styleName).toBe(PDF_SHX_TEXT_STYLE)
    expect(measure).toHaveBeenCalledWith('AB', 'txt', 3, 'gbcbig')

    session.setSize('shx', { autoWidth: false, widthFactor: 0.8 })
    expect(session.createText(target, measure).widthFactor).toBeCloseTo(0.8)
  })

  it('tracks typed lines, skipped lines and fills unread ones', () => {
    const db = new AcDbDatabase()
    const session = new AcApPdfTextSession({
      db,
      fontKind,
      rows: [
        row('shx', '', 'unread', 0),
        row('shx', '', 'unread', 20),
        row('shx', 'OK', 'ocr', 40)
      ]
    })
    expect(session.readyRows).toHaveLength(1)

    session.setText(0, 'AB')
    expect(session.rows[0]).toMatchObject({ source: 'typed', included: true })
    const filled = session.fillUnread(candidate =>
      candidate.position.x === 20 ? 'ABAB' : undefined
    )
    expect(filled).toEqual([1])
    expect(session.rows[1]).toMatchObject({
      text: 'ABAB',
      source: 'dictionary',
      included: true
    })

    session.setIncluded(2, false)
    expect(session.readyRows.map(item => item.text)).toEqual(['AB', 'ABAB'])
    expect(session.typedRows.map(item => item.text)).toEqual(['AB'])

    session.setKind(1, 'mesh')
    expect(session.kinds).toEqual(['shx', 'mesh'])
  })
})
