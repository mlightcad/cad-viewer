import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrMaterialManager } from './AcTrMaterialManager'

export interface AcTrPointMaterialOptions {
  size?: number
}

/**
 * Material manager dedicated to point entities.
 *
 * Produces and caches THREE.PointsMaterial instances keyed by color and size.
 * This ensures that repeated point drawings reuse the same optimized material.
 */
export class AcTrPointMaterialManager extends AcTrMaterialManager<AcTrPointMaterialOptions> {
  /**
   * Builds a stable material key from traits.
   */
  protected buildKey(
    traits: AcGiSubEntityTraits,
    options: AcTrPointMaterialOptions
  ): string {
    const size = options.size ?? 1
    const drawOrderSuffix = this.buildDrawOrderSuffix(traits)
    return this.hasByLayerKeyTraits(traits)
      ? `layer_${traits.layer}_${traits.rgbColor}_${size}${drawOrderSuffix}`
      : `entity_${traits.rgbColor}_${size}${drawOrderSuffix}`
  }

  /** Returns true if color is ByLayer. */
  protected hasByLayerKeyTraits(traits: AcGiSubEntityTraits): boolean {
    return traits.color.isByLayer
  }

  protected createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: AcTrPointMaterialOptions = {}
  ): THREE.Material {
    return new THREE.PointsMaterial({
      color: traits.rgbColor,
      size: options.size
    })
  }
}
