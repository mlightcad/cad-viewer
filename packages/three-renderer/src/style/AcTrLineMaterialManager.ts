import { AcGiLineWeight, AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

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
    const lineWidth = this.resolveLineWidth(traits.lineWeight)
    const mode = this.getMaterialMode(traits, options)

    if (mode === 'shader') {
      return isByLayer
        ? `layer_${mode}_${traits.layer}_${traits.lineType.name}_${traits.rgbColor}_${traits.lineTypeScale}_${lineWidth}`
        : `entity_${mode}_${traits.lineType.name}_${traits.rgbColor}_${traits.lineTypeScale}_${lineWidth}`
    }

    return isByLayer
      ? `layer_${mode}_${traits.layer}_${traits.rgbColor}_${lineWidth}`
      : `entity_${mode}_${traits.rgbColor}_${lineWidth}`
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

  private getMaterialMode(
    traits: AcGiSubEntityTraits,
    options: AcTrLineMaterialOptions
  ): 'shader' | 'basic' | 'fat' {
    if (this.isShaderMaterial(traits, options)) return 'shader'
    return options.basicMaterialOnly ? 'basic' : 'fat'
  }

  protected createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: AcTrLineMaterialOptions = {}
  ): THREE.Material {
    let material: THREE.Material

    const scales = this.getLineTypeScales()
    const scale = scales.ltscale * scales.celtscale * traits.lineTypeScale

    if (this.isShaderMaterial(traits, options)) {
      material = AcTrLinePatternShaders.createLineShaderMaterial(
        traits.lineType.pattern!,
        traits.rgbColor,
        scale,
        this.options.viewportScaleUniform,
        AcTrMaterialManager.CameraZoomUniform
      )
    } else if (options.basicMaterialOnly || traits.lineWeight < 0) {
      material = new THREE.LineBasicMaterial({
        color: traits.rgbColor
      })
    } else {
      const fatLineMaterial = new LineMaterial({
        color: traits.rgbColor,
        linewidth: this.resolveLineWidth(traits.lineWeight)
      })
      fatLineMaterial.resolution.copy(this.options.resolution)
      material = fatLineMaterial
    }
    return material
  }

  protected isByLayer(traits: AcGiSubEntityTraits): boolean {
    return (
      super.isByLayer(traits) || traits.lineWeight === AcGiLineWeight.ByLayer
    )
  }

  private resolveLineWidth(lineWeight: AcGiLineWeight): number {
    if (lineWeight < 0) return 1
    return Math.max(1, lineWeight / 40)
  }

  updateResolution() {
    const resolution = this.options.resolution
    Object.values(this.cache).forEach(material => {
      if (material instanceof LineMaterial) {
        material.resolution.copy(resolution)
      }
    })
  }

  //References https://knowledge.autodesk.com/support/autocad-lt/learn-explore/caas/CloudHelp/cloudhelp/2020/ENU/AutoCAD-LT/files/GUID-4323BBAD-2757-4E92-B2E4-E0E550BB37CB-htm.html
  private getLineTypeScales() {
    return {
      ltscale: this.options.ltscale || 1.0,
      celtscale: this.options.celtscale || 1.0
    }
  }
}
