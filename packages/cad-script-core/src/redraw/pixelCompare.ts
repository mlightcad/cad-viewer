/**
 * Pixel-level comparison between a reference image and a rendered drawing.
 *
 * Everything here works on plain RGBA buffers so it runs in Node, workers, and
 * tests without a DOM. Hosts decode / render / encode images and pass them in.
 *
 * Pipeline: ink extraction (adaptive threshold against the local background)
 * → Zhang–Suen thinning to 1-px centerlines → registration (warp the rendered
 * drawing into the reference frame through the pixel → CAD transform) →
 * chamfer distance transforms → coverage / precision / distance metrics,
 * hotspot cells, overlay and difference images.
 */

import type { Point2dInput } from '../tools/types.js'

/** Straight (non-premultiplied) RGBA image, row-major from the top-left. */
export interface CadRasterImage {
  width: number
  height: number
  /** `width * height * 4` bytes. */
  data: Uint8ClampedArray
}

/** Binary mask, `1` = ink. */
export interface InkMask {
  width: number
  height: number
  data: Uint8Array
}

/** Creates an RGBA image filled with one color. */
export function acexCreateRaster(
  width: number,
  height: number,
  rgba: [number, number, number, number] = [255, 255, 255, 255]
): CadRasterImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0]
    data[i + 1] = rgba[1]
    data[i + 2] = rgba[2]
    data[i + 3] = rgba[3]
  }
  return { width, height, data }
}

/** Nearest-neighbour-free box downscale so the long side is at most `maxSide`. */
export function acexDownscaleRaster(
  image: CadRasterImage,
  maxSide: number
): { image: CadRasterImage; scale: number } {
  const longSide = Math.max(image.width, image.height)
  if (longSide <= maxSide) return { image, scale: 1 }
  const scale = maxSide / longSide
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const out = new Uint8ClampedArray(width * height * 4)
  const sx = image.width / width
  const sy = image.height / height
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      // Keep the darkest / most contrasting sample too so thin lines survive.
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * image.width + xx) * 4
          r += image.data[i]
          g += image.data[i + 1]
          b += image.data[i + 2]
          a += image.data[i + 3]
          n++
        }
      }
      const o = (y * width + x) * 4
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
      out[o + 3] = a / n
    }
  }
  return { image: { width, height, data: out }, scale }
}

/** Luma (0–255) with alpha composited over white. */
function lumaOf(image: CadRasterImage): Float32Array {
  const { width, height, data } = image
  const out = new Float32Array(width * height)
  for (let p = 0, i = 0; p < out.length; p++, i += 4) {
    const alpha = data[i + 3] / 255
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    out[p] = luma * alpha + 255 * (1 - alpha)
  }
  return out
}

/** Median of the border luma, used to decide light vs dark background. */
function borderMedian(luma: Float32Array, width: number, height: number) {
  const samples: number[] = []
  const step = Math.max(1, Math.floor((width + height) / 400))
  for (let x = 0; x < width; x += step) {
    samples.push(luma[x], luma[(height - 1) * width + x])
  }
  for (let y = 0; y < height; y += step) {
    samples.push(luma[y * width], luma[y * width + width - 1])
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)] ?? 255
}

/** Options for {@link acexExtractInk}. */
export interface InkOptions {
  /** Minimum luma contrast against the local background. Default 40. */
  contrast?: number
  /** Half-size of the local-mean window in pixels. Default ~1/40 of the long side. */
  radius?: number
}

/**
 * Extracts "ink" (lines, text, fills) as a binary mask.
 *
 * Works for both scans (dark ink on light paper) and CAD screenshots (light
 * lines on a dark background): the polarity comes from the border median and
 * each pixel is compared with its local mean, so uneven lighting and paper
 * tone do not flood the mask.
 */
