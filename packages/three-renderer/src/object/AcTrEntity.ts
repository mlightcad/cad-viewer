import { AcGeMatrix3d, AcGePoint3d, AcGiEntity } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrMaterialUtil, AcTrMatrixUtil } from '../util'
import { AcTrObject } from './AcTrObject'

/**
 * Represent the display object of one drawing entity.
 */
export class AcTrEntity extends AcTrObject implements AcGiEntity {
  static readonly NO_BATCH_FLAG = 'noBatch'
  protected _box: THREE.Box3
  protected _basePoint?: AcGePoint3d

  constructor(styleManager: AcTrStyleManager) {
    super(styleManager)
    this._box = new THREE.Box3()
  }

  /**
   * The bounding box without considering transformation matrix applied on this object.
   * If you want to get bounding box with transformation matrix, please call `applyMatrix4`
   * for this box.
   */
  get box() {
    return this._box
  }
  set box(box: THREE.Box3) {
    this._box.copy(box)
  }

  /**
   * JavaScript (and WebGL) use 64‑bit floating point numbers for CPU-side calculations,
   * but GPU shaders typically use 32‑bit floats. A 32-bit float has ~7.2 decimal digits
   * of precision. If passing 64-bit floating vertices data to GPU directly, it will
   * destroy number preciesion.
   *
   * So we adopt a simpler but effective version of the “origin-shift” idea. Recompute
   * geometry using re-centered coordinates and apply offset to its position. The base
   * point is extractly offset value.
   */
  get basePoint() {
    return this._basePoint
  }
  set basePoint(value: AcGePoint3d | undefined) {
    if (value == null) {
      this._basePoint = value
    } else {
      this._basePoint = this._basePoint
        ? this._basePoint.copy(value)
        : new AcGePoint3d(value)
    }
  }

  /**
   * @inheritdoc
   */
  get objectId() {
    return this.userData.objectId as string
  }
  set objectId(value: string) {
    this.userData.objectId = value
  }

  /**
   * @inheritdoc
   */
  get ownerId() {
    return this.userData.ownerId as string
  }
  set ownerId(value: string) {
    this.userData.ownerId = value
  }

  /**
   * @inheritdoc
   */
  get layerName() {
    return this.userData.layerName as string
  }
  set layerName(value: string) {
    this.userData.layerName = value
  }

