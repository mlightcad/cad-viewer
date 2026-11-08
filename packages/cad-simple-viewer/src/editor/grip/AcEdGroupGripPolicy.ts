import {
  AcDbDatabase,
  AcDbObjectId,
  AcGeBox3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import {
  acapFindGroupsContaining,
  acapGetGroupDisplayMode,
  acapIsGroupSelectionEnabled
} from '../../service/AcApGroup'

/**
 * One fully covered selectable group within the current selection, used for
 * GROUPDISPLAYMODE center grips and bounding boxes.
 */
export interface AcEdGroupGripUnit {
  /** Stable key (group name or object id) for deduping. */
  key: string
  /** First selected member id; used as the grip entry's entity id. */
  representativeId: AcDbObjectId
  /** Selectable members of this group that are present in the selection. */
  memberIds: AcDbObjectId[]
}

/**
 * Computes the axis-aligned bounding box of selected entities, or `null`.
 */
export function acedSelectionBoundingBox(
  db: AcDbDatabase,
  selectedIds: readonly AcDbObjectId[]
): AcGeBox3d | null {
  let box: AcGeBox3d | null = null
  for (const id of selectedIds) {
    const entity = db.tables.blockTable.getEntityById(id)
    const extents = entity?.geometricExtents
    if (!extents) continue
    if (!box) {
      box = extents.clone()
    } else {
      box.union(extents)
    }
  }
  return box
}

/**
 * Center point of the selection bounding box, or `null` when empty.
 */
export function acedSelectionCenter(
  db: AcDbDatabase,
  selectedIds: readonly AcDbObjectId[]
): AcGePoint3dLike | null {
  const box = acedSelectionBoundingBox(db, selectedIds)
  if (!box) return null
  return {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2
  }
}

/**
 * Selectable groups whose members are all present in the selection.
 *
 * Matches AutoCAD: GROUPDISPLAYMODE applies per fully selected group even when
 * the selection also contains non-group (or other-group) objects.
 */
export function acedCoveredGroupGripUnits(
  db: AcDbDatabase,
  selectedIds: readonly AcDbObjectId[]
): AcEdGroupGripUnit[] {
  if (!acapIsGroupSelectionEnabled(db) || selectedIds.length === 0) return []

  const selected = new Set(selectedIds)
  const units: AcEdGroupGripUnit[] = []
  const seen = new Set<string>()

  for (const id of selectedIds) {
    const groups = acapFindGroupsContaining(db, id).filter(g => g.selectable)
    for (const group of groups) {
      if (!group.entityIds.every(memberId => selected.has(memberId))) continue
      const key = group.name || group.objectId
      if (seen.has(key)) continue
      seen.add(key)
      units.push({
        key,
        representativeId: group.entityIds[0] ?? id,
        memberIds: [...group.entityIds]
      })
    }
  }
  return units
}

/**
 * Returns whether any fully covered selectable group is present in the
 * selection (so GROUPDISPLAYMODE may apply to those units).
 */
export function acedShouldUseGroupGripDisplay(
  db: AcDbDatabase,
  selectedIds: readonly AcDbObjectId[]
): boolean {
  return acedCoveredGroupGripUnits(db, selectedIds).length > 0
}

/**
 * Effective GROUPDISPLAYMODE when at least one covered group exists; otherwise
 * `0` (per-entity grips only).
 */
export function acedEffectiveGroupDisplayMode(
  db: AcDbDatabase,
  selectedIds: readonly AcDbObjectId[]
): number {
  if (!acedShouldUseGroupGripDisplay(db, selectedIds)) return 0
  return acapGetGroupDisplayMode(db)
}

/**
 * Selected ids that should show per-entity grips under the given mode.
 *
 * When mode is `1` or `2`, members of covered groups are omitted (they use the
 * group center grip / bbox instead). Mode `0` returns every selected id.
 */
export function acedIdsForEntityGrips(
  selectedIds: readonly AcDbObjectId[],
  units: readonly AcEdGroupGripUnit[],
  groupMode: number
): AcDbObjectId[] {
  if (groupMode !== 1 && groupMode !== 2) return [...selectedIds]
  const covered = new Set<AcDbObjectId>()
  for (const unit of units) {
    for (const id of unit.memberIds) covered.add(id)
  }
  return selectedIds.filter(id => !covered.has(id))
}