export function acexExtractInk(
  image: CadRasterImage,
  options: InkOptions = {}
): InkMask {
  const { width, height } = image
  const luma = lumaOf(image)
  const darkInk = borderMedian(luma, width, height) >= 128
  const contrast = options.contrast ?? 40
  const radius = Math.max(
    2,
    Math.round(options.radius ?? Math.max(width, height) / 40)
  )

  // Integral image for O(1) local means.
  const stride = width + 1
  const integral = new Float64Array(stride * (height + 1))
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      row += luma[y * width + x]
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row
    }
  }

  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(height, y + radius + 1)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width, x + radius + 1)
      const sum =
        integral[y1 * stride + x1] -
        integral[y0 * stride + x1] -
        integral[y1 * stride + x0] +
        integral[y0 * stride + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      const v = luma[y * width + x]
      // A line darker (or lighter) than its neighbourhood is ink. The global
      // check keeps solid fills (where the local mean equals the fill) inked.
      const local = darkInk ? mean - v : v - mean
      data[y * width + x] = local >= contrast ? 1 : 0
    }
  }
  return { width, height, data }
}

/**
 * Zhang–Suen thinning: reduces strokes of any width to 1-px centerlines so a
 * 3-px pen stroke and a 1-px rendered line compare fairly.
 */
export function acexThinInk(mask: InkMask): InkMask {
  const { width, height } = mask
  const img = new Uint8Array(mask.data)
  const remove: number[] = []
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : img[y * width + x]
  let changed = true
  let iterations = 0
  while (changed && iterations < 100) {
    changed = false
    iterations++
    for (let pass = 0; pass < 2; pass++) {
      remove.length = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!img[y * width + x]) continue
          const p2 = at(x, y - 1)
          const p3 = at(x + 1, y - 1)
          const p4 = at(x + 1, y)
          const p5 = at(x + 1, y + 1)
          const p6 = at(x, y + 1)
          const p7 = at(x - 1, y + 1)
          const p8 = at(x - 1, y)
          const p9 = at(x - 1, y - 1)
          const neighbours = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
          if (neighbours < 2 || neighbours > 6) continue
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
          let transitions = 0
          for (let k = 0; k < 8; k++) {
            if (seq[k] === 0 && seq[k + 1] === 1) transitions++
          }
          if (transitions !== 1) continue
          if (pass === 0) {
            if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue
          } else if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) {
            continue
          }
          remove.push(y * width + x)
        }
      }
      if (remove.length) {
        changed = true
        for (const index of remove) img[index] = 0
      }
    }
  }
  return { width, height, data: img }
}

const FAR = 1e9

/**
 * Euclidean distance transform (Felzenszwalb–Huttenlocher): distance in
 * pixels from every pixel to the nearest ink pixel.
 */
export function acexDistanceTransform(mask: InkMask): Float32Array {
  const { width, height, data } = mask
  const grid = new Float64Array(width * height)
  for (let i = 0; i < grid.length; i++) grid[i] = data[i] ? 0 : FAR
  const n = Math.max(width, height)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)

  const transform1d = (length: number) => {
    let k = 0
    v[0] = 0
    z[0] = -Infinity
    z[1] = Infinity
    for (let q = 1; q < length; q++) {
      let s =
        (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) {
        k--
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      }
      k++
      v[k] = q
      z[k] = s
      z[k + 1] = Infinity
    }
    k = 0
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x]
    transform1d(height)
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y]
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x]
    transform1d(width)
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x]
  }
  const out = new Float32Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(grid[i])
  return out
}

/** Maps a reference-image pixel (original resolution) to CAD WCS. */
export type PixelToCad = (pixel: Point2dInput) => Point2dInput

/** Rendered drawing plus the CAD box it was framed to. */
export interface RenderedDrawing {
  image: CadRasterImage
  /** CAD box rendered edge-to-edge (y up). */
  box: { min: Point2dInput; max: Point2dInput }
}

/**
 * Warps a rendered drawing's ink into the reference frame.
 *
 * For every reference pixel the matching CAD point comes from `toCad`, and the
 * rendered pixel from the render box. Any pixel → CAD model works, including
 * homographies, because the warp is evaluated per pixel.
 *
 * @param renderedInk - Ink mask of the rendered drawing.
 * @param box - CAD box the render covers.
 * @param width - Reference working width.
 * @param height - Reference working height.
 * @param workScale - Working pixels per original reference pixel.
 * @param toCad - Original reference pixel → CAD.
 */