  /**
   * Flattens the descendant hierarchy under `root` so that every leaf render object becomes a
   * direct child of `root`, while keeping the visual result unchanged.
   *
   * The key constraint is that this method must preserve transforms without baking them into
   * leaf geometries. In CAD scenes, vertex coordinates can already be very large, and applying
   * additional parent transforms directly to geometry can further increase their magnitude,
   * which risks precision loss once those coordinates are uploaded to GPU float buffers.
   *
   * To avoid that, the method:
   * 1. Traverses the hierarchy and collects only leaf objects.
   * 2. Computes each leaf's transform relative to `root`.
   * 3. Removes intermediate grouping nodes from the hierarchy.
   * 4. Re-parents each leaf directly under `root`.
   * 5. Restores the previously computed relative transform onto the leaf object itself
   *    (`position`, `quaternion`, `scale`) rather than modifying its geometry data.
   *
   * After flattening:
   * - `root` keeps its own local/world transform unchanged.
   * - intermediate container nodes below `root` are removed.
   * - leaf geometry buffers remain numerically unchanged.
   * - each leaf still renders in the same world-space location as before.
   *
   * @param root The root entity whose descendant hierarchy should be flattened.
   */
  static flattenObject(root: AcTrEntity) {
    // Store each leaf together with the transform that places it correctly under `root`.
    // The matrix is expressed in `root` local space, not in world space.
    const objectsToReparent: Array<{
      object: THREE.Object3D
      relativeMatrix: THREE.Matrix4
    }> = []
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    // Reconstruct the object's local TRS from the relative matrix. We intentionally restore
    // the transform onto the object itself instead of applying the matrix to its geometry.
    function applyRelativeMatrix(
      object: THREE.Object3D,
      relativeMatrix: THREE.Matrix4
    ) {
      relativeMatrix.decompose(position, quaternion, scale)
      object.position.copy(position)
      object.quaternion.copy(quaternion)
      object.scale.copy(scale)
      object.updateMatrix()
    }

    // Walk the subtree and collect only leaf render objects. Any intermediate groups are
    // removed so the final hierarchy under `root` is one level deep.
    function traverseAndCollectChildren(
      object: THREE.Object3D,
      rootMatrixWorldInverse: THREE.Matrix4
    ) {
      // Copy first because we will mutate the hierarchy during traversal.
      const children = [...object.children]
      for (const child of children) {
        // Propagate layer information downward when the leaf itself does not define one.
        if (!child.userData.layerName && object.userData.layerName) {
          child.userData.layerName = object.userData.layerName
        }

        if (child.children.length > 0) {
          // Keep descending until we reach actual render leaves.
          traverseAndCollectChildren(child, rootMatrixWorldInverse)
        } else {
          // Refresh world matrices before computing the leaf transform relative to `root`.
          child.updateMatrixWorld(true)

          // Convert from world space into `root` local space:
          //   relative = inverse(rootWorld) * childWorld
          // This preserves the final rendered placement after the child is re-parented
          // directly under `root`.
          objectsToReparent.push({
            object: child,
            relativeMatrix: rootMatrixWorldInverse
              .clone()
              .multiply(child.matrixWorld)
          })
        }

        // Detach the current child from its old parent so that the old nested hierarchy is
        // removed completely before we attach the collected leaves back under `root`.
        object.remove(child)
      }
    }

    // Capture `root`'s current world transform once. The inverse lets us convert each leaf's
    // existing world transform into the local transform it should have after re-parenting.
    root.updateMatrixWorld(true)
    traverseAndCollectChildren(root, root.matrixWorld.clone().invert())

    // Re-parent all collected leaves directly under `root`, restoring only object-level
    // transforms so geometry coordinates remain untouched.
    for (const item of objectsToReparent) {
      const { object: child, relativeMatrix } = item

      applyRelativeMatrix(child, relativeMatrix)
      root.add(child)
    }

    // Refresh matrices so downstream code sees the updated flattened hierarchy immediately.
    root.updateMatrixWorld(true)
  }

  /**
   * Remove the specified object from its parent and release geometry and material resource used
   * by the object.
   * @param object Input object to dispose
   */
  static disposeObject(
    object: THREE.Object3D,
    isRemoveFromParent: boolean = true
  ) {
    // Step 1: Remove the object from the parent if it exists
    if (isRemoveFromParent) object.removeFromParent()

    // Step 2: Dispose of geometry if it exists
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      if (object.geometry) {
        object.geometry.dispose()
      }
    }

