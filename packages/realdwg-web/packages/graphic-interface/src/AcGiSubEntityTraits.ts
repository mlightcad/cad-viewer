import { AcCmColor, AcCmTransparency } from '@mlightcad/common'

import { AcGiHatchStyle } from './AcGiHatchStyle'
import { AcGiLineStyle } from './AcGiLineStyle'
import { AcGiLineWeight } from './AcGiLineWeight'

/**
 * Trait settings for a sub‑entity in AutoCAD graphics (corresponding to AcGiSubEntityTraits).
 * These properties define visual attributes like color, line style, layer, thickness, etc.
 */
export interface AcGiSubEntityTraits {
  /**
   * The RGB color.
   * It resolves layer colors and block colors as needed and converts color index
   * to actual RGB color.
   */
  rgbColor: number

  /**
   * Color of the entity.
   */
  color: AcCmColor

  /**
   * Line type (pattern) used for drawing edges / curves of the entity.
   * Corresponds to AutoCAD's `AcGiLineStyle` (or linetypeTableRecord).
   */
  lineType: AcGiLineStyle

  /**
   * Scale factor applied to the lineType.
   * Changes how dense or stretched the pattern appears. (Equivalent to
   * AutoCAD's "Linetype Scale" / ltScale).
   */
  lineTypeScale: number

  /**
   * Lineweight for the entity's drawing (i.e. the visual thickness of lines).
   * Typically corresponds to one of AutoCAD's predefined lineweights.
   */
  lineWeight: AcGiLineWeight

  /**
   * Fill type / hatch style for the entity (if applicable).
   * Corresponds to AutoCAD's `AcGiHatchStyle`. For example, controlling whether
   * the sub‑entity is filled or only outlined.
   */
  fillType: AcGiHatchStyle

  /**
   * Transparency of the entity.
   * A numeric value controlling how transparent (or opaque) the entity is when rendered.
   */
  transparency: AcCmTransparency

  /**
   * Thickness (extrusion) of the entity along the positive Z axis in WCS units.
   * Only affects certain primitive types (e.g. polylines, arcs, circles, SHX‑text),
   * similarly to AutoCAD's "thickness" property.
   */
  thickness: number

  /**
   * The name of the layer on which the entity resides.
   * Corresponds to AutoCAD layer name (i.e. current layer in drawing).
   */
  layer: string
}
