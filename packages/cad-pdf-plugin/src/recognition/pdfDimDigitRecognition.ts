/**
 * Lightweight recognition of exploded dimension text (digits and a few CAD
 * symbols) from stroke geometry. No OCR model or network: each glyph is
 * rasterized onto a small grid and matched against built-in templates.
 */

import type {
  PdfTextGlyph,
  PdfTextLineCandidate
} from './pdfGlyphClustering.js'
import type { PdfRecPoint } from './pdfRecGeometry.js'

/** Grid size for one glyph (width × height). */
const GW = 12
const GH = 16

/** Gap between glyphs (fraction of height) that inserts a space. */
const SPACE_GAP = 0.85

/** Minimum score to accept a template match (Jaccard). */
const MIN_SCORE = 0.34

/** Winner must beat the runner-up by at least this margin. */
const MIN_MARGIN = 0.03

/** Expected enclosed holes for digits that templates can form. */
const HOLES: Record<string, number> = {
  '0': 1,
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 1,
  '5': 0,
  '6': 1,
  '7': 0,
  '8': 2,
  '9': 1,
  '.': 0,
  ',': 0,
  R: 1,
  Ø: 1,
  '°': 1,
  x: 0,
  '-': 0,
  M: 0,
  '±': 0,
  '⌒': 0
}

type P = PdfRecPoint

