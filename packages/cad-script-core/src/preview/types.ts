/** Default preview long side in pixels. */
export const DRAWING_PREVIEW_LONG_SIDE_PX = 1024

/** @deprecated Use {@link DRAWING_PREVIEW_LONG_SIDE_PX}. */
export const VERIFICATION_PREVIEW_LONG_SIDE_PX = DRAWING_PREVIEW_LONG_SIDE_PX

/** Reasons a preview capture can fail. */
export type CaptureDrawingPreviewFailure =
  | 'scene-not-ready'
  | 'unsupported-view'
  | 'no-bounds'
  | 'capture-failed'

/** Result of `CadSession.capturePreview`. */
export type CaptureDrawingPreviewResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: CaptureDrawingPreviewFailure }
