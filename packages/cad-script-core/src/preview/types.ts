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
}

/**
 * Normalizes `capturePreview` arguments.
 *
 * Accepts the options object, or a bare positive pixel number (legacy
 * `CadSession.capturePreview(longSide)` / accidental `cad.view.capturePreview(512)`).
 */
export function normalizeCadCapturePreviewOptions(
  options?: CadCapturePreviewOptions | number
): CadCapturePreviewOptions {
  if (typeof options === 'number') {
    return options > 0 ? { longSide: options } : {}
  }
  return options ?? {}
}

/** Reasons a preview capture can fail. */
export type CaptureDrawingPreviewFailure =
  | 'scene-not-ready'
  | 'unsupported-view'
  | 'no-bounds'
  | 'no-selection'
  | 'capture-failed'

/** Result of `CadSession.capturePreview`. */
export type CaptureDrawingPreviewResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: CaptureDrawingPreviewFailure }
