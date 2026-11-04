const mockAcapRunDatabaseEdit = jest.fn(
  (
    db: { runDatabaseEdit: (label: string, fn: () => void) => void },
    label: string,
    fn: () => void
  ) => db.runDatabaseEdit(label, fn)
)

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: { instance: undefined },
  AcApSettingManager: { instance: { fontMapping: {} } },
  AcApFontUtil: {
    findFontInfoByName: () => undefined,
    getReplacementFontName: () => undefined,
    getCachedMeshFontProgram: async () => undefined,
    persistMeshFontProgram: async () => undefined
  },
  acapRunDatabaseEdit: mockAcapRunDatabaseEdit
}))

jest.mock('@mlightcad/cad-pdf-core', () => ({
  acexPdfExportDatabase: jest.fn(async () => new Uint8Array([37, 80, 68, 70]))
}))

jest.mock('@mlightcad/cad-html-plugin', () => ({
  AcApHtmlConvertor: jest.fn().mockImplementation(() => ({
    exportToResult: jest.fn(async () => ({
      fileName: 'drawing.html',
      bytes: new TextEncoder().encode('<html></html>'),
      mediaType: 'text/html;charset=utf-8'
    }))
  }))
}))

jest.mock('../src/preview/captureDrawingPreview', () => ({
  captureDrawingPreview: jest.fn(async () => ({
    ok: true,
    dataUrl: 'data:image/png;base64,viewer'
  })),
  waitForDrawingSceneReady: jest.fn(async () => true)
}))

jest.mock('../src/export/exportDrawingPdf', () => ({
  exportDrawingPdf: jest.fn(async () => new Uint8Array([37, 80, 68, 70]))
}))

jest.mock('../src/export/exportDrawingHtml', () => ({
  exportDrawingHtml: jest.fn(async () => ({
    fileName: 'drawing.html',
    bytes: new TextEncoder().encode('<html></html>'),
    mediaType: 'text/html;charset=utf-8'
  }))
}))

import { AcDbDatabase } from '@mlightcad/data-model'

import { AcEdOpenMode } from '../../cad-simple-viewer/src/editor/view/AcEdOpenMode'
import {
  CadActionExecutor,
  type CadSession,
  CadSessionOpenMode,
  createCadToolCatalog,
  createDatabaseSession,
  createDocManagerSession,
  executeCadScript
} from '../src'
import { exportDrawingHtml } from '../src/export/exportDrawingHtml'
import { exportDrawingPdf } from '../src/export/exportDrawingPdf'
import { captureDrawingPreview } from '../src/preview/captureDrawingPreview'
import { withViewerDefaults } from '../src/session/withViewerDefaults'

const DRAW_AND_CAPTURE = `
  cad.edit.transaction('agent draw', tx => {
    tx.drawLine({ start: { x: 0, y: 0 }, end: { x: 1, y: 1 } })
  })
  cad.view.capturePreview({ longSide: 256 })
`

/** A session without hook keys, like a hand-written one in a viewer app. */
function plainSession(db: AcDbDatabase): CadSession {
  const { getDocument, getView } = createDatabaseSession(db)
  return { getDocument, getView }
}

beforeEach(() => {
  mockAcapRunDatabaseEdit.mockClear()
  ;(captureDrawingPreview as jest.Mock).mockClear()
  ;(exportDrawingPdf as jest.Mock).mockClear()
  ;(exportDrawingHtml as jest.Mock).mockClear()
})

describe('viewer bindings', () => {
  test('CadSessionOpenMode matches AcEdOpenMode', () => {
    expect(CadSessionOpenMode).toEqual({
      Read: AcEdOpenMode.Read,
      Review: AcEdOpenMode.Review,
      Write: AcEdOpenMode.Write
    })
  })

  test('the doc-manager session wires viewer edit and preview hooks', () => {
    const session = createDocManagerSession()
    expect(session.getDocument()).toBeUndefined()
    expect(typeof session.runEdit).toBe('function')
    expect(typeof session.capturePreview).toBe('function')
  })

  test('executeCadScript gives a plain session the viewer hooks', async () => {
    const db = new AcDbDatabase()
    const result = await executeCadScript(
      { code: DRAW_AND_CAPTURE },
      plainSession(db)
    )

    expect(result.success).toBe(true)
    expect(mockAcapRunDatabaseEdit).toHaveBeenCalledTimes(1)
    expect(mockAcapRunDatabaseEdit.mock.calls[0][0]).toBe(db)
    expect(mockAcapRunDatabaseEdit.mock.calls[0][1]).toBe('agent draw')
    expect(captureDrawingPreview).toHaveBeenCalledWith(256)
    expect(result.images).toEqual([
      { mediaType: 'image/png', dataUrl: 'data:image/png;base64,viewer' }
    ])
  })

  test('hooks supplied by the session take precedence', async () => {
    const db = new AcDbDatabase()
    const runEdit = jest.fn(
      (database: AcDbDatabase, label: string, fn: () => void) =>
        database.runDatabaseEdit(label, fn)
    )
    const capturePreview = jest.fn(async () => ({
      ok: true as const,
      dataUrl: 'data:image/png;base64,custom'
    }))
    const session = { ...createDatabaseSession(db), runEdit, capturePreview }

    const result = await executeCadScript({ code: DRAW_AND_CAPTURE }, session)

    expect(result.success).toBe(true)
    expect(runEdit).toHaveBeenCalledTimes(1)
    expect(mockAcapRunDatabaseEdit).not.toHaveBeenCalled()
    expect(capturePreview).toHaveBeenCalledWith(256)
    expect(captureDrawingPreview).not.toHaveBeenCalled()
  })

  test('catalog and executor keep previews and viewer edits', async () => {
    const db = new AcDbDatabase()
    const session = plainSession(db)

    const [tool] = createCadToolCatalog(session)
    expect(tool.description).not.toContain('DISABLED')
    const result = await tool.execute({ code: DRAW_AND_CAPTURE })
    expect(result.images).toHaveLength(1)

    mockAcapRunDatabaseEdit.mockClear()
    const drawn = new CadActionExecutor(session).drawCircle({
      center: { x: 0, y: 0 },
      radius: 1
    })
    expect(drawn.success).toBe(true)
    expect(mockAcapRunDatabaseEdit).toHaveBeenCalledTimes(1)
  })

  test('a database session keeps its own hooks', async () => {
    const db = new AcDbDatabase()
    const session = createDatabaseSession(db)

    const [tool] = createCadToolCatalog(session)
    expect(tool.description).toContain('This session has no')

    const result = await executeCadScript({ code: DRAW_AND_CAPTURE }, session)
    expect(result.success).toBe(true)
    expect(result.images).toBeUndefined()
    expect(mockAcapRunDatabaseEdit).not.toHaveBeenCalled()
    expect(captureDrawingPreview).not.toHaveBeenCalled()

    new CadActionExecutor(session).drawCircle({
      center: { x: 0, y: 0 },
      radius: 1
    })
    expect(mockAcapRunDatabaseEdit).not.toHaveBeenCalled()
  })

  test('withViewerDefaults attaches exportPdf and exportHtml when absent', () => {
    const db = new AcDbDatabase()
    const session = withViewerDefaults(plainSession(db))
    expect(typeof session.exportPdf).toBe('function')
    expect(typeof session.exportHtml).toBe('function')
  })

  test('createDatabaseSession opts out of viewer exporters', () => {
    const db = new AcDbDatabase()
    const session = withViewerDefaults(createDatabaseSession(db))
    expect(session.exportPdf).toBeUndefined()
    expect(session.exportHtml).toBeUndefined()
  })
})
