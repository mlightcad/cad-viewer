/**
 * @jest-environment jsdom
 */
jest.mock('@mlightcad/cad-simple-viewer', () => {
  const dim = jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/AcApDimBlockUtil'
  )
  const preview = jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/dimStylePreview'
  )
  const render = jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/acedRenderDimStylePreview'
  )
  return {
    ...dim,
    ...preview,
    ...render,
    acedApplyUiTheme: jest.fn(),
    acedSubscribeUiTheme: () => () => {},
    resolveUiTheme: () => 'light'
  }
})
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key
}))

import {
  AcDbDatabase,
  AcDbDimStyleTableRecord,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { AcApPdfDimSession } from '../src/AcApPdfDimSession'
import type { PdfDimensionCandidate } from '../src/recognition/pdfDimensionPattern'
import {
  AcUiPdfDimPanel,
  type AcUiPdfDimPanelOptions
} from '../src/ui/AcUiPdfDimPanel'

function candidate(text: string): PdfDimensionCandidate<string> {
  return {
    kind: 'linear',
    xLine1: { x: 0, y: 10 },
    xLine2: { x: 55, y: 10 },
    dimLinePoint: { x: 0, y: 0 },
    rotation: 0,
    measured: 55,
    text: { id: 't', text, center: { x: 27, y: 1 }, height: 2.5 },
    arrowSize: 2.5,
    extensionBeyond: 1,
    ticks: false,
    arrowsOut: false,
    consumed: ['a0', 'a1', 't']
  }
}

function mount(overrides: Partial<AcUiPdfDimPanelOptions<string>> = {}) {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  const existing = new AcDbDimStyleTableRecord()
  existing.name = 'ISO-25'
  db.tables.dimStyleTable.add(existing)
  const session = new AcApPdfDimSession({
    db,
    candidates: [candidate('55'), candidate('70')]
  })
  const options: AcUiPdfDimPanelOptions<string> = {
    session,
    onChange: jest.fn(),
    onFocusRow: jest.fn(),
    onHideStrokes: jest.fn(),
    onClose: jest.fn(),
    ...overrides
  }
  const panel = new AcUiPdfDimPanel(options)
  document.body.append(panel.element)
  return { panel, session, options, root: panel.element }
}

describe('AcUiPdfDimPanel', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  test('lists dimension texts for editing and Apply', () => {
    const { root, session, options } = mount()
    const inputs = [
      ...root.querySelectorAll<HTMLInputElement>('input.ml-pdfdim-text')
    ]
    expect(inputs).toHaveLength(2)
    expect(inputs[0].value).toBe('55')
    inputs[0].value = '56'
    inputs[0].dispatchEvent(new Event('input'))
    expect(session.rows[0].text).toBe('56')
    expect(options.onChange).toHaveBeenCalled()

    const apply = [...root.querySelectorAll('button')].find(
      b => b.textContent === 'jig.pdfdim.panel.apply'
    )
    expect(apply).toBeTruthy()
    apply!.click()
    expect(options.onClose).toHaveBeenCalledWith(true)
  })

  test('offers existing dim styles and a create-new option', () => {
    const { root, session } = mount()
    const select = root.querySelector<HTMLSelectElement>(
      'select.ml-pdfdim-input'
    )!
    const values = [...select.options].map(o => o.value)
    expect(values).toEqual(
      expect.arrayContaining(['ISO-25', 'Standard', 'PDF_DIM'])
    )
    select.value = '\u0000new'
    select.dispatchEvent(new Event('change'))
    const name = root.querySelector<HTMLInputElement>(
      '.ml-pdfdim-naming input'
    )!
    name.value = 'Mine'
    const create = [...root.querySelectorAll('button')].find(
      b => b.textContent === 'jig.pdfdim.panel.createStyle'
    )!
    create.click()
    expect(session.styleName).toBe('Mine')
    expect(session.isNewStyle).toBe(true)
  })
})
