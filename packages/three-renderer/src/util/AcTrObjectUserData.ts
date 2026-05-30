import { AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

/**
 * Relative-to-eye flags stored on {@link THREE.Object3D.userData}.
 *
 * @see AcTrRelativeToEyeUtil
 */
export interface AcTrRteObjectUserData {
  /** Shader hook installed for camera-relative rendering. */
  relativeToEyeEnabled?: boolean
  /** Vertex shader uses split translation instead of geometry rebase. */
  useSplitTranslation?: boolean
  /** Local geometry was rebased (or rebase was skipped intentionally). */
  geometryRebased?: boolean
  /** MTEXT layout cache invalidated after geometry rebase. */
  layoutCache?: unknown
}

/**
 * Runtime fields on {@link THREE.Material.userData} for relative-to-eye patching.
 */
export interface AcTrMaterialRuntimeUserData {
  /** Program-cache key written when the material shader is patched. */
  relativeToEyePatchVersion?: string
  /** Compiled shader instance from the latest `onBeforeCompile`. */
  relativeToEyeCompiledShader?: unknown
}

/**
 * Entity must stay unbatched (pattern hatch, image, …).
 */
export type AcTrNoBatchUserData = {
  noBatch?: true
}

/**
 * Pick metadata copied into batched geometry records and leaf drawables.
 */
export interface AcTrPickableObjectUserData {
  bboxIntersectionCheck?: boolean
  isPoint?: boolean
  position?: AcGePoint3dLike
}

/**
 * Style-manager linkage for drawable leaves before batching.
 */
export interface AcTrStyledDrawableUserData {
  styleMaterialId?: number
}

/**
 * Database identity stored on {@link AcTrEntity} and descendants.
 */
export interface AcTrEntityIdentityUserData {
  objectId?: string
  ownerId?: string
  layerName?: string
}

/**
 * {@link AcTrEntity} container userData.
 */
export interface AcTrEntityUserData
  extends AcTrEntityIdentityUserData, AcTrRteObjectUserData {
  originalMaterial?: THREE.Material | THREE.Material[]
}

/**
 * When an unbatched drawable is cloned into world space, stores the source
 * world matrix so HTML export can re-align hatch pattern coordinates.
 */
export type AcTrBakedWorldMatrixUserData = {
  bakedWorldMatrix?: number[]
}

/**
 * Leaf line/mesh/point objects produced by entity conversion, prior to batching.
 */
export type AcTrSceneDrawableUserData = AcTrPickableObjectUserData &
  AcTrStyledDrawableUserData &
  AcTrRteObjectUserData &
  AcTrNoBatchUserData &
  AcTrBakedWorldMatrixUserData

export interface AcTrHighlightUserData {
  objectId?: string
  disposeGeometryOnRemove?: boolean
}

/**
 * Temporary highlight clones attached to hover/selection overlay groups.
 */
export type AcTrHighlightObjectUserData = AcTrHighlightUserData &
  AcTrSceneDrawableUserData

/**
 * Packed batch container (`AcTrBatchedLine`, `AcTrBatchedMesh`, …) userData.
 */
export type AcTrBatchedContainerUserData = AcTrRteObjectUserData

/**
 * Full set of optional fields that may appear on renderer {@link THREE.Object3D.userData}.
 *
 * Use role-specific types (`AcTrEntityUserData`, `AcTrSceneDrawableUserData`, …)
 * at assignment sites; this interface is the superset used for safe reads/writes.
 */
export interface AcTrObjectUserDataFields
  extends
    AcTrEntityIdentityUserData,
    AcTrPickableObjectUserData,
    AcTrStyledDrawableUserData,
    AcTrRteObjectUserData,
    AcTrNoBatchUserData,
    AcTrHighlightUserData {
  originalMaterial?: THREE.Material | THREE.Material[]
}

/** Partial patch accepted when writing userData fields. */
export type AcTrObjectUserDataPatch = Partial<AcTrObjectUserDataFields>

/**
 * {@link THREE.Object3D} with cad-viewer userData typing.
 */
export type AcTrObject3D = THREE.Object3D & {
  userData: AcTrObjectUserDataPatch
}

export function asAcTrObject(object: THREE.Object3D): AcTrObject3D {
  return object as AcTrObject3D
}

export function getObjectUserData(
  object: THREE.Object3D
): AcTrObjectUserDataPatch {
  return asAcTrObject(object).userData
}

export function getRteUserData(object: THREE.Object3D): AcTrRteObjectUserData {
  return getObjectUserData(object)
}

export function getMaterialRuntimeUserData(
  material: THREE.Material
): AcTrMaterialRuntimeUserData {
  return material.userData as AcTrMaterialRuntimeUserData
}

export function getSceneDrawableUserData(
  object: THREE.Object3D
): AcTrSceneDrawableUserData {
  return getObjectUserData(object) as AcTrSceneDrawableUserData
}

export function getHighlightUserData(
  object: THREE.Object3D
): AcTrHighlightObjectUserData {
  return getObjectUserData(object) as AcTrHighlightObjectUserData
}

export function getBatchedContainerUserData(
  object: THREE.Object3D
): AcTrBatchedContainerUserData {
  return getObjectUserData(object) as AcTrBatchedContainerUserData
}

/**
 * Sets {@link AcTrRteObjectUserData.useSplitTranslation} when the object's world
 * origin is large enough to require the RTE shader path.
 */
export function markSplitTranslationFlag(_object: THREE.Object3D): void {}

/**
 * Copies RTE / no-batch flags from a source drawable onto a highlight clone.
 */
export function copyHighlightObjectFlags(
  source: THREE.Object3D,
  target: THREE.Object3D
): void {
  const sourceData = getObjectUserData(source)
  const targetData = getSceneDrawableUserData(target)

  if (sourceData.useSplitTranslation) {
    targetData.useSplitTranslation = true
  }

  if (sourceData.noBatch) {
    targetData.noBatch = true
  }

  const childCount = Math.min(source.children.length, target.children.length)

  for (let i = 0; i < childCount; i++) {
    copyHighlightObjectFlags(source.children[i], target.children[i])
  }
}