export function acexWarpRenderedInk(
  renderedInk: InkMask,
  box: RenderedDrawing['box'],
  width: number,
  height: number,
  workScale: number,
  toCad: PixelToCad
): InkMask {
  const data = new Uint8Array(width * height)
  const bw = box.max.x - box.min.x
  const bh = box.max.y - box.min.y
  const rw = renderedInk.width
  const rh = renderedInk.height
  // A working pixel covers several rendered pixels (the render is finer), so
  // test its whole footprint: nearest-neighbour sampling drops 1-px lines.
  const corner = (x: number, y: number) => {
    const cad = toCad({ x: x / workScale, y: y / workScale })
    return {
      u: ((cad.x - box.min.x) / bw) * rw,
      v: ((box.max.y - cad.y) / bh) * rh
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = corner(x, y)
      const b = corner(x + 1, y + 1)
      const c = corner(x + 1, y)
      const d = corner(x, y + 1)
      const u0 = Math.max(0, Math.floor(Math.min(a.u, b.u, c.u, d.u)))
      const u1 = Math.min(rw - 1, Math.ceil(Math.max(a.u, b.u, c.u, d.u)) - 1)
      const v0 = Math.max(0, Math.floor(Math.min(a.v, b.v, c.v, d.v)))
      const v1 = Math.min(rh - 1, Math.ceil(Math.max(a.v, b.v, c.v, d.v)) - 1)
      let hit = 0
      for (let v = v0; v <= v1 && !hit; v++) {
        for (let u = u0; u <= u1; u++) {
          if (renderedInk.data[v * rw + u]) {
            hit = 1
            break
          }
        }
      }
      data[y * width + x] = hit
    }
  }
  return { width, height, data }
}

/** One cell of the hotspot grid with the most disagreement. */
export interface CompareHotspot {
  /** Reference pixels (original resolution) `[left, top, right, bottom]`. */
  sourceRoi: [number, number, number, number]
  /** Matching CAD box (when the transform is known). */
  cadBox?: { min: Point2dInput; max: Point2dInput }
  /** Reference centerline pixels with no drawing nearby (missing geometry). */
  missing: number
  /** Drawing centerline pixels with no reference ink nearby (extra / misplaced). */
  extra: number
}

/** Metrics from {@link acexCompareInk}. */
export interface CompareMetrics {
  /** Reference centerline pixels. */
  sourceInk: number
  /** Drawing centerline pixels (in the reference frame). */
  cadInk: number
  /** Share of reference ink within tolerance of the drawing (recall). */
  coverage: number
  /** Share of drawing ink within tolerance of the reference. */
  precision: number
  /** Harmonic mean of coverage and precision. */
  f1: number
  /** Mean distance (working px) from reference ink to the nearest drawing ink. */
  meanDistancePx: number
  /** 95th percentile of that distance. */
  p95DistancePx: number
}

/** Result of {@link acexCompareInk}. */
export interface InkComparison {
  metrics: CompareMetrics
  /** Translation (working px) that best aligns the drawing with the reference. */
  bestShiftPx: Point2dInput
  /** Coverage after applying {@link bestShiftPx}. */
  shiftedCoverage: number
  hotspots: CompareHotspot[]
  /** Reference ink not matched (red in images). */
  missingMask: InkMask
  /** Drawing ink not matched (blue in images). */
  extraMask: InkMask
  /** Drawing ink that matched (green in the overlay). */
  matchedMask: InkMask
}

/** Options for {@link acexCompareInk}. */
export interface InkCompareOptions {
  /** Match tolerance in working pixels. */
  tolerancePx: number
  /** Hotspot grid size per side. Default 6. */
  grid?: number
  /** Hotspots to return. Default 5. */
  maxHotspots?: number
  /** Working → original reference pixel scale (for hotspot ROIs). */
  workScale?: number
  /** Original reference pixel → CAD, for hotspot CAD boxes. */
  toCad?: PixelToCad
  /** Max translation searched by {@link InkComparison.bestShiftPx}. Default 8 % of the long side. */
  shiftSearchPx?: number
}

/**
 * Compares two centerline masks in the same frame.
 *
 * @param source - Reference centerlines.
 * @param cad - Drawing centerlines warped into the reference frame.
 */
