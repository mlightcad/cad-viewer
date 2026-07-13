import {
  AcApDocManager,
  AcApEntityPreviewConvertor,
  AcTrView2d,
  yieldToMain
} from '@mlightcad/cad-simple-viewer'
import type { AcDbObjectId } from '@mlightcad/data-model'

/** Default preview long side in pixels for drawing verification. */
export const VERIFICATION_PREVIEW_LONG_SIDE_PX = 1024

const SCENE_READY_POLL_MS = 50
const SCENE_READY_TIMEOUT_MS = 15000

/** Collects all entity object ids in model space. */
export function getModelSpaceEntityIds(): AcDbObjectId[] {
  const modelSpace =
    AcApDocManager.instance.curDocument.database.tables.blockTable.modelSpace
  return [...modelSpace.newIterator()].map(entity => entity.objectId)
}

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

  const deadline = Date.now() + timeoutMs
  while (view.isProcessingEntities) {
    if (Date.now() > deadline) {
      return false
    }
    await yieldToMain()
    await new Promise(resolve => setTimeout(resolve, SCENE_READY_POLL_MS))
  }

  await yieldToMain()
  return true
}

/**
 * Captures a PNG preview of the current model-space drawing for LLM verification.
 *
 * @param longSide - Maximum output width or height in pixels.
 */
export async function captureDrawingPreview(
  longSide = VERIFICATION_PREVIEW_LONG_SIDE_PX
) {
  const sceneReady = await waitForDrawingSceneReady()
  if (!sceneReady) {
    return { ok: false as const, reason: 'scene-not-ready' as const }
  }

  const entityIds = getModelSpaceEntityIds()
  return new AcApEntityPreviewConvertor().capture(entityIds, longSide)
}
