import * as THREE from 'three'

/**
 * Immutable ByLayer binding semantics carried with a cached material.
 *
 * These flags answer a specific question for each visual trait:
 * "Should this trait be inherited from the owning layer when the layer changes
 * or when a layer-0 block entity is remapped to an INSERT layer?"
 */
export interface AcTrByLayerBindingFlags {
  /** True when color is layer-bound and must follow layer color updates. */
  isByLayerColor: boolean
  /** True when linetype is layer-bound and must follow layer linetype updates. */
  isByLayerLineType: boolean
  /** True when lineweight is layer-bound and must follow layer lineweight updates. */
  isByLayerLineWeight: boolean
  /** True when transparency is layer-bound and must follow layer transparency updates. */
  isByLayerTransparency: boolean
}

/**
 * Canonical metadata attached to `THREE.Material.userData` by cad-viewer.
 *
 * `THREE.Material` supports arbitrary `userData`, so this interface defines the
 * strongly-typed contract used by style/material management logic.
 */
export interface AcTrMaterialMetadata extends AcTrByLayerBindingFlags {
  /** Effective layer name used to target layer-level style updates. */
  layer: string
  /** Internal cache key used by style managers for reverse lookup. */
  materialKey: string
  /** True when color follows foreground inversion rules (ACI 7 behavior). */
  isForeground: boolean
  /** True when fill should be repainted with current canvas background. */
  isBackgroundFill?: boolean
  /** Explicit render-order tier for the batch that owns this material. */
  drawOrder?: number
  /** Culling side used by fill materials. Present only when explicitly set. */
  side?: 'front' | 'back'
}

/**
 * Partial metadata view used for legacy/foreign materials whose userData may be incomplete.
 */
export type AcTrMaterialMetadataPatch = Partial<AcTrMaterialMetadata>

/**
 * Common typed view for CAD renderer materials that carry metadata in `userData`.
 */
export type AcTrMaterial = THREE.Material & {
  userData: AcTrMaterialMetadataPatch
}

/**
 * Casts a THREE material into the CAD typed-material view.
 *
 * This does not mutate the material; it only narrows TypeScript types so
 * all metadata access goes through one shared contract.
 */
export function asAcTrMaterial(material: THREE.Material): AcTrMaterial {
  return material as AcTrMaterial
}

/**
 * Returns typed material metadata stored in `material.userData`.
 */
export function getMaterialMetadata(
  material: THREE.Material
): AcTrMaterialMetadataPatch {
  return asAcTrMaterial(material).userData
}

/**
 * Merges metadata fields into `material.userData` with strong typing.
 */
export function setMaterialMetadata(
  material: THREE.Material,
  patch: AcTrMaterialMetadataPatch
): void {
  Object.assign(getMaterialMetadata(material), patch)
}

/**
 * Returns whether metadata indicates at least one ByLayer-bound trait.
 */
export function hasByLayerBinding(
  metadata: AcTrMaterialMetadataPatch
): boolean {
  return (
    metadata.isByLayerColor === true ||
    metadata.isByLayerLineType === true ||
    metadata.isByLayerLineWeight === true ||
    metadata.isByLayerTransparency === true
  )
}
