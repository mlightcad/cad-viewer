import { AcCmColorMethod } from './AcCmColorMethod'
import { AcCmColorUtil } from './AcCmColorUtil'

/**
 * Represents an AutoCAD color. This class supports color methods:
 * - ByColor: explicit RGB
 * - ByACI: AutoCAD Color Index (0-256)
 * - ByLayer: color inherited from layer
 * - ByBlock: color inherited from block
 */
export class AcCmColor {
  /** The method used to determine the entity's color */
  private _colorMethod: AcCmColorMethod

  /**
   * Internal value representing the color.
   * - RGB: packed 0xRRGGBB for `ByColor`
   * - ACI: 0–256 for `ByACI`
   * - Layer index: 256 for `ByLayer`
   * - Block indicator: 0 for `ByBlock`
   */
  private _value?: number

  /**
   * Constructs a new AcCmColor.
   * @param method Initial color method (defaults to `ByColor`)
   * @param value Internal packed value
   */
  constructor(
    method: AcCmColorMethod = AcCmColorMethod.ByLayer,
    value?: number
  ) {
    this._colorMethod = method
    if (this._colorMethod == AcCmColorMethod.ByColor && value == null) {
      this._value = 0xffffff
    } else if (this._colorMethod == AcCmColorMethod.ByACI) {
      if (value == null) {
        this._value = 8
      } else if (value === 0) {
        this._colorMethod = AcCmColorMethod.ByBlock
      } else if (value === 256) {
        this._colorMethod = AcCmColorMethod.ByLayer
      } else {
        this._value = Math.max(0, Math.min(value, 256))
      }
    } else {
      this._value = value
    }
  }

  // ---------------------------------------------------------------------
  // Color method
  // ---------------------------------------------------------------------

  /** Gets the current color method. */
  get colorMethod(): AcCmColorMethod {
    return this._colorMethod
  }

  /**
   * Sets the color method.
   *
   * Note: Changing the method does not modify `_value`.
   */
  set colorMethod(method: AcCmColorMethod) {
    this._colorMethod = method
  }

  // ---------------------------------------------------------------------
  // RGB accessors (ByColor)
  // ---------------------------------------------------------------------

  /** Gets the red component (0–255). */
  get red(): number | undefined {
    const rgb = this.RGB
    return rgb != null ? (rgb >> 16) & 0xff : undefined
  }

  /** Gets the green component (0–255). */
  get green(): number | undefined {
    const rgb = this.RGB
    return rgb != null ? (rgb >> 8) & 0xff : undefined
  }

  /** Gets the blue component (0–255). */
  get blue(): number | undefined {
    const rgb = this.RGB
    return rgb != null ? rgb & 0xff : undefined
  }

  /**
   * Gets the packed RGB value (0xRRGGBB).
   *
   * - For `ByColor`, returns `_value` directly
   * - For `ByACI`, converts index to RGB via `AcCmColorUtil`
   * - For `ByLayer` or `ByBlock`, returns `_value` directly
   */
  get RGB(): number | undefined {
    switch (this._colorMethod) {
      case AcCmColorMethod.ByColor:
      case AcCmColorMethod.ByBlock:
      case AcCmColorMethod.ByLayer:
        return this._value
      case AcCmColorMethod.ByACI:
        return this._value
          ? AcCmColorUtil.getColorByIndex(this._value)
          : this._value
      default:
        return undefined
    }
  }

  /**
   * Sets the RGB color.
   *
   * @param r Red component (0–255)
   * @param g Green component (0–255)
   * @param b Blue component (0–255)
   * @returns The current instance for chaining
   */
  setRGB(r: number, g: number, b: number) {
    const red = Math.max(0, Math.min(255, Math.round(r)))
    const green = Math.max(0, Math.min(255, Math.round(g)))
    const blue = Math.max(0, Math.min(255, Math.round(b)))
    this._value = (red << 16) | (green << 8) | blue
    this._colorMethod = AcCmColorMethod.ByColor
    return this
  }

