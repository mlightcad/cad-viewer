import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const DEFAULT_UI_LAYOUT_WRAPPERS = [
  'ml-ex-ui-dock-main',
  'ml-ex-ui-toolbar-main'
] as const

/**
 * Walks up from plugin-owned canvas wrappers to the application canvas parent.
 * Dock wrapping changes `canvas.parentElement` to `dock-main`; in-flow chrome
 * should still mount on the stable parent.
 *
 * @param el - Candidate mount element.
 * @param host - Plugin host; walking stops here.
 * @param wrappers - Class names to skip. Defaults to dock-main and toolbar-main.
 */
export function acuiSkipUiLayoutWrappers(
  el: HTMLElement,
  host: HTMLElement,
  wrappers: readonly string[] = DEFAULT_UI_LAYOUT_WRAPPERS
): HTMLElement {
  let current = el
  while (
    current !== host &&
    current.parentElement &&
    wrappers.some(name => current.classList?.contains(name) === true)
  ) {
    current = current.parentElement
  }
  return current
}

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
export function acuiResolveDockMountTarget(
  host: HTMLElement,
  mountTarget?: HTMLElement
): HTMLElement {
  if (mountTarget) {
    return mountTarget
  }

  const canvasContainer = AcApDocManager.instance.curView?.container
  const canvasParent = canvasContainer?.parentElement
  if (canvasParent && (canvasParent === host || host.contains(canvasParent))) {
    return acuiSkipUiLayoutWrappers(canvasParent, host)
  }

  return host
}
