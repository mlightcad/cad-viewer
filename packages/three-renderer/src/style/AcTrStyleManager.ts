import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrFillMaterialManager } from './AcTrFillMaterialManager'
import { AcTrLineMaterialManager } from './AcTrLineMaterialManager'
import { AcTrPointMaterialManager } from './AcTrPointMaterialManager'
import { AcTrStyleManagerOptions } from './AcTrStyleManagerOptions'

/**
 * Central style/material access point for the CAD viewer.
 *
 * This class delegates all material creation to the four specialized
 * AcTrMaterialManager implementations:
 *
 * - Point materials
 * - Line materials
 * - Mesh materials
 * - Hatch materials
 *
 * This ensures consistent material reuse, improved rendering performance,
 * and clean separation of material logic.
 */
export class AcTrStyleManager {
  static options: AcTrStyleManagerOptions = {
    // cameraZoomUniform: 1.0,
    viewportScaleUniform: 1.0,
    maxFragmentUniforms: 1024
  }
  private pointMgr: AcTrPointMaterialManager
  private lineMgr: AcTrLineMaterialManager
  private fillMgr: AcTrFillMaterialManager

  constructor() {
    this.pointMgr = new AcTrPointMaterialManager(AcTrStyleManager.options)
    this.lineMgr = new AcTrLineMaterialManager(AcTrStyleManager.options)
    this.fillMgr = new AcTrFillMaterialManager(AcTrStyleManager.options)
  }

  /** Stores unsupported text styles mapped by name → usage count. */
  public unsupportedTextStyles: Record<string, number> = {}

  /**
   * Returns a material for point entities.
   *
   * @param size - Point size (default = 2).
   */
  getPointsMaterial(
    traits: AcGiSubEntityTraits,
    size: number = 2
  ): THREE.Material {
    return this.pointMgr.getMaterial(traits, { size })!
  }

  /**
   * Returns a basic or shader line material depending on the lineType.
   *
   * @param traits - Current entity traits.
   * @param basicMaterialOnly - The flag whether to search and return the basic material only
   */
  getLineMaterial(
    traits: AcGiSubEntityTraits,
    basicMaterialOnly?: boolean
  ): THREE.Material {
    return this.lineMgr.getMaterial(traits, {
      basicMaterialOnly
    })!
  }

  /**
   * Returns the shader hatch material or a mesh fallback.
   *
   * @param traits - Current entity traits.
   * @param rebaseOffset - Offset used to transform pattern origins.
   */
  getFillMaterial(
    traits: AcGiSubEntityTraits,
    rebaseOffset: THREE.Vector2 = _rebaseOffset
  ): THREE.Material {
    return this.fillMgr.getMaterial(traits, {
      rebaseOffset
    })
  }

  /**
   * Forces all materials that belong to the given layer to update,
   * for traits that use ByLayer color or ByLayer lineType.
   *
   * @param layerName - The name of the layer whose materials need to be updated.
   * @param newTraits - Layer-level traits (color, lineType, etc.) resolved from your layer table.
   * @returns Mapping: oldMaterialId → newMaterial
   */
  updateLayerMaterial(
    layerName: string,
    newTraits: Partial<AcGiSubEntityTraits>
  ): Record<number, THREE.Material> {
    return {
      ...this.lineMgr.updateLayerMaterial(layerName, newTraits),
      ...this.pointMgr.updateLayerMaterial(layerName, newTraits),
      ...this.fillMgr.updateLayerMaterial(layerName, newTraits)
    }
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose(): void {
    this.lineMgr.dispose()
    this.pointMgr.dispose()
    this.fillMgr.dispose()
  }
}

const _rebaseOffset = /*@__PURE__*/ new THREE.Vector2(0, 0)
