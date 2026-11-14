/**
 * @jest-environment jsdom
 */
const notify = jest.fn()
const paletteOpen = jest.fn()

jest.mock('@mlightcad/cad-simple-viewer', () => {
  const dim = jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/AcApDimBlockUtil'
  )
  class AcEdCommand {
    mode = 0
    notify = notify
  }
  return {
    ...dim,
    AcApI18n: { t: (key: string) => key },
    AcApPaletteService: { open: paletteOpen },
    acapZoomToVisible: jest.fn(),
    AcEdCommand,
    AcEdOpenMode: { Write: 2 },
    resolveSelectedEntities: async (context: {
      selection: Map<string, unknown>
    }) => ({
      ids: [...context.selection.keys()],
      entities: [...context.selection.values()]
    })
  }
})
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string) => key
}))
jest.mock('../src/pdfDimStrokeTexts', () => ({
  acapPdfPrepareDimStrokeTexts: () => {}
}))
jest.mock('../src/recognition/pdfDimensionPattern', () => {
  const actual = jest.requireActual('../src/recognition/pdfDimensionPattern')
  return {
    ...actual,
    recognizePdfDimensions: jest.fn()
  }
})

type PanelOptions =
  import('../src/ui/AcUiPdfDimPanel').AcUiPdfDimPanelOptions<string>

/** Captures the panel the command opens, so tests can drive it. */
const panels: Array<{ options: PanelOptions }> = []
jest.mock('../src/ui/AcUiPdfDimPanel', () => ({
  AcUiPdfDimPanel: class {
    element = document.createElement('div')
    constructor(public options: never) {
      panels.push(this as never)
    }
    selectFirst() {}
    destroy() {}
  }
}))

import {
  AcDbDatabase,
  AcDbLine,
  AcDbText,
  type AcDbEntity,
  acdbHostApplicationServices,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApPdfDimCmd } from '../src/AcApPdfDimCmd'
import { PDF_DIM_STYLE } from '../src/pdfDimensionConvert'
import {
  recognizePdfDimensions,
  type PdfDimensionCandidate
} from '../src/recognition/pdfDimensionPattern'

const recognize = recognizePdfDimensions as jest.MockedFunction<
  typeof recognizePdfDimensions
>

function linear(text: string): PdfDimensionCandidate<string> {
  return {
    kind: 'linear',
    xLine1: { x: 0, y: 10 },
    xLine2: { x: 55, y: 10 },
    dimLinePoint: { x: 0, y: 0 },
    rotation: 0,
    measured: 55,
    text: { id: 't', text, center: { x: 27.5, y: 1 }, height: 2.5 },
    arrowSize: 2.5,
    extensionBeyond: 1,
    ticks: false,
    arrowsOut: false,
    consumed: ['a0', 'a1', 'dim', 'ext0', 'ext1', 't']
  }
}

/** Palette handle mock: records close, lets the test close it as the user. */
function mockPalette() {
  const closedListeners: Array<() => void> = []
  const handle = {
    close: jest.fn(() => {
      closedListeners.splice(0).forEach(listener => listener())
    }),
    onClosed: (listener: () => void) => closedListeners.push(listener),
    coveredInsets: () => undefined
  }
  paletteOpen.mockReturnValue(handle)
  return handle
}

/** Lets the command reach `await result` (preview debounce / panel). */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function start(selection: Map<string, AcDbEntity>) {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  const appended: AcDbEntity[] = []
  const erased: string[] = []
  const view = {
    selectionSet: { clear: jest.fn(), add: jest.fn() },
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    setEntitySceneVisible: jest.fn(),
    highlight: jest.fn(),
    unhighlight: jest.fn(),
    container: undefined,
    canvas: undefined
  }
  jest
    .spyOn(db.tables.blockTable.modelSpace, 'appendEntity')
    .mockImplementation(entities => {
      appended.push(...(Array.isArray(entities) ? entities : [entities]))
    })
  const context = {
    selection,
    view,
    doc: {
      database: db,
      entityService: { eraseEntities: (ids: string[]) => erased.push(...ids) }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = new AcApPdfDimCmd().execute(context as any)
  return { context, db, appended, erased, view, run }
}

function selectionWithText(): Map<string, AcDbEntity> {
  const selection = new Map<string, AcDbEntity>()
  selection.set(
    'dim',
    new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(55, 0, 0))
  )
  const text = new AcDbText()
  text.textString = '55'
  text.height = 2.5
  text.position = new AcGePoint3d(27, 1, 0)
  selection.set('t', text)
  for (const id of ['a0', 'a1', 'ext0', 'ext1']) {
    selection.set(
      id,
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
    )
  }
  return selection
}

describe('AcApPdfDimCmd review panel', () => {
  beforeEach(() => {
    panels.length = 0
    paletteOpen.mockReset()
    notify.mockClear()
    recognize.mockReset()
    recognize.mockReturnValue([linear('55')])
  })

  test('previews dimensions without writing dim styles until Apply', async () => {
    mockPalette()
    const { run, db, appended, erased, view } = start(selectionWithText())
    await settle()

    expect(paletteOpen).toHaveBeenCalledTimes(1)
    expect(paletteOpen.mock.calls[0][0].id).toBe('pdfdim')
    expect(view.addTransientEntity).toHaveBeenCalled()
    expect(db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)).toBeUndefined()
    expect(appended).toEqual([])
    expect(erased).toEqual([])

    const { session, onClose } = panels[0].options
    expect(session.rows).toHaveLength(1)
    onClose(true)
    await run

    expect(db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)).toBeTruthy()
    expect(appended).toHaveLength(1)
    expect(erased).toEqual(
      expect.arrayContaining(['a0', 'a1', 'dim', 'ext0', 'ext1', 't'])
    )
    expect(view.removeTransientEntity).toHaveBeenCalled()
  })

  test('changes nothing when the user closes the palette', async () => {
    const handle = mockPalette()
    const { run, db, appended, erased, view } = start(selectionWithText())
    await settle()

    expect(db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)).toBeUndefined()
    handle.close()
    await run

    expect(appended).toEqual([])
    expect(erased).toEqual([])
    expect(db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)).toBeUndefined()
    expect(view.setEntitySceneVisible).toHaveBeenLastCalledWith(
      expect.any(String),
      true
    )
    expect(notify).toHaveBeenCalledWith('jig.pdfdim.cancelled')
  })
})
