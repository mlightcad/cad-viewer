/**
 * Headless PDF export must omit no-plot layers by default so output matches
 * cad-editor (AcApDocManager sets drawNoPlotLayers: false on open).
 */
jest.mock('../src/nodeFontLoader', () => ({
  setupExportTextRendering: jest.fn(async () => ({
    loader: {},
    find: async () => undefined
  })),
  preloadDrawingFonts: jest.fn(async () => undefined),
  createNodeTextFontResolver: jest.fn(() => async () => undefined)
}))

jest.mock('@mlightcad/cad-pdf-core', () => ({
  acexPdfResolveExportOptions: jest.fn((options: object) => ({
    modelSpaceFit: 'extents',
    exportLayouts: true,
    textMode: 'text',
    colorMode: 'color',
    ...options
  })),
  acexPdfExportDatabase: jest.fn(async (database: { drawNoPlotLayers: boolean }) => {
    observedDuringExport = database.drawNoPlotLayers
    return new Uint8Array([1, 2, 3])
  })
}))

let observedDuringExport: boolean | undefined

describe('convertDatabaseToPdf drawNoPlotLayers', () => {
  beforeEach(() => {
    observedDuringExport = undefined
  })

  it('defaults to omitting no-plot layers during export', async () => {
    const { AcDbDatabase, acdbHostApplicationServices } = await import(
      '@mlightcad/data-model'
    )
    const { convertDatabaseToPdf } = await import('../src/convertDatabase')

    const database = new AcDbDatabase()
    ;(database as unknown as { _drawNoPlotLayers: boolean })._drawNoPlotLayers =
      true
    acdbHostApplicationServices().workingDatabase = database

    await convertDatabaseToPdf(database)

    expect(observedDuringExport).toBe(false)
    expect(database.drawNoPlotLayers).toBe(true)
  })

  it('keeps no-plot layers when drawNoPlotLayers is true', async () => {
    const { AcDbDatabase, acdbHostApplicationServices } = await import(
      '@mlightcad/data-model'
    )
    const { convertDatabaseToPdf } = await import('../src/convertDatabase')

    const database = new AcDbDatabase()
    ;(database as unknown as { _drawNoPlotLayers: boolean })._drawNoPlotLayers =
      false
    acdbHostApplicationServices().workingDatabase = database

    await convertDatabaseToPdf(database, { drawNoPlotLayers: true })

    expect(observedDuringExport).toBe(true)
    expect(database.drawNoPlotLayers).toBe(false)
  })
})
