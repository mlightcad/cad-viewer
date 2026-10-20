import {
  AcApDocManager,
  AcApRasterImageConvertor,
  AcTrView2d,
  resolveDrawingExtents
} from '@mlightcad/cad-simple-viewer'
import { accmYieldForPaint } from '@mlightcad/data-model'

/** Default preview long side in pixels. */
export const DRAWING_PREVIEW_LONG_SIDE_PX = 1024

/** @deprecated Use {@link DRAWING_PREVIEW_LONG_SIDE_PX}. */
export const VERIFICATION_PREVIEW_LONG_SIDE_PX = DRAWING_PREVIEW_LONG_SIDE_PX

const SCENE_READY_TIMEOUT_MS = 15000

/** Failure reasons returned by {@link captureDrawingPreview}. */
export type CaptureDrawingPreviewFailure =
  | 'scene-not-ready'
  | 'unsupported-view'
  | 'no-bounds'
  | 'capture-failed'

export type CaptureDrawingPreviewResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: CaptureDrawingPreviewFailure }

/**
 * Waits until the view finishes async entity batch conversion so preview
 * bounds exist in the renderer scene.
 */
export async function waitForDrawingSceneReady(
  timeoutMs = SCENE_READY_TIMEOUT_MS
): Promise<boolean> {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return false
  }

  const idle = await view.waitUntilIdle(timeoutMs)
  await accmYieldForPaint()
  return idle
}

/**
 * Captures a PNG preview of the current drawing.
 *
 * Renders the live scene via {@link AcApRasterImageConvertor} (cost roughly
 * independent of entity count). Used by high-inference verification and by
 * `cad.view.capturePreview` in scripts.
 *
 * Agent scripts always create entities in model space, so when a paper-space
 * layout is active this temporarily switches to model space for the capture
 * and restores the previous layout afterward.
 *
 * @param longSide - Maximum output width or height in pixels.
 */
export async function captureDrawingPreview(
  longSide = DRAWING_PREVIEW_LONG_SIDE_PX
): Promise<CaptureDrawingPreviewResult> {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return { ok: false, reason: 'unsupported-view' }
  }

  const previousLayoutBtrId = view.activeLayoutBtrId
  const modelSpaceBtrId = view.modelSpaceBtrId
  const switchedToModelSpace =
    !!modelSpaceBtrId &&
    !!previousLayoutBtrId &&
    previousLayoutBtrId !== modelSpaceBtrId

  try {
    if (switchedToModelSpace) {
      view.activeLayoutBtrId = modelSpaceBtrId
    }

    const sceneReady = await waitForDrawingSceneReady()
    if (!sceneReady) {
      return { ok: false, reason: 'scene-not-ready' }
    }

    const bounds = resolveDrawingExtents(
      view,
      AcApDocManager.instance.curDocument.database
    )
    if (!bounds || bounds.isEmpty()) {
      return { ok: false, reason: 'no-bounds' }
    }

    const dataUrl = await new AcApRasterImageConvertor('png').captureToDataUrl(
      bounds,
      longSide
    )
    if (!dataUrl) {
      return { ok: false, reason: 'capture-failed' }
    }

    return { ok: true, dataUrl }
  } finally {
    if (switchedToModelSpace && view.activeLayoutBtrId !== previousLayoutBtrId) {
      view.activeLayoutBtrId = previousLayoutBtrId
    }
  }
}
