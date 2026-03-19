import { AcCmColor } from '@mlightcad/data-model'
import { ColorSettings, MTextColor } from '@mlightcad/mtext-renderer'

/**
 * Utility helpers for converting between MTextColor and AcCmColor.
 */
export class AcTrMTextColorUtil {
  static toAcCmColor(color?: MTextColor | null): AcCmColor {
    const resolved = new AcCmColor()
    if (!color) {
      return resolved
    }

    if (color.isRgb && typeof color.rgbValue === 'number') {
      resolved.setRGBValue(color.rgbValue)
      if (color.rgbValue === 0xffffff || color.rgbValue === 0x000000) {
        resolved.colorIndex = 7
      }
      return resolved
    }

    if (typeof color.aci === 'number') {
      if (color.aci === 256) {
        resolved.setByLayer()
      } else if (color.aci === 0) {
        resolved.setByBlock()
      } else {
        resolved.colorIndex = color.aci
      }
    }

    return resolved
  }

  static toMTextColor(color?: AcCmColor | null): MTextColor {
    const resolved = new MTextColor()
    if (!color) {
      return resolved
    }

    if (color.isByLayer) {
      resolved.aci = 256
      return resolved
    }

    if (color.isByBlock) {
      resolved.aci = 0
      return resolved
    }

    if (color.isByACI && typeof color.colorIndex === 'number') {
      resolved.aci = color.colorIndex
      return resolved
    }

    const rgbValue = color.RGB
    if (typeof rgbValue === 'number') {
      resolved.rgbValue = rgbValue
    }

    return resolved
  }

  static resolveRgbColor(settings: ColorSettings): number {
    const { color, byBlockColor, byLayerColor } = settings

    if (color.isRgb && typeof color.rgbValue === 'number') {
      return color.rgbValue
    }

    if (color.aci === 0) {
      return byBlockColor
    }

    if (color.aci === 256 || color.aci == null) {
      return byLayerColor
    }

    const aciColor = new AcCmColor()
    aciColor.colorIndex = color.aci
    const rgbValue = aciColor.RGB
    return typeof rgbValue === 'number' ? rgbValue : byLayerColor
  }
}