/** Stick-font strokes in a unit cell [0,1]×[0,1] (baseline at 0, cap at 1). */
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
  '3': [
    [
      { x: 0.2, y: 0.9 },
      { x: 0.8, y: 0.9 },
      { x: 0.8, y: 0.5 },
      { x: 0.35, y: 0.5 }
    ],
    [
      { x: 0.8, y: 0.5 },
      { x: 0.8, y: 0.05 },
      { x: 0.2, y: 0.05 }
    ]
  ],
  '4': [
    [
      { x: 0.7, y: 0.05 },
      { x: 0.7, y: 0.95 }
    ],
    [
      { x: 0.7, y: 0.95 },
      { x: 0.2, y: 0.4 }
    ],
    [
      { x: 0.2, y: 0.4 },
      { x: 0.85, y: 0.4 }
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
  '6': [
    [
      { x: 0.75, y: 0.95 },
      { x: 0.25, y: 0.95 },
      { x: 0.2, y: 0.5 },
      { x: 0.2, y: 0.15 },
      { x: 0.35, y: 0.05 },
      { x: 0.75, y: 0.05 },
      { x: 0.8, y: 0.2 },
      { x: 0.8, y: 0.45 },
      { x: 0.25, y: 0.5 }
    ]
  ],
  '7': [
    [
      { x: 0.2, y: 0.95 },
      { x: 0.8, y: 0.95 },
      { x: 0.35, y: 0.05 }
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
  '9': [
    [
      { x: 0.25, y: 0.05 },
      { x: 0.75, y: 0.05 },
      { x: 0.8, y: 0.5 },
      { x: 0.8, y: 0.85 },
      { x: 0.65, y: 0.95 },
      { x: 0.25, y: 0.95 },
      { x: 0.2, y: 0.8 },
      { x: 0.2, y: 0.55 },
      { x: 0.75, y: 0.5 }
    ]
  ],
  '.': [
    [
      { x: 0.4, y: 0.05 },
      { x: 0.6, y: 0.05 },
      { x: 0.6, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.4, y: 0.05 }
    ]
  ],
  ',': [
    [
      { x: 0.4, y: 0.05 },
      { x: 0.6, y: 0.05 },
      { x: 0.6, y: 0.2 },
      { x: 0.35, y: -0.1 }
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
  ],
  '°': [
    [
      { x: 0.5, y: 0.7 },
      { x: 0.65, y: 0.75 },
      { x: 0.7, y: 0.9 },
      { x: 0.55, y: 0.95 },
      { x: 0.4, y: 0.9 },
      { x: 0.35, y: 0.75 },
      { x: 0.5, y: 0.7 }
    ]
  ],
  x: [
    [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.8 }
    ],
    [
      { x: 0.8, y: 0.2 },
      { x: 0.2, y: 0.8 }
    ]
  ],
  '-': [
    [
      { x: 0.15, y: 0.5 },
      { x: 0.85, y: 0.5 }
    ]
  ]
}

/**
 * Rounded variants (romans / isocp / simplex style SHX fonts). The stick set
 * above is blocky; most CAD dimension fonts curve their bowls, which the
 * block shapes miss by more than {@link MIN_SCORE}.
 */
const ROUNDED: Array<[string, P[][]]> = [
  [
    '1',
    [
      [
        { x: 0.1, y: 0.8 },
        { x: 0.55, y: 1 },
        { x: 0.55, y: 0 }
      ]
    ]
  ],
  [
    '2',
    [
      [
        { x: 0.12, y: 0.78 },
        { x: 0.2, y: 0.92 },
        { x: 0.38, y: 1 },
        { x: 0.62, y: 1 },
        { x: 0.8, y: 0.92 },
        { x: 0.88, y: 0.78 },
        { x: 0.85, y: 0.62 },
        { x: 0.72, y: 0.45 },
        { x: 0.1, y: 0 },
        { x: 0.92, y: 0 }
      ]
    ]
  ],
  [
    '3',
    [
      [
        { x: 0.15, y: 0.85 },
        { x: 0.35, y: 1 },
        { x: 0.65, y: 1 },
        { x: 0.82, y: 0.88 },
        { x: 0.82, y: 0.68 },
        { x: 0.65, y: 0.56 },
        { x: 0.4, y: 0.55 }
      ],
      [
        { x: 0.65, y: 0.54 },
        { x: 0.86, y: 0.4 },
        { x: 0.88, y: 0.18 },
        { x: 0.7, y: 0.02 },
        { x: 0.35, y: 0 },
        { x: 0.12, y: 0.15 }
      ]
    ]
  ],
  [
    '5',
    [
      [
        { x: 0.85, y: 1 },
        { x: 0.18, y: 1 },
        { x: 0.12, y: 0.6 },
        { x: 0.3, y: 0.66 },
        { x: 0.55, y: 0.67 },
        { x: 0.78, y: 0.58 },
        { x: 0.9, y: 0.4 },
        { x: 0.9, y: 0.22 },
        { x: 0.78, y: 0.06 },
        { x: 0.55, y: 0 },
        { x: 0.3, y: 0 },
        { x: 0.1, y: 0.1 },
        { x: 0.02, y: 0.2 }
      ]
    ]
  ],
  [
    '6',
    [
      [
        { x: 0.82, y: 0.88 },
        { x: 0.65, y: 1 },
        { x: 0.38, y: 1 },
        { x: 0.18, y: 0.85 },
        { x: 0.1, y: 0.55 },
        { x: 0.1, y: 0.25 },
        { x: 0.22, y: 0.05 },
        { x: 0.45, y: 0 },
        { x: 0.7, y: 0.05 },
        { x: 0.88, y: 0.22 },
        { x: 0.88, y: 0.42 },
        { x: 0.7, y: 0.6 },
        { x: 0.45, y: 0.64 },
        { x: 0.22, y: 0.56 },
        { x: 0.1, y: 0.4 }
      ]
    ]
  ],
  [
    '9',
    [
      [
        { x: 0.9, y: 0.6 },
        { x: 0.78, y: 0.42 },
        { x: 0.55, y: 0.36 },
        { x: 0.3, y: 0.4 },
        { x: 0.12, y: 0.58 },
        { x: 0.12, y: 0.78 },
        { x: 0.3, y: 0.95 },
        { x: 0.55, y: 1 },
        { x: 0.78, y: 0.95 },
        { x: 0.9, y: 0.75 },
        { x: 0.9, y: 0.45 },
        { x: 0.82, y: 0.15 },
        { x: 0.62, y: 0 },
        { x: 0.35, y: 0 },
        { x: 0.18, y: 0.12 }
      ]
    ]
  ],
  [
    '8',
    [
      [
        { x: 0.5, y: 0.56 },
        { x: 0.25, y: 0.64 },
        { x: 0.15, y: 0.8 },
        { x: 0.25, y: 0.95 },
        { x: 0.5, y: 1 },
        { x: 0.75, y: 0.95 },
        { x: 0.85, y: 0.8 },
        { x: 0.75, y: 0.64 },
        { x: 0.5, y: 0.56 },
        { x: 0.2, y: 0.46 },
        { x: 0.08, y: 0.28 },
        { x: 0.15, y: 0.08 },
        { x: 0.5, y: 0 },
        { x: 0.85, y: 0.08 },
        { x: 0.92, y: 0.28 },
        { x: 0.8, y: 0.46 },
        { x: 0.5, y: 0.56 }
      ]
    ]
  ],
  [
    '0',
    [
      [
        { x: 0.5, y: 1 },
        { x: 0.22, y: 0.9 },
        { x: 0.08, y: 0.6 },
        { x: 0.08, y: 0.4 },
        { x: 0.22, y: 0.1 },
        { x: 0.5, y: 0 },
        { x: 0.78, y: 0.1 },
        { x: 0.92, y: 0.4 },
        { x: 0.92, y: 0.6 },
        { x: 0.78, y: 0.9 },
        { x: 0.5, y: 1 }
      ]
    ]
  ],
  [
    '4',
    [
      [
        { x: 0.68, y: 0 },
        { x: 0.68, y: 1 },
        { x: 0.05, y: 0.32 },
        { x: 0.95, y: 0.32 }
      ]
    ]
  ],
  [
    'M',
    [
      [
        { x: 0.05, y: 0 },
        { x: 0.05, y: 1 },
        { x: 0.5, y: 0 },
        { x: 0.95, y: 1 },
        { x: 0.95, y: 0 }
      ]
    ]
  ],
  [
    '±',
    [
      [
        { x: 0.5, y: 0.35 },
        { x: 0.5, y: 0.95 }
      ],
      [
        { x: 0.15, y: 0.65 },
        { x: 0.85, y: 0.65 }
      ],
      [
        { x: 0.15, y: 0.1 },
        { x: 0.85, y: 0.1 }
      ]
    ]
  ],
  [
    '⌒',
    [
      [
        { x: 0.05, y: 0.55 },
        { x: 0.2, y: 0.82 },
        { x: 0.5, y: 0.95 },
        { x: 0.8, y: 0.82 },
        { x: 0.95, y: 0.55 }
      ]
    ]
  ]
]

/** Also accept these lookalikes as the canonical dimension character. */
const ALIASES: Record<string, string> = {
  ø: 'Ø',
  '⌀': 'Ø',
  o: '0',
  O: '0'
}

const TEMPLATES: Array<{ char: string; grid: Uint8Array }> = [
  ...Object.entries(STICK),
  ...ROUNDED
].flatMap(([char, strokes]) => {
  const grid = rasterizeStrokes(strokes)
  return grid ? [{ char, grid }] : []
})

/**
 * Reads a clustered stroke text line as a dimension value when every glyph
 * matches a digit or CAD symbol template.
 *
 * @returns The string (e.g. `55`, `Ø12`, `R10`, `45°`), or `undefined`.
 */
export function recognizePdfDimStrokeText(
  line: PdfTextLineCandidate
): string | undefined {
  if (line.glyphs.length === 0) return undefined
  let text = ''
  for (let i = 0; i < line.glyphs.length; i++) {
    const glyph = line.glyphs[i]
    const char = recognizePdfDimGlyph(glyph, line)
    if (!char) return undefined
    if (
      i > 0 &&
      glyph.minU - line.glyphs[i - 1].maxU > SPACE_GAP * line.height
    ) {
      text += ' '
    }
    text += char
  }
  // Dimension values rarely need spaces; clustering gaps are noisy.
  const compact = text.replace(/\s+/g, '')
  return compact.length > 0 ? compact : undefined
}

/**
 * Matches one glyph box against the built-in digit / symbol templates.
 */
export function recognizePdfDimGlyph(
  glyph: PdfTextGlyph,
  line: Pick<PdfTextLineCandidate, 'rotation' | 'position' | 'height'>
): string | undefined {
  const grid = rasterizeGlyph(glyph, line)
  if (!grid) return undefined
  // Narrow glyphs (under a quarter of the height) can only be 1 . , or a
  // stroke: rasterizing letterboxes them, which hides how thin they are.
  const aspect = line.height > 0 ? (glyph.maxU - glyph.minU) / line.height : 1
  const tall = (glyph.maxV - glyph.minV) / Math.max(line.height, 1e-9)
  if (aspect < 0.25 && tall > 0.6) return '1'
  // A "1" with a flag is still far narrower than other digits (≥ 0.45 of
  // the height in CAD fonts); without a foot serif no template fits it well.
  if (aspect < 0.38 && tall > 0.8 && !hasFootSerif(grid)) return '1'
  // A speck on the baseline is a decimal point; one hanging below it is a
  // comma. Templates stretch such specks to the full cell and miss them.
  if (aspect < 0.25 && tall < 0.25) {
    const baseV =
      -line.position.x * Math.sin(line.rotation) +
      line.position.y * Math.cos(line.rotation)
    const below = (baseV - glyph.minV) / Math.max(line.height, 1e-9)
    return below > 0.1 ? ',' : '.'
  }
  const holes = countHoles(grid)
  // Best score per character: variants of one character are not rivals.
  const byChar = new Map<string, number>()
  for (const template of TEMPLATES) {
    // Soft prior: prefer templates whose hole count matches the ink.
    const holePenalty =
      HOLES[template.char] === undefined
        ? 0
        : HOLES[template.char] === holes
          ? 0
          : 0.12
    const score = jaccard(grid, template.grid) - holePenalty
    if (score > (byChar.get(template.char) ?? -Infinity)) {
      byChar.set(template.char, score)
    }
  }
  let best: { char: string; score: number } | undefined
  let second = 0
  for (const [char, score] of byChar) {
    if (!best || score > best.score) {
      second = best?.score ?? 0
      best = { char, score }
    } else if (score > second) {
      second = score
    }
  }
  if (!best || best.score < MIN_SCORE || best.score - second < MIN_MARGIN) {
    return undefined
  }
  return ALIASES[best.char] ?? best.char
}

/** Whether the bottom row spans most of the cell (a "1" with a foot). */
function hasFootSerif(grid: Uint8Array): boolean {
  let on = 0
  for (let x = 0; x < GW; x++) on += grid[(GH - 1) * GW + x]
  return on >= GW * 0.6
}

/** Rasterizes a glyph's strokes into the unit grid, in line-local UV. */
function rasterizeGlyph(
  glyph: PdfTextGlyph,
  line: Pick<PdfTextLineCandidate, 'rotation' | 'position' | 'height'>
): Uint8Array | undefined {
  if (!(line.height > 0)) return undefined
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  const toLocal = (p: P) => ({ x: p.x * c + p.y * s, y: -p.x * s + p.y * c })
  if (glyph.strokes.some(stroke => stroke.filled)) {
    return rasterizeFilled(
      glyph.strokes.map(stroke => stroke.points.map(toLocal))
    )
  }
  return rasterizeStrokes(
    glyph.strokes.map(stroke => stroke.points.map(toLocal))
  )
}

/**
 * Rasterizes filled glyph contours (even-odd, so inner contours are holes)
 * at a finer resolution, thins the ink to its centre line and draws that
 * skeleton into the template grid with the same pen as stick strokes.
 */
function rasterizeFilled(contours: P[][]): Uint8Array | undefined {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const contour of contours) {
    for (const p of contour) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  const height = maxY - minY
  const width = maxX - minX
  if (!(height > 0)) return undefined
  // Fine grid: 48 rows over the glyph height keep strokes several cells thick.
  const rows = 48
  const cell = height / rows
  const cols = Math.max(1, Math.ceil(width / cell))
  const ink = new Uint8Array(rows * cols)
  for (let r = 0; r < rows; r++) {
    const y = minY + (r + 0.5) * cell
    // Even-odd scanline: toggle at every contour edge crossing.
    const xs: number[] = []
    for (const contour of contours) {
      for (let i = 0; i + 1 < contour.length; i++) {
        const a = contour[i]
        const b = contour[i + 1]
        if (a.y <= y !== b.y <= y) {
          xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x))
        }
      }
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.floor((xs[k] - minX) / cell))
      const c1 = Math.min(cols - 1, Math.floor((xs[k + 1] - minX) / cell))
      // Row 0 is the bottom here.
      for (let col = c0; col <= c1; col++) ink[r * cols + col] = 1
    }
  }
  thin(ink, cols, rows)
  // Normalize the skeleton like stick strokes: its own box fills the cell
  // (a filled glyph's outline box is a stroke width larger on every side).
  let sx0 = Infinity
  let sy0 = Infinity
  let sx1 = -Infinity
  let sy1 = -Infinity
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (!ink[r * cols + col]) continue
      sx0 = Math.min(sx0, col)
      sx1 = Math.max(sx1, col)
      sy0 = Math.min(sy0, r)
      sy1 = Math.max(sy1, r)
    }
  }
  if (!Number.isFinite(sx0)) return undefined
  const skW = sx1 - sx0
  const skH = Math.max(sy1 - sy0, 1e-9)
  const spanX = Math.max(skW, skH * 0.35, 1e-9)
  const padX = (spanX - skW) / 2
  const grid = new Uint8Array(GW * GH)
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (!ink[r * cols + col]) continue
      paintDisk(grid, (col - sx0 + padX) / spanX, (r - sy0) / skH, 0.1)
    }
  }
  let on = 0
  for (let i = 0; i < grid.length; i++) on += grid[i]
  return on >= 2 ? grid : undefined
}

