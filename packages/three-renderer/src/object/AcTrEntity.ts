import { AcGeMatrix3d, AcGePoint3d, AcGiEntity } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrMaterialUtil } from '../util'
import { AcTrObject } from './AcTrObject'

/**
 * Represent the display object of one drawing entity.
 */
export class AcTrEntity extends AcTrObject implements AcGiEntity {
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
   * Flatten the hierarchy of the specified object so that all children are moved to be direct
   * children of this object. Preserve transformations.
   * @param root Input object to be flatten
   * @returns Return the flatten object
   */
  static flattenObject(root: AcTrEntity) {
    // Temporary array to store children that will be re-parented
    const objectsToReparent: THREE.Object3D[] = []

    function resetObjectMatrix(object: THREE.Object3D) {
      // Clear local transformations of the child (now global transformations are applied)
      object.position.set(0, 0, 0)
      object.rotation.set(0, 0, 0)
      object.scale.set(1, 1, 1)
      object.matrix.identity()
    }

    // Helper function to recursively traverse the tree
    function traverseAndCollectChildren(
      object: THREE.Object3D,
      parentMatrixWorld: THREE.Matrix4
    ) {
      const children = [...object.children] // Copy the children array
      for (const child of children) {
        if (!child.userData.layerName && object.userData.layerName) {
          child.userData.layerName = object.userData.layerName
        }

        // Update the child's world matrix to preserve its world transform
        child.applyMatrix4(parentMatrixWorld)

        // Clear local transformations of the child (now global transformations are applied)
        resetObjectMatrix(child)

        if (child.children.length > 0) {
          // Recursively process the child's children
          traverseAndCollectChildren(child, child.matrixWorld)
        } else {
          // Collect the child for re-parenting
          objectsToReparent.push(child)
        }
      }
      object.children = [] // Clear children of the current object
    }

    // Start recursive traversal with the root's matrix world
    // Ensure the root's matrixWorld is up to date
    root.updateMatrixWorld(true)
    traverseAndCollectChildren(root, root.matrixWorld)

    // Add all collected children directly to the root
    for (const child of objectsToReparent) {
      // need to clone geometry, because a geometry can be shared by many objects
      if ('geometry' in child) {
        const geom = child.geometry as THREE.BufferGeometry
        geom.applyMatrix4(child.matrixWorld)

        child.matrixWorld.identity()
        child.matrixWorldNeedsUpdate = false
        root.add(child)
      }
    }

    resetObjectMatrix(root)
    root.matrixWorld.identity()
    root.matrixWorldNeedsUpdate = false
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
  applyMatrix(matrix: AcGeMatrix3d) {
    const elements = matrix.elements
    const threeMatrix = new THREE.Matrix4(
      elements[0],
      elements[4],
      elements[8],
      elements[12],
      elements[1],
      elements[5],
      elements[9],
      elements[13],
      elements[2],
      elements[6],
      elements[10],
      elements[14],
      elements[3],
      elements[7],
      elements[11],
      elements[15]
    )
    this.applyMatrix4(threeMatrix)
    this.updateMatrixWorld(true)
    this._box.applyMatrix4(threeMatrix)
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
