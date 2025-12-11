import { AcCmColor } from '@mlightcad/data-model'

/**
 * Describes basic layer state information within the editor view.
 *
 * Contains the layer's display name and common visibility/freeze flags.
 * @public
 */
export interface AcEdLayerInfo {
  /**
   * Human-readable layer name.
   */
  name: string
  /**
   * When true, the layer is frozen (entities are hidden from display and don't participate regen.).
   */
  isFrozen: boolean
  /**
   * When true, the layer is turned off (entities are hidden from display but still participate regen).
   */
  isOff: boolean
  /**
   * Layer color
   */
  color: AcCmColor
}
