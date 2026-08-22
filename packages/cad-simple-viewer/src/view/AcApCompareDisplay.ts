/**
 * Role of an entity in drawing comparison display.
 * - deleted: present only in the left (old) drawing
 * - added: present only in the right (new) drawing
 * - modified: present in both but geometry/attributes differ
 */
export type AcApCompareDisplayRole = 'deleted' | 'added' | 'modified'

/** Configurable colors for compare display mode. */
export interface AcApCompareDisplayColors {
  /** Unchanged entities (default gray `#9ca3af`). */
  unchanged?: number
  /** Deleted entities — left/old drawing (default red `#e11d48`). */
  deleted?: number
  /** Added entities — right/new drawing (default green `#22c55e`). */
  added?: number
  /** Modified entities (default yellow `#f59e0b`). */
  modified?: number
}

/** Options for {@link AcApDocManager.setCompareDisplay} / view compare mode. */
export interface AcApCompareDisplayOptions {
  /** When true, force unchanged color then apply role overrides. */
  enabled: boolean
  /** Alias for {@link AcApCompareDisplayColors.unchanged}. */
  baseColor?: number
  /** Role colors applied after the unchanged base color. */
  colors?: AcApCompareDisplayColors
  /** Per-entity role overrides (objectId is the DWG handle). */
  overrides?: Iterable<{
    /** Entity object id (DWG handle). */
    objectId: string
    /** Role to apply, or `null` to clear an override. */
    role: AcApCompareDisplayRole | null
  }>
}

/** Default compare-display colors used when the host omits a channel. */
export const ACAP_DEFAULT_COMPARE_COLORS: Required<AcApCompareDisplayColors> = {
  unchanged: 0x9ca3af,
  deleted: 0xe11d48,
  added: 0x22c55e,
  modified: 0xf59e0b
}
