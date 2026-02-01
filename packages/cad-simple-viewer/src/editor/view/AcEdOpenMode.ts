/**
 * Enumeration defining the access modes for opening a CAD database.
 *
 * The mode with higher value is compatible with modes with lower values.
 * For example:
 * - Write mode (8) is compatible with Review (4) and Read (0)
 * - Review mode (4) is compatible with Read (0)
 * - Read mode (0) is only compatible with itself
 *
 * @example
 * ```typescript
 * const mode = AcEdOpenMode.Write;
 * if (mode >= AcEdOpenMode.Review) {
 *   // Can perform review operations
 * }
 * ```
 */
export enum AcEdOpenMode {
  /** Read-only mode: allows viewing but no modifications */
  Read = 0,
  /** Review mode: allows viewing and reviewing, compatible with Read */
  Review = 4,
  /** Write mode: allows full read/write access, compatible with Review and Read */
  Write = 8
}
