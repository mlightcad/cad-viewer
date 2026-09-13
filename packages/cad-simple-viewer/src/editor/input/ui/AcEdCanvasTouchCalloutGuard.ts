/**
 * Suppresses iOS Safari / WKWebView long-press callout and text selection on a
 * drawing canvas so custom long-press gestures (snap loupe) can win.
 *
 * Apple devices still show Copy / selection UI on `<canvas>` even when Pointer
 * Events call `preventDefault`. A non-passive `touchstart` listener is
 * required in addition to CSS (`-webkit-touch-callout`, `user-select`).
 */

/**
 * Applies canvas styles that block OS long-press callout and selection.
 *
 * @param element - Canvas or host element to style.
 */
export function acedApplyCanvasTouchCalloutStyles(element: HTMLElement): void {
  element.style.touchAction = 'none'
  element.style.userSelect = 'none'
  element.style.setProperty('-webkit-user-select', 'none')
  element.style.setProperty('-webkit-touch-callout', 'none')
  element.style.setProperty('-webkit-tap-highlight-color', 'transparent')
}

/**
 * Clears any active DOM text selection (iOS selection handles / callout).
 */
export function acedClearDomSelection(): void {
  const selection = window.getSelection?.()
  if (selection == null || selection.rangeCount === 0) return
  selection.removeAllRanges()
}

/**
 * Guards a canvas against iOS long-press copy / selection.
 *
 * Styles may also be applied to an optional host so the callout does not
 * appear on empty padding around the canvas. `selectstart` / `touchstart`
 * prevention stays on the canvas only so overlay text editors keep working.
 *
 * @param canvas - Drawing surface that owns touch long-press gestures.
 * @param host - Optional host around the canvas (callout CSS only).
 * @returns Cleanup that removes the listeners.
 */
export function acedGuardCanvasTouchCallout(
  canvas: HTMLElement,
  host?: HTMLElement
): () => void {
  acedApplyCanvasTouchCalloutStyles(canvas)
  if (host) {
    host.style.setProperty('-webkit-touch-callout', 'none')
    host.style.setProperty('-webkit-tap-highlight-color', 'transparent')
  }

  const onTouchStart = (event: TouchEvent) => {
    // Required on Apple devices even when pointerdown already called
    // preventDefault — otherwise the Copy / selection callout still appears.
    event.preventDefault()
  }
  const onSelectStart = (event: Event) => {
    event.preventDefault()
  }

  const touchOptions: AddEventListenerOptions = {
    passive: false,
    capture: true
  }
  canvas.addEventListener('touchstart', onTouchStart, touchOptions)
  canvas.addEventListener('selectstart', onSelectStart, true)

  return () => {
    canvas.removeEventListener('touchstart', onTouchStart, touchOptions)
    canvas.removeEventListener('selectstart', onSelectStart, true)
  }
}
