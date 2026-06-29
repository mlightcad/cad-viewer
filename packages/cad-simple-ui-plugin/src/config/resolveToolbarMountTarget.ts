import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

/**
 * Resolves the DOM element that receives the floating viewer toolbar.
 *
 * Prefers the active view canvas container when it lies inside `host`, so the
 * toolbar is positioned relative to the drawing area rather than outer chrome.
 *
 * @param host - Plugin host element (theme root and outer layout).
 * @param mountTarget - Optional explicit toolbar mount element.
 */
export function resolveToolbarMountTarget(
  host: HTMLElement,
  mountTarget?: HTMLElement
): HTMLElement {
  if (mountTarget) {
    return mountTarget
  }

  const canvasContainer = AcApDocManager.instance.curView?.container
  if (
    canvasContainer &&
    (canvasContainer === host || host.contains(canvasContainer))
  ) {
    return canvasContainer
  }

  return host
}
