import { AcGePoint2dLike } from '@mlightcad/data-model'

/**
 * Optional context for AutoCAD-style command-line point entry.
 */
export interface AcEdPointInputContext {
  /** Last picked point or prompt base point for relative (`@`) entry. */
  referencePoint?: AcGePoint2dLike | null
  /**
   * Current cursor position in WCS. Required to interpret a lone distance value
   * as a point along the active rubber-band direction.
   */
  cursorPoint?: AcGePoint2dLike | null
}

/**
 * Base class for all input handlers.
 * @template T The final parsed value type (number, string, point, etc.).
 */
export interface AcEdInputHandler<T> {
  /**
   * Parses floating-input box values using rules implemented in subclasses.
   * @param x - Texts in the first input box
   * @param y - Texts in the second input box
   * @returns parsed value if valid, otherwise null.
   */
  parse(x: string, y?: string): T | null

  /**
   * Parses one AutoCAD-style command-line token.
   *
   * Handlers that only accept a single value typically delegate to {@link parse}.
   */
  parseCommandLine(token: string, context?: AcEdPointInputContext): T | null
}
