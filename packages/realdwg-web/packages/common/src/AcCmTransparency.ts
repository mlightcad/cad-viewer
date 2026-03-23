import { AcCmTransparencyMethod } from './AcCmTransparencyMethod'

/**
 * Class representing transparency similar to AutoCAD’s `AcCmTransparency`.
 *
 * Stores both method and alpha information.
 */
export class AcCmTransparency {
  /** The transparency interpretation method. */
  private _method: AcCmTransparencyMethod

  /**
   * Alpha value in range 0–255 where:
   * - 0 is fully transparent
   * - 255 is fully opaque
   *
   * Only valid when the method is `ByAlpha`.
   */
  private _alpha: number

  /**
   * Creates a new transparency object.
   *
   * @param alpha
   *   When provided, constructs with `ByAlpha` method and sets alpha.
   *   Must be between 0 and 255.
   */
  constructor(alpha?: number) {
    if (alpha !== undefined) {
      this._method = AcCmTransparencyMethod.ByAlpha
      this._alpha = AcCmTransparency.clampAlpha(alpha)
    } else {
      this._method = AcCmTransparencyMethod.ByLayer
      this._alpha = 255
    }
  }

  /** Gets the current transparency method */
  get method(): AcCmTransparencyMethod {
    return this._method
  }

  /**
   * Sets the transparency method.
   * If setting to ByAlpha with no prior alpha, alpha stays 255 (opaque).
   *
   * @param method The new transparency method
   */
  set method(method: AcCmTransparencyMethod) {
    this._method = method
  }

  /**
   * Gets the alpha value.
   * Only meaningful if `method === ByAlpha`.
   */
  get alpha(): number {
    return this._alpha
  }

  /**
   * Sets the alpha value and force the method to `ByAlpha`.
   *
   * @param alpha 0–255 alpha, clamped internally if out of range
   */
  set alpha(alpha: number) {
    this._alpha = AcCmTransparency.clampAlpha(alpha)
    this._method = AcCmTransparencyMethod.ByAlpha
  }

  /**
   * Gets the AutoCAD-style transparency percentage.
   *
   * Mapping rules:
   * - 0%   = fully opaque  (alpha = 255)
   * - 100% = fully transparent (alpha = 0)
   *
   * This matches how AutoCAD displays and stores transparency
   * values in UI and DXF files.
   *
   * If the transparency method is not `ByAlpha`,
   * this method returns `undefined`, because AutoCAD
   * does not define a percentage for ByLayer or ByBlock.
   *
   * @returns Transparency percentage (0–100), or undefined
   */
  get percentage(): number | undefined {
    if (this._method !== AcCmTransparencyMethod.ByAlpha) {
      return undefined
    }

    return Math.round((1 - this._alpha / 255) * 100)
  }

  /**
   * Sets the transparency using an AutoCAD-style percentage.
   *
   * Mapping rules (AutoCAD compatible):
   * - 0%   → fully opaque      (alpha = 255)
   * - 100% → fully transparent (alpha = 0)
   *
   * Internally, the alpha value is calculated as:
   *   alpha = round(255 × (1 − percentage / 100))
   *
   * This method:
   * - Forces the transparency method to `ByAlpha`
   * - Clamps the percentage to the range 0–100
   * - Preserves ObjectARX value semantics
   *
   * @param percentage Transparency percentage (0–100)
   * @returns This instance (for fluent chaining)
   *
   * @example
   * const t = new AcCmTransparency();
   * t.setPercentage(50); // ≈ alpha 128
   *
   * t.setPercentage(0);   // alpha = 255 (opaque)
   * t.setPercentage(100); // alpha = 0   (clear)
   */
  set percentage(percentage: number) {
    const p = Math.max(0, Math.min(100, percentage))
    const alpha = Math.round(255 * (1 - p / 100))
    this.alpha = alpha
  }

  /**
   * Ensures alpha always stays within 0–255.
   */
  private static clampAlpha(alpha: number): number {
    return Math.max(0, Math.min(255, Math.floor(alpha)))
  }

  /**
   * True if the method is `ByAlpha`.
   */
  get isByAlpha(): boolean {
    return this._method === AcCmTransparencyMethod.ByAlpha
  }

  /**
   * True if the method is `ByBlock`.
   */
  get isByBlock(): boolean {
    return this._method === AcCmTransparencyMethod.ByBlock
  }

  /**
   * True if the method is `ByLayer`.
   */
  get isByLayer(): boolean {
    return this._method === AcCmTransparencyMethod.ByLayer
  }

  /**
   * True if transparency is exactly clear (alpha==0 and ByAlpha).
   */
  get isClear(): boolean {
    return this.isByAlpha && this._alpha === 0
  }

