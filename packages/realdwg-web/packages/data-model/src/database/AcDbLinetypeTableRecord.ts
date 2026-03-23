import { AcGiBaseLineStyle } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbSymbolTableRecord } from './AcDbSymbolTableRecord'

/**
 * Represents a record in the line type table within the AutoCAD drawing database.
 *
 * Each line type table record contains the information necessary to define a specific line type,
 * including its pattern, description, and rendering characteristics. Line types define how lines
 * are drawn, including patterns of dashes, dots, and spaces.
 *
 * Within the line type table record, the dashes (line segments that make up characteristics of the
 * linetype) are stored in a list with an index that is zero based. If the linetype is complex, then
 * embedded shapes or text strings are stored in the list at the same index as the dash that preceded
 * them in the linetype definition. So there will always be a dashLength for any valid index in the
 * list, even if there is a shape or text string sharing the same index. When the linetype is elaborated,
 * a shape's insertion point will coincide with the end of the dash that it shares an index with.
 */
export class AcDbLinetypeTableRecord extends AcDbSymbolTableRecord {
  private _linetype: AcGiBaseLineStyle

  /**
   * Creates a new line type table record.
   *
   * @param linetype - The line type style object that defines the visual characteristics
   *                   and pattern of this line type
   */
  constructor(linetype: AcGiBaseLineStyle) {
    super()
    this.name = linetype.name
    this._linetype = linetype
  }

  /**
   * Gets the number of dash elements in the line type pattern.
   *
   * This value represents the total count of dashes, spaces, dots, and other pattern elements
   * that make up the line type. It corresponds to DXF group code 73 in the AutoCAD file format.
   *
   * @returns The number of pattern elements in the line type
   */
  get numDashes() {
    return this._linetype.pattern ? this._linetype.pattern.length : 0
  }

  /**
   * Gets the total pattern length in AutoCAD drawing units.
   *
   * The pattern length represents the total length of all dashes and spaces when the line type
   * scale is 1.0. This value is used to calculate how the pattern repeats along a line.
   *
   * Note: Embedded shapes or text strings do not add to the pattern length because they are
   * overlaid and do not interrupt the actual dash pattern.
   *
   * @returns The total length of the line type pattern in drawing units
   */
  get patternLength() {
    return this._linetype.totalPatternLength
  }

  /**
   * Gets the description or comments associated with this line type.
   *
   * This property provides additional information about the line type, such as its intended
   * use or any special characteristics.
   *
   * @returns The description text for the line type
   */
  get comments() {
    return this._linetype.description
  }

  /**
   * Gets the line type style object used by the renderer.
   *
   * This property provides access to the underlying line type definition that contains
   * all the visual characteristics and rendering information.
   *
   * @returns The line type style object
   */
  get linetype() {
    return this._linetype
  }

  /**
   * Gets the length of a specific dash element in the line type pattern.
   *
   * Each dash element in the pattern has a specific length that determines how it appears
   * when the line type is rendered. Positive values represent visible dashes, while negative
   * values represent spaces (pen up).
   *
   * @param index - Zero-based index of the dash element. Must be greater than or equal to zero,
   *                but less than the value of property 'numDashes'
   * @returns The length of the specified dash element in drawing units
   * @throws {Error} When the index is out of range
   */
  dashLengthAt(index: number) {
    if (index < 0 || index >= this.numDashes) {
      throw new Error(
        'Index must be greater than or equal to zero, but less than the value of property "numDashes".'
      )
    }
    return this._linetype.pattern![index].elementLength
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbLinetypeTableRecord')
    filer.writeString(2, this.name)
    filer.writeInt16(70, this.linetype.standardFlag)
    filer.writeString(3, this.comments)
    filer.writeInt16(72, 65)
    filer.writeInt16(73, this.numDashes)
    filer.writeDouble(40, this.patternLength)
    for (const item of this.linetype.pattern ?? []) {
      filer.writeDouble(49, item.elementLength)
      filer.writeInt16(74, item.elementTypeFlag)
    }
    return this
  }
}
