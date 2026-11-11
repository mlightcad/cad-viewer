jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual('./helpers/pdfTextCmdTestUtils').viewerMock()
)
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string, params?: Record<string, unknown>) =>
    `${key} ${JSON.stringify(params ?? {})}`
}))
jest.mock('../src/pdfEntityStrokes', () =>
  jest.requireActual('./helpers/pdfTextCmdTestUtils').strokesMock()
)
jest.mock('../src/recognition/pdfGlyphClustering', () =>
  jest.requireActual('./helpers/pdfTextCmdTestUtils').clusteringMock()
)
jest.mock('../src/recognition/pdfGlyphDictionary', () =>
  jest.requireActual('./helpers/pdfTextCmdTestUtils').dictionaryMock()
)

import { AcApPdfTextCmd } from '../src/AcApPdfTextCmd'
import { PDF_SHX_TEXT_STYLE } from '../src/pdfImportEntities'
import {
  createContext,
  learned,
  loadFonts,
  paletteOpen
} from './helpers/pdfTextCmdTestUtils'

/** Without a DOM there is no panel: what was read is converted directly. */
describe('AcApPdfTextCmd (headless)', () => {
  beforeEach(() => {
    loadFonts.mockClear()
    paletteOpen.mockClear()
    learned.length = 0
  })

  it('converts read lines, keeping SHX text SHX and outline text TrueType', async () => {
    const { context, appended, erased, database } = createContext([
      's1',
      'm1',
      'u1'
    ])

    const cmd = new AcApPdfTextCmd()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cmd.execute(context as any)

    expect(paletteOpen).not.toHaveBeenCalled()
    const styleOf = (text: string) =>
      appended.find(item => item.textString === text)?.styleName
    expect(styleOf('SHX')).toBe(PDF_SHX_TEXT_STYLE)
    // The current style already draws in a TrueType face: reused.
    expect(styleOf('MESH')).toBe(database.textstyle)
    // The unread line is skipped and its strokes kept.
    expect(appended).toHaveLength(2)
    expect(erased.sort()).toEqual(['m1', 's1'])

    const shx = database.tables.textStyleTable.getAt(PDF_SHX_TEXT_STYLE)
    expect(shx?.textStyle.font).toBe('txt')
    expect(shx?.textStyle.bigFont).toBe('gbcbig')
    expect(loadFonts).toHaveBeenCalledWith(['txt', 'gbcbig', 'SimKai'])
    // Nothing was typed, so nothing is learned.
    expect(learned).toEqual([])
  })
})
