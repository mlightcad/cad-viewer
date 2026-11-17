import type { Point2dInput } from '../tools/types.js'
import {
  acexRedrawResolveCalibration,
  type RedrawPointTransform
} from './calibration.js'
import {
  acexCompareInk,
  acexDownscaleRaster,
  acexExtractInk,
  acexRenderDifference,
  acexRenderOverlay,
  acexThinInk,
  acexWarpRenderedInk,
  type CompareHotspot,
  type CompareMetrics
} from './pixelCompare.js'
import type { CadRedrawRasterHost } from './rasterHost.js'
import type { RedrawCalibrationSpec, RedrawSpec, RedrawViewSpec } from './types.js'
import { acexRedrawValidateSpec } from './validateRedrawSpec.js'

/** Options for `cad.redraw.compare`. */
export interface RedrawCompareOptions {
  /** Attached reference image to compare with. Default 0 (the first). */
  referenceIndex?: number
  /**
   * Calibration mapping reference pixels to CAD. Defaults to the only spec
   * calibration, or the calibration of `viewId`.
   */
  calibration?: string
  /** Compare only this view's ROI (`views[].sourceRoi`). */
  viewId?: string
  /** Match tolerance in reference pixels. Default ~0.6 % of the long side (≥ 2). */
  tolerancePx?: number
  /** Working resolution (long side) for the comparison. Default 900. */
  maxSide?: number
  /** Attach overlay + difference PNGs for the model. Default true. */
  images?: boolean
}

/** Queued compare request, fulfilled after the script returns. */
export interface RedrawCompareRequest {
  spec: RedrawSpec
  options: RedrawCompareOptions
  index: number
}

/** Result of one pixel comparison. */
export interface RedrawCompareResult {
  ok: boolean
  /** Why the comparison could not run (when `ok` is false). */
  reason?: string
  index: number
  calibration?: string
  viewId?: string
  /** `aligned` / `offset` / `incomplete` / `cluttered` / `mismatch`. */
  verdict?: 'aligned' | 'offset' | 'incomplete' | 'cluttered' | 'mismatch'
  metrics?: CompareMetrics & {
    /** Tolerance in reference pixels and in CAD units. */
    tolerancePx: number
    toleranceCad: number
    /** Mean / p95 distances converted to reference pixels and CAD units. */
    meanDistanceCad: number
    p95DistanceCad: number
  }
  /** Systematic offset of the drawing vs the reference, in CAD units. */
  suggestedMove?: Point2dInput
  /** Coverage if that offset were applied. */
  shiftedCoverage?: number
  hotspots?: CompareHotspot[]
  /** Short guidance for the next fix. */
  advice: string[]
}

/** Image produced by a comparison, for the tool result. */
export interface RedrawCompareImage {
  label: 'overlay' | 'difference'
  index: number
  dataUrl: string
}

function pickCalibration(
  spec: RedrawSpec,
  options: RedrawCompareOptions
): { calibration?: RedrawCalibrationSpec; view?: RedrawViewSpec } {
  const views = Array.isArray(spec.views) ? spec.views : []
  const calibrations = Array.isArray(spec.calibration) ? spec.calibration : []
  const view = options.viewId
    ? views.find(entry => entry?.id === options.viewId)
    : undefined
  const id =
    options.calibration ??
    view?.calibration ??
    (calibrations.length === 1 ? calibrations[0]?.id : undefined)
  const calibration = calibrations.find(entry => entry?.id === id)
  const owner =
    view ?? views.find(entry => entry?.calibration === calibration?.id)
  return { calibration, view: owner }
}

/**
 * Runs one queued pixel comparison: decode the reference, render the drawing
 * over the reference's CAD footprint, register both into the reference frame
 * through the calibration, and measure.
 */
