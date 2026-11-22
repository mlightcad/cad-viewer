import type { AcDbObjectId } from '@mlightcad/data-model'

/**
 * Payload of the entity property palette's `update-property` event.
 */
export interface MlEntityPropertyUpdate {
  /** Group of the edited property, e.g. `general` or `geometry`. */
  groupName: string
  /** Name of the edited property within its group. */
  propertyName: string
  /**
   * New value. For array properties this is the whole array with one item
   * changed, ready to pass to the property's accessor.
   */
  newValue: unknown
  /**
   * Index of the single entity being edited in the list shown by the palette,
   * or `-1` when the properties shared by all listed entities are edited.
   */
  entityIndex: number
}

/**
 * Returns the entities an edit applies to: the one picked in the palette's
 * entity selector, or every listed entity for a shared-property edit.
 *
 * @param ids - Entity ids in the order the palette lists them.
 * @param update - The edit emitted by the palette.
 */
export function mlResolvePropertyEditTargets(
  ids: readonly AcDbObjectId[],
  update: Pick<MlEntityPropertyUpdate, 'entityIndex'>
): AcDbObjectId[] {
  if (update.entityIndex < 0) return [...ids]
  const id = ids[update.entityIndex]
  return id ? [id] : []
}