    // Step 3: Dispose of material(s)
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      materials.forEach(material => {
        material.dispose()
        // Dispose textures (if any) used by the material
        material.map?.dispose()
        material.envMap?.dispose()
        material.lightMap?.dispose()
        material.bumpMap?.dispose()
        material.normalMap?.dispose()
        material.roughnessMap?.dispose()
        material.metalnessMap?.dispose()
        material.alphaMap?.dispose()
      })
    }

    // Step 4: Recursively dispose of all child objects
    object.children.forEach(child => this.disposeObject(child))

    // Step 5: Clean up references
    if ('geometry' in object) object.geometry = null // This clears the geometry reference
    if ('material' in object) object.material = null // This clears the material reference
    object.children = [] // Clear children array
  }

  /**
   * Flatten the hierarchy of this object so that all children are moved to be direct children of
   * this entity. Preserve transformations.
   */
  flatten() {
    AcTrEntity.flattenObject(this)
  }

  /**
   * Remove this object from its parent and release geometry and material resource used by this object.
   */
  dispose() {
    AcTrEntity.disposeObject(this)
  }

  async draw() {
    // Do nothing for now
  }

  /**
   * @inheritdoc
   */
  addChild(entity: AcTrEntity) {
    this.add(entity)
  }

  /**
   * @inheritdoc
   */
  applyMatrix(matrix: AcGeMatrix3d) {
    const threeMatrix = AcTrMatrixUtil.createMatrix4(matrix)
    this.applyMatrix4(threeMatrix)
    this.updateMatrixWorld(true)
    this._box.applyMatrix4(threeMatrix)
  }

  /**
   * @inheritdoc
   */
  bakeTransformToChildren(): void {
    // Ensure the object's world matrix is up to date
    this.updateWorldMatrix(true, false)

    // Cache the object's current world matrix
    const objectWorldMatrix = this.matrixWorld.clone()

    // Bake the object's world transform into all direct children
    this.children.forEach(child => {
      // Ensure the child's local matrix is up to date
      child.updateMatrix()

      // child.localMatrix = objectWorldMatrix * child.localMatrix
      child.applyMatrix4(objectWorldMatrix)
    })

    // Reset the object to an identity transform
    this.position.set(0, 0, 0)
    this.rotation.set(0, 0, 0)
    this.scale.set(1, 1, 1)
    this.updateMatrix()
  }

  /**
   * @inheritdoc
   */
  highlight() {
    this.highlightObject(this)
  }

  /**
   * Highlight the specified object.
   */
  protected highlightObject(object: THREE.Object3D) {
    if ('material' in object) {
      const material = object.material as THREE.Material | THREE.Material[]
      // If 'originalMaterial' isn't null, this object is already highlighted
      if (object.userData.originalMaterial == null) {
        const clonedMaterial = AcTrMaterialUtil.cloneMaterial(material)
        AcTrMaterialUtil.setMaterialColor(clonedMaterial)
        object.userData.originalMaterial = object.material
        object.material = clonedMaterial
      }
    } else if (object.children.length > 0) {
      object.children.forEach(child => {
        this.highlightObject(child)
      })
    }
  }

  /**
   * @inheritdoc
   */
  unhighlight() {
    this.unhighlightObject(this)
  }

  /**
   * @inheritdoc
   */
  fastDeepClone() {
    const cloned = new AcTrEntity(this.styleManager)
    cloned.copy(this, false)
    this.copyGeometry(this, cloned)
    return cloned
  }

  /**
   * @inheritdoc
   */
  copy(object: AcTrEntity, recursive?: boolean) {
    this.objectId = object.objectId
    this.ownerId = object.ownerId
    this.layerName = object.layerName
    this.box = object.box
    return super.copy(object, recursive)
  }

  /**
   * Clone geometries in the source's direct children and copy them to the target
   * @param source Input the source entity
   * @param target Input the target entity
   */
  protected copyGeometry(source: AcTrEntity, target: AcTrEntity) {
    for (let i = 0; i < source.children.length; i++) {
      const child = source.children[i]

      if (child instanceof AcTrEntity) {
        target.add(child.fastDeepClone())
        continue
      }

      const clonedChild = child.clone(false)
      if ('geometry' in clonedChild) {
        clonedChild.geometry = (
          clonedChild.geometry as THREE.BufferGeometry
        ).clone()
      }
      target.add(clonedChild)
    }
  }

  /**
   * Unhighlight the specified object
   */
  protected unhighlightObject(object: THREE.Object3D) {
    if ('material' in object) {
      const material = object.material as THREE.Material | THREE.Material[]
      object.material = object.userData.originalMaterial
      delete object.userData.originalMaterial

      // clean up
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose())
      } else if (material instanceof THREE.Material) {
        material.dispose()
      }
    } else if (object.children.length > 0) {
      object.children.forEach(child => {
        this.unhighlightObject(child)
      })
    }
  }

  protected createColorArray(color: number, length: number) {
    const red = ((color >> 16) & 255) / 256
    const green = ((color >> 8) & 255) / 256
    const blue = (color & 255) / 256

    const colors = new Float32Array(length * 3)
    for (let i = 0, pos = 0; i < length; i++) {
      colors[pos] = red
      colors[pos + 1] = green
      colors[pos + 2] = blue
      pos += 3
    }
    return colors
  }
}
