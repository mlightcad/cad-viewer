jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      loadFonts: jest.fn(async () => undefined),
      withBusyIndicator: async <T>(work: () => Promise<T>) => work()
    }
  },
  AcApFontUtil: {
    getFontType: (name: string) =>
      ['txt', 'gbcbig'].includes(name.toLowerCase()) ? 'shx' : undefined,
    getCatalogFontType: (name: string) =>
      ['txt', 'gbcbig'].includes(name.toLowerCase()) ? 'shx' : undefined,
    getFontScaleFactor: () => 1,
    getReplacementFontName: (name: string) => name,
    findFontInfoByName: () => ({}),
    isFontLoaded: () => true,
    prepareTextMeasurement: async () => undefined,
    measureTextWidth: () => undefined
  },
  AcApI18n: { t: (key: string) => key, currentLocale: 'en' },
  AcApTextRecognitionService: {
    hasRecognizer: false,
    has: () => false,
    listAvailable: async () => []
  }
}))

jest.mock('../src/pdfEntityStrokes', () => ({
  pdfEntityToStroke: (_entity: unknown, id: unknown) => ({
    id,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]
  })
}))

const recognizeExploded = jest.fn()

jest.mock('../src/pdfExplodedTextRecognition', () => ({
  acapPdfOcrErrorMessage: (error: unknown) => String(error),
  acapPdfRecognizeExplodedTextLines: (...args: unknown[]) =>
    recognizeExploded(...args)
}))

import {
  AcCmColor,
  AcDbDatabase,
  AcDbHatch,
  AcDbLine,
  AcDbText,
  AcGePoint3d
} from '@mlightcad/data-model'

