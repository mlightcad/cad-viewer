import { AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

import type { AcTrMTextEntityTraits } from './AcTrMTextColorUtil'

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
  /** Batch slot-mask highlight shader patch installed on this material. */
  batchHighlightPatched?: boolean
  /** Persistent highlight uniform bag shared by compiled shader programs. */
  batchHighlightUniforms?: Record<string, { value: unknown }>
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
  /** Entity colour/layer snapshot for unbatched MTEXT/TEXT placement roots. */
  textEntityTraits?: AcTrMTextEntityTraits
}

/**
 * Database identity stored on {@link AcTrEntity} and descendants.
 */
export interface AcTrEntityIdentityUserData {
  objectId?: string
  ownerId?: string
  layerName?: string
  /**
   * Layer name authored in the block definition before layer-0 inheritance.
   * Set when {@link layerName} is remapped from `"0"` to an INSERT layer so
   * material remapping can still treat the drawable as layer-0 ByLayer.
   */
  authoredLayerName?: string
  /**
   * Layer of the outermost (or owning) INSERT that produced this drawable.
   * Used to hide all INSERT fragments when that INSERT layer is frozen.
   */
  insertLayerName?: string
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
  /** Marks geometry extracted for command preview overlays. */
  previewDrawable?: boolean
}

/**
 * Marks a preview subset container created by {@link AcTrBatchedGroup.createPreviewSubset}.
 */
export interface AcTrPreviewSubsetGroupUserData {
  /** Set to `true` on the subset root group. */
  previewSubsetGroup?: true
}

/**
 * Marks the root group of one command preview overlay.
 */
export interface AcTrEntityPreviewRootUserData {
  /** Set to `true` on preview roots registered with {@link AcTrPreviewOverlayManager}. */
  entityPreviewRoot?: true
}

/**
 * Marks a {@link THREE.Group} that holds transient selection/hover highlight
 * clones instead of source drawing geometry.
 */
export interface AcTrHighlightOverlayGroupUserData {
  highlightOverlayGroup?: true
}

/**
 * Selection or hover overlay container inside {@link AcTrBatchedGroup}.
 */
export type AcTrHighlightOverlayGroup = THREE.Group & {
  userData: AcTrHighlightOverlayGroupUserData
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
    AcTrHighlightUserData,
    AcTrHighlightOverlayGroupUserData,
    AcTrPreviewSubsetGroupUserData,
    AcTrEntityPreviewRootUserData {
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

/**
 * Resolves a style-cache material remap for one drawable material instance.
 */
export function resolveCachedMaterialRemap(
  material: THREE.Material,
  materials: Record<number, THREE.Material>,
  styleMaterialId?: number
): THREE.Material | undefined {
  return (
    materials[material.id] ??
    (styleMaterialId != null ? materials[styleMaterialId] : undefined)
  )
}

/**
 * Keeps {@link AcTrStyledDrawableUserData.styleMaterialId} aligned with drawable materials.
 *
 * Array materials only store a style id when every slot shares the same material id.
 */
export function syncStyleMaterialIdFromMaterials(
  userData: AcTrStyledDrawableUserData,
  material: THREE.Material | THREE.Material[]
): void {
  if (Array.isArray(material)) {
    const ids = new Set(material.map(entry => entry.id))
    if (ids.size === 1) {
      userData.styleMaterialId = material[0].id
      return
    }
    delete userData.styleMaterialId
    return
  }

  userData.styleMaterialId = material.id
}

type AcTrMaterialDrawable = THREE.Mesh | THREE.Line | THREE.LineSegments

/**
 * Patches drawable material slots after the style cache replaces material instances.
 */
export function patchDrawableMaterialFromCache(
  drawable: AcTrMaterialDrawable,
  materials: Record<number, THREE.Material>
): void {
  const userData = getSceneDrawableUserData(drawable)
  const current = drawable.material

  if (Array.isArray(current)) {
    drawable.material = current.map(entry => {
      const remapped = resolveCachedMaterialRemap(
        entry,
        materials,
        userData.styleMaterialId
      )
      return remapped && remapped !== entry ? remapped : entry
    })
    syncStyleMaterialIdFromMaterials(userData, drawable.material)
    return
  }

  const remapped = resolveCachedMaterialRemap(
    current,
    materials,
    userData.styleMaterialId
  )
  if (remapped && remapped !== current) {
    drawable.material = remapped
    syncStyleMaterialIdFromMaterials(userData, remapped)
  }
}

export function getHighlightUserData(
  object: THREE.Object3D
): AcTrHighlightObjectUserData {
  return getObjectUserData(object) as AcTrHighlightObjectUserData
}

/**
 * Reads preview-root flags from one preview overlay group.
 *
 * @param object - Preview overlay root group
 */
export function getEntityPreviewRootUserData(
  object: THREE.Object3D
): AcTrEntityPreviewRootUserData {
  return getObjectUserData(object) as AcTrEntityPreviewRootUserData
}

export function getHighlightOverlayGroupUserData(
  object: THREE.Object3D
): AcTrHighlightOverlayGroupUserData {
  return getObjectUserData(object) as AcTrHighlightOverlayGroupUserData
}

/**
 * Tags one group as a selection/hover highlight overlay container.
 */
export function markHighlightOverlayGroup(
  group: THREE.Group
): AcTrHighlightOverlayGroup {
  const overlay = group as AcTrHighlightOverlayGroup
  overlay.userData.highlightOverlayGroup = true
  return overlay
}

/**
 * Returns whether `object` or any ancestor is a highlight overlay container.
 */
export function isHighlightOverlayDescendant(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object
  while (node) {
    if (getHighlightOverlayGroupUserData(node).highlightOverlayGroup) {
      return true
    }
    node = node.parent
  }
  return false
}

/**
 * Returns whether `object` is a transient selection/hover highlight clone rather
 * than source drawing geometry.
 *
 * Highlight clones receive `userData.objectId` in
 * {@link AcTrBatchedGroup.highlight}; leaf drawables in the normal scene graph do
 * not. Entity containers also carry `objectId`, but they are excluded here.
 */
export function isHighlightCloneDrawable(object: THREE.Object3D): boolean {
  if (getHighlightUserData(object).objectId == null) {
    return false
  }

  const userData = getObjectUserData(object)
  if (userData.layerName != null && object.children.length > 0) {
    return false
  }

  return true
}

/**
 * Returns the drawable material to use for HTML/export snapshots.
 *
 * Unbatched selection and hover tinting swaps materials in place while
 * preserving the source material on {@link AcTrObjectUserDataFields.originalMaterial}.
 */
export function resolveDrawableExportMaterial(
  object: THREE.Object3D
): THREE.Material | THREE.Material[] | undefined {
  if (!('material' in object)) {
    return undefined
  }

  const originalMaterial = getObjectUserData(object).originalMaterial
  if (originalMaterial != null) {
    return originalMaterial
  }

  return object.material as THREE.Material | THREE.Material[]
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
 * Resolves the Object3D that carries MTEXT insertion/rotation from the renderer.
 * Worker output is already the placement root; sync output wraps it under `MText`.
 */
export function resolveMTextRenderRoot(mtext: THREE.Object3D): THREE.Object3D {
  if (mtext.children.length !== 1) {
    return mtext
  }

  const child = mtext.children[0]
  if (
    child instanceof THREE.Mesh ||
    child instanceof THREE.Line ||
    child instanceof THREE.LineSegments
  ) {
    return mtext
  }

  return child
}

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
