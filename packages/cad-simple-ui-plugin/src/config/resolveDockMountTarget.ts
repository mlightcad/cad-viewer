import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

/**
 * Resolves the DOM element that receives the dock panel and flex shrink layout.
 *
 * Prefers an explicit `mountTarget`, otherwise the viewer canvas container's parent
 * when it lies inside `host`. This keeps sibling UI (such as a demo header toolbar)
 * outside the dock flex layout.
 *
 * @param host - Plugin host element (toolbar and theme root).
 * @param mountTarget - Optional explicit dock mount element.
 */
export function resolveDockMountTarget(
  host: HTMLElement,
  mountTarget?: HTMLElement
): HTMLElement {
  if (mountTarget) {
    return mountTarget
  }

  const canvasContainer = AcApDocManager.instance.curView?.container
  const canvasParent = canvasContainer?.parentElement
  if (canvasParent && (canvasParent === host || host.contains(canvasParent))) {
    return canvasParent
  }

  return host
}
