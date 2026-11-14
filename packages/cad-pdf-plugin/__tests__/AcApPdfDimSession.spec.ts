jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/AcApDimBlockUtil'
  )
)

import {
  AcDbDatabase,
  AcDbDimStyleTableRecord,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { AcApPdfDimSession } from '../src/AcApPdfDimSession'
import { PDF_DIM_STYLE } from '../src/pdfDimensionConvert'
import type { PdfDimensionCandidate } from '../src/recognition/pdfDimensionPattern'

function linear(text: string, measured = 55): PdfDimensionCandidate<string> {
  return {
    kind: 'linear',
    xLine1: { x: 0, y: 10 },
    xLine2: { x: measured, y: 10 },
    dimLinePoint: { x: 0, y: 0 },
    rotation: 0,
    measured,
    text: { id: 't', text, center: { x: measured / 2, y: 1 }, height: 2.5 },
    arrowSize: 2.5,
    extensionBeyond: 1,
    ticks: false,
    arrowsOut: false,
    consumed: ['a0', 'a1', 'dim', 'ext0', 'ext1', 't']
  }
}

function dbWithStyles(...names: string[]) {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  for (const name of names) {
    if (db.tables.dimStyleTable.getAt(name)) continue
    const style = new AcDbDimStyleTableRecord()
    style.name = name
    db.tables.dimStyleTable.add(style)
  }
  return db
}

describe('AcApPdfDimSession', () => {
  it('lists recognized dimensions with editable text', () => {
    const session = new AcApPdfDimSession({
      db: dbWithStyles(),
      candidates: [linear('55'), linear('70', 70)]
    })
    expect(session.rows).toHaveLength(2)
    expect(session.rows[0].text).toBe('55')
    session.setText(session.rows[0], '56')
    expect(session.candidatesForApply()[0].text.text).toBe('56')
    expect(session.readyRows).toHaveLength(2)
  })

  it('skips unchecked or blank rows on Apply', () => {
    const session = new AcApPdfDimSession({
      db: dbWithStyles(),
      candidates: [linear('55'), linear('70', 70)]
    })
    session.setIncluded(session.rows[0], false)
    session.setText(session.rows[1], '  ')
    expect(session.candidatesForApply()).toHaveLength(0)
  })

  it('lets the user pick an existing style or create a new one', () => {
    const db = dbWithStyles('Standard', 'ISO-25')
    const session = new AcApPdfDimSession({
      db,
      candidates: [linear('55')]
    })
    expect(session.styleName).toBe(PDF_DIM_STYLE)
    session.selectStyle('ISO-25')
    expect(session.styleName).toBe('ISO-25')
    expect(session.isNewStyle).toBe(false)

    session.beginNewStyle()
    expect(session.validateNewStyleName('')).toBe('empty')
    expect(session.validateNewStyleName('ISO-25')).toBe('exists')
    expect(session.commitNewStyleName('Mine')).toBeUndefined()
    expect(session.styleName).toBe('Mine')
    expect(session.isNewStyle).toBe(true)

    const name = session.ensureStyle()
    expect(name).toBe('Mine')
    expect(db.tables.dimStyleTable.getAt('Mine')).toBeTruthy()
    expect(db.tables.dimStyleTable.getAt('Mine')!.dimse1).toBe(0)
    expect(db.tables.dimStyleTable.getAt('Mine')!.dimse2).toBe(0)

    session.selectStyle('ISO-25')
    const before = db.tables.dimStyleTable.getAt('ISO-25')!.dimtxt
    session.ensureStyle()
    expect(db.tables.dimStyleTable.getAt('ISO-25')!.dimtxt).toBe(before)
  })

  it('preview blends recovered sizes with the selected style appearance', () => {
    const db = dbWithStyles('Standard', 'ISO-25')
    const iso = db.tables.dimStyleTable.getAt('ISO-25')!
    iso.dimclrd = 1
    iso.dimtxt = 99
    const session = new AcApPdfDimSession({
      db,
      candidates: [linear('55')]
    })
    session.selectStyle('ISO-25')
    expect(session.workingStyleName).toBe(PDF_DIM_STYLE)
    expect(session.appearanceFromStyle).toBe('ISO-25')
    const preview = session.previewStyleRecord()
    // Recovered paper size, not the table record's 99.
    expect(preview.dimtxt).toBeCloseTo(2.5, 5)
    expect(preview.dimscale).toBe(1)
    // Appearance comes from the selected style.
    expect(preview.dimclrd).toBe(1)
  })
})
