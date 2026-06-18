import { AcDbObjectId, AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrMatrixUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'
export interface AcTrEntityBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: AcDbObjectId
}

/**
 * One collection of graphic interface entities. Now it is used to render block reference,
 * table and viewport.
 */
export class AcTrGroup extends AcTrEntity {
  private _isOnTheSameLayer: boolean
  private _wcsChildBoxes: AcTrEntityBox[] = []

  constructor(entities: AcTrEntity[], context: AcTrRenderContext) {
    super(context)
    entities.forEach(entity => {
      // FIXME: It looks like that code within 'Array.isArray(entity)' condition is useless.
      if (Array.isArray(entity)) {
        const subGroup = new AcTrEntity(context)
        this.add(subGroup)
        this.wcsBbox.union(subGroup.wcsBbox)
      } else {
        this.add(entity)
        this.wcsBbox.union(entity.wcsBbox)
      }
      this.storeBoxes(entity)
    })
    this.flatten()

    // It is a little tricky that how AutoCAD handles block references (inserts), their
    // own layer, and the layers of entities inside the block.
    //
    // Assuming block B contains:
    // - E1 on layer 0
    // - E2 on layer L2
    // - E3 on layer L3
    //
    // You insert block B onto layer L2 (the block reference layer).
    //
    // Case 1: Turn off layer L2
    // - The block reference itself is on L2.
    // - When you turn off L2, the entire block reference disappears, regardless of what
    // layers its contents are on. Result is block reference will NOT be visible.
    //
    // Case 2: Turn off layer L3
    // - The block reference is still on L2, which remains on.
    // - Inside the block:
    //   - E1 (on 0) → inherits from the block’s layer (L2), so it is still visible.
    //   - E2 (on L2) → visible (since L2 is still on).
    //   - E3 (on L3) → hidden (since L3 is turned off).
    // - Result is that the block reference will still be visible, but E3 inside it will not.
    //
    // If all of entities are on layer '0', we can merge them together so that it looks
    // like one non-composite entity. This approach can improve rendering performance and
    // make it easier to process entities in group. Actually most of blocks follow this pattern.
    //
    // So 'isMerged' flag is used to handle the above situation.
    //
    let hasEntityInNonZeroLayer = false
    const children = this.children
    for (let index = 0; index < children.length; ++index) {
      const entity = children[index]
      if (
        entity.userData.layerName != null &&
        entity.userData.layerName !== '0'
      ) {
        hasEntityInNonZeroLayer = true
        break
      }
    }
    this._isOnTheSameLayer = !hasEntityInNonZeroLayer

    // Note: Don't merge children because the structure of is group is needed when
    // hovering over one entity. For example, when hovering on one character in one
    // block reference, its bounding box is used to check intersection instead of its
    // real shape. After merging, there is no way to do this kind of check.

    // wcsChildBoxes is the source of truth for spatial indexing. The aggregate
    // wcsBbox union taken during construction (or Box3.applyMatrix4 after INSERT)
    // can be slightly larger than the union of per-child boxes when transforms
    // include rotation or when nested groups carry mismatched metadata.
    this.syncWcsBboxFromChildBoxes()
  }

  get isOnTheSameLayer() {
    return this._isOnTheSameLayer
  }

  /** Per-child WCS bounding boxes used by the spatial index. */
  get wcsChildBoxes() {
    return this._wcsChildBoxes
  }

  /**
   * Block-reference attributes are appended after the group is constructed
   * (see AcDbRenderingCache.draw). Register their bounds for spatial indexing.
   */
  addChild(entity: AcTrEntity) {
    super.addChild(entity)
    if (
      entity.userData.layerName != null &&
      entity.userData.layerName !== '0'
    ) {
      // Block-reference attributes are appended after the group is constructed
      // (see AcDbRenderingCache.draw). Without this update, isOnTheSameLayer
      // stays true and INSERT layer-0 inheritance is applied to every child,
      // including attributes on their own layers such as title-block CARTOUCHE.
      this._isOnTheSameLayer = false
    }
    this.storeBoxes(entity)
    if (!entity.wcsBbox.isEmpty()) {
      this.wcsBbox.union(entity.wcsBbox)
    }
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * @inheritdoc
   */
  applyMatrix(matrix: AcGeMatrix3d) {
    const threeMatrix = AcTrMatrixUtil.createMatrix4(matrix)
    this._wcsChildBoxes.forEach(box =>
      this.applyMatrixToEntityBox(box, threeMatrix)
    )
    super.applyMatrix(matrix)
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * @inheritdoc
   */
  copy(object: AcTrGroup, recursive?: boolean) {
    this._isOnTheSameLayer = object._isOnTheSameLayer
    this._wcsChildBoxes = []
    object.wcsChildBoxes.forEach(box => this._wcsChildBoxes.push({ ...box }))
    return super.copy(object, recursive)
  }

  /**
   * @inheritdoc
   */
  fastDeepClone() {
    const cloned = new AcTrGroup([], this.renderContext)
    cloned.copy(this, false)
    this.copyGeometry(this, cloned)
    return cloned
  }

  private syncWcsBboxFromChildBoxes() {
    if (this._wcsChildBoxes.length === 0) {
      return
    }

    const union = new THREE.Box3()
    for (const box of this._wcsChildBoxes) {
      union.union(
        new THREE.Box3(
          new THREE.Vector3(box.minX, box.minY, 0),
          new THREE.Vector3(box.maxX, box.maxY, 0)
        )
      )
    }
    this.wcsBbox = union
  }

  private storeBoxes(object: THREE.Object3D) {
    if (object instanceof AcTrGroup) {
      object._wcsChildBoxes.forEach(box => this._wcsChildBoxes.push(box))
    } else if (object instanceof AcTrEntity) {
      // only leaf entities should contribute to _wcsChildBoxes
      this._wcsChildBoxes.push({
        minX: object.wcsBbox.min.x,
        minY: object.wcsBbox.min.y,
        maxX: object.wcsBbox.max.x,
        maxY: object.wcsBbox.max.y,
        id: object.objectId
      })
    }
  }

  private applyMatrixToEntityBox(box: AcTrEntityBox, matrix: THREE.Matrix4) {
    const points = [
      new THREE.Vector3(box.minX, box.minY, 0),
      new THREE.Vector3(box.maxX, box.minY, 0),
      new THREE.Vector3(box.maxX, box.maxY, 0),
      new THREE.Vector3(box.minX, box.maxY, 0)
    ]

    // Apply matrix to all corners
    for (const p of points) {
      p.applyMatrix4(matrix)
    }

    // Recompute AABB
    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    box.minX = minX
    box.minY = minY
    box.maxX = maxX
    box.maxY = maxY
  }
}
