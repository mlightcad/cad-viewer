/**
 * Toggle-style input flags maintained by the editor input system.
 *
 * These represent *stateful switches* that flip on key press and persist
 * after key release, matching AutoCAD-style behavior where a key acts as a
 * toggle rather than a momentary modifier.
 *
 * Notes:
 * - Toggle states are command-friendly and should be read (not mutated)
 *   by commands.
 * - Moment-in-time modifier states live in {@link AcEdInputModifiers}.
 */
export interface AcEdInputToggles {
  /**
   * Arc direction flip toggle for PLINE-style arc segments.
   *
   * Behavior:
   * - Each Ctrl key press flips this flag.
   * - Releasing Ctrl does NOT revert it.
   * - The active arc direction should be computed based on this value.
   */
  ctrlArcFlip: boolean
}