export async function acexRunRedrawCompare(
  request: RedrawCompareRequest,
  host: CadRedrawRasterHost
): Promise<{ result: RedrawCompareResult; images: RedrawCompareImage[] }> {
  const { spec, options, index } = request
  const fail = (reason: string, advice: string[] = []) => ({
    result: { ok: false, reason, index, advice },
    images: []
  })

  const validation = acexRedrawValidateSpec(spec).result
  if (validation.errors.some(issue => issue.path.startsWith('calibration'))) {
    return fail('invalid_calibration', [
      'Fix the calibration errors reported by cad.redraw.validate first.'
    ])
  }
  const { calibration, view } = pickCalibration(spec, options)
  if (!calibration) {
    return fail('no_calibration', [
      'Pixel comparison needs a calibration that maps image pixels to CAD: add one (two readable dimension end points, or 3–4 matched corners) and pass its id as { calibration }.'
    ])
  }
  let transform: RedrawPointTransform
  try {
    transform = acexRedrawResolveCalibration(calibration, view).transform
  } catch (error) {
    return fail(
      `invalid_calibration: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const reference = await host.getReferenceImage(options.referenceIndex ?? 0)
  if (!reference) {
    return fail('no_reference_image', [
      'Attach the reference image to the chat message; compare reads attachments, not the drawing.'
    ])
  }

  // Region of interest in reference pixels.
  const roi = view?.sourceRoi ?? [0, 0, reference.width, reference.height]
  const left = Math.max(0, Math.floor(roi[0]))
  const top = Math.max(0, Math.floor(roi[1]))
  const right = Math.min(reference.width, Math.ceil(roi[2]))
  const bottom = Math.min(reference.height, Math.ceil(roi[3]))
  if (right - left < 8 || bottom - top < 8) {
    return fail('roi_too_small')
  }
  const cropped = cropRaster(reference, left, top, right - left, bottom - top)
  const maxSide = Math.max(200, Math.min(2000, options.maxSide ?? 900))
  const { image: working, scale } = acexDownscaleRaster(cropped, maxSide)
  const toCad = (pixel: Point2dInput) =>
    transform({ x: pixel.x + left, y: pixel.y + top })

  // CAD footprint of the ROI: render exactly that box (any rotation /
  // perspective is handled by the per-pixel warp).
  const corners = [
    toCad({ x: 0, y: 0 }),
    toCad({ x: cropped.width, y: 0 }),
    toCad({ x: cropped.width, y: cropped.height }),
    toCad({ x: 0, y: cropped.height })
  ]
  const box = {
    min: {
      x: Math.min(...corners.map(c => c.x)),
      y: Math.min(...corners.map(c => c.y))
    },
    max: {
      x: Math.max(...corners.map(c => c.x)),
      y: Math.max(...corners.map(c => c.y))
    }
  }
  const boxW = box.max.x - box.min.x
  const boxH = box.max.y - box.min.y
  if (!(boxW > 0 && boxH > 0)) return fail('degenerate_calibration')
  // Render at ~2x working resolution so thin lines survive the warp.
  const renderLong = Math.min(2400, Math.max(working.width, working.height) * 2)
  const renderW = Math.max(
    1,
    Math.round(boxW >= boxH ? renderLong : (renderLong * boxW) / boxH)
  )
  const renderH = Math.max(
    1,
    Math.round(boxH > boxW ? renderLong : (renderLong * boxH) / boxW)
  )
  const rendered = await host.renderDrawing(box, renderW, renderH)
  if (!rendered) return fail('render_failed')

  const sourceInk = acexThinInk(acexExtractInk(working))
  const renderedInk = acexExtractInk(rendered, { radius: 6, contrast: 30 })
  const cadInk = acexThinInk(
    acexWarpRenderedInk(
      renderedInk,
      box,
      working.width,
      working.height,
      scale,
      toCad
    )
  )
  if (!sourceInk.data.some(Boolean)) {
    return fail('no_reference_ink', [
      'No lines were found in the reference region; check the ROI and image contrast.'
    ])
  }

  const longSide = Math.max(working.width, working.height)
  const tolerancePx = Math.max(
    2,
    options.tolerancePx !== undefined
      ? options.tolerancePx * scale
      : longSide * 0.006
  )
  const comparison = acexCompareInk(sourceInk, cadInk, {
    tolerancePx,
    workScale: scale,
    toCad
  })
  const { metrics } = comparison

  // Pixel → CAD scale at the ROI center (working pixels).
  const center = toCad({ x: cropped.width / 2, y: cropped.height / 2 })
  const unit = toCad({ x: cropped.width / 2 + 1 / scale, y: cropped.height / 2 })
  const cadPerWorkPx = Math.hypot(unit.x - center.x, unit.y - center.y)

  const shift = comparison.bestShiftPx
  const shiftCad = (() => {
    const a = toCad({ x: cropped.width / 2, y: cropped.height / 2 })
    const b = toCad({
      x: cropped.width / 2 - shift.x / scale,
      y: cropped.height / 2 - shift.y / scale
    })
    return { x: b.x - a.x, y: b.y - a.y }
  })()
  const shiftGain = comparison.shiftedCoverage - metrics.coverage
  const meaningfulShift =
    Math.hypot(shift.x, shift.y) > tolerancePx && shiftGain > 0.1

  // A short missing feature is a small share of all ink, so global ratios can
  // look fine; a concentrated cluster of disagreement still means work left.
  const localGap = comparison.hotspots.some(
    hotspot =>
      Math.max(hotspot.missing, hotspot.extra) >=
      Math.max(12, 0.025 * Math.max(metrics.sourceInk, metrics.cadInk))
  )
  let verdict: RedrawCompareResult['verdict']
  if (meaningfulShift) verdict = 'offset'
  else if (metrics.coverage >= 0.97 && metrics.precision >= 0.95 && !localGap)
    verdict = 'aligned'
  else if (metrics.coverage < metrics.precision) verdict = 'incomplete'
  else if (metrics.precision < metrics.coverage) verdict = 'cluttered'
  else verdict = 'mismatch'
  if (
    verdict !== 'offset' &&
    metrics.coverage < 0.5 &&
    metrics.precision < 0.5
  ) {
    verdict = 'mismatch'
  }

  const advice: string[] = []
  if (verdict === 'offset') {
    advice.push(
      `The drawing looks shifted: moving it by (${round(shiftCad.x)}, ${round(shiftCad.y)}) would raise coverage to ${pct(comparison.shiftedCoverage)}. Check the calibration / origin before redrawing geometry.`
    )
  }
  const missingTotal = comparison.hotspots.reduce((s, h) => s + h.missing, 0)
  const extraTotal = comparison.hotspots.reduce((s, h) => s + h.extra, 0)
  if (metrics.coverage < 0.97 || missingTotal > 0) {
    advice.push(
      'Red in the overlay = reference lines with no drawing nearby (missing or misplaced geometry). Start with the hotspots (sourceRoi / cadBox).'
    )
  }
  if (metrics.precision < 0.95 || extraTotal > 0) {
    advice.push(
      'Blue = drawn lines with no reference line nearby (extra or misplaced geometry).'
    )
  }
  advice.push(
    'Pixel metrics measure visual registration only; they do not prove dimensions — keep cad.redraw.inspect checks for sizes.'
  )

  const images: RedrawCompareImage[] = []
  if (options.images !== false) {
    images.push(
      {
        label: 'overlay',
        index,
        dataUrl: await host.encodePng(acexRenderOverlay(working, comparison))
      },
      {
        label: 'difference',
        index,
        dataUrl: await host.encodePng(acexRenderDifference(comparison))
      }
    )
  }

  return {
    result: {
      ok: true,
      index,
      calibration: calibration.id,
      ...(view?.id ? { viewId: view.id } : {}),
      verdict,
      metrics: {
        ...metrics,
        coverage: round(metrics.coverage, 3),
        precision: round(metrics.precision, 3),
        f1: round(metrics.f1, 3),
        meanDistancePx: round(metrics.meanDistancePx / scale, 2),
        p95DistancePx: round(metrics.p95DistancePx / scale, 2),
        tolerancePx: round(tolerancePx / scale, 2),
        toleranceCad: round(tolerancePx * cadPerWorkPx),
        meanDistanceCad: round(metrics.meanDistancePx * cadPerWorkPx),
        p95DistanceCad: round(metrics.p95DistancePx * cadPerWorkPx)
      },
      ...(meaningfulShift
        ? {
            suggestedMove: { x: round(shiftCad.x), y: round(shiftCad.y) },
            shiftedCoverage: round(comparison.shiftedCoverage, 3)
          }
        : {}),
      hotspots: comparison.hotspots.map(hotspot => ({
        ...hotspot,
        ...(hotspot.cadBox
          ? {
              cadBox: {
                min: {
                  x: round(hotspot.cadBox.min.x),
                  y: round(hotspot.cadBox.min.y)
                },
                max: {
                  x: round(hotspot.cadBox.max.x),
                  y: round(hotspot.cadBox.max.y)
                }
              }
            }
          : {}),
        sourceRoi: [
          hotspot.sourceRoi[0] + left,
          hotspot.sourceRoi[1] + top,
          hotspot.sourceRoi[2] + left,
          hotspot.sourceRoi[3] + top
        ]
      })),
      advice
    },
    images
  }
}

function cropRaster(
  image: { width: number; height: number; data: Uint8ClampedArray },
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (x === 0 && y === 0 && width === image.width && height === image.height) {
    return image
  }
  const data = new Uint8ClampedArray(width * height * 4)
  for (let row = 0; row < height; row++) {
    const from = ((y + row) * image.width + x) * 4
    data.set(image.data.subarray(from, from + width * 4), row * width * 4)
  }
  return { width, height, data }
}

function round(value: number, digits = 3): number {
  if (!Number.isFinite(value)) return value
  const magnitude = Math.abs(value)
  // Keep ~4 significant figures for large CAD values, `digits` for small ones.
  const places =
    magnitude >= 1000 ? 1 : magnitude >= 1 ? Math.max(digits - 1, 2) : digits
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}