/** Zhang–Suen thinning of a binary image (in place). */
function thin(img: Uint8Array, w: number, h: number) {
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]
  let changed = true
  while (changed) {
    changed = false
    for (const step of [0, 1]) {
      const clear: number[] = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!img[y * w + x]) continue
          const p2 = at(x, y + 1)
          const p3 = at(x + 1, y + 1)
          const p4 = at(x + 1, y)
          const p5 = at(x + 1, y - 1)
          const p6 = at(x, y - 1)
          const p7 = at(x - 1, y - 1)
          const p8 = at(x - 1, y)
          const p9 = at(x - 1, y + 1)
          const ring = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
          if (b < 2 || b > 6) continue
          let a = 0
          for (let i = 0; i < 8; i++) if (!ring[i] && ring[i + 1]) a++
          if (a !== 1) continue
          if (
            step === 0
              ? p2 * p4 * p6 || p4 * p6 * p8
              : p2 * p4 * p8 || p2 * p6 * p8
          ) {
            continue
          }
          clear.push(y * w + x)
        }
      }
      for (const i of clear) img[i] = 0
      if (clear.length > 0) changed = true
    }
  }
}

/**
 * Fits strokes into the grid by their axis-aligned bbox so template and
 * live glyphs share the same normalization (content fills the cell, thin
 * glyphs such as `1` stay letterboxed).
 */
