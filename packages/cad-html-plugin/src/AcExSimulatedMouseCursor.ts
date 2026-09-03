/**
 * DOM crosshair for simulated-mouse touch picking in the offline HTML viewer.
 */

/** Crosshair arm length in CSS pixels (full size is 2× this). */
const CROSS_ARM_PX = 9

/** Lazily created cursor root. */
let cursorRoot: HTMLDivElement | null = null

/** Whether the shared stylesheet has been injected. */
let stylesInjected = false

/**
 * Injects simulated-mouse cursor CSS once.
 */
function injectCss(): void {
  if (stylesInjected) return
  stylesInjected = true
  const style = document.createElement('style')
  style.id = 'mlcad-simulated-mouse-cursor-styles'
  style.textContent = `
.mlcad-simulated-mouse-cursor {
  position: absolute;
  width: ${CROSS_ARM_PX * 2}px;
  height: ${CROSS_ARM_PX * 2}px;
  margin: -${CROSS_ARM_PX}px 0 0 -${CROSS_ARM_PX}px;
  pointer-events: none;
  z-index: 40;
  color: var(--mlcad-canvas-line, #0f0);
  display: none;
}
.mlcad-simulated-mouse-cursor svg {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.85));
}
`.trim()
  document.head.appendChild(style)
}

/**
 * Ensures the cursor element exists under `host` and returns it.
 *
 * @param host - Canvas host element (typically `#mlcad-root` or canvas parent).
 */
function ensureCursor(host: HTMLElement): HTMLDivElement {
  if (cursorRoot && cursorRoot.isConnected) return cursorRoot
  injectCss()
  cursorRoot = document.createElement('div')
  cursorRoot.className = 'mlcad-simulated-mouse-cursor'
  cursorRoot.setAttribute('aria-hidden', 'true')
  cursorRoot.innerHTML = `<svg viewBox="0 0 18 18" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="2"
      d="M9 1v16M1 9h16"/>
  </svg>`
  const hostPosition = getComputedStyle(host).position
  if (hostPosition === 'static') {
    host.style.position = 'relative'
  }
  host.appendChild(cursorRoot)
  return cursorRoot
}

/**
 * Shows or repositions the simulated-mouse crosshair at a client sample.
 *
 * @param host - Element that owns absolute positioning for the HUD.
 * @param clientX - Sample X in viewport/client CSS pixels.
 * @param clientY - Sample Y in viewport/client CSS pixels.
 */
export function acexRefreshSimulatedMouseCursor(
  host: HTMLElement,
  clientX: number,
  clientY: number
): void {
  const root = ensureCursor(host)
  const rect = host.getBoundingClientRect()
  root.style.left = `${clientX - rect.left}px`
  root.style.top = `${clientY - rect.top}px`
  root.style.display = 'block'
}

/**
 * Hides the simulated-mouse crosshair if visible.
 */
export function acexHideSimulatedMouseCursor(): void {
  if (!cursorRoot) return
  cursorRoot.style.display = 'none'
}

/**
 * Disposes the simulated-mouse cursor HUD (tests / teardown).
 */
export function acexDisposeSimulatedMouseCursor(): void {
  cursorRoot?.remove()
  cursorRoot = null
}
