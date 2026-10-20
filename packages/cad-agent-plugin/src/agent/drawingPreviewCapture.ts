/**
 * Re-exports drawing preview capture from `@mlightcad/cad-agent-core`.
 *
 * Kept as a thin shim so existing plugin imports keep working.
 */
export {
  captureDrawingPreview,
  DRAWING_PREVIEW_LONG_SIDE_PX,
  VERIFICATION_PREVIEW_LONG_SIDE_PX,
  waitForDrawingSceneReady,
  type CaptureDrawingPreviewFailure,
  type CaptureDrawingPreviewResult
} from '@mlightcad/cad-agent-core'
