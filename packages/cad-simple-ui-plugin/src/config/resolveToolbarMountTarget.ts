import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

/**
 * Resolves the DOM element that receives the floating viewer toolbar.
 *
 * Prefers the canvas container's parent when it lies inside `host`, matching
 * {@link acuiResolveDockMountTarget} so the toolbar stays within the visible
 * viewer clip (not an oversized inner canvas box).
 *
 * @param host - Plugin host element (theme root and outer layout).
 * @param mountTarget - Optional explicit toolbar mount element.
 */
export function acuiResolveToolbarMountTarget(
  host: HTMLElement,
  mountTarget?: HTMLElement
): HTMLElement {
  if (mountTarget) {
    return mountTarget
  }

  const canvasContainer = AcApDocManager.instance.curView?.container
  const canvasParent = canvasContainer?.parentElement
  if (
    canvasParent &&
    (canvasParent === host || host.contains(canvasParent))
  ) {
    return canvasParent
  }

  if (
    canvasContainer &&
    (canvasContainer === host || host.contains(canvasContainer))
  ) {
    return canvasContainer
  }

  return host
}
