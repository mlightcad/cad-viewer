import { AcDbTypedValue } from './AcDbTypedValue'

/**
 * Represents an ordered collection of typed values.
 *
 * @remarks
 * This class corresponds to AutoCAD's ResultBuffer class.
 * It is commonly used to store Xrecord data, XData, and
 * other extensible data structures.
 */
export class AcDbResultBuffer implements Iterable<AcDbTypedValue> {
  private readonly _values: AcDbTypedValue[] = []

  /**
   * Creates a new result buffer.
   *
   * @param values - Optional initial typed values
   */
  constructor(values?: Iterable<AcDbTypedValue>) {
    if (values) {
      for (const v of values) {
        this._values.push({ ...v })
      }
    }
  }

  /**
   * Gets the number of typed values in the buffer.
   */
  get length(): number {
    return this._values.length
  }

  /**
   * Gets the typed value at the specified index.
   *
   * @param index - Zero-based index
   */
  at(index: number): AcDbTypedValue | undefined {
    return this._values[index]
  }

  /**
   * Adds a typed value to the end of the buffer.
   *
   * @param value - Typed value to add
   */
  add(value: AcDbTypedValue): void {
    this._values.push(value)
  }

  /**
   * Adds multiple typed values to the buffer.
   *
   * @param values - Typed values to add
   */
  addRange(values: Iterable<AcDbTypedValue>): void {
    for (const v of values) {
      this._values.push(v)
    }
  }

  /**
   * Removes all values from the buffer.
   */
  clear(): void {
    this._values.length = 0
  }

  /**
   * Returns a shallow copy of the typed values.
   */
  toArray(): AcDbTypedValue[] {
    return this._values.map(v => ({ ...v }))
  }

  /**
   * Creates a deep copy of this result buffer.
   */
  clone(): AcDbResultBuffer {
    return new AcDbResultBuffer(this._values)
  }

  /**
   * Returns an iterator for the typed values.
   */
  [Symbol.iterator](): Iterator<AcDbTypedValue> {
    return this._values[Symbol.iterator]()
  }
}
