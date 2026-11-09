import {
  type CadCapturePreviewOptions,
  type CaptureDrawingPreviewResult,
  DRAWING_PREVIEW_LONG_SIDE_PX,
  normalizeCadCapturePreviewOptions
} from '@mlightcad/cad-script-core'
import {
  AcApDocManager,
  AcApEntityPreviewConvertor,
  AcApRasterImageConvertor,
  AcTrView2d,
  resolveDrawingExtents
} from '@mlightcad/cad-simple-viewer'
import { accmYieldForPaint } from '@mlightcad/data-model'

const SCENE_READY_TIMEOUT_MS = 15000

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
 * Captures a PNG preview of the current drawing, or of the current selection.
 *
 * Renders the live scene via {@link AcApRasterImageConvertor} (cost roughly
 * independent of entity count). Used by high-inference verification and by
 * `cad.view.capturePreview` in scripts.
 *
 * Default mode frames drawing extents. Agent scripts usually create entities
 * in model space, so when a paper-space layout is active this temporarily
 * switches to model space for the capture and restores the previous layout
 * afterward.
 *
 * With `{ selection: true }`, extracts the selected entities through
 * {@link AcApEntityPreviewConvertor} (batch GPU geometry + scene bounds) so
 * framing matches what is actually drawn — not database `geometricExtents`,
 * which can be empty or wrong on real DWGs.
 *
 * With `{ layers: [...] }`, extracts only the model-space geometry bucketed on
 * those layers and frames the image to the union of their batch bounds, so
 * the crop fits the layers instead of the whole drawing.
 *
 * @param options - Pixel size and optional selection / layer preview mode. A bare
 *   positive number is treated as `longSide`.
 */
export async function captureDrawingPreview(
  options: CadCapturePreviewOptions | number = {}
): Promise<CaptureDrawingPreviewResult> {
  const normalized = normalizeCadCapturePreviewOptions(options)
  const longSide =
    typeof normalized.longSide === 'number' && normalized.longSide > 0
      ? normalized.longSide
      : DRAWING_PREVIEW_LONG_SIDE_PX

  if (normalized.selection === true) {
    return captureSelectionPreview(longSide)
  }
  if (normalized.layers?.length) {
    return captureLayersPreview(normalized.layers, longSide)
  }

  return captureExtentsPreview(longSide)
}

async function captureExtentsPreview(
  longSide: number
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

async function captureSelectionPreview(
  longSide: number
): Promise<CaptureDrawingPreviewResult> {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return { ok: false, reason: 'unsupported-view' }
  }

  const selectedIds = [...view.selectionSet.ids]
  if (!selectedIds.length) {
    return { ok: false, reason: 'no-selection' }
  }

  const sceneReady = await waitForDrawingSceneReady()
  if (!sceneReady) {
    return { ok: false, reason: 'scene-not-ready' }
  }

  // Extract selected batch geometry (same path as ENTPREVIEW). Framing uses
  // scene/batch bounds, not database geometricExtents — those are often wrong
  // or incomplete on real DWGs and produced empty / wipeout-only crops.
  const capture = new AcApEntityPreviewConvertor().capture(
    selectedIds,
    longSide
  )
  if (!capture.ok) {
    if (capture.reason === 'no-entities' || capture.reason === 'no-bounds') {
      return { ok: false, reason: 'no-bounds' }
    }
    return { ok: false, reason: 'capture-failed' }
  }

  return { ok: true, dataUrl: capture.dataUrl }
}

async function captureLayersPreview(
  layerNames: string[],
  longSide: number
): Promise<CaptureDrawingPreviewResult> {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return { ok: false, reason: 'unsupported-view' }
  }

  const sceneReady = await waitForDrawingSceneReady()
  if (!sceneReady) {
    return { ok: false, reason: 'scene-not-ready' }
  }

  const capture = new AcApEntityPreviewConvertor().captureLayers(
    layerNames,
    longSide
  )
  if (!capture.ok) {
    if (capture.reason === 'no-layers' || capture.reason === 'no-bounds') {
      return { ok: false, reason: capture.reason }
    }
    return { ok: false, reason: 'capture-failed' }
  }

  return { ok: true, dataUrl: capture.dataUrl }
}
