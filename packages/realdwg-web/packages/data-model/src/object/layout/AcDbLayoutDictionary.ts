import { AcDbObjectId } from '../../base/AcDbObject'
import { AcDbDictionary } from '../AcDbDictionary'
import { AcDbLayout } from './AcDbLayout'

/**
 * Dictionary for storing and managing AcDbLayout objects.
 *
 * This class extends AcDbDictionary to provide specialized functionality
 * for managing layout objects, including searching by block table record ID
 * and tracking the maximum tab order.
 *
 * @example
 * ```typescript
 * const layoutDict = new AcDbLayoutDictionary(database);
 * const layout = layoutDict.getBtrIdAt('some-block-id');
 * const maxOrder = layoutDict.maxTabOrder;
 * ```
 */
export class AcDbLayoutDictionary extends AcDbDictionary<AcDbLayout> {
  /**
   * Searches the dictionary for a layout associated with the specified block table record ID.
   *
   * @param id - The block table record ID to search for
   * @returns The layout associated with the block table record ID, or undefined if not found
   *
   * @example
   * ```typescript
   * const layout = layoutDict.getBtrIdAt('some-block-id');
   * if (layout) {
   *   console.log('Found layout:', layout.layoutName);
   * }
   * ```
   */
  getBtrIdAt(id: AcDbObjectId) {
    for (const [_, layout] of this._recordsByName) {
      if (layout.blockTableRecordId == id) return layout
    }
    return undefined
  }

  /**
   * Gets the maximum tab order value of layouts in the layout dictionary.
   *
   * @returns The maximum tab order value, or -1 if no layouts exist
   *
   * @example
   * ```typescript
   * const maxOrder = layoutDict.maxTabOrder;
   * console.log('Maximum tab order:', maxOrder);
   * ```
   */
  get maxTabOrder() {
    let maxValue = -1
    this._recordsByName.forEach(layout => {
      if (layout.tabOrder > maxValue) {
        maxValue = layout.tabOrder
      }
    })
    return maxValue
  }
}
