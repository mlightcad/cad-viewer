import { AcGiArrowType } from './AcGiArrowType'
import { AcGiStyleType } from './AcGiStyleType'

/**
 * Line type pattern element
 */
export interface AcGiLineTypePatternElement {
  elementLength: number
  elementTypeFlag: number
  shapeNumber?: number
  styleObjectId?: string
  scale?: number
  rotation?: number
  offsetX?: number
  offsetY?: number
  text?: string
}

/**
 * Arrow style
 */
export interface AcGiArrowStyle {
  /**
   * Arrow type.
   */
  type: AcGiArrowType
  /**
   * The flag to determinate whether the arrow direction is inversed. Default value is false.
   * - true: arrow direction is from the external part of the line to the start or end point of the
   * line like '>------<'.
   * - fase: arrow direction is from the internal part of the line to the start or end point of the
   * line like '<------>'.
   */
  inversed?: boolean
  /**
   * The flag to determinate how to attach arrow to endpoint of the line.
   * - true: append arrow to endpoint of the line
   * - false: overlap arrow with endpoint of the line
   */
  appended?: boolean
  /**
   * Scale factor. Default value is 1.
   */
  scale?: number
  /**
   * The flag whether this arrow is visible.
   */
  visible: boolean
}

/**
 * Interface to define arrow style of arrows at the start point and end point of one line
 */
export interface AcGiLineArrowStyle {
  /**
   * Arrow style at the first point of the line. If it is undefined, no arrow style applied for this point.
   */
  firstArrow?: AcGiArrowStyle
  /**
   * Arrow style at the second point of the line. If it is undefined, no arrow style applied for this point.
   */
  secondArrow?: AcGiArrowStyle
}

/**
 * Line type
 */
export interface AcGiBaseLineStyle {
  /**
   * Line type name
   */
  name: string
  /**
   * Standard flag values (bit-coded values):
   * - 16 = If set, table entry is externally dependent on an xref
   * - 32 = If both this bit and bit 16 are set, the externally dependent xref has been successfully resolved
   * - 64 = If set, the table entry was referenced by at least one entity in the drawing the last time the drawing was edited. (This flag is for the benefit of AutoCAD commands. It can be ignored by most programs that read DXF files and need not be set by programs that write DXF files)
   */
  standardFlag: number
  /**
   * Line type description
   */
  description: string
  /**
   * Total pattern length
   */
  totalPatternLength: number
  /**
   * Line type pattern
   */
  pattern?: AcGiLineTypePatternElement[]
}

/**
 * Line style
 */
export interface AcGiLineStyle extends AcGiBaseLineStyle {
  /**
   * Indicates how the style is determined for this entity.
   *
   * - `ByLayer`: The style is inherited from the layer the entity belongs to.
   * - `ByBlock`: The style is inherited from the block reference containing the entity.
   * - `UserSpecified`: The style is explicitly defined on the entity itself.
   */
  type: AcGiStyleType
  /**
   * Arrow style of arrows at the start point and end point of one line.
   * If it is undefined, no arrow style applied at the start and end points.
   */
  arrows?: AcGiLineArrowStyle
}
