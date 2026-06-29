/** Max viewport width (px) treated as mobile/narrow UI layout (phones). */
export const ML_UI_MOBILE_MAX_WIDTH = 600

/** Media query matching {@link ML_UI_MOBILE_MAX_WIDTH}. */
export const ML_UI_MOBILE_MEDIA_QUERY = `(max-width: ${ML_UI_MOBILE_MAX_WIDTH}px)`

/** Whether the current viewport matches the narrow mobile UI layout. */
export function isMobileUiLayout(): boolean {
  return window.matchMedia?.(ML_UI_MOBILE_MEDIA_QUERY).matches ?? false
}

/** Max viewport width (px) for compact app-shell layout (e.g. collapsible sidebars). */
export const ML_UI_COMPACT_MAX_WIDTH = 960

/** Media query matching {@link ML_UI_COMPACT_MAX_WIDTH}. */
export const ML_UI_COMPACT_MEDIA_QUERY = `(max-width: ${ML_UI_COMPACT_MAX_WIDTH}px)`

/** Whether the current viewport matches the compact app-shell layout. */
export function isCompactUiLayout(): boolean {
  return window.matchMedia?.(ML_UI_COMPACT_MEDIA_QUERY).matches ?? false
}
