/**
 * Viewport-based UI layout detection for responsive viewer chrome.
 *
 * Breakpoints: phone ≤ {@link ML_UI_MOBILE_MAX_WIDTH}px, pad up to
 * {@link ML_UI_COMPACT_MAX_WIDTH}px, desktop above compact max.
 */

/** Max viewport width (px) treated as mobile/narrow UI layout (phones). */
export const ML_UI_MOBILE_MAX_WIDTH = 600
/** Media query matching {@link ML_UI_MOBILE_MAX_WIDTH}. */
export const ML_UI_MOBILE_MEDIA_QUERY = `(max-width: ${ML_UI_MOBILE_MAX_WIDTH}px)`

/**
 * Width (px) of the bottom command/session panel on pad layouts.
 * Phone uses full viewport width (`left: 0; right: 0`).
 *
 * Keep in sync with `.ml-mobile-cmd-panel` in {@link AcUiMobileSessionPanel}.
 */
export const ML_UI_SESSION_PANEL_WIDTH = 440

/**
 * Horizontal inset (px) so the pad session panel does not touch the
 * viewport edges (`max-width: calc(100vw - inset)`).
 */
export const ML_UI_SESSION_PANEL_INSET = 24

/** CSS `max-width` for the pad session panel and layout-width dialogs. */
export const ML_UI_SESSION_PANEL_MAX_WIDTH = `calc(100vw - ${ML_UI_SESSION_PANEL_INSET}px)`

/**
 * Z-index for screen-space stroke canvases (measure / markup lines, arcs,
 * fills). Kept below capsule labels; see {@link ML_UI_Z_CANVAS_HTML_OVERLAY}.
 *
 * Must match `.ml-html-canvas` in `@mlightcad/three-renderer`.
 */
export const ML_UI_Z_CANVAS_HTML_STROKE = 1

/**
 * Z-index for world-anchored HTML labels (CSS2D measure / markup capsules).
 *
 * Above stroke canvases ({@link ML_UI_Z_CANVAS_HTML_STROKE}); below command
 * line, mobile chrome, draw-style toolbar, and modal dialogs.
 */
export const ML_UI_Z_CANVAS_HTML_OVERLAY = 2

/**
 * Z-index for the desktop draw-style toolbar overlay.
 *
 * Above mobile command chrome (`40`); below modal dialogs (`10050`).
 */
export const ML_UI_Z_DRAW_STYLE_TOOLBAR = 45

/**
 * Z-index for the floating shortcut toolbar (undo/redo/erase + selection extensions).
 *
 * Above draw-style session chrome; below modal dialogs.
 */
export const ML_UI_Z_SHORTCUT_TOOLBAR = 46

/**
 * Z-index for the mobile entity-pick cancel button (below message / status bar).
 */
export const ML_UI_Z_ENTITY_PICK_CANCEL = 47

/** Whether the current viewport matches the narrow mobile UI layout. */
export function acedIsMobileUiLayout(): boolean {
  return window.matchMedia?.(ML_UI_MOBILE_MEDIA_QUERY).matches ?? false
}

/** Max viewport width (px) for compact app-shell layout (e.g. collapsible sidebars). */
export const ML_UI_COMPACT_MAX_WIDTH = 960

/** Media query matching {@link ML_UI_COMPACT_MEDIA_QUERY}. */
export const ML_UI_COMPACT_MEDIA_QUERY = `(max-width: ${ML_UI_COMPACT_MAX_WIDTH}px)`

/** Whether the current viewport matches the compact app-shell layout. */
export function acedIsCompactUiLayout(): boolean {
  return window.matchMedia?.(ML_UI_COMPACT_MEDIA_QUERY).matches ?? false
}

/**
 * Media query matching a coarse *primary* pointer (typical phones and pads).
 *
 * Uses `pointer`, not `any-pointer`, so a mouse-first laptop with a touch
 * screen (`pointer: fine` + `any-pointer: coarse`) stays desktop.
 */
export const ML_UI_COARSE_POINTER_MEDIA_QUERY = '(pointer: coarse)'

const MOBILE_OR_PAD_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

/**
 * Whether the browser looks like a phone or pad, independent of viewport width.
 *
 * Covers landscape / wide tablets that exceed {@link ML_UI_COMPACT_MAX_WIDTH},
 * including iPadOS which reports as Macintosh with a touch screen.
 * Coarse-pointer detection uses the primary pointer only; see
 * {@link ML_UI_COARSE_POINTER_MEDIA_QUERY}.
 */
export function acedIsHandheldDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { msMaxTouchPoints?: number }
  if (MOBILE_OR_PAD_UA.test(nav.userAgent || '')) return true
  if (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1) return true
  return window.matchMedia?.(ML_UI_COARSE_POINTER_MEDIA_QUERY).matches ?? false
}

/**
 * Coarse UI layout kind derived from viewport width.
 *
 * - `phone`: {@link ML_UI_MOBILE_MAX_WIDTH} and below
 * - `pad`: between mobile and {@link ML_UI_COMPACT_MAX_WIDTH}
 * - `desktop`: above compact max width
 */
export type AcEdUiLayoutKind = 'phone' | 'pad' | 'desktop'

/**
 * Returns the current UI layout kind from viewport width media queries.
 *
 * @returns `'phone'`, `'pad'`, or `'desktop'`.
 */
export function acedGetUiLayout(): AcEdUiLayoutKind {
  if (acedIsMobileUiLayout()) return 'phone'
  if (acedIsCompactUiLayout()) return 'pad'
  return 'desktop'
}

/**
 * Whether the UI should behave as phone or pad: compact viewport, or a
 * handheld / touch device at any width (including landscape).
 */
export function acedIsMobileOrPadUi(): boolean {
  return acedGetUiLayout() !== 'desktop' || acedIsHandheldDevice()
}

/**
 * Whether the desktop floating command line should be hidden.
 *
 * Phone layouts always hide it (commands start from the toolbar). Pad and
 * other handheld UIs hide it only while an input session is active so the
 * mobile command chrome can replace Enter/Esc and keyword chips.
 *
 * @param sessionActive - True while {@link AcEdInputManager} is acquiring input.
 */
export function acedShouldHideDesktopCommandLine(
  sessionActive: boolean
): boolean {
  if (acedIsMobileUiLayout()) return true
  return sessionActive && acedIsMobileOrPadUi()
}

/**
 * Subscribes to viewport layout-kind changes (mobile + compact media queries).
 *
 * @param listener - Invoked whenever {@link acedGetUiLayout} would return a new kind.
 * @returns Unsubscribe function; no-op when `matchMedia` is unavailable.
 */
export function acedSubscribeUiLayout(
  listener: (kind: AcEdUiLayoutKind) => void
): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined
  }

  const mobileQuery = window.matchMedia(ML_UI_MOBILE_MEDIA_QUERY)
  const compactQuery = window.matchMedia(ML_UI_COMPACT_MEDIA_QUERY)
  let current = acedGetUiLayout()

  const notify = () => {
    const next = acedGetUiLayout()
    if (next === current) return
    current = next
    listener(next)
  }

  mobileQuery.addEventListener('change', notify)
  compactQuery.addEventListener('change', notify)

  return () => {
    mobileQuery.removeEventListener('change', notify)
    compactQuery.removeEventListener('change', notify)
  }
}
