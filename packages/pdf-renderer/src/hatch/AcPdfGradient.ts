import type { AcPdfPoint, AcPdfRgb } from '../renderer/AcPdfStyle'

/** CAD gradient fill (subset of AcGi hatch gradient). */
export interface AcPdfGradientFill {
  name?: string
  angle?: number
  shift?: number
  oneColorMode?: boolean
  shadeTintValue?: number
  startColor?: number
  endColor?: number
}

/** Solid strip used when a pattern cannot be expressed as one Type 2/3 shading. */
export interface AcPdfGradientStrip {
  points: AcPdfPoint[]
  rgb: AcPdfRgb
}

export interface AcPdfShadingSpec {
  /** PDF shading type: 2 axial, 3 radial. */
  shadingType: 2 | 3
  coords: number[]
  c0: AcPdfRgb
  c1: AcPdfRgb
  /**
   * When set, paint these clipped solid strips instead of a PDF shading.
   * Used for CYLINDER (center peak) which Type 2/3 cannot express alone.
   */
  strips?: AcPdfGradientStrip[]
}

const STRIP_COUNT = 48

function packedToRgb(packed: number): AcPdfRgb {
  return {
    r: ((packed >> 16) & 0xff) / 255,
    g: ((packed >> 8) & 0xff) / 255,
    b: (packed & 0xff) / 255
  }
}

function oneColorEnd(start: number, shadeTintValue?: number): number {
  const t = shadeTintValue ?? 0
  const r = (start >> 16) & 0xff
  const g = (start >> 8) & 0xff
  const b = start & 0xff
  const mix = (c: number) => Math.round(c + (t >= 0 ? (255 - c) * t : c * t))
  return (mix(r) << 16) | (mix(g) << 8) | mix(b)
}

function saturate(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = saturate((x - edge0) / (edge1 - edge0 || 1e-9))
  return t * t * (3 - 2 * t)
}

/**
 * Matches {@link AcTrGradientHatchShaders} `getGradientFactor` in local
 * normalized coordinates (≈[-1,1]² after angle rotation).
 */
export function gradientFactor(
  name: string,
  localX: number,
  localY: number,
  shift = 0
): number {
  const shiftedX = localX - Math.max(-1, Math.min(1, shift))
  const linear = saturate(shiftedX * 0.5 + 0.5)
  const cylinder = saturate(1 - Math.abs(shiftedX))
  const radial = saturate(Math.hypot(shiftedX, localY))
  const curved = smoothstep(0, 1, linear)
  const hemi = saturate(1 - Math.hypot(shiftedX, localY + 1) * 0.5)
  switch (name) {
    case 'CYLINDER':
      return cylinder
    case 'INVCYLINDER':
      return 1 - cylinder
    case 'SPHERICAL':
      return 1 - radial
    case 'INVSPHERICAL':
      return radial
    case 'HEMISPHERICAL':
      return hemi
    case 'INVHEMISPHERICAL':
      return 1 - hemi
    case 'CURVED':
      return curved
    case 'INVCURVED':
      return 1 - curved
    default:
      return linear
  }
}

function mixRgb(c0: AcPdfRgb, c1: AcPdfRgb, t: number): AcPdfRgb {
  const u = saturate(t)
  return {
    r: c0.r + (c1.r - c0.r) * u,
    g: c0.g + (c1.g - c0.g) * u,
    b: c0.b + (c1.b - c0.b) * u
  }
}

function loopsCenter(loops: AcPdfPoint[][]): {
  cx: number
  cy: number
  rx: number
  ry: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const loop of loops) {
    for (const p of loop) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  if (!Number.isFinite(minX)) {
    return { cx: 0, cy: 0, rx: 1, ry: 1 }
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: Math.max((maxX - minX) / 2, 1e-6),
    ry: Math.max((maxY - minY) / 2, 1e-6)
  }
}

