import {
  AcCmColor,
  ACGI_LIGHT_THEME_FOREGROUND
} from '@mlightcad/data-model'
import {
  buildWorkerMaterialColorSettings,
  MTextColor,
  serializeMTextColor
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { getMaterialMetadata } from '../src/style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'
import { AcTrMTextColorUtil } from '../src/util/AcTrMTextColorUtil'

/**
 * End-to-end regression for entity ACI-7 MTEXT after worker reconstruct:
 * materials must track foreground so switchbg can invert white↔black.
 */
describe('ACI-7 MTEXT worker reconstruct → foreground materials', () => {
  it('reconstructed ACI-7 ColorSettings produce isForeground materials that invert', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const base = {
      layer: 'NOTES',
      color: new MTextColor(7),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }

    // New processor path: serialize keeps aci=7.
    const fromAci = buildWorkerMaterialColorSettings(
      base,
      0xffffff,
      false,
      serializeMTextColor(new MTextColor(7))
    )
    expect(fromAci.color.aci).toBe(7)

    // Old bake path: rgb white payload must still recover entity ACI 7.
    const baked = new MTextColor()
    baked.rgbValue = 0xffffff
    const fromBaked = buildWorkerMaterialColorSettings(
      base,
      0xffffff,
      false,
      serializeMTextColor(baked)
    )
    expect(fromBaked.color.aci).toBe(7)

    const traits = AcTrSubEntityTraitsUtil.createTraitsForMText(fromAci)
    expect(traits.color.isForeground).toBe(true)

    const material = styleManager.getMTextFillMaterial(traits)
    expect(getMaterialMetadata(material).isForeground).toBe(true)
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      ACGI_LIGHT_THEME_FOREGROUND
    )
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x000000)
  })

  it('keeps serialized ACI 255 absolute across background switch', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const base = {
      layer: 'NOTES',
      color: new MTextColor(7),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
    const settings = buildWorkerMaterialColorSettings(base, 0xffffff, false, {
      aci: 255
    })
    expect(settings.color.aci).toBe(255)

    const traits = AcTrSubEntityTraitsUtil.createTraitsForMText(settings)
    expect(traits.color.isForeground).toBe(false)

    const material = styleManager.getMTextFillMaterial(traits)
    expect(getMaterialMetadata(material).isForeground).toBe(false)

    styleManager.currentBackgroundColor = 0xffffff
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)
  })

  it('toAcCmColor from worker ACI 7 matches setForeground entity traits', () => {
    const color = AcTrMTextColorUtil.toAcCmColor(new MTextColor(7))
    expect(color.isForeground).toBe(true)

    const explicit = new AcCmColor().setForeground()
    expect(explicit.isForeground).toBe(true)
    expect(color.colorIndex).toBe(explicit.colorIndex)
  })
})
