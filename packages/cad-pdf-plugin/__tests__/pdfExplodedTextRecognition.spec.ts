const recognizeBatch = jest.fn()
let hasRecognizer = true

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApI18n: { currentLocale: 'en', t: (key: string) => key },
  AcApTextRecognitionService: {
    get hasRecognizer() {
      return hasRecognizer
    },
    recognizeBatch: (...args: unknown[]) => recognizeBatch(...args)
  }
}))

jest.mock('../src/recognition/pdfGlyphClustering', () => {
  const clusterPdfTextStrokes = (strokes: Array<{ id: string }>) => ({
    lines: strokes.map(stroke => ({
      strokes: [stroke],
      glyphs: [
        {
          strokes: [stroke],
          minU: 0,
          maxU: 1,
          minV: 0,
          maxV: 1
        }
      ],
      position: { x: 0, y: 0 },
      height: 1,
      width: 1,
      rotation: 0
    })),
    rejected: [],
    textHeight: 1
  })
  return {
    clusterPdfTextStrokes,
    clusterPdfTextStrokesMultiScale: clusterPdfTextStrokes,
    isImplausiblePdfTextLine: () => false
  }
})

jest.mock('../src/recognition/pdfTextFontKind', () => ({
  classifyPdfTextLineFont: () => 'shx'
}))

import { acapPdfRecognizeExplodedTextLines } from '../src/pdfExplodedTextRecognition'
import type { PdfTextStroke } from '../src/recognition/pdfGlyphClustering'
import type { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

function strokes(...ids: string[]): PdfTextStroke<string>[] {
  return ids.map(id => ({
    id,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]
  }))
}

function dictionary(
  map: Record<string, string | undefined>
): PdfGlyphDictionary {
  return {
    lookup: (line: { strokes: Array<{ id: string }> }) =>
      map[line.strokes[0]?.id ?? ''],
    learn: jest.fn(),
    load: jest.fn(),
    toJSON: () => [],
    size: 0
  } as unknown as PdfGlyphDictionary
}

describe('acapPdfRecognizeExplodedTextLines', () => {
  beforeEach(() => {
    recognizeBatch.mockReset()
    hasRecognizer = true
  })

  test('local mode reads dictionary hits and does not call OCR', async () => {
    const result = await acapPdfRecognizeExplodedTextLines(
      strokes('known', 'unknown'),
      {
        dictionary: dictionary({ known: 'OK' }),
        mode: 'local'
      }
    )

    expect(recognizeBatch).not.toHaveBeenCalled()
    expect(result).toEqual([
      expect.objectContaining({
        text: 'OK',
        source: 'dictionary',
        kind: 'shx'
      }),
      expect.objectContaining({ text: '', source: 'unread', kind: 'shx' })
    ])
  })

  test('ocr mode asks the recognition service for unread lines', async () => {
    const createElement = jest.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        lineCap: '',
        lineJoin: '',
        fillRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn()
      }),
      toDataURL: () => 'data:image/png;base64,xx'
    }))
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement }
    })
    recognizeBatch.mockResolvedValue(['FROM-OCR'])

    try {
      const result = await acapPdfRecognizeExplodedTextLines(
        strokes('known', 'unknown'),
        {
          dictionary: dictionary({ known: 'OK' }),
          mode: 'ocr'
        }
      )
      expect(recognizeBatch).toHaveBeenCalledTimes(1)
      expect(recognizeBatch.mock.calls[0][0].images).toHaveLength(1)
      expect(result).toEqual([
        expect.objectContaining({ text: 'OK', source: 'dictionary' }),
        expect.objectContaining({ text: 'FROM-OCR', source: 'ocr' })
      ])
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).document
    }
  })

  test('ocr mode without a recognizer stays local', async () => {
    hasRecognizer = false
    const result = await acapPdfRecognizeExplodedTextLines(strokes('unknown'), {
      dictionary: dictionary({}),
      mode: 'ocr'
    })
    expect(recognizeBatch).not.toHaveBeenCalled()
    expect(result[0].source).toBe('unread')
  })

  test('ocr mode times out a hung recognizer and leaves lines unread', async () => {
    const createElement = jest.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        lineCap: '',
        lineJoin: '',
        fillRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn()
      }),
      toDataURL: () => 'data:image/png;base64,xx'
    }))
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement }
    })
    recognizeBatch.mockImplementation(() => new Promise(() => {}))
    jest.useFakeTimers()
    try {
      const pending = acapPdfRecognizeExplodedTextLines(strokes('unknown'), {
        dictionary: dictionary({}),
        mode: 'ocr',
        timeoutMs: 50
      })
      await jest.advanceTimersByTimeAsync(51)
      const result = await pending
      expect(result[0].source).toBe('unread')
      expect(result[0].text).toBe('')
    } finally {
      jest.useRealTimers()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).document
    }
  })
})
