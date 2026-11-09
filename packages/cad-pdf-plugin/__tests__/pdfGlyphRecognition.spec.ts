import {
  clusterPdfTextStrokes,
  estimatePdfTextHeight,
  type PdfTextStroke
} from '../src/recognition/pdfGlyphClustering'
import { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

type P = { x: number; y: number }

/** Minimal stroke font in a 0.6 × 1 cell (cap height 1). */
const FONT: Record<string, P[][]> = {
  L: [
    [
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 0.6, y: 0 }
    ]
  ],
  T: [
    [
      { x: 0, y: 1 },
      { x: 0.6, y: 1 }
    ],
    [
      { x: 0.3, y: 1 },
      { x: 0.3, y: 0 }
    ]
  ],
  H: [
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 }
    ],
    [
      { x: 0.6, y: 0 },
      { x: 0.6, y: 1 }
    ],
    [
      { x: 0, y: 0.5 },
      { x: 0.6, y: 0.5 }
    ]
  ],
  E: [
    [
      { x: 0.6, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 0.6, y: 0 }
    ],
    [
      { x: 0, y: 0.5 },
      { x: 0.4, y: 0.5 }
    ]
  ]
}

let nextId = 0

/** Lays out `text` with height `h` at `origin`, rotated by `angle`. */
function write(
  text: string,
  origin: P,
  h: number,
  angle = 0
): PdfTextStroke<number>[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const out: PdfTextStroke<number>[] = []
  let cursor = 0
  for (const ch of text) {
    if (ch === ' ') {
      cursor += 0.8
      continue
    }
    for (const stroke of FONT[ch]) {
      out.push({
        id: nextId++,
        points: stroke.map(p => {
          const u = (cursor + p.x) * h
          const v = p.y * h
          return { x: origin.x + u * c - v * s, y: origin.y + u * s + v * c }
        })
      })
    }
    cursor += 0.85
  }
  return out
}

describe('clusterPdfTextStrokes', () => {
  it('groups one word into a single line with its placement', () => {
    const strokes = write('HELL', { x: 10, y: 20 }, 2.5)
    const { lines } = clusterPdfTextStrokes(strokes, { textHeight: 2.5 })
    expect(lines).toHaveLength(1)
    const line = lines[0]
    expect(line.glyphs).toHaveLength(4)
    expect(line.rotation).toBeCloseTo(0, 6)
    expect(line.position.x).toBeCloseTo(10, 6)
    expect(line.position.y).toBeCloseTo(20, 6)
    expect(line.height).toBeCloseTo(2.5, 6)
  })

  it('keeps words separated by a normal space in one line', () => {
    const strokes = write('THE LET', { x: 0, y: 0 }, 1)
    const { lines } = clusterPdfTextStrokes(strokes, { textHeight: 1 })
    expect(lines).toHaveLength(1)
    expect(lines[0].glyphs).toHaveLength(6)
  })

  it('separates stacked lines and orders them top to bottom', () => {
    const strokes = [
      ...write('LET', { x: 0, y: 0 }, 1),
      ...write('HELL', { x: 0, y: 2 }, 1)
    ]
    const { lines } = clusterPdfTextStrokes(strokes, { textHeight: 1 })
    expect(lines).toHaveLength(2)
    expect(lines[0].glyphs).toHaveLength(4)
    expect(lines[1].glyphs).toHaveLength(3)
  })

  it('recovers the rotation of rotated text', () => {
    const angle = Math.PI / 6
    const strokes = write('HELLHELL', { x: 5, y: 5 }, 1, angle)
    const { lines } = clusterPdfTextStrokes(strokes, { textHeight: 1 })
    expect(lines).toHaveLength(1)
    expect(lines[0].rotation).toBeCloseTo(angle, 1)
  })

  it('rejects strokes much larger than the text (frames)', () => {
    const frame: PdfTextStroke<number> = {
      id: -1,
      points: [
        { x: -5, y: -5 },
        { x: 50, y: -5 },
        { x: 50, y: 10 },
        { x: -5, y: 10 },
        { x: -5, y: -5 }
      ]
    }
    const strokes = [...write('HELL', { x: 0, y: 0 }, 1), frame]
    expect(estimatePdfTextHeight(strokes)).toBeCloseTo(1, 6)
    const { lines, rejected } = clusterPdfTextStrokes(strokes)
    expect(rejected).toEqual([frame])
    expect(lines).toHaveLength(1)
  })
})

describe('PdfGlyphDictionary', () => {
  it('learns glyphs from one line and recognizes them elsewhere', () => {
    const dict = new PdfGlyphDictionary()
    const first = clusterPdfTextStrokes(write('THE', { x: 0, y: 0 }, 2), {
      textHeight: 2
    }).lines[0]
    expect(dict.learn(first, 'THE')).toBe(3)

    // Same glyphs, different place, size and rotation.
    const other = clusterPdfTextStrokes(
      write('HE ET', { x: 100, y: -40 }, 3.5, Math.PI / 2),
      { textHeight: 3.5 }
    ).lines[0]
    expect(dict.lookup(other)).toBe('HE ET')
  })

  it('returns undefined when a glyph is unknown', () => {
    const dict = new PdfGlyphDictionary()
    dict.learn(
      clusterPdfTextStrokes(write('TE', { x: 0, y: 0 }, 1), { textHeight: 1 })
        .lines[0],
      'TE'
    )
    const line = clusterPdfTextStrokes(write('TL', { x: 0, y: 5 }, 1), {
      textHeight: 1
    }).lines[0]
    expect(dict.lookup(line)).toBeUndefined()
  })

  it('does not learn when character and glyph counts differ', () => {
    const dict = new PdfGlyphDictionary()
    const line = clusterPdfTextStrokes(write('HE', { x: 0, y: 0 }, 1), {
      textHeight: 1
    }).lines[0]
    expect(dict.learn(line, 'HEL')).toBe(0)
    expect(dict.size).toBe(0)
  })
})
