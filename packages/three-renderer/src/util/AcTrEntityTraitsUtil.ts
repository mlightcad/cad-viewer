import {
  AcCmColor,
  AcCmTransparency,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { StyleTraits } from '@mlightcad/mtext-renderer'

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

  static createTraitsForMText(traits: StyleTraits): AcGiSubEntityTraits {
    const color = new AcCmColor()
    if (!traits.isByLayer) {
      color.setRGBValue(traits.color)
    }
    return {
      color,
      rgbColor: traits.color,
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
      layer: traits.layer ?? '0'
    }
  }
}
