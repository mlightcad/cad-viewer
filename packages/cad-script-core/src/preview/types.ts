/** Default preview long side in pixels. */
export const DRAWING_PREVIEW_LONG_SIDE_PX = 1024

/** @deprecated Use {@link DRAWING_PREVIEW_LONG_SIDE_PX}. */
export const VERIFICATION_PREVIEW_LONG_SIDE_PX = DRAWING_PREVIEW_LONG_SIDE_PX

/** Options for {@link CadSession.capturePreview} / `cad.view.capturePreview`. */
export interface CadCapturePreviewOptions {
  /** Maximum output width or height in pixels. Defaults to {@link DRAWING_PREVIEW_LONG_SIDE_PX}. */
  longSide?: number
  /**
   * When `true`, extract the current selection into a PNG (batch geometry,
   * framed to scene bounds). When omitted or `false`, capture the full
   * drawing extents (model space).
   */
  selection?: boolean
  /**
   * CAD layer names (case-insensitive) to render together in one PNG. Only
   * model-space geometry on these layers is extracted (an INSERT contributes
   * just its fragments on these layers), and the image is framed to the union
   * of those layers' bounds — not the whole drawing — so it has no large
   * empty margins. Layer on/off/frozen state is ignored. A single name may be
   * passed as a string. Cannot be combined with `selection`.
   */
  layers?: string | string[]
}

/** {@link CadCapturePreviewOptions} after {@link normalizeCadCapturePreviewOptions}. */
export interface NormalizedCadCapturePreviewOptions {
  longSide?: number
  selection?: boolean
  /** Trimmed, de-duplicated (case-insensitive), non-empty layer names. */
  layers?: string[]
}

/**
 * Normalizes `capturePreview` arguments.
 *
 * Accepts the options object, or a bare positive pixel number (legacy
 * `CadSession.capturePreview(longSide)` / accidental `cad.view.capturePreview(512)`).
 * `layers` is turned into a trimmed, de-duplicated array.
 *
 * @throws Error when `layers` is given but names no layer, or when both
 *   `selection: true` and `layers` are given.
 */
export function normalizeCadCapturePreviewOptions(
  options?: CadCapturePreviewOptions | number
): NormalizedCadCapturePreviewOptions {
  if (typeof options === 'number') {
    return options > 0 ? { longSide: options } : {}
  }
  if (!options) return {}

  const normalized: NormalizedCadCapturePreviewOptions = {}
  if (typeof options.longSide === 'number') {
    normalized.longSide = options.longSide
  }
  if (options.selection === true) {
    normalized.selection = true
  }
  if (options.layers !== undefined) {
    const layers = normalizeLayerNames(options.layers)
    if (!layers.length) {
      throw new Error(
        'capturePreview: layers must name at least one layer (string or string[])'
      )
    }
    if (normalized.selection) {
      throw new Error(
        'capturePreview: pass either selection: true or layers, not both'
      )
    }
    normalized.layers = layers
  }
  return normalized
}

function normalizeLayerNames(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [value]
  const seen = new Set<string>()
  const names: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = item.trim()
    const key = name.toUpperCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

/** Reasons a preview capture can fail. */
export type CaptureDrawingPreviewFailure =
  | 'scene-not-ready'
  | 'unsupported-view'
  | 'no-bounds'
  | 'no-selection'
  | 'no-layers'
  | 'capture-failed'

/** Result of `CadSession.capturePreview`. */
export type CaptureDrawingPreviewResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: CaptureDrawingPreviewFailure }
