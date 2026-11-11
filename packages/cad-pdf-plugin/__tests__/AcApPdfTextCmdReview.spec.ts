/**
 * @jest-environment jsdom
 */
jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual('./helpers/pdfTextCmdTestUtils').viewerMock()
)
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string) => key
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

/** Captures the panel the command opens, so tests can drive it. */
const panels: Array<{
  options: {
    session: import('../src/AcApPdfTextSession').AcApPdfTextSession<string>
    onClose: (apply: boolean) => void
    onHideStrokes: (hide: boolean) => void
  }
}> = []
jest.mock('../src/ui/AcUiPdfTextPanel', () => ({
  AcUiPdfTextPanel: class {
    element = document.createElement('div')
    constructor(public options: never) {
      panels.push(this as never)
    }
    focusFirstUnread() {}
    destroy() {}
  }
}))

import { AcApPdfTextCmd } from '../src/AcApPdfTextCmd'
import { PDF_SHX_TEXT_STYLE } from '../src/pdfImportEntities'
import { createContext, learned, paletteOpen } from './helpers/pdfTextCmdTestUtils'

/** Palette handle mock: records close, lets the test close it as the user. */
function mockPalette() {
  const closedListeners: Array<() => void> = []
  const handle = {
    closed: false,
    close: jest.fn(() => {
      handle.closed = true
      closedListeners.splice(0).forEach(listener => listener())
    }),
    onClosed: (listener: () => void) => closedListeners.push(listener),
    coveredInsets: () => undefined
  }
  paletteOpen.mockReturnValue(handle)
  return handle
}

/** Lets the command reach `await result` (preview, fonts, panel). */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

describe('AcApPdfTextCmd review panel', () => {
  beforeEach(() => {
    panels.length = 0
    learned.length = 0
    paletteOpen.mockReset()
  })

  it('applies edited text with the chosen style and learns typed lines', async () => {
    const handle = mockPalette()
    const { context, appended, erased, view } = createContext(['s1', 'u1'])

    const cmd = new AcApPdfTextCmd()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const run = cmd.execute(context as any)
    await settle()

    expect(paletteOpen).toHaveBeenCalledTimes(1)
    // The preview draws the line already read.
    expect(view.addTransientEntity).toHaveBeenCalled()
    const { session, onClose, onHideStrokes } = panels[0].options
    onHideStrokes(true)
    expect(view.setEntitySceneVisible).toHaveBeenCalledWith('u1', false)
    session.setText(1, 'TYPED')
    session.setSize('shx', { heightScale: 2 })
    onClose(true)
    await run

    expect(appended.map(text => text.textString).sort()).toEqual([
      'SHX',
      'TYPED'
    ])
    expect(appended.every(text => text.styleName === PDF_SHX_TEXT_STYLE)).toBe(
      true
    )
    expect(appended[0].height).toBe(2)
    expect(erased.sort()).toEqual(['s1', 'u1'])
    expect(learned).toEqual([['u1', 'TYPED']])
    // The preview and hidden strokes are cleaned up, the palette closed.
    expect(view.removeTransientEntity).toHaveBeenCalled()
    expect(view.setEntitySceneVisible).toHaveBeenLastCalledWith('u1', true)
    expect(handle.close).toHaveBeenCalled()
  })

  it('changes nothing when the user closes the palette', async () => {
    const handle = mockPalette()
    const { context, appended, erased, database } = createContext(['s1'])

    const cmd = new AcApPdfTextCmd()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const run = cmd.execute(context as any)
    await settle()
    // The preview created the suggested style.
    expect(database.tables.textStyleTable.has(PDF_SHX_TEXT_STYLE)).toBe(true)

    handle.close()
    await run

    expect(appended).toEqual([])
    expect(erased).toEqual([])
    expect(database.tables.textStyleTable.has(PDF_SHX_TEXT_STYLE)).toBe(false)
    expect(learned).toEqual([])
  })
})
