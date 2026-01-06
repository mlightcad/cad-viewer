import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrLinePatternShaders } from './AcTrLinePatternShaders'
import { AcTrMaterialManager } from './AcTrMaterialManager'

export interface AcTrLineMaterialOptions {
  basicMaterialOnly?: boolean
}

/**
 * Material manager responsible for creating and caching all line materials.
 *
 * This class supports:
 * - Simple non-patterned lines (THREE.LineBasicMaterial)
 * - Patterned/dashed lines (custom shader materials)
 *
 * Materials are cached by computed keys. Each material also remembers:
 * - The CAD layer it belongs to
 * - Whether its certain property value (for example color or linetype) is ByLayer
 *
 * Layer updates then locate materials using these userData flags instead of
 * maintaining a separate layer → key mapping.
 */
export class AcTrLineMaterialManager extends AcTrMaterialManager<AcTrLineMaterialOptions> {
  /**
   * Builds a stable material key from traits.
   * Key differs for shader vs basic, ByLayer vs ByEntity.
   */
  protected buildKey(
    traits: AcGiSubEntityTraits,
    options: AcTrLineMaterialOptions
  ): string {
    const isByLayer = this.isByLayer(traits)

    if (this.isShaderMaterial(traits, options)) {
      return isByLayer
        ? `layer_${traits.layer}_${traits.lineType.name}_${traits.rgbColor}_${traits.lineTypeScale}`
        : `entity_${traits.lineType.name}_${traits.rgbColor}_${traits.lineTypeScale}`
    }

    return isByLayer
      ? `layer_${traits.layer}_${traits.rgbColor}`
      : `entity_${traits.rgbColor}`
  }

  /** Returns true if a shader material is required. */
  private isShaderMaterial(
    traits: AcGiSubEntityTraits,
    options: AcTrLineMaterialOptions
  ): boolean {
    return !!(
      !options.basicMaterialOnly &&
      traits.lineType.pattern &&
      traits.lineType.pattern.length > 0
    )
  }

  protected createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: AcTrLineMaterialOptions = {}
  ): THREE.Material {
    let material: THREE.Material

    const scales = this.getLineTypeScales();
    const scale = scales.ltScale * scales.celtScale * traits.lineTypeScale;

    if (this.isShaderMaterial(traits, options)) {
      material = AcTrLinePatternShaders.createLineShaderMaterial(
        traits.lineType.pattern!,
        traits.rgbColor,
        scale,
        this.options.viewportScaleUniform,
        AcTrMaterialManager.CameraZoomUniform
      )
    } else {
      material = new THREE.LineBasicMaterial({ color: traits.rgbColor })
    }
    return material
  }

  //References https://knowledge.autodesk.com/support/autocad-lt/learn-explore/caas/CloudHelp/cloudhelp/2020/ENU/AutoCAD-LT/files/GUID-4323BBAD-2757-4E92-B2E4-E0E550BB37CB-htm.html
  private getLineTypeScales() {
    const scales = { ltScale: 1.0, celtScale: 1.0 }
    // TODO: get ltScale and celtScale from database
    // if (!this.header) {
    //   return scales
    // }
    // // Global linetype scale
    scales.ltScale = this.options.ltScale || 1
    // //Current entity linetype scale
    // scales.celtScale = (this.header["$CELTSCALE"] as number) || 1
    return scales
  }
}
