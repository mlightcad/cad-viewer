import { AcDbObjectId, AcGeMatrix3d, AcGePoint3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
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
  private _boxes: AcTrEntityBox[] = []

  /**
   * Notes:
   * All entities should have the same base point
   * @param entities
   * @param styleManager
   * @param basePoint
   */
  constructor(
    entities: AcTrEntity[],
    styleManager: AcTrStyleManager,
    basePoint?: AcGePoint3d
  ) {
    super(styleManager, basePoint)
    entities.forEach(entity => {
      // FIXME: It looks like that code within 'Array.isArray(entity)' condition is useless.
      if (Array.isArray(entity)) {
        const subGroup = new AcTrEntity(styleManager)
        this.add(subGroup)
        this.box.union(subGroup.box)
      } else {
        this.add(entity)
        this.box.union(entity.box)
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
  }

  get isOnTheSameLayer() {
    return this._isOnTheSameLayer
  }

  get boxes() {
    return this._boxes
  }

  /**
   * @inheritdoc
   */
  applyMatrix(matrix: AcGeMatrix3d) {
    const threeMatrix = AcTrMatrixUtil.createMatrix4(matrix)
    this._boxes.forEach(box => this.applyMatrixToEntityBox(box, threeMatrix))
    super.applyMatrix(matrix)
  }

  /**
   * @inheritdoc
   */
  copy(object: AcTrGroup, recursive?: boolean) {
    this._isOnTheSameLayer = object._isOnTheSameLayer
    this._boxes = []
    object.boxes.forEach(box => this._boxes.push({ ...box }))
    return super.copy(object, recursive)
  }

  /**
   * @inheritdoc
   */
  fastDeepClone() {
    const cloned = new AcTrGroup([], this.styleManager, this._basePoint)
    cloned.copy(this, false)
    this.copyGeometry(this, cloned)
    return cloned
  }

  private storeBoxes(object: THREE.Object3D) {
    if (object instanceof AcTrGroup) {
      object._boxes.forEach(box => this._boxes.push(box))
    } else if (object instanceof AcTrEntity) {
      // only leaf entities should contribute to _boxes
      this._boxes.push({
        minX: object.box.min.x,
        minY: object.box.min.y,
        maxX: object.box.max.x,
        maxY: object.box.max.y,
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
