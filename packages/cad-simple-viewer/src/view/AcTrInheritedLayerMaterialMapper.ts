import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import {
  type AcTrMaterialMetadataPatch,
  AcTrRenderer,
  getMaterialMetadata,
  getSceneDrawableUserData,
  setMaterialMetadata,
  syncStyleMaterialIdFromMaterials
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

/**
 * Remaps layer metadata and material bindings when block contents inherit an INSERT layer.
 *
 * AutoCAD requires entities authored on layer "0" inside a block to inherit the INSERT's
 * layer for ByLayer traits. This mapper mutates drawable `userData.layerName` and rebinds
 * materials via the renderer style cache so subsequent layer-level style edits target the
 * correct material instances.
 */
export class AcTrInheritedLayerMaterialMapper {
  /**
   * @param getLayerTraits - Resolves live layer-table traits for an effective layer name.
   * @param renderer - Renderer used to rebind materials through the style cache.
   */
  constructor(
    private readonly getLayerTraits: (
      layerName: string
    ) => Partial<AcGiSubEntityTraits> | undefined,
    private readonly renderer: AcTrRenderer
  ) {}

  /**
   * Remaps materials for objects in a layer bucket after INSERT decomposition.
   *
   * @param objects - Root objects in the current layer bucket to traverse and remap.
   * @param sourceLayerName - Layer name found in the block definition before inheritance.
   * @param effectiveLayerName - Final layer name used by rendering and style updates.
   */
  remap(
    objects: THREE.Object3D[],
    sourceLayerName: string,
    effectiveLayerName: string
  ): void {
    if (sourceLayerName === effectiveLayerName) {
      return
    }

    const layerTraits = this.getLayerTraits(effectiveLayerName)
    for (const object of objects) {
      object.traverse(child => {
        const inheritsInsertLayer = child.userData.layerName === sourceLayerName
        if (inheritsInsertLayer) {
          child.userData.layerName = effectiveLayerName
        }

        if (!('material' in child)) {
          return
        }
        // Only layer-"0" (or the current source bucket) inherits INSERT traits.
        // Attributes/text on other layers must keep their own layer materials.
        if (!inheritsInsertLayer) {
          return
        }

        const material = child.material
        if (Array.isArray(material)) {
          const materials = material as THREE.Material[]
          child.material = materials.map(entry => {
            if (!this.shouldRemap(entry, sourceLayerName)) {
              return entry
            }
            return (
              this.renderer.getLayerBoundMaterial(
                this.promoteLayerZeroByLayerColor(entry, sourceLayerName),
                effectiveLayerName,
                layerTraits
              ) ?? entry
            )
          })
          syncStyleMaterialIdFromMaterials(
            getSceneDrawableUserData(child),
            child.material as THREE.Material[]
          )
          return
        }

        if (!this.shouldRemap(material as THREE.Material, sourceLayerName)) {
          return
        }

        const remappedMaterial = this.renderer.getLayerBoundMaterial(
          this.promoteLayerZeroByLayerColor(
            material as THREE.Material,
            sourceLayerName
          ),
          effectiveLayerName,
          layerTraits
        )
        if (!remappedMaterial) {
          return
        }
        child.material = remappedMaterial
        syncStyleMaterialIdFromMaterials(
          getSceneDrawableUserData(child),
          remappedMaterial
        )
      })
    }
  }

  /**
   * Layer-0 block contents with ByLayer color resolve to ACI-7 foreground materials before
   * INSERT remapping. Those materials must still inherit the INSERT layer when their colour
   * is layer-bound, while explicit ACI-7 entities on layer 0 stay untouched.
   *
   * An explicit ACI-7 colour (`isByLayerColor === false`) is a real entity colour, not an
   * inherited one: AutoCAD keeps it white no matter which layer the INSERT lives on. Only a
   * *missing* binding (`isByLayerColor == null`, seen when a conversion path drops the flag)
   * may be inferred from the remaining ByLayer markers.
   *
   * @param material - Candidate material to evaluate for INSERT-layer rebinding.
   * @param sourceLayerName - Layer name from the block definition before inheritance.
   * @returns True when the material should be rebound to the INSERT layer.
   */
  private shouldRemap(
    material: THREE.Material,
    sourceLayerName: string
  ): boolean {
    const metadata = getMaterialMetadata(material)
    if (metadata.isForeground !== true) {
      return true
    }
    if (sourceLayerName !== '0') {
      return false
    }
    if (metadata.isByLayerColor != null) {
      return metadata.isByLayerColor === true
    }
    return this.byLayerColorBindingWasLost(metadata)
  }

  /**
   * Repairs layer-0 materials whose colour binding was dropped by a conversion path while
   * other ByLayer markers (lineType/lineWeight/transparency) survived.
   *
   * Both explicit colours are left alone: an absolute colour (`isByLayerColor === false`,
   * not foreground) must not inherit the INSERT layer, otherwise a solid hatch with ACI 251
   * on layer 0 washes out to the INSERT layer's ACI 7; and an explicit ACI-7 foreground
   * colour must stay white/black instead of becoming the INSERT layer colour (e.g. red).
   *
   * @param material - Material whose ByLayer metadata may need normalization.
   * @param sourceLayerName - Source bucket layer name (typically `"0"`).
   * @returns The same material instance, possibly with patched metadata.
   */
  private promoteLayerZeroByLayerColor(
    material: THREE.Material,
    sourceLayerName: string
  ): THREE.Material {
    const metadata = getMaterialMetadata(material)
    if (metadata.isByLayerColor != null) {
      return material
    }
    if (sourceLayerName === '0' && this.byLayerColorBindingWasLost(metadata)) {
      setMaterialMetadata(material, { isByLayerColor: true })
    }
    return material
  }

  /**
   * Whether a material lacking `isByLayerColor` still carries another ByLayer trait, which
   * is the only signal that its colour was layer-bound before the flag was lost.
   */
  private byLayerColorBindingWasLost(
    metadata: AcTrMaterialMetadataPatch
  ): boolean {
    return (
      metadata.isByLayerLineType === true ||
      metadata.isByLayerLineWeight === true ||
      metadata.isByLayerTransparency === true
    )
  }
}
