const getString = jest.fn()

jest.mock('@mlightcad/cad-simple-viewer', () => {
  class AcEdCommand {
    mode = 0
    notify = jest.fn()
  }
  class AcEdPromptStringOptions {
    allowSpaces = false
    allowEmpty = false
    constructor(public message: string) {}
  }
  return {
    AcApDocManager: { instance: { editor: { getString } } },
    AcApI18n: { t: (key: string) => key, currentLocale: 'en' },
    AcApLlmSettingsService: { getStatus: async () => undefined },
    AcApTextRecognitionService: { hasRecognizer: false },
    AcEdCommand,
    AcEdOpenMode: { Write: 2 },
    AcEdPromptStatus: { OK: 'OK', None: 'None', Cancel: 'Cancel' },
    AcEdPromptStringOptions,
    resolveSelectedEntities: async (context: { ids: string[] }) => ({
      ids: context.ids,
      entities: context.ids.map(() => ({
        layer: '0',
        color: new (jest.requireActual('@mlightcad/data-model').AcCmColor)()
      }))
    })
  }
})

jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string, params?: Record<string, unknown>) =>
    `${key} ${JSON.stringify(params ?? {})}`
}))

jest.mock('../src/pdfEntityStrokes', () => ({
  pdfEntityToStroke: (_entity: unknown, id: string) => ({
    id,
    points: [{ x: 0, y: 0 }]
  })
}))

/** Three lines, each made of one stroke whose id names the line. */
jest.mock('../src/recognition/pdfGlyphClustering', () => ({
  clusterPdfTextStrokes: (strokes: Array<{ id: string }>) => ({
    lines: strokes.map(stroke => ({
      strokes: [stroke],
      position: { x: 0, y: 0 },
      height: 1,
      width: 1,
      rotation: 0
    }))
  })
}))

/**
 * Typing line `a` teaches the glyphs of lines `b` and `c`, as when every
 * line reuses the glyphs of the first one.
 */
jest.mock('../src/recognition/pdfGlyphDictionary', () => {
  class PdfGlyphDictionary {
    private known = new Map<string, string>()
    lookup(line: { strokes: Array<{ id: string }> }) {
      return this.known.get(line.strokes[0].id)
    }
    learn() {
      this.known.set('b', 'BB')
      this.known.set('c', 'CC')
    }
    load() {}
    toJSON() {
      return []
    }
  }
  return { PdfGlyphDictionary }
})

import { AcApPdfTextCmd } from '../src/AcApPdfTextCmd'

function createContext(ids: string[]) {
  const appended: Array<{ textString: string }> = []
  const erased: string[] = []
  const context = {
    ids,
    view: { selectionSet: { clear: jest.fn(), add: jest.fn() } },
    doc: {
      database: {
        tables: {
          blockTable: {
            modelSpace: {
              appendEntity: (texts: Array<{ textString: string }>) =>
                appended.push(...texts)
            }
          }
        }
      },
      entityService: {
        eraseEntities: (list: string[]) => erased.push(...list)
      }
    }
  }
  return { context, appended, erased }
}

describe('AcApPdfTextCmd', () => {
  beforeEach(() => getString.mockReset())

  it('reads the remaining lines from glyphs taught by a typed line', async () => {
    getString.mockResolvedValue({ status: 'OK', stringResult: 'AA' })
    const { context, appended, erased } = createContext(['a', 'b', 'c'])

    const cmd = new AcApPdfTextCmd()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cmd.execute(context as any)

    expect(getString).toHaveBeenCalledTimes(1)
    expect(appended.map(text => text.textString).sort()).toEqual([
      'AA',
      'BB',
      'CC'
    ])
    expect(erased.sort()).toEqual(['a', 'b', 'c'])
  })
})
