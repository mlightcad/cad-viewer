import type { AcDbEntity } from '@mlightcad/data-model'

/**
 * Event payload emitted when one database entity is modified.
 */
export interface AcDbEntityModifiedEventArgs {
  entity: AcDbEntity
  changes?: Partial<Record<string, unknown>>
}

/**
 * Returns true when a database entity modification only affects visibility.
 */
export function isVisibilityOnlyEntityChange(
  changes?: Partial<Record<string, unknown>>
): boolean {
  if (!changes) {
    return false
  }

  const keys = Object.keys(changes)
  return keys.length > 0 && keys.every(key => key === 'visibility')
}

/**
 * Returns true when an entity modification can be applied by toggling scene
 * visibility without rebuilding geometry.
 */
export function canApplyVisibilityOnlySceneUpdate(
  args: AcDbEntityModifiedEventArgs,
  hasEntity: (objectId: string) => boolean,
  getEntityVisible: (objectId: string) => boolean | undefined
): boolean {
  const { entity, changes } = args
  const objectId = entity.objectId

  if (!hasEntity(objectId)) {
    return false
  }

  if (isVisibilityOnlyEntityChange(changes)) {
    if (changes!.visibility === true) {
      const sceneVisible = getEntityVisible(objectId)
      if (sceneVisible === undefined) {
        return false
      }
    }
    return true
  }

  // Hide-without-regen when the database already marks the entity invisible but
  // the scene slot is still drawn. Require an empty changes payload so geometry
  // or style edits always fall back to a full update.
  if (changes && Object.keys(changes).length > 0) {
    return false
  }

  const sceneVisible = getEntityVisible(objectId)
  if (sceneVisible === undefined) {
    return false
  }

  return sceneVisible && !entity.visibility
}
