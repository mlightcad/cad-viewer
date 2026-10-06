import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import { acuiSkipUiLayoutWrappers } from './resolveDockMountTarget'

/**
 * Resolves the DOM element that receives the floating viewer toolbar.
 *
 * Prefers the canvas container's parent when it lies inside `host`, matching
 * {@link acuiResolveDockMountTarget} so the toolbar stays within the visible
 * viewer clip (not an oversized inner canvas box). Overlay toolbars also fall
 * back to the canvas container itself when that node is inside `host`.
 *
 * In-flow (`inCanvasParent`) toolbars should call
 * {@link acuiResolveDockMountTarget} instead so they share the dock panel's
 * parent exactly and can sit as a flex sibling of the canvas.
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
    // Skip in-flow canvas wrappers only. Keep `dock-main` so overlay chrome
    // stays on the drawing slot rather than covering the dock panel.
    return acuiSkipUiLayoutWrappers(canvasParent, host, [
      'ml-ex-ui-toolbar-main'
    ])
  }

  if (
    canvasContainer &&
    (canvasContainer === host || host.contains(canvasContainer))
  ) {
    return canvasContainer
  }

  return host
}
