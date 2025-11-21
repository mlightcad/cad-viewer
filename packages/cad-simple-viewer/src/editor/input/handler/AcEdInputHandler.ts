/**
 * Base class for all input handlers.
 * @template T The final parsed value type (number, string, point, etc.).
 */
export interface AcEdInputHandler<T> {
  /**
   * Parses `value` using rules implemented in subclasses.
   * @returns parsed value if valid, otherwise null.
   */
  parse(value: string): T | null
}
