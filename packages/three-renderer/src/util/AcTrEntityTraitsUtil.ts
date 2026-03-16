import {
  AcCmColor,
  AcCmTransparency,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { ColorSettings } from '@mlightcad/mtext-renderer'

import { AcTrMTextColorUtil } from './AcTrMTextColorUtil'

export class AcTrSubEntityTraitsUtil {
  static createDefaultTraits(): AcGiSubEntityTraits {
    return {
      color: new AcCmColor(),
      rgbColor: 0xffffff,
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
      layer: '0'
    }
  }

  static createTraitsForMText(
    colorSettings: ColorSettings
  ): AcGiSubEntityTraits {
    const color = AcTrMTextColorUtil.toAcCmColor(colorSettings.color)
    const rgbColor = AcTrMTextColorUtil.resolveRgbColor(colorSettings)
    return {
      color,
      rgbColor,
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
      layer: colorSettings.layer ?? '0'
    }
  }
}