  /**
   * Sets the RGB color by a single packed number (0xRRGGBB).
   *
   * @param value Packed RGB number
   */
  setRGBValue(value: number | undefined | null) {
    if (value == null || !Number.isFinite(value)) {
      console.warn('Invalid RGB value:', value)
      return this
    }
    this._value = value & 0xffffff
    this._colorMethod = AcCmColorMethod.ByColor
    return this
  }

  /**
   * Sets the RGB color from a CSS color string.
   *
   * Examples:
   * - "#FF00FF"
   * - "#F0F"
   * - "rgb(255,0,255)"
   * - "rgba(255,0,255,0.5)"
   * - "red" (named colors)
   *
   * @param cssString CSS color string
   * @returns The current instance for chaining
   */
  setRGBFromCss(cssString: string) {
    if (!cssString) return this

    const s = cssString.trim().toLowerCase()

    // Hex: #RRGGBB or #RGB
    if (s.startsWith('#')) {
      let r = 0,
        g = 0,
        b = 0
      if (s.length === 7) {
        r = parseInt(s.substr(1, 2), 16)
        g = parseInt(s.substr(3, 2), 16)
        b = parseInt(s.substr(5, 2), 16)
      } else if (s.length === 4) {
        r = parseInt(s[1] + s[1], 16)
        g = parseInt(s[2] + s[2], 16)
        b = parseInt(s[3] + s[3], 16)
      } else {
        console.warn('Invalid hex color:', cssString)
        return this
      }
      return this.setRGB(r, g, b)
    }

    // rgb() or rgba()
    const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10)
      const g = parseInt(rgbMatch[2], 10)
      const b = parseInt(rgbMatch[3], 10)
      return this.setRGB(r, g, b)
    }

    // Named color
    const namedColor = AcCmColorUtil.getColorByName(cssString)
    if (namedColor !== undefined) {
      return this.setRGBValue(namedColor)
    }

    console.warn('Unknown CSS color string:', cssString)
    return this
  }

  /**
   * Sets the color as a scalar grayscale value.
   *
   * @param scalar Scalar value (0–255)
   * @returns The current instance for chaining
   */
  setScalar(scalar: number) {
    return this.setRGB(scalar, scalar, scalar)
  }

  /**
   * Gets the hexadecimal representation of the color (e.g., "0xFF00FF").
   */
  get hexColor(): string | undefined {
    const rgb = this.RGB
    if (rgb == null) return undefined

    // Convert to hex and ensure always 6 digits
    const hex = rgb.toString(16).padStart(6, '0').toUpperCase()
    return '0x' + hex
  }

  /**
   * Gets the CSS RGB color string (e.g., "rgb(255,0,255)").
   */
  get cssColor(): string | undefined {
    const rgb = this.RGB
    if (rgb == null) return undefined
    return `rgb(${(rgb >> 16) & 0xff},${(rgb >> 8) & 0xff},${rgb & 0xff})`
  }

  /**
   * Returns a CSS rgba() color string with the specified alpha value.
   * @param alpha - Opacity value between 0 (transparent) and 1 (opaque)
   */
  cssColorAlpha(alpha: number): string | undefined {
    const rgb = this.RGB
    if (rgb == null) return undefined
    return `rgba(${(rgb >> 16) & 0xff},${(rgb >> 8) & 0xff},${rgb & 0xff},${alpha})`
  }

  // ---------------------------------------------------------------------
  // ACI accessors (ByACI)
  // ---------------------------------------------------------------------

  /** Gets the AutoCAD Color Index (ACI), or undefined if not ByACI, ByBlock, or ByLayer. */
  get colorIndex(): number | undefined {
    if (this._colorMethod === AcCmColorMethod.ByACI) return this._value
    else if (this._colorMethod === AcCmColorMethod.ByLayer) return 256
    else if (this._colorMethod === AcCmColorMethod.ByBlock) return 0
    else return undefined
  }

  /**
   * Sets the AutoCAD Color Index (0–256).
   *
   * - 0 sets the color method to `ByBlock`
   * - 256 sets the color method to `ByLayer`
   * - 1–255 sets the color method to `ByACI`
   *
   * @param index ACI index
   */
  set colorIndex(index: number | undefined) {
    if (index == null) return
    const clamped = Math.max(0, Math.min(256, Math.round(index)))

    if (clamped === 0) {
      this._colorMethod = AcCmColorMethod.ByBlock
      this._value = undefined
    } else if (clamped === 256) {
      this._colorMethod = AcCmColorMethod.ByLayer
      this._value = undefined
    } else {
      this._colorMethod = AcCmColorMethod.ByACI
      this._value = clamped
    }
  }

  /**
   * Returns true if the color method is ByColor (explicit RGB).
   */
  get isByColor(): boolean {
    return this._colorMethod === AcCmColorMethod.ByColor
  }

  /**
   * Returns true if the color method is ByACI.
   */
  get isByACI(): boolean {
    return this._colorMethod === AcCmColorMethod.ByACI
  }

  /**
   * Returns true if the color method is ByACI and ACI value is 7
   *
   * Notes:
   * In AutoCAD, ACI Color 7 (Color Index 7) is officially named "Black" or "White" depending on
   * the context, but it is functionally defined as the "Contrasting Color" or "Auto-Contrast Color."
   * Here is the technical explanation of its behavior:
   * - If the background is dark: Color 7 displays as White.
   * - If the background is light: Color 7 displays as Black.
   */
  get isForeground(): boolean {
    return this._colorMethod === AcCmColorMethod.ByACI && this._value === 7
  }

  /**
   * Sets the color to ACI value 7.
   */
  setForeground() {
    this._colorMethod = AcCmColorMethod.ByACI
    this._value = 7
    return this
  }

  // ---------------------------------------------------------------------
  // Layer / Block helpers
  // ---------------------------------------------------------------------

  /** Returns true if the color method is ByLayer. */
  get isByLayer(): boolean {
    return this._colorMethod === AcCmColorMethod.ByLayer
  }

  /**
   * Sets the color to ByLayer.
   * @param value - Option layer color value
   */
  setByLayer(value?: number) {
    this._colorMethod = AcCmColorMethod.ByLayer
    if (value == null) {
      this._value = 256
    } else {
      this._value = value
    }
    return this
  }

  /** Returns true if the color method is ByBlock. */
  get isByBlock(): boolean {
    return this._colorMethod === AcCmColorMethod.ByBlock
  }

  /**
   * Sets the color to ByBlock.
   * @param value - Option layer color value
   */
  setByBlock(value?: number) {
    this._colorMethod = AcCmColorMethod.ByBlock
    if (value == null) {
      this._value = 0
    } else {
      this._value = value
    }
    return this
  }

  // ---------------------------------------------------------------------
  // Color name (dynamic)
  // ---------------------------------------------------------------------

  /**
   * Gets the color name.
   *
   * For `ByColor` or `ByACI`, resolves the name via `AcCmColorUtil`.
   * For `ByLayer` or `ByBlock`, returns the corresponding string.
   */
  get colorName(): string | undefined {
    switch (this._colorMethod) {
      case AcCmColorMethod.ByLayer:
        return 'ByLayer'
      case AcCmColorMethod.ByBlock:
        return 'ByBlock'
      case AcCmColorMethod.ByColor:
        return this._value ? AcCmColorUtil.getNameByColor(this._value) : ''
      case AcCmColorMethod.ByACI:
        return this._value ? AcCmColorUtil.getNameByIndex(this._value) : ''
      default:
        return undefined
    }
  }

  /**
   * Sets the color by name.
   *
   * Resolves the name to an RGB value via `AcCmColorUtil`.
   *
   * @param name Color name
   */
  set colorName(name: string | undefined) {
    if (!name) return
    const color = AcCmColorUtil.getColorByName(name)
    if (color !== undefined) {
      this._value = color
      this._colorMethod = AcCmColorMethod.ByColor
    } else {
      console.warn('Unknown color name:', name)
    }
  }

  // ---------------------------------------------------------------------
  // Clone / Copy / Equals
  // ---------------------------------------------------------------------

  /**
   * Creates a clone of this color instance.
   *
   * @returns A new AcCmColor instance with the same method and value
   */
  clone(): AcCmColor {
    const c = new AcCmColor()
    c._colorMethod = this._colorMethod
    c._value = this._value
    return c
  }

  /**
   * Copies color values from another AcCmColor instance.
   *
   * @param other The source color
   * @returns The current instance
   */
  copy(other: AcCmColor) {
    this._colorMethod = other._colorMethod
    this._value = other._value
    return this
  }

  /**
   * Checks equality with another color.
   *
   * @param other The color to compare
   * @returns True if color method and value are identical
   */
  equals(other: AcCmColor) {
    return (
      this._colorMethod === other._colorMethod && this._value === other._value
    )
  }

  // ---------------------------------------------------------------------
  // String representation
  // ---------------------------------------------------------------------

  /**
   * Returns a string representation of the color.
   *
   * - "ByLayer" for ByLayer colors
   * - "ByBlock" for ByBlock colors
   * - One number for color index
   * - Three comma-separated numbers for RGB color
   */
  toString(): string {
    switch (this._colorMethod) {
      case AcCmColorMethod.ByLayer:
        return 'ByLayer'
      case AcCmColorMethod.ByBlock:
        return 'ByBlock'
      case AcCmColorMethod.ByACI:
        // ACI index as number string: "30"
        return this._value !== undefined ? String(this._value) : ''
      case AcCmColorMethod.ByColor:
        if (!this._value) return ''
        return `${this.red},${this.green},${this.blue}`
      default:
        return ''
    }
  }

  /**
   * Creates one AcCmColor from one string
   */
  static fromString(name: string): AcCmColor | undefined {
    if (!name) return undefined

    const n = name.trim()

    // -------------------------------------------------
    // 1. ByLayer / ByBlock
    // -------------------------------------------------
    if (/^bylayer$/i.test(n)) {
      return new AcCmColor(AcCmColorMethod.ByLayer)
    }

    if (/^byblock$/i.test(n)) {
      return new AcCmColor(AcCmColorMethod.ByBlock)
    }

    // -------------------------------------------------
    // 2. RGB with prefix: "RGB:255,0,0" (case-insensitive)
    // -------------------------------------------------
    const rgbPrefixedMatch = n.match(
      /^rgb\s*:\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/i
    )
    if (rgbPrefixedMatch) {
      const r = Number(rgbPrefixedMatch[1])
      const g = Number(rgbPrefixedMatch[2])
      const b = Number(rgbPrefixedMatch[3])

      const color = new AcCmColor(AcCmColorMethod.ByColor)
      color.setRGB(r, g, b)
      return color
    }

    // -------------------------------------------------
    // 3. RGB without prefix: "255,0,0"
    // -------------------------------------------------
    if (/^\d{1,3},\d{1,3},\d{1,3}$/.test(n)) {
      const [r, g, b] = n.split(',').map(Number)
      const color = new AcCmColor(AcCmColorMethod.ByColor)
      color.setRGB(r, g, b)
      return color
    }

    // -------------------------------------------------
    // 4. ACI index: "1" – "255"
    // -------------------------------------------------
    if (/^\d+$/.test(n)) {
      const index = parseInt(n, 10)
      return new AcCmColor(AcCmColorMethod.ByACI, index)
    }

    // -------------------------------------------------
    // 5. Color book entry: "Book$Name" (case-insensitive prefix)
    // -------------------------------------------------
    if (/^book\$/i.test(n)) {
      // Preserve original name after "Book$"
      const bookName = n.substring(n.indexOf('$') + 1)

      // Let util decide how to resolve book colors
      const colorVal = AcCmColorUtil.getColorByName(bookName)
      if (colorVal != null) {
        return new AcCmColor(AcCmColorMethod.ByColor, colorVal)
      }

      console.warn('Unknown color book entry:', name)
      return undefined
    }

    // -------------------------------------------------
    // 6. Named colors
    // -------------------------------------------------
    const colorVal = AcCmColorUtil.getColorByName(n)
    if (colorVal != null) {
      return new AcCmColor(AcCmColorMethod.ByColor, colorVal)
    }

    console.warn('Unknown color name:', name)
    return undefined
  }
}
