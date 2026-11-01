import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import {
  AcTrRenderer,
  getMaterialMetadata,
  getSceneDrawableUserData,
  hasByLayerBinding,
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
   * Whether a layer-0 block material should be rebound to the INSERT layer.
   *
   * With authored provenance the answer is exact: a ByLayer colour inherits, an
   * explicit colour (including ACI-7) does not. Without provenance the colour is
   * already resolved and looks explicit either way, so only a genuine ByLayer
   * `isByLayerColor` or a surviving ByLayer sibling trait may justify inheriting.
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
    if (metadata.isByLayerColor === true) {
      return true
    }
    if (metadata.hasColorProvenance === true) {
      return false
    }
    if (sourceLayerName !== '0') {
      return false
    }
    // Legacy path: colour provenance was lost during conversion, so only other
    // ByLayer traits can justify inheriting — never the colour itself.
    return (
      metadata.isByLayerLineType === true ||
      metadata.isByLayerLineWeight === true ||
      metadata.isByLayerTransparency === true
    )
  }

  /**
   * Repairs layer-0 materials whose colour binding was dropped or resolved
   * before it could be recorded, while other ByLayer markers
   * (lineType/lineWeight/transparency) survived.
   *
   * An explicit colour must never be promoted. With `isColorByLayer` provenance
   * available an explicit ACI-7 reports `isByLayerColor === false` and is left
   * alone; an explicit absolute colour is likewise untouched. Without
   * provenance (older `data-model`), a layer-0 ByLayer colour and an explicit
   * ACI-7 both arrive as `false` + foreground, so the legacy promotion is
   * required — dropping it would stop layer-0 content from inheriting.
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
    if (metadata.isByLayerColor === false && metadata.isForeground !== true) {
      return material
    }
    // With authored provenance, `isByLayerColor === false` is authoritative: the
    // colour really is explicit (an ACI-7 frame inside a red layer must stay
    // white), so it must never be promoted.
    if (metadata.hasColorProvenance === true) {
      return material
    }
    if (
      sourceLayerName === '0' &&
      hasByLayerBinding(metadata) &&
      metadata.isByLayerColor !== true
    ) {
      setMaterialMetadata(material, { isByLayerColor: true })
    }
    return material
  }
}