function rasterizeStrokes(strokes: P[][]): Uint8Array | undefined {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of strokes) {
    for (const p of stroke) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  const width = maxX - minX
  const height = maxY - minY
  if (!(width > 0 || height > 0)) return undefined
  const spanX = Math.max(width, height * 0.35, 1e-9)
  const spanY = Math.max(height, 1e-9)
  const padX = (spanX - width) / 2
  const grid = new Uint8Array(GW * GH)
  const pen = 0.1
  for (const stroke of strokes) {
    const pts = stroke.map(p => ({
      x: (p.x - minX + padX) / spanX,
      y: (p.y - minY) / spanY
    }))
    strokeGrid(grid, pts, pen)
  }
  let on = 0
  for (let i = 0; i < grid.length; i++) on += grid[i]
  return on >= 2 ? grid : undefined
}

function strokeGrid(grid: Uint8Array, points: P[], pen: number) {
  for (let i = 0; i < points.length - 1; i++) {
    paintSegment(grid, points[i], points[i + 1], pen)
  }
  if (points.length === 1) paintDisk(grid, points[0].x, points[0].y, pen)
}

function paintSegment(grid: Uint8Array, a: P, b: P, pen: number) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (pen * 0.45))
  )
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    paintDisk(grid, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, pen)
  }
}

