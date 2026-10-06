/**
 * Enumeration of view interaction modes.
 *
 * The view mode determines how the view responds to user mouse interactions:
 * - In SELECTION mode, clicks select entities
 * - In PAN mode, clicks and drags pan the view
 *
 * @example
 * ```typescript
 * view.mode = AcEdViewMode.SELECTION
 * view.mode = AcEdViewMode.PAN
 * ```
 */
export enum AcEdViewMode {
  /**
   * Selection mode - mouse clicks select entities.
   *
   * In this mode:
   * - Single clicks select individual entities
   * - Drag operations can create selection boxes
   * - Selected entities are highlighted with grip points
   */
  SELECTION = 0,
  /**
   * Pan mode - mouse interactions pan the view.
   *
   * In this mode:
   * - Click and drag operations move the view
   * - The cursor typically changes to indicate pan mode
   * - Entity selection is disabled
   */
  PAN = 1
}
