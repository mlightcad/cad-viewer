/**
 * Shared timing for touch precise point capture.
 *
 * Kept in a tiny module so {@link @mlightcad/cad-html-plugin} can share the
 * same values via the main package export (tree-shaken into the offline HTML
 * IIFE) without depending on {@link ./AcEdTouchPointSession}.
 */

/**
 * Long-press delay before precise capture activates (simulated mouse or
 * snap loupe), in milliseconds.
 */
export const ACED_TOUCH_POINT_LONG_PRESS_MS = 1000

/**
 * Pointer movement in CSS pixels that cancels a pending long-press so the
 * gesture can be treated as a pan instead of a pick.
 */
export const ACED_TOUCH_POINT_MOVE_CANCEL_PX = 10
