/**
 * Lightweight recognition of exploded dimension text (digits and a few CAD
 * symbols) from stroke geometry. No OCR model or network: each glyph is
 * rasterized onto a small grid and matched against built-in templates.
 */

import type {
  PdfTextGlyph,
  PdfTextLineCandidate
} from './pdfGlyphClustering'
import type { PdfRecPoint } from './pdfRecGeometry'

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
  '-': 0
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

/** Also accept these lookalikes as the canonical dimension character. */
const ALIASES: Record<string, string> = {
  ø: 'Ø',
  '⌀': 'Ø',
  o: '0',
  O: '0'
}

const TEMPLATES: Array<{ char: string; grid: Uint8Array }> = Object.entries(
  STICK
).flatMap(([char, strokes]) => {
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
  const holes = countHoles(grid)
  let best: { char: string; score: number } | undefined
  let second = 0
  for (const template of TEMPLATES) {
    // Soft prior: prefer templates whose hole count matches the ink.
    const holePenalty =
      HOLES[template.char] === undefined
        ? 0
        : HOLES[template.char] === holes
          ? 0
          : 0.12
    const score = jaccard(grid, template.grid) - holePenalty
    if (!best || score > best.score) {
      second = best?.score ?? 0
      best = { char: template.char, score }
    } else if (score > second) {
      second = score
    }
  }
  if (!best || best.score < MIN_SCORE || best.score - second < MIN_MARGIN) {
    return undefined
  }
  return ALIASES[best.char] ?? best.char
}

/** Rasterizes a glyph's strokes into the unit grid, in line-local UV. */
function rasterizeGlyph(
  glyph: PdfTextGlyph,
  line: Pick<PdfTextLineCandidate, 'rotation' | 'position' | 'height'>
): Uint8Array | undefined {
  if (!(line.height > 0)) return undefined
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  const strokes = glyph.strokes.map(stroke =>
    stroke.points.map(p => ({
      x: p.x * c + p.y * s,
      y: -p.x * s + p.y * c
    }))
  )
  return rasterizeStrokes(strokes)
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