export function acexCompareInk(
  source: InkMask,
  cad: InkMask,
  options: InkCompareOptions
): InkComparison {
  const { width, height } = source
  const tol = options.tolerancePx
  const dtCad = acexDistanceTransform(cad)
  const dtSource = acexDistanceTransform(source)

  const missingMask = new Uint8Array(width * height)
  const extraMask = new Uint8Array(width * height)
  const matchedMask = new Uint8Array(width * height)
  let sourceInk = 0
  let covered = 0
  let cadInk = 0
  let precise = 0
  const distances: number[] = []

  for (let i = 0; i < width * height; i++) {
    if (source.data[i]) {
      sourceInk++
      const dist = dtCad[i]
      distances.push(Math.min(dist, Math.max(width, height)))
      if (dist <= tol) covered++
      else missingMask[i] = 1
    }
    if (cad.data[i]) {
      cadInk++
      if (dtSource[i] <= tol) {
        precise++
        matchedMask[i] = 1
      } else {
        extraMask[i] = 1
      }
    }
  }

  distances.sort((a, b) => a - b)
  const coverage = sourceInk ? covered / sourceInk : 0
  const precision = cadInk ? precise / cadInk : 0
  const metrics: CompareMetrics = {
    sourceInk,
    cadInk,
    coverage,
    precision,
    f1:
      coverage + precision > 0
        ? (2 * coverage * precision) / (coverage + precision)
        : 0,
    meanDistancePx: distances.length
      ? distances.reduce((sum, d) => sum + d, 0) / distances.length
      : 0,
    p95DistancePx: distances.length
      ? distances[Math.min(distances.length - 1, Math.floor(distances.length * 0.95))]
      : 0
  }

  // Best translation: sample reference ink and score candidate shifts against
  // the drawing's distance transform. A large shift means a systematic offset
  // (wrong origin / calibration) rather than missing geometry.
  const samples: number[] = []
  const stride = Math.max(1, Math.floor(sourceInk / 4000))
  for (let i = 0, seen = 0; i < width * height; i++) {
    if (!source.data[i]) continue
    if (seen++ % stride === 0) samples.push(i)
  }
  const search = Math.max(
    1,
    Math.round(options.shiftSearchPx ?? Math.max(width, height) * 0.08)
  )
  const scoreShift = (dx: number, dy: number) => {
    let hits = 0
    for (const index of samples) {
      const x = (index % width) + dx
      const y = Math.floor(index / width) + dy
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      if (dtCad[y * width + x] <= tol) hits++
    }
    return hits
  }
  // Coarse grid over the whole window, then refine around the best cell.
  let best = { x: 0, y: 0, score: scoreShift(0, 0) }
  let step = Math.max(1, Math.round(tol))
  let cx = 0
  let cy = 0
  let radius = search
  while (true) {
    for (let dy = cy - radius; dy <= cy + radius; dy += step) {
      for (let dx = cx - radius; dx <= cx + radius; dx += step) {
        const hits = scoreShift(dx, dy)
        // Prefer the smaller shift on ties so an aligned drawing reports 0.
        const better =
          hits > best.score ||
          (hits === best.score &&
            Math.hypot(dx, dy) < Math.hypot(best.x, best.y))
        if (better) best = { x: dx, y: dy, score: hits }
      }
    }
    if (step === 1) break
    cx = best.x
    cy = best.y
    radius = step
    step = Math.max(1, Math.floor(step / 2))
  }
  const shiftedCoverage = samples.length ? best.score / samples.length : 0

  // Hotspot grid.
  const grid = Math.max(1, options.grid ?? 6)
  const cellW = width / grid
  const cellH = height / grid
  const cells: Array<{ cx: number; cy: number; missing: number; extra: number }> = []
  for (let cy = 0; cy < grid; cy++) {
    for (let cx = 0; cx < grid; cx++) cells.push({ cx, cy, missing: 0, extra: 0 })
  }
  for (let i = 0; i < width * height; i++) {
    if (!missingMask[i] && !extraMask[i]) continue
    const cx = Math.min(grid - 1, Math.floor((i % width) / cellW))
    const cy = Math.min(grid - 1, Math.floor(Math.floor(i / width) / cellH))
    const cell = cells[cy * grid + cx]
    if (missingMask[i]) cell.missing++
    if (extraMask[i]) cell.extra++
  }
  const workScale = options.workScale ?? 1
  const minimum = Math.max(3, Math.round((sourceInk + cadInk) * 0.005))
  const hotspots = cells
    .filter(cell => cell.missing + cell.extra >= minimum)
    .sort((a, b) => b.missing + b.extra - (a.missing + a.extra))
    .slice(0, options.maxHotspots ?? 5)
    .map(cell => {
      const roi: [number, number, number, number] = [
        Math.round((cell.cx * cellW) / workScale),
        Math.round((cell.cy * cellH) / workScale),
        Math.round(((cell.cx + 1) * cellW) / workScale),
        Math.round(((cell.cy + 1) * cellH) / workScale)
      ]
      const hotspot: CompareHotspot = {
        sourceRoi: roi,
        missing: cell.missing,
        extra: cell.extra
      }
      if (options.toCad) {
        const corners = [
          options.toCad({ x: roi[0], y: roi[1] }),
          options.toCad({ x: roi[2], y: roi[1] }),
          options.toCad({ x: roi[2], y: roi[3] }),
          options.toCad({ x: roi[0], y: roi[3] })
        ]
        hotspot.cadBox = {
          min: {
            x: Math.min(...corners.map(c => c.x)),
            y: Math.min(...corners.map(c => c.y))
          },
          max: {
            x: Math.max(...corners.map(c => c.x)),
            y: Math.max(...corners.map(c => c.y))
          }
        }
      }
      return hotspot
    })

  const asMask = (data: Uint8Array): InkMask => ({ width, height, data })
  return {
    metrics,
    bestShiftPx: { x: best.x, y: best.y },
    shiftedCoverage,
    hotspots,
    missingMask: asMask(missingMask),
    extraMask: asMask(extraMask),
    matchedMask: asMask(matchedMask)
  }
}

