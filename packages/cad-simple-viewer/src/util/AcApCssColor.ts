import { AcCmColor, AcCmColorUtil } from '@mlightcad/data-model'

/**
 * If an RGB color matches the AutoCAD palette exactly, restore ByACI so
 * ribbon color dropdowns can show named colors (Red, Yellow, …) instead of
 * Custom after a CSS round-trip.
 */
export function preferExactAciColor(color: AcCmColor): AcCmColor {
  if (!color.isByColor) return color
  const rgb = color.RGB
  if (rgb == null) return color
  const index = AcCmColorUtil.getIndexByColor(rgb)
  if (index == null) return color
  const aci = new AcCmColor()
  aci.colorIndex = index
  return aci
}
