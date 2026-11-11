/**
 * Shared mocks for the `pdftext` command specs (headless and review panel).
 * Loaded from `jest.mock` factories, so only `require` style access is used.
 */
import { AcCmColor, AcDbDatabase } from '@mlightcad/data-model'

export const loadFonts = jest.fn(async () => undefined)
export const regen = jest.fn()
export const paletteOpen = jest.fn()

/** Mock of `@mlightcad/cad-simple-viewer` used by `AcApPdfTextCmd`. */
export function viewerMock() {
  class AcEdCommand {
    mode = 0
    notify = jest.fn()
  }
  return {
    AcApDocManager: {
      instance: { loadFonts, regen, avaiableFonts: [] }
    },
    // The drawing's current style font (SimKai) is a TrueType face.
    AcApFontUtil: {
      getFontType: () => undefined,
      getCatalogFontType: (name: string) =>
        name.toLowerCase() === 'simkai'
          ? 'mesh'
          : name.toLowerCase() === 'txt'
            ? 'shx'
            : undefined,
      getReplacementFontName: (name: string) => name,
      findFontInfoByName: () => ({}),
      isFontLoaded: () => false,
      prepareTextMeasurement: async () => undefined,
      measureTextWidth: () => undefined
    },
    AcApI18n: { t: (key: string) => key, currentLocale: 'en' },
    AcApLlmSettingsService: { getStatus: async () => undefined },
    AcApPaletteService: { open: paletteOpen },
    AcApTextRecognitionService: { hasRecognizer: false },
    acapZoomToVisible: jest.fn(),
    AcEdCommand,
    AcEdOpenMode: { Write: 2 },
    resolveSelectedEntities: async (context: { ids: string[] }) => ({
      ids: context.ids,
      entities: context.ids.map(() => ({ layer: '0', color: new AcCmColor() }))
    })
  }
}

/**
 * Stroke ids starting with `m` are closed outlines (TrueType text), others
 * open strokes (SHX text).
 */
export function strokesMock() {
  return {
    pdfEntityToStroke: (_entity: unknown, id: string) => ({
      id,
      points: id.startsWith('m')
        ? [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 0 }
          ]
        : [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
          ]
    })
  }
}

/** One line per stroke. */
export function clusteringMock() {
  return {
    clusterPdfTextStrokes: (strokes: Array<{ id: string }>) => ({
      lines: strokes.map(stroke => ({
        strokes: [stroke],
        glyphs: [],
        position: { x: 0, y: 0 },
        height: 1,
        width: 1,
        rotation: 0
      }))
    })
  }
}

/** Glyphs taught to the dictionary mock (stroke id → text). */
export const learned: Array<[string, string]> = []

/**
 * Dictionary that reads lines `s*` as `SHX` and `m*` as `MESH`; `u*` lines
 * stay unread. Learning records the call.
 */
export function dictionaryMock() {
  class PdfGlyphDictionary {
    lookup(line: { strokes: Array<{ id: string }> }) {
      const id = line.strokes[0].id
      if (id.startsWith('s')) return 'SHX'
      if (id.startsWith('m')) return 'MESH'
      return undefined
    }
    learn(line: { strokes: Array<{ id: string }> }, text: string) {
      learned.push([line.strokes[0].id, text])
    }
    load() {}
    toJSON() {
      return []
    }
  }
  return { PdfGlyphDictionary }
}

export interface AppendedText {
  textString: string
  styleName: string
  height: number
}

/** A context whose model space and erase calls are recorded. */
export function createContext(ids: string[]) {
  const appended: AppendedText[] = []
  const erased: string[] = []
  const db = new AcDbDatabase()
  const view = {
    selectionSet: { clear: jest.fn(), add: jest.fn() },
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    setEntitySceneVisible: jest.fn(),
    highlight: jest.fn(),
    unhighlight: jest.fn(),
    canvas: undefined,
    container: undefined
  }
  const database = {
    textstyle: db.textstyle,
    tables: {
      textStyleTable: db.tables.textStyleTable,
      blockTable: {
        modelSpace: {
          appendEntity: (texts: AppendedText[]) => appended.push(...texts)
        }
      }
    }
  }
  const context = {
    ids,
    view,
    doc: {
      database,
      entityService: {
        eraseEntities: (list: string[]) => erased.push(...list)
      }
    }
  }
  return { context, appended, erased, view, database }
}
