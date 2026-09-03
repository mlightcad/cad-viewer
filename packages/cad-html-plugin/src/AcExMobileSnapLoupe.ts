/**
 * Shared mobile snap loupe bridge for the offline HTML viewer.
 *
 * The runtime registers refresh/hide hooks once; measure / markup point pick
 * and osnap grip drag both call these helpers so the loupe lives in one place.
 */

/** Runtime-owned loupe hooks. */
export interface AcExMobileSnapLoupeBridge {
  /** Show / reposition the loupe around a client sample. */
  refresh: (clientX: number, clientY: number) => void
  /** Hide the loupe and clear the overlay sample. */
  hide: () => void
  /**
   * Optional: lock one-finger pan while the loupe tracks a precise sample.
   * Used by drawing-tool long-press; grip drag may omit this.
   */
  setPreciseCaptureActive?: (active: boolean) => void
}

let bridge: AcExMobileSnapLoupeBridge | null = null

/**
 * Registers the runtime loupe implementation. Pass `null` to clear (teardown).
 *
 * @param next - Loupe hooks from {@link createAcExHtmlViewerRuntime}, or null.
 */
export function acExBindMobileSnapLoupe(
  next: AcExMobileSnapLoupeBridge | null
): void {
  bridge = next
}

/**
 * Shows or repositions the shared snap loupe around a client sample.
 *
 * @param clientX - Sample X in client CSS pixels.
 * @param clientY - Sample Y in client CSS pixels.
 */
export function acExRefreshMobileSnapLoupe(
  clientX: number,
  clientY: number
): void {
  bridge?.refresh(clientX, clientY)
}

/**
 * Hides the shared snap loupe if visible.
 */
export function acExHideMobileSnapLoupe(): void {
  bridge?.hide()
}

/**
 * Toggles precise-capture mode when the runtime provided a hook.
 *
 * @param active - True while the loupe should block one-finger pan.
 */
export function acExSetMobileSnapLoupePreciseCapture(active: boolean): void {
  bridge?.setPreciseCaptureActive?.(active)
}