import { PDF_SHX_TEXT_STYLE } from '../src/pdfImportEntities'
import { acapPdfRecognizeImportExplodedText } from '../src/pdfImportExplodedText'
import { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

describe('acapPdfRecognizeImportExplodedText', () => {
  beforeEach(() => {
    recognizeExploded.mockReset()
    recognizeExploded.mockImplementation(
      async (strokes: Array<{ id: unknown }>) => [
        {
          line: {
            strokes: [strokes[0]],
            glyphs: [],
            position: { x: 1, y: 2 },
            height: 3,
            width: 4,
            rotation: 0
          },
          kind: 'shx',
          text: 'HI',
          source: 'dictionary'
        },
        {
          line: {
            strokes: [strokes[1]],
            glyphs: [],
            position: { x: 5, y: 6 },
            height: 3,
            width: 4,
            rotation: 0
          },
          kind: 'shx',
          text: '',
          source: 'unread'
        }
      ]
    )
  })

  test('replaces readable stroke groups with text and keeps unread strokes', async () => {
    const db = new AcDbDatabase()
    const s1 = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
    const s2 = new AcDbLine(new AcGePoint3d(2, 0, 0), new AcGePoint3d(3, 0, 0))
    s1.layer = 'TEXT'
    s1.color = new AcCmColor()
    s2.layer = 'TEXT'
    s2.color = new AcCmColor()

    const recovered = await acapPdfRecognizeImportExplodedText(
      db,
      [s1, s2],
      new PdfGlyphDictionary(),
      { mode: 'local' }
    )

    expect(recovered.converted).toBe(1)
    expect(recovered.replaced).toBe(1)
    expect(recovered.unread).toBe(1)
    expect(recovered.entities).toHaveLength(2)
    const text = recovered.entities.find(
      (entity): entity is AcDbText => entity instanceof AcDbText
    )
    expect(text?.textString).toBe('HI')
    expect(text?.styleName).toBe(PDF_SHX_TEXT_STYLE)
    expect(text?.layer).toBe('TEXT')
    expect(recovered.entities).toContain(s2)
    expect(recovered.entities).not.toContain(s1)
  })

  test('keeps every text when several lines share the earliest paint stroke', async () => {
    // One solid hatch can hold multiple outline-font glyphs; both lines then
    // use that hatch as their earliest (and only) paint-order entity.
    const db = new AcDbDatabase()
    const hatch = new AcDbHatch()
    hatch.layer = 'TEXT'
    hatch.color = new AcCmColor()
    const other = new AcDbLine(
      new AcGePoint3d(10, 0, 0),
      new AcGePoint3d(11, 0, 0)
    )
    other.layer = '0'
    other.color = new AcCmColor()

    recognizeExploded.mockImplementation(async () => [
      {
        line: {
          strokes: [
            {
              id: hatch,
              points: [
                { x: 0, y: 0 },
                { x: 1, y: 1 }
              ]
            }
          ],
          glyphs: [],
          position: { x: 0, y: 2 },
          height: 3,
          width: 4,
          rotation: 0
        },
        kind: 'mesh',
        text: 'AB',
        source: 'dictionary'
      },
      {
        line: {
          strokes: [
            {
              id: hatch,
              points: [
                { x: 2, y: 0 },
                { x: 3, y: 1 }
              ]
            }
          ],
          glyphs: [],
          position: { x: 5, y: 2 },
          height: 3,
          width: 4,
          rotation: 0
        },
        kind: 'mesh',
        text: 'CD',
        source: 'dictionary'
      }
    ])

    const recovered = await acapPdfRecognizeImportExplodedText(
      db,
      [hatch, other],
      new PdfGlyphDictionary(),
      { mode: 'local' },
      new Map([
        [
          hatch,
          [
            [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 }
            ],
            [
              { x: 2, y: 0 },
              { x: 3, y: 0 },
              { x: 3, y: 1 }
            ]
          ]
        ]
      ])
    )

    expect(recognizeExploded).toHaveBeenCalled()
    const strokes = recognizeExploded.mock.calls[0][0] as Array<{
      filled?: boolean
      id: unknown
    }>
    expect(strokes.some(stroke => stroke.filled && stroke.id === hatch)).toBe(
      true
    )
    expect(recovered.converted).toBe(2)
    expect(recovered.replaced).toBe(1)
    expect(recovered.entities).not.toContain(hatch)
    expect(recovered.entities).toContain(other)
    const texts = recovered.entities.filter(
      (entity): entity is AcDbText => entity instanceof AcDbText
    )
    expect(texts.map(text => text.textString).sort()).toEqual(['AB', 'CD'])
  })

  test('drops outline strokes that sit under an already-imported PDF text', async () => {
    const db = new AcDbDatabase()
    const outline = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    const native = new AcDbText()
    native.textString = '受控文件'
    native.position = new AcGePoint3d(0, 0, 0)
    native.height = 3
    native.rotation = 0
    native.widthFactor = 1

    recognizeExploded.mockImplementation(
      async (strokes: Array<{ id: unknown }>) => [
        {
          line: {
            strokes: [strokes[0]],
            glyphs: [],
            position: { x: 0, y: 0 },
            height: 3,
            width: 12,
            rotation: 0
          },
          kind: 'mesh',
          text: '',
          source: 'unread'
        }
      ]
    )

    const recovered = await acapPdfRecognizeImportExplodedText(
      db,
      [outline, native],
      new PdfGlyphDictionary(),
      { mode: 'local' }
    )

    expect(recovered.converted).toBe(0)
    expect(recovered.replaced).toBe(1)
    expect(recovered.entities).toEqual([native])
    expect(recovered.entities).not.toContain(outline)
  })

  test('keeps a coloured fill under a differently coloured imported text', async () => {
    const db = new AcDbDatabase()
    // A green badge with a white "1" on it: the badge outline clusters into
    // the digit's line, but it is artwork, not the digit's outline twin.
    const badge = new AcDbHatch()
    badge.color = new AcCmColor().setRGB(0, 171, 79)
    const twin = new AcDbHatch()
    twin.color = new AcCmColor().setRGB(255, 255, 255)
    const native = new AcDbText()
    native.textString = '1'
    native.position = new AcGePoint3d(0, 0, 0)
    native.height = 3
    native.rotation = 0
    native.widthFactor = 1
    native.color = new AcCmColor().setRGB(255, 255, 255)

    recognizeExploded.mockImplementation(
      async (strokes: Array<{ id: unknown }>) => [
        {
          line: {
            strokes: [strokes[0], strokes[1]],
            glyphs: [],
            position: { x: 0, y: 0 },
            height: 3,
            width: 2,
            rotation: 0
          },
          kind: 'mesh',
          text: '',
          source: 'unread'
        }
      ]
    )

    const recovered = await acapPdfRecognizeImportExplodedText(
      db,
      [badge, twin, native],
      new PdfGlyphDictionary(),
      { mode: 'local' }
    )

    expect(recovered.entities).toContain(badge)
    expect(recovered.entities).toContain(native)
    expect(recovered.entities).not.toContain(twin)
  })

  test('also drops fill+stroke companion outlines when the hatch becomes text', async () => {
    const db = new AcDbDatabase()
    const hatch = new AcDbHatch()
    hatch.layer = 'TEXT'
    hatch.color = new AcCmColor()
    const outline = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 1, 0)
    )
    outline.layer = 'TEXT'
    outline.color = new AcCmColor()

    recognizeExploded.mockImplementation(async () => [
      {
        line: {
          strokes: [
            {
              id: hatch,
              points: [
                { x: 0, y: 0 },
                { x: 1, y: 1 }
              ]
            }
          ],
          glyphs: [],
          position: { x: 0, y: 0 },
          height: 3,
          width: 4,
          rotation: 0
        },
        kind: 'mesh',
        text: 'OK',
        source: 'dictionary'
      }
    ])

    const recovered = await acapPdfRecognizeImportExplodedText(
      db,
      [hatch, outline],
      new PdfGlyphDictionary(),
      { mode: 'local' },
      new Map([
        [
          hatch,
          [
            [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 }
            ]
          ]
        ]
      ]),
      new Map([[hatch, [outline]]])
    )

    expect(recovered.converted).toBe(1)
    expect(recovered.entities).not.toContain(hatch)
    expect(recovered.entities).not.toContain(outline)
    expect(
      recovered.entities.some(
        (entity): entity is AcDbText =>
          entity instanceof AcDbText && entity.textString === 'OK'
      )
    ).toBe(true)
  })
})
