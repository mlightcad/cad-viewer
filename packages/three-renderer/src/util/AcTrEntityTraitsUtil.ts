import {
  AcCmColor,
  AcCmTransparency,
  ACGI_PAPER_SPACE_BACKGROUND,
  acgiForegroundColorForBackground,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { ColorSettings } from '@mlightcad/mtext-renderer'

import { AcTrMTextColorUtil } from './AcTrMTextColorUtil.js'

export class AcTrSubEntityTraitsUtil {
  static createDefaultTraits(): AcGiSubEntityTraits {
    return {
      color: new AcCmColor(),
      lineType: {
        type: 'ByLayer',
        name: 'Continuous',
        standardFlag: 0,
        description: 'Solid line',
        totalPatternLength: 0
      },
      lineTypeScale: 1,
      lineWeight: AcGiLineWeight.ByLayer,
      fillType: {
        solidFill: true,
        patternAngle: 0,
        definitionLines: []
      },
      transparency: new AcCmTransparency(),
      thickness: 0,
      layer: '0',
      drawOrder: 0
    }
  }

  static createTraitsForMText(
    colorSettings: ColorSettings,
    backgroundColor?: number
  ): AcGiSubEntityTraits {
    const color = AcTrMTextColorUtil.toAcCmColor(colorSettings.color)
    // Inline `\C0` (ByBlock) glyphs take the colour the entity gives its ByBlock
    // parts (`byBlockColor`). Outside a block that is ACI 7: track the
    // foreground so the glyphs follow background switches instead of being
    // born white and never repainted.
    if (color.isByBlock) {
      const byBlockRgb = colorSettings.byBlockColor
      const foreground = acgiForegroundColorForBackground(
        backgroundColor ?? ACGI_PAPER_SPACE_BACKGROUND
      )
      if (typeof byBlockRgb !== 'number' || byBlockRgb === foreground) {
        color.setForeground()
      } else {
        color.setRGBValue(byBlockRgb)
      }
    }
    return {
      color,
      lineType: {
        type: 'ByLayer',
        name: 'Continuous',
        standardFlag: 0,
        description: 'Solid line',
        totalPatternLength: 0
      },
      lineTypeScale: 1,
      lineWeight: AcGiLineWeight.ByLayer,
      fillType: {
        solidFill: true,
        patternAngle: 0,
        definitionLines: []
      },
      transparency: new AcCmTransparency(),
      thickness: 0,
      layer: colorSettings.layer ?? '0',
      drawOrder: 0
    }
  }
}
