/**
 * @jest-environment jsdom
 */
const notify = jest.fn()
const paletteOpen = jest.fn()
const getPoint = jest.fn()

jest.mock('@mlightcad/cad-simple-viewer', () => {
  class AcEdCommand {
    mode = 0
    notify = notify
  }
  class AcEdPromptPointOptions {
    constructor(public message: string) {}
  }
  return {
    AcApDocManager: { instance: { editor: { getPoint } } },
    AcApI18n: { t: (key: string) => key },
    AcApPaletteService: { open: paletteOpen },
    acapZoomToVisible: jest.fn(),
    AcEdCommand,
    AcEdOpenMode: { Write: 2 },
    AcEdPromptPointOptions,
    AcEdPromptStatus: { OK: 'OK', Cancel: 'Cancel' },
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

type PanelOptions =
  import('../src/ui/AcUiPdfHatchPanel').AcUiPdfHatchPanelOptions<string>

/** Captures the panel the command opens, so tests can drive it. */
const panels: Array<{ options: PanelOptions }> = []
jest.mock('../src/ui/AcUiPdfHatchPanel', () => ({
  AcUiPdfHatchPanel: class {
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
  type AcDbEntity,
  type AcDbHatch,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { AcApPdfHatchCmd } from '../src/AcApPdfHatchCmd'
import {
  createHatchContext,
  hatchedRoom,
  rect
} from './helpers/pdfHatchTestUtils'

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

/** Lets the command reach `await result`. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function start(selection: Map<string, AcDbEntity>) {
  const env = createHatchContext(selection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = new AcApPdfHatchCmd().execute(env.context as any)
  return { ...env, run }
}

describe('AcApPdfHatchCmd review panel', () => {
  beforeAll(() => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
  })
  beforeEach(() => {
    panels.length = 0
    paletteOpen.mockReset()
    getPoint.mockReset()
    notify.mockClear()
  })

  test('previews the hatches and converts only the included ones', async () => {
    const handle = mockPalette()
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 60, 40))
    hatchedRoom(selection, 'b', rect(200, 0, 250, 30))
    const { run, view, appended, erased } = start(selection)
    await settle()

    expect(paletteOpen).toHaveBeenCalledTimes(1)
    expect(paletteOpen.mock.calls[0][0].id).toBe('pdfhatch')
    // The hatches are drawn in place of their strokes.
    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(
      view.setEntitySceneVisible.mock.calls.some(
        ([id, visible]) => String(id).startsWith('a-s') && visible === false
      )
    ).toBe(true)

    const { session, onClose, onFocusRow } = panels[0].options
    expect(session.rows).toHaveLength(2)
    const skipped = session.rows[1]
    const prefix = skipped.consumed[0].slice(0, 2)
    session.setIncluded(skipped, false)
    onFocusRow(session.rows[0], true)
    expect(view.highlight).toHaveBeenCalled()
    onClose(true)
    await run

    expect(appended).toHaveLength(1)
    expect(erased.length).toBeGreaterThan(0)
    expect(erased.every(id => !id.startsWith(prefix))).toBe(true)
    // Preview, highlight and hidden strokes are cleaned up.
    expect(view.removeTransientEntity).toHaveBeenCalled()
    expect(view.unhighlight).toHaveBeenCalled()
    expect(view.setEntitySceneVisible).toHaveBeenLastCalledWith(
      expect.any(String),
      true
    )
    expect(handle.close).toHaveBeenCalled()
  })

  test('applies a pattern changed in the panel', async () => {
    mockPalette()
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 80, 50), 'ANSI37', 2)
    const { run, appended } = start(selection)
    await settle()

    const { session, onClose } = panels[0].options
    const row = session.rows[0]
    expect(session.patternKey(row)).toBe('predefined:ANSI37')
    session.setPattern(row, 'user2')
    onClose(true)
    await run

    const hatch = appended[0] as AcDbHatch
    expect(hatch.patternName).not.toBe('ANSI37')
  })

  test('changes nothing when the user closes the palette', async () => {
    const handle = mockPalette()
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 60, 40))
    const { run, appended, erased, view } = start(selection)
    await settle()

    handle.close()
    await run

    expect(appended).toEqual([])
    expect(erased).toEqual([])
    expect(view.setEntitySceneVisible).toHaveBeenLastCalledWith(
      expect.any(String),
      true
    )
    expect(notify).toHaveBeenCalledWith('jig.pdfhatch.cancelled')
  })

  test('adds a hatch for a point picked in the drawing', async () => {
    mockPalette()
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 60, 40))
    const { run, appended } = start(selection)
    await settle()

    const { session, onAddRegion, onClose } = panels[0].options
    // Pretend the recognition missed the room.
    session.rows.splice(0)
    getPoint.mockResolvedValueOnce({
      status: 'OK',
      value: { x: 30.2, y: 20.3 }
    })
    const added = await onAddRegion()
    expect(typeof added).toBe('object')
    expect(session.rows).toHaveLength(1)

    getPoint.mockResolvedValueOnce({ status: 'Cancel' })
    expect(await onAddRegion()).toBe('cancelled')
    // A failing prompt ends the pick, not the review.
    getPoint.mockRejectedValueOnce(new Error('Invalid point input \'\''))
    expect(await onAddRegion()).toBe('cancelled')

    onClose(true)
    await run
    expect(appended).toHaveLength(1)
  })
})
