import type { AcGePoint3dLike } from '@mlightcad/data-model'

/**
 * Incremental sample fed to an entity-prompt preview jig while the cursor
 * moves over the drawing during {@link AcEdInputManager.getEntity}.
 *
 * When nothing valid is under the cursor, `objectId` is omitted so the jig
 * can clear its transient geometry.
 */
export interface AcEdEntityHoverSample {
  /** Picked entity id when the cursor is over an allowed object. */
  objectId?: string
  /** World-space cursor / pick point associated with this sample. */
  pickedPoint: AcGePoint3dLike
}
