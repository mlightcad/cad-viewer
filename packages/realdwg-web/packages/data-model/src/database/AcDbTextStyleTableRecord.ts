import { AcGiTextStyle } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbSymbolTableRecord } from './AcDbSymbolTableRecord'

/**
 * Represents a record in the text style table.
 *
 * This class represents the records that are found in the text style table (known as the "style"
 * table in DXF). Each of these records represents a specific set of text parameters such as font,
 * default size, relative x scaling, vertical or horizontal orientation, etc.
 *
 * @example
 * ```typescript
 * const textStyle = new AcGiBaseTextStyle();
 * textStyle.name = 'MyStyle';
 * textStyle.font = 'Arial';
 * const record = new AcDbTextStyleTableRecord(textStyle);
 * ```
 */
export class AcDbTextStyleTableRecord extends AcDbSymbolTableRecord {
  /** The text style configuration */
  private _textStyle: AcGiTextStyle
  /** Whether text drawn with this style is vertical */
  private _isVertical: boolean

  /**
   * Creates a new AcDbTextStyleTableRecord instance.
   *
   * @param textStyle - The text style configuration to use
   *
   * @example
   * ```typescript
   * const textStyle = new AcGiBaseTextStyle();
   * textStyle.name = 'MyStyle';
   * const record = new AcDbTextStyleTableRecord(textStyle);
   * ```
   */
  constructor(textStyle: AcGiTextStyle) {
    super()
    this.name = textStyle.name
    this._textStyle = textStyle
    // Property `font` in text style may be empty string
    // If it contans file extension, just remove file extension.
    this._textStyle.font = this.getFileNameWithoutExtension(
      this._textStyle.font || this._textStyle.extendedFont || this.name
    )
    this._isVertical = false
  }

  /**
   * Gets or sets the obliquing angle.
   *
   * The obliquing angle is the angle from the text's vertical; that is, the
   * top of the text "slants" relative to the bottom--the same as the slope in this italic text.
   * Positive angles slant characters forward at their tops. Negative angles have 2pi added to them
   * to convert them to their positive equivalent.
   *
   * @returns The obliquing angle in radians
   *
   * @example
   * ```typescript
   * const angle = record.obliquingAngle;
   * record.obliquingAngle = Math.PI / 6; // 30 degrees
   * ```
   */
  get obliquingAngle() {
    return this._textStyle.obliqueAngle
  }
  set obliquingAngle(value: number) {
    this._textStyle.obliqueAngle = value
  }

  /**
   * Gets or sets the text height used for the last text created using this text style.
   *
   * This value is updated automatically by AutoCAD after the creation of any text object
   * that references this text style table record. If the textSize value for this text style
   * is 0, then the priorSize value is used by AutoCAD as the default text height for the
   * next text created using this text style.
   *
   * This value is automatically changed by the use of the text command. It will only be
   * automatically changed if the textSize is set to 0 so that users are prompted for a height.
   *
   * @returns The prior text size
   *
   * @example
   * ```typescript
   * const priorSize = record.priorSize;
   * record.priorSize = 12.0;
   * ```
   */
  get priorSize() {
    return this._textStyle.lastHeight
  }
  set priorSize(value: number) {
    this._textStyle.lastHeight = value
  }

  /**
   * Gets or sets the default size of the text drawn with this text style.
   *
   * If the text size is set to 0, then each use of the AutoCAD text commands prompt
   * for a text height to use in creating the text entity. If textSize is non-zero,
   * the text command will not prompt for a text height and will use this value.
   *
   * @returns The default text size
   *
   * @example
   * ```typescript
   * const textSize = record.textSize;
   * record.textSize = 10.0; // Fixed text height
   * ```
   */
  get textSize() {
    return this._textStyle.fixedTextHeight
  }
  set textSize(value: number) {
    this._textStyle.fixedTextHeight = value
  }

  /**
   * Gets or sets the width factor (also referred to as the relative X-scale factor) for the text style.
   *
   * The width factor is applied to the text's width to allow the width to be adjusted
   * independently of the height. For example, if the width factor value is 0.8, then the text is
   * drawn with a width that is 80% of its normal "unadjusted" width.
   *
   * @returns The width factor
   *
   * @example
   * ```typescript
   * const xScale = record.xScale;
   * record.xScale = 0.8; // 80% width
   * ```
   */
  get xScale() {
    return this._textStyle.widthFactor
  }
  set xScale(value: number) {
    this._textStyle.widthFactor = value
  }

  /**
   * Gets or sets whether text drawn with this text style is drawn vertically.
   *
   * @returns True if text is drawn vertically, false otherwise
   *
   * @example
   * ```typescript
   * if (record.isVertical) {
   *   console.log('Text style is vertical');
   * }
   * record.isVertical = true;
   * ```
   */
  get isVertical() {
    return this._isVertical
  }
  set isVertical(value: boolean) {
    this._isVertical = value
  }

  /**
   * Gets or sets the name of the font file for this text style.
   *
   * @returns The font file name
   *
   * @example
   * ```typescript
   * const fileName = record.fileName;
   * record.fileName = 'Arial';
   * ```
   */
  get fileName() {
    return this._textStyle.font
  }
  set fileName(value: string) {
    this._textStyle.font = value
  }

  /**
   * Gets or sets the name of the big font file for this text style.
   *
   * Big font files are used for languages that require more than 256 characters,
   * such as Chinese, Japanese, and Korean.
   *
   * @returns The big font file name
   *
   * @example
   * ```typescript
   * const bigFontFileName = record.bigFontFileName;
   * record.bigFontFileName = 'bigfont.shx';
   * ```
   */
  get bigFontFileName() {
    return this._textStyle.bigFont
  }
  set bigFontFileName(value: string) {
    this._textStyle.bigFont = value
  }

  /**
   * Gets the text style information used by the renderer.
   *
   * @returns The text style configuration
   *
   * @example
   * ```typescript
   * const textStyle = record.textStyle;
   * console.log('Font:', textStyle.font);
   * ```
   */
  get textStyle() {
    return this._textStyle
  }

  /**
   * Removes the file extension from a file name.
   *
   * @param pathName - The file path or name
   * @returns The file name without extension
   *
   * @example
   * ```typescript
   * const fileName = this.getFileNameWithoutExtension('arial.ttf');
   * // Returns: 'arial'
   * ```
   */
  private getFileNameWithoutExtension(pathName: string) {
    const fileName = pathName.split('/').pop()
    if (fileName) {
      // Find the last dot to separate the extension, if any
      const dotIndex = fileName.lastIndexOf('.')

      // If no dot is found, return the file name as is
      if (dotIndex === -1) {
        return fileName
      }

      // Otherwise, return the part before the last dot (file name without extension)
      return fileName.substring(0, dotIndex)
    }
    return pathName
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbTextStyleTableRecord')
    filer.writeString(2, this.name)
    filer.writeInt16(70, this.textStyle.standardFlag)
    filer.writeDouble(40, this.textSize)
    filer.writeDouble(41, this.xScale)
    filer.writeAngle(50, this.obliquingAngle)
    filer.writeInt16(
      71,
      this.isVertical ? 4 : this.textStyle.textGenerationFlag
    )
    filer.writeDouble(42, this.priorSize)
    filer.writeString(3, this.fileName)
    filer.writeString(4, this.bigFontFileName)
    return this
  }
}