function paintDisk(grid: Uint8Array, x: number, y: number, pen: number) {
  // y=0 is the bottom of the bbox, y=1 the top → flip for row 0 at top.
  const cx = x * (GW - 1)
  const cy = (1 - y) * (GH - 1)
  const r = pen * Math.max(GW, GH)
  const x0 = Math.max(0, Math.floor(cx - r))
  const x1 = Math.min(GW - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const y1 = Math.min(GH - 1, Math.ceil(cy + r))
  const r2 = r * r
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      const dx = gx - cx
      const dy = gy - cy
      if (dx * dx + dy * dy <= r2) grid[gy * GW + gx] = 1
    }
  }
}

function jaccard(a: Uint8Array, b: Uint8Array): number {
  let inter = 0
  let union = 0
  for (let i = 0; i < a.length; i++) {
    const av = a[i]
    const bv = b[i]
    inter += av & bv
    union += av | bv
  }
  return union > 0 ? inter / union : 0
}

/**
 * Counts background components not connected to the grid border (holes
 * inside digit ink). Used to separate 0/4/6/9/Ø (1) from 8 (2) and 1/2/3/5/7 (0).
 */
function countHoles(grid: Uint8Array): number {
  const seen = new Uint8Array(grid.length)
  const flood = (start: number) => {
    const stack = [start]
    seen[start] = 1
    while (stack.length > 0) {
      const i = stack.pop()!
      const x = i % GW
      const y = (i / GW) | 0
      const push = (nx: number, ny: number) => {
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) return
        const j = ny * GW + nx
        if (seen[j] || grid[j]) return
        seen[j] = 1
        stack.push(j)
      }
      push(x - 1, y)
      push(x + 1, y)
      push(x, y - 1)
      push(x, y + 1)
    }
  }
  // Exterior: every empty cell on the border.
  for (let x = 0; x < GW; x++) {
    if (!grid[x]) flood(x)
    if (!grid[(GH - 1) * GW + x]) flood((GH - 1) * GW + x)
  }
  for (let y = 0; y < GH; y++) {
    if (!grid[y * GW]) flood(y * GW)
    if (!grid[y * GW + GW - 1]) flood(y * GW + GW - 1)
  }
  let holes = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] || seen[i]) continue
    holes++
    flood(i)
  }
  return holes
}
