/**
 * How long after convert + deferred glyph jobs go idle a `fontLoaded`
 * callback is still part of the open, not a later face download.
 *
 * Glyph jobs await content/style fonts before they commit. The load event
 * is debounced (~50ms) and often runs just after those jobs hit zero.
 * `database.regen()` then replays CONVERSION progress. With progressive
 * rendering on, the open spinner has already hidden, so that replay looks
 * like a second loading animation. Entities already in the scene are
 * not rebuilt (`entityAppended` skips ids the view already has).
 */
export const POST_OPEN_FONT_REGEN_QUIET_MS = 1000

/**
 * Whether a late font load should call `database.regen()`.
 *
 * Live glyph shells are redrawn in place by the caller. A database regen is
 * only for committed text whose font arrived well after the open finished.
 *
 * @param isProcessingEntities - Convert queue or deferred glyph jobs still running
 * @param liveGlyphCount - Glyph entities still in the scene (not yet batched)
 * @param msSinceEntitiesBecameIdle - Time since convert and glyph jobs last
 *   became idle, or `null` when that transition has not happened
 */
export function shouldRegenDatabaseAfterFontLoad(
  isProcessingEntities: boolean,
  liveGlyphCount: number,
  msSinceEntitiesBecameIdle: number | null
): boolean {
  if (isProcessingEntities || liveGlyphCount > 0) {
    return false
  }
  if (msSinceEntitiesBecameIdle == null) {
    return true
  }
  return msSinceEntitiesBecameIdle >= POST_OPEN_FONT_REGEN_QUIET_MS
}
