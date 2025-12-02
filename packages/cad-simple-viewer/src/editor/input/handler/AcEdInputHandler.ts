/**
 * Base class for all input handlers.
 * @template T The final parsed value type (number, string, point, etc.).
 */
export interface AcEdInputHandler<T> {
  /**
   * Parses `value` using rules implemented in subclasses.
   * @param x - Texts in the first input box
   * @param y - Texts in the second input box
   * @returns parsed value if valid, otherwise null.
   */
  parse(x: string, y?: string): T | null
}
