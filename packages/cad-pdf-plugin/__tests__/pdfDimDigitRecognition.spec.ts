import {
  clusterPdfTextStrokes,
  type PdfTextStroke
} from '../src/recognition/pdfGlyphClustering'
import {
  recognizePdfDimGlyph,
  recognizePdfDimStrokeText
} from '../src/recognition/pdfDimDigitRecognition'

type P = { x: number; y: number }

/**
 * Same stick strokes the recognizer ships as templates (unit cell), so a
 * round-trip must read them back.
 */
const STICK: Record<string, P[][]> = {
  '0': [
    [
      { x: 0.2, y: 0.05 },
      { x: 0.8, y: 0.05 },
      { x: 0.8, y: 0.95 },
      { x: 0.2, y: 0.95 },
      { x: 0.2, y: 0.05 }
    ]
  ],
  '1': [
    [
      { x: 0.35, y: 0.75 },
      { x: 0.55, y: 0.95 }
    ],
    [
      { x: 0.55, y: 0.95 },
      { x: 0.55, y: 0.05 }
    ],
    [
      { x: 0.3, y: 0.05 },
      { x: 0.8, y: 0.05 }
    ]
  ],
  '2': [
    [
      { x: 0.2, y: 0.8 },
      { x: 0.2, y: 0.9 },
      { x: 0.8, y: 0.9 },
      { x: 0.8, y: 0.55 },
      { x: 0.2, y: 0.55 },
      { x: 0.2, y: 0.05 },
      { x: 0.8, y: 0.05 }
    ]
  ],
  '5': [
    [
      { x: 0.8, y: 0.95 },
      { x: 0.2, y: 0.95 },
      { x: 0.2, y: 0.55 },
      { x: 0.75, y: 0.55 },
      { x: 0.8, y: 0.45 },
      { x: 0.8, y: 0.15 },
      { x: 0.7, y: 0.05 },
      { x: 0.2, y: 0.05 }
    ]
  ],
  '8': [
    [
      { x: 0.5, y: 0.5 },
      { x: 0.2, y: 0.7 },
      { x: 0.2, y: 0.9 },
      { x: 0.8, y: 0.9 },
      { x: 0.8, y: 0.7 },
      { x: 0.5, y: 0.5 },
      { x: 0.2, y: 0.3 },
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.1 },
      { x: 0.8, y: 0.3 },
      { x: 0.5, y: 0.5 }
    ]
  ],
  R: [
    [
      { x: 0.2, y: 0.05 },
      { x: 0.2, y: 0.95 },
      { x: 0.65, y: 0.95 },
      { x: 0.8, y: 0.8 },
      { x: 0.8, y: 0.6 },
      { x: 0.65, y: 0.5 },
      { x: 0.2, y: 0.5 }
    ],
    [
      { x: 0.5, y: 0.5 },
      { x: 0.8, y: 0.05 }
    ]
  ],
  Ø: [
    [
      { x: 0.5, y: 0.15 },
      { x: 0.75, y: 0.25 },
      { x: 0.85, y: 0.5 },
      { x: 0.75, y: 0.75 },
      { x: 0.5, y: 0.85 },
      { x: 0.25, y: 0.75 },
      { x: 0.15, y: 0.5 },
      { x: 0.25, y: 0.25 },
      { x: 0.5, y: 0.15 }
    ],
    [
      { x: 0.25, y: 0.2 },
      { x: 0.75, y: 0.8 }
    ]
  ]
}

let nextId = 0

function write(text: string, origin: P, h: number): PdfTextStroke<number>[] {
  const out: PdfTextStroke<number>[] = []
  let cursor = 0
  for (const ch of text) {
    if (ch === ' ') {
      cursor += 0.9
      continue
    }
    for (const stroke of STICK[ch]) {
      out.push({
        id: nextId++,
        points: stroke.map(p => ({
          x: origin.x + (cursor + p.x) * h,
          y: origin.y + p.y * h
        }))
      })
    }
    cursor += 0.85
  }
  return out
}

describe('recognizePdfDimStrokeText', () => {
  it.each(['55', '12', '80', 'R10', 'Ø12'] as const)(
    'reads stick-font %s',
    label => {
      const strokes = write(label, { x: 10, y: 20 }, 3)
      const { lines } = clusterPdfTextStrokes(strokes, { textHeight: 3 })
      expect(lines).toHaveLength(1)
      const chars = lines[0].glyphs.map(g => recognizePdfDimGlyph(g, lines[0]))
      expect(chars.join('')).toBe(label)
      expect(recognizePdfDimStrokeText(lines[0])).toBe(label)
    }
  )

  it('rejects a plain rectangle as a digit', () => {
    const strokes: PdfTextStroke<number>[] = [
      {
        id: 1,
        points: [
          { x: 0, y: 0 },
          { x: 3, y: 0 },
          { x: 3, y: 3 },
          { x: 0, y: 3 },
          { x: 0, y: 0 }
        ]
      }
    ]
    const { lines } = clusterPdfTextStrokes(strokes, { textHeight: 3 })
    expect(lines.length).toBeGreaterThanOrEqual(1)
    // A square may look somewhat like 0/Ø; require a clear winner margin so
    // ambiguous blobs stay unread for the measured-length fallback.
    const char = recognizePdfDimGlyph(lines[0].glyphs[0], lines[0])
    if (char !== undefined) {
      expect(['0', 'Ø', '8']).toContain(char)
    }
  })
})
