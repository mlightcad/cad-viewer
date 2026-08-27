/**
 * Viewport layout helpers for toolbar chrome.
 *
 * Mirrors `@mlightcad/cad-simple-viewer` {@link AcEdUiLayout} breakpoints so the
 * `/toolbar` entry (and HTML export runtime) can resolve layout without importing
 * the full viewer package.
 */

/** Max viewport width (px) treated as mobile/narrow UI layout (phones). */
export const ML_EX_UI_MOBILE_MAX_WIDTH = 600

/** Media query matching {@link ML_EX_UI_MOBILE_MAX_WIDTH}. */
export const ML_EX_UI_MOBILE_MEDIA_QUERY = `(max-width: ${ML_EX_UI_MOBILE_MAX_WIDTH}px)`

/** Whether the current viewport matches the narrow mobile UI layout. */
export function acuiIsMobileLayout(): boolean {
  return window.matchMedia?.(ML_EX_UI_MOBILE_MEDIA_QUERY).matches ?? false
}

/**
 * Max viewport width (px) for pad / compact shell (matches viewer
 * {@link ML_UI_COMPACT_MAX_WIDTH}).
 */
export const ML_EX_UI_COMPACT_MAX_WIDTH = 960

/** Media query matching {@link ML_EX_UI_COMPACT_MAX_WIDTH}. */
export const ML_EX_UI_COMPACT_MEDIA_QUERY = `(max-width: ${ML_EX_UI_COMPACT_MAX_WIDTH}px)`

/** Whether the current viewport matches the compact (pad) UI layout. */
export function acuiIsCompactLayout(): boolean {
  return window.matchMedia?.(ML_EX_UI_COMPACT_MEDIA_QUERY).matches ?? false
}

/**
 * Device-oriented UI layout kind for toolbars.
 *
 * - `'mobile'`: ≤ {@link ML_EX_UI_MOBILE_MAX_WIDTH}
 * - `'pad'`: between mobile and {@link ML_EX_UI_COMPACT_MAX_WIDTH}
 * - `'desktop'`: wider than compact
 */
export type AcUiLayoutKind = 'mobile' | 'pad' | 'desktop'

/**
 * Resolves the current UI layout kind from viewport width.
 *
 * Same breakpoints as viewer {@link acedGetUiLayoutKind}.
 */
export function acuiGetLayoutKind(): AcUiLayoutKind {
  if (acuiIsMobileLayout()) return 'mobile'
  if (acuiIsCompactLayout()) return 'pad'
  return 'desktop'
}
