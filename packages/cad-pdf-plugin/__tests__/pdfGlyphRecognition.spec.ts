import {
  clusterPdfTextStrokes,
  estimatePdfTextHeight,
  type PdfTextStroke
} from '../src/recognition/pdfGlyphClustering'
import { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

type P = { x: number; y: number }

/** An ellipse filling the 0.6 × 1 cell, as one closed 16-sided stroke. */
const ROUND: P[] = Array.from({ length: 17 }, (_, i) => {
  const t = (i / 16) * Math.PI * 2
  return { x: 0.3 + 0.3 * Math.cos(t), y: 0.5 + 0.5 * Math.sin(t) }
})

/** Minimal stroke font in a 0.6 × 1 cell (cap height 1). */
const FONT: Record<string, P[][]> = {
  O: [ROUND],
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

  it('estimates the height of text exploded into short line segments', () => {
    // Some PDFs store each glyph stroke as many tiny separate lines, so
    // single strokes are far smaller than the text.
    const strokes = explode([
      ...write('THE HELL', { x: 0, y: 4 }, 1),
      ...write('LET', { x: 0, y: 2 }, 1)
    ])
    expect(estimatePdfTextHeight(strokes)).toBeCloseTo(1, 6)
    const { lines, rejected } = clusterPdfTextStrokes(strokes)
    expect(rejected).toHaveLength(0)
    expect(lines.map(line => line.glyphs.length)).toEqual([7, 3])
    expect(lines[0].height).toBeCloseTo(1, 6)
    expect(lines[0].rotation).toBeCloseTo(0, 6)
  })

  it('keeps the long strokes of a title taller than the body text', () => {
    // Body text sets the estimated height. As in real PDFs, the title has
    // round strokes made of short segments, while its straight strokes are
    // longer than the body text allows (one is even kept as one segment).
    // Straight strokes are only attached back through the round ones: a
    // title of nothing but long straight strokes cannot be told from lines.
    const titleStrokes = write('LOT', { x: 0, y: 14 }, 4)
    const long = titleStrokes[titleStrokes.length - 1]
    // A piece hanging below the title, split off from it as its own row.
    const piece: PdfTextStroke<number> = {
      id: -3,
      points: [
        { x: 5, y: 13.1 },
        { x: 5, y: 13.4 }
      ]
    }
    const title = [...explode(titleStrokes.slice(0, -1)), long, piece]
    const underline: PdfTextStroke<number> = {
      id: -2,
      points: [
        { x: 0, y: 13.5 },
        { x: 9, y: 13.5 }
      ]
    }
    const body = [10, 8, 6, 4].flatMap(y => write('THE HELL', { x: 0, y }, 1))
    const strokes = [
      ...title,
      underline,
      ...explode([...body, ...write('LET', { x: 0, y: 2 }, 1)])
    ]
    // Precondition: title strokes are too long for the estimated height.
    expect(estimatePdfTextHeight(strokes) * 1.5).toBeLessThan(4)
    const { lines, rejected } = clusterPdfTextStrokes(strokes)
    expect(rejected).toEqual([underline])
    expect(lines.map(line => line.glyphs.length)).toEqual([3, 7, 7, 7, 7, 3])
    expect(lines[0].strokes).toHaveLength(title.length)
    expect(lines[0].strokes).toEqual(expect.arrayContaining([long, piece]))
    expect(lines[0].height).toBeCloseTo(4, 6)
  })

  it('ignores table grid lines exploded into short segments', () => {
    // A narrow table column: one cell per row. The PDF splits the grid into
    // segments shorter than the text, which used to glue the cells into one
    // tall block read as vertical text, one glyph per line.
    const rows = 5
    const cellW = 3.5
    const cellH = 2.5
    const segment = (a: P, b: P): PdfTextStroke<number> => ({
      id: nextId++,
      points: [a, b]
    })
    const grid: PdfTextStroke<number>[] = []
    for (let x = 0; x <= cellW; x += cellW) {
      for (let y = 0; y < rows * cellH; y += 0.5) {
        grid.push(segment({ x, y }, { x, y: y + 0.5 }))
      }
    }
    for (let r = 0; r <= rows; r++) {
      for (let x = 0; x < cellW; x += 0.5) {
        const y = r * cellH
        grid.push(segment({ x, y }, { x: Math.min(x + 0.5, cellW), y }))
      }
    }
    const text = Array.from({ length: rows }, (_, r) =>
      write('LET', { x: 0.5, y: r * cellH + 0.75 }, 1)
    ).flat()

    const { lines, rejected } = clusterPdfTextStrokes([...grid, ...text])
    expect(lines).toHaveLength(rows)
    lines.forEach(line => {
      expect(line.rotation).toBeCloseTo(0, 6)
      expect(line.glyphs).toHaveLength(3)
      expect(line.height).toBeCloseTo(1, 6)
    })
    expect(new Set(rejected)).toEqual(new Set(grid))
  })
})

/** Splits every stroke into separate segments about 0.1 long. */
function explode(strokes: PdfTextStroke<number>[]): PdfTextStroke<number>[] {
  const out: PdfTextStroke<number>[] = []
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const a = stroke.points[i - 1]
      const b = stroke.points[i]
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 0.1))
      for (let k = 0; k < n; k++) {
        const at = (t: number) => ({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t
        })
        out.push({ id: nextId++, points: [at(k / n), at((k + 1) / n)] })
      }
    }
  }
  return out
}

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

  it('round-trips through JSON and keeps the most recent entries', () => {
    const dict = new PdfGlyphDictionary()
    const line = clusterPdfTextStrokes(write('THE', { x: 0, y: 0 }, 2), {
      textHeight: 2
    }).lines[0]
    dict.learn(line, 'THE')

    const restored = new PdfGlyphDictionary()
    expect(restored.load(JSON.parse(JSON.stringify(dict.toJSON())))).toBe(3)
    const other = clusterPdfTextStrokes(write('HE', { x: 50, y: 0 }, 2), {
      textHeight: 2
    }).lines[0]
    expect(restored.lookup(other)).toBe('HE')

    expect(dict.toJSON(1)).toEqual([dict.toJSON()[2]])
    expect(restored.load([['x', 'too long'], 'bad', ['y', 'Z']])).toBe(1)
  })
})