  /**
   * True if transparency is solid (alpha==255 and ByAlpha).
   */
  get isSolid(): boolean {
    return this.isByAlpha && this._alpha === 255
  }

  /**
   * True if current state is invalid (ErrorValue).
   */
  get isInvalid(): boolean {
    return this._method === AcCmTransparencyMethod.ErrorValue
  }

  /**
   * Convert this transparency to an integer suitable for storage.
   * Uses a simple bit-encoding: high­bits for method and low­bits for alpha.
   *
   * 31          24 23          8 7          0
   * +-------------+--------------+------------+
   * |  flags      |   reserved   |  alpha     |
   * +-------------+--------------+------------+
   */
  serialize(): number {
    const methodVal = this._method
    return (methodVal << 24) | this._alpha
  }

  /**
   * Creates a deep copy of this transparency object.
   *
   * This mirrors the value-semantics of ObjectARX `AcCmTransparency`,
   * where copying results in an independent object with the same
   * transparency method and alpha value.
   *
   * @returns A new `AcCmTransparency` instance with identical state.
   */
  clone(): AcCmTransparency {
    const copy = new AcCmTransparency()
    copy._method = this._method
    copy._alpha = this._alpha
    return copy
  }

  /**
   * Compares this transparency with another one for equality.
   *
   * Two `AcCmTransparency` objects are considered equal if:
   * - Their transparency methods are identical
   * - Their alpha values are identical
   *
   * This mirrors the value semantics of ObjectARX
   * `AcCmTransparency`.
   *
   * @param other The transparency to compare with
   * @returns True if both represent the same transparency
   *
   * @example
   * const a = new AcCmTransparency(128);
   * const b = new AcCmTransparency(128);
   * a.equals(b); // true
   */
  equals(other: AcCmTransparency): boolean {
    return this._method === other._method && this._alpha === other._alpha
  }

  /**
   * Returns a human-readable string representation of the transparency.
   *
   * Behavior:
   * - `"ByLayer"` if transparency is inherited from layer
   * - `"ByBlock"` if transparency is inherited from block
   * - Numeric alpha value (`"0"`–`"255"`) if method is `ByAlpha`
   *
   * This format is intentionally simple and mirrors common
   * AutoCAD UI and DXF text usage.
   *
   * @returns String representation of the transparency
   *
   * @example
   * new AcCmTransparency().toString();        // "ByLayer"
   * new AcCmTransparency(128).toString();     // "128"
   */
  toString(): string {
    if (this.isByLayer) return 'ByLayer'
    if (this.isByBlock) return 'ByBlock'
    return this._alpha.toString()
  }

  /**
   * Creates an `AcCmTransparency` instance from a string representation.
   *
   * Accepted formats:
   * - `"ByLayer"` (case-insensitive)
   * - `"ByBlock"` (case-insensitive)
   * - Numeric alpha value `"0"`–`"255"`
   *
   * Invalid or out-of-range values will produce an
   * `ErrorValue` transparency.
   *
   * @param value String to parse
   * @returns Parsed `AcCmTransparency` instance
   *
   * @example
   * AcCmTransparency.fromString("ByLayer");
   * AcCmTransparency.fromString("128");
   * AcCmTransparency.fromString("ByBlock");
   */
  static fromString(value: string): AcCmTransparency {
    const v = value.trim()

    if (/^bylayer$/i.test(v)) {
      const t = new AcCmTransparency()
      t._method = AcCmTransparencyMethod.ByLayer
      return t
    }

    if (/^byblock$/i.test(v)) {
      const t = new AcCmTransparency()
      t._method = AcCmTransparencyMethod.ByBlock
      return t
    }

    const alpha = Number(v)
    if (Number.isInteger(alpha) && alpha >= 0 && alpha <= 255) {
      return new AcCmTransparency(alpha)
    }

    // Invalid input → ErrorValue
    const t = new AcCmTransparency()
    t._method = AcCmTransparencyMethod.ErrorValue
    return t
  }

  /**
   * Deserialize an integer back into a transparency object.
   *
   * @param value 32-bit stored transparency representation
   */
  static deserialize(value: number): AcCmTransparency {
    const methodIndex = (value >>> 24) & 0xff
    const alpha = value & 0xff
    const method =
      Object.values(AcCmTransparencyMethod)[methodIndex] ??
      AcCmTransparencyMethod.ErrorValue
    const t = new AcCmTransparency()
    t._method = method as AcCmTransparencyMethod
    t._alpha = AcCmTransparency.clampAlpha(alpha)
    return t
  }
}
