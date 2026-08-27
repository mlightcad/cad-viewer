/** Max viewport width (px) treated as mobile/narrow UI layout (phones). */
export const ML_EX_UI_MOBILE_MAX_WIDTH = 600

/** Media query matching {@link ML_EX_UI_MOBILE_MAX_WIDTH}. */
export const ML_EX_UI_MOBILE_MEDIA_QUERY = `(max-width: ${ML_EX_UI_MOBILE_MAX_WIDTH}px)`

/** Whether the current viewport matches the narrow mobile UI layout. */
export function isExUiMobileLayout(): boolean {
  return window.matchMedia?.(ML_EX_UI_MOBILE_MEDIA_QUERY).matches ?? false
}