/** Grows a mask by `radius` pixels so 1-px lines stay visible in images. */
function dilate(mask: InkMask, radius: number): Uint8Array {
  if (radius <= 0) return mask.data
  const { width, height, data } = mask
  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!data[y * width + x]) continue
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          out[yy * width + xx] = 1
        }
      }
    }
  }
  return out
}

const RED: [number, number, number] = [220, 30, 30]
const BLUE: [number, number, number] = [30, 90, 230]
const GREEN: [number, number, number] = [20, 160, 60]

function paint(
  image: CadRasterImage,
  mask: Uint8Array,
  [r, g, b]: [number, number, number]
) {
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    const i = p * 4
    image.data[i] = r
    image.data[i + 1] = g
    image.data[i + 2] = b
    image.data[i + 3] = 255
  }
}

/**
 * Overlay: the reference faded to light gray, matched drawing lines in green,
 * missing reference lines in red, and extra drawing lines in blue.
 */
export function acexRenderOverlay(
  reference: CadRasterImage,
  comparison: InkComparison
): CadRasterImage {
  const { width, height } = reference
  const luma = lumaOf(reference)
  const darkInk = borderMedian(luma, width, height) >= 128
  const out = acexCreateRaster(width, height)
  for (let p = 0; p < luma.length; p++) {
    // Fade toward white, keeping ink faintly visible regardless of polarity.
    const ink = darkInk ? luma[p] : 255 - luma[p]
    const value = 255 - (255 - ink) * 0.25
    const i = p * 4
    out.data[i] = value
    out.data[i + 1] = value
    out.data[i + 2] = value
  }
  const grow = Math.max(0, Math.round(Math.max(width, height) / 600))
  paint(out, dilate(comparison.matchedMask, grow), GREEN)
  paint(out, dilate(comparison.extraMask, grow), BLUE)
  paint(out, dilate(comparison.missingMask, grow), RED)
  return out
}

/** Difference image: white background, missing in red, extra in blue. */
export function acexRenderDifference(
  comparison: InkComparison
): CadRasterImage {
  const { width, height } = comparison.missingMask
  const out = acexCreateRaster(width, height)
  const grow = Math.max(0, Math.round(Math.max(width, height) / 600))
  paint(out, dilate(comparison.extraMask, grow), BLUE)
  paint(out, dilate(comparison.missingMask, grow), RED)
  return out
}
