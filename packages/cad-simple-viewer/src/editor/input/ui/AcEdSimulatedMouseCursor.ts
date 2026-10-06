/**
 * DOM crosshair for simulated-mouse touch picking.
 *
 * Positioned at the pick sample (above the finger). One HUD per view, shared
 * across point prompts the same way as {@link acedRefreshMobileSnapLoupe}.
 */

import type { AcEdBaseView } from '../../view'

/** Crosshair arm length in CSS pixels (full size is 2× this). */
const CROSS_ARM_PX = 9

/** Lazily created cursor HUD keyed by view. */
const cursors = new WeakMap<AcEdBaseView, HTMLDivElement>()

/** Whether the shared stylesheet has been injected. */
let stylesInjected = false

/**
 * Injects simulated-mouse cursor CSS once.
 */
function injectCss(): void {
  if (stylesInjected) return
  stylesInjected = true
  const style = document.createElement('style')
  style.id = 'ml-simulated-mouse-cursor-styles'
  style.textContent = `
.ml-simulated-mouse-cursor {
  position: absolute;
  width: ${CROSS_ARM_PX * 2}px;
  height: ${CROSS_ARM_PX * 2}px;
  margin: -${CROSS_ARM_PX}px 0 0 -${CROSS_ARM_PX}px;
  pointer-events: none;
  z-index: 40;
  color: var(--ml-ui-canvas-line, #0f0);
  display: none;
}
.ml-simulated-mouse-cursor svg {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.85));
}
`.trim()
  document.head.appendChild(style)
}

/**
 * Ensures a cursor element exists for `view` and returns it.
 *
 * @param view - View that owns the overlay host.
 * @returns The cursor root element.
 */
function ensureCursor(view: AcEdBaseView): HTMLDivElement {
  let root = cursors.get(view)
  if (root) return root
  injectCss()
  root = document.createElement('div')
  root.className = 'ml-simulated-mouse-cursor'
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `<svg viewBox="0 0 18 18" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="2"
      d="M9 1v16M1 9h16"/>
  </svg>`
  const hostPosition = getComputedStyle(view.container).position
  if (hostPosition === 'static') {
    view.container.style.position = 'relative'
  }
  view.container.appendChild(root)
  cursors.set(view, root)
  return root
}

/**
 * Shows or repositions the simulated-mouse crosshair at a client sample.
 *
 * @param view - View that owns the overlay host.
 * @param clientX - Sample X in viewport/client CSS pixels.
 * @param clientY - Sample Y in viewport/client CSS pixels.
 */
export function acedRefreshSimulatedMouseCursor(
  view: AcEdBaseView,
  clientX: number,
  clientY: number
): void {
  const root = ensureCursor(view)
  const canvas = view.viewportToCanvas({ x: clientX, y: clientY })
  const host = view.canvasToContainer(canvas)
  root.style.left = `${host.x}px`
  root.style.top = `${host.y}px`
  root.style.display = 'block'
}

/**
 * Hides the simulated-mouse crosshair for `view` if visible.
 *
 * @param view - View whose cursor should be hidden.
 */
export function acedHideSimulatedMouseCursor(view: AcEdBaseView): void {
  const root = cursors.get(view)
  if (!root) return
  root.style.display = 'none'
}

/**
 * Disposes the simulated-mouse cursor HUD for `view` (tests / view teardown).
 *
 * @param view - View whose cursor should be destroyed.
 */
export function acedDisposeSimulatedMouseCursor(view: AcEdBaseView): void {
  const root = cursors.get(view)
  if (!root) return
  root.remove()
  cursors.delete(view)
}
