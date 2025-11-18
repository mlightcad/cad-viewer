import { AcGePoint3d } from '@mlightcad/data-model'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrEntity } from './AcTrEntity'
import { AcTrGroupRebaser } from './rebaser'

/**
 * One collection of graphic interface entities. Now it is used to render block reference,
 * table and viewport.
 */
export class AcTrGroup extends AcTrEntity {
  private _isOnTheSameLayer: boolean

  constructor(
    entities: AcTrEntity[],
    styleManager: AcTrStyleManager,
    basePoint?: AcGePoint3d
  ) {
    super(styleManager, basePoint)
    entities.forEach(entity => {
      if (Array.isArray(entity)) {
        const subGroup = new AcTrEntity(styleManager)
        this.add(subGroup)
        this.box.union(subGroup.box)
      } else {
        this.add(entity)
        this.box.union(entity.box)
      }
    })
    // Important:
    // The third parameter must be false because call to flatten will apply position
    // to geometry again. It may destory number precision. So set group's position
    // after calling to flatten.
    const offset = this.rebase(new AcTrGroupRebaser(entities), basePoint)
    this.flatten()
    if (offset) this.position.copy(offset)

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

  /**
   * @inheritdoc
   */
  copy(object: AcTrGroup, recursive?: boolean) {
    this._isOnTheSameLayer = object._isOnTheSameLayer
    return super.copy(object, recursive)
  }

  /**
   * @inheritdoc
   */
  fastDeepClone() {
    const cloned = new AcTrGroup([], this.styleManager)
    cloned.copy(this, false)
    this.copyGeometry(this, cloned)
    return cloned
  }
}