function buildAxisStrips(
  name: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number,
  shift: number,
  start: AcPdfRgb,
  end: AcPdfRgb
): AcPdfGradientStrip[] {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const nx = -dy
  const ny = dx
  const span = Math.max(rx, ry)
  const cross = Math.max(rx, ry) * 1.5
  const strips: AcPdfGradientStrip[] = []
  for (let i = 0; i < STRIP_COUNT; i++) {
    const t0 = (i / STRIP_COUNT) * 2 - 1
    const t1 = ((i + 1) / STRIP_COUNT) * 2 - 1
    const tm = (t0 + t1) * 0.5
    const factor = gradientFactor(name, tm, 0, shift)
    const rgb = mixRgb(start, end, factor)
    const a0 = t0 * span
    const a1 = t1 * span
    const p0x = cx + dx * a0
    const p0y = cy + dy * a0
    const p1x = cx + dx * a1
    const p1y = cy + dy * a1
    strips.push({
      rgb,
      points: [
        { x: p0x + nx * cross, y: p0y + ny * cross },
        { x: p1x + nx * cross, y: p1y + ny * cross },
        { x: p1x - nx * cross, y: p1y - ny * cross },
        { x: p0x - nx * cross, y: p0y - ny * cross }
      ]
    })
  }
  return strips
}

/**
 * Builds a PDF shading (or clipped solid strips) for a CAD gradient hatch.
 *
 * Factor curves match the Three.js viewer shader. Patterns that map cleanly
 * to Type 2/3 use a linear FunctionType 2 with the correct C0/C1 order.
 * CYLINDER / INVCYLINDER use solid strips (a single axial shading cannot peak
 * in the middle).
 */
export function shadingFromGradient(
  gradient: AcPdfGradientFill,
  loops: AcPdfPoint[][],
  fallbackPacked: number
): AcPdfShadingSpec {
  const startPacked = gradient.startColor ?? fallbackPacked
  const endPacked =
    gradient.endColor ??
    (gradient.oneColorMode
      ? oneColorEnd(startPacked, gradient.shadeTintValue)
      : fallbackPacked)
  const start = packedToRgb(startPacked)
  const end = packedToRgb(endPacked)
  const { cx, cy, rx, ry } = loopsCenter(loops)
  const angle = gradient.angle ?? 0
  const shift = Math.max(-1, Math.min(1, gradient.shift ?? 0))
  const name = (gradient.name || 'LINEAR').trim().toUpperCase()
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)

  if (name === 'CYLINDER' || name === 'INVCYLINDER') {
    return {
      shadingType: 2,
      coords: [cx, cy, cx + dx, cy + dy],
      c0: start,
      c1: end,
      strips: buildAxisStrips(name, cx, cy, rx, ry, angle, shift, start, end)
    }
  }

  if (name.includes('HEMI')) {
    // Viewer hemi is radial about the bottom-center of the normalized box.
    // SPHERICAL-like: factor high at center → end color at r=0.
    const invert = name.startsWith('INV')
    const hx = cx
    const hy = cy - ry
    const r1 = Math.hypot(rx, 2 * ry)
    return {
      shadingType: 3,
      coords: [hx, hy, 0, hx + dx * shift * r1, hy + dy * shift * r1, r1],
      c0: invert ? start : end,
      c1: invert ? end : start
    }
  }

  if (name.includes('SPHER')) {
    const invert = name.startsWith('INV')
    const r1 = Math.max(rx, ry)
    return {
      shadingType: 3,
      coords: [cx, cy, 0, cx + dx * shift * r1, cy + dy * shift * r1, r1],
      // SPHERICAL: yellow center (end) → blue edge (start)
      c0: invert ? start : end,
      c1: invert ? end : start
    }
  }

  // LINEAR / CURVED / INVCURVED — axial. Invert color order for INV*.
  const invert = name.startsWith('INV')
  const span = Math.hypot(rx, ry)
  const x0 = cx - dx * span + dx * shift * span
  const y0 = cy - dy * span + dy * shift * span
  const x1 = cx + dx * span + dx * shift * span
  const y1 = cy + dy * span + dy * shift * span
  return {
    shadingType: 2,
    coords: [x0, y0, x1, y1],
    c0: invert ? end : start,
    c1: invert ? start : end
  }
}
