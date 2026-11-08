import {
  AcDbDatabase,
  AcDbGroup,
  AcDbObjectId,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import { isEntityOnLockedLayer } from './AcApLockedLayer'

/** Max length of a named group (AutoCAD). */
export const ACAP_GROUP_NAME_MAX_LENGTH = 31

/** Max length of a group description (AutoCAD). */
export const ACAP_GROUP_DESCRIPTION_MAX_LENGTH = 64

const ANONYMOUS_GROUP_RE = /^\*A(\d+)$/i
const NAMED_GROUP_RE = /^[A-Z0-9$_-]{1,31}$/

/**
 * Returns whether group selection is enabled for the current `PICKSTYLE`.
 *
 * AutoCAD values `1` and `3` enable group selection. Associative-hatch
 * co-selection (`2` / `3`) is registered but not expanded here because hatch
 * boundary soft-pointers are not yet modeled on `AcDbHatch`.
 */
export function acapIsGroupSelectionEnabled(database?: AcDbDatabase): boolean {
  const raw = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.PICKSTYLE,
    database as AcDbDatabase
  )
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return true
  return (Math.trunc(value) & 1) !== 0
}

/**
 * Returns whether `PICKSTYLE` requests associative hatch co-selection.
 *
 * Currently unused for expansion (no boundary refs); kept for ribbon/sysvar UI.
 */
export function acapIsAssociativeHatchSelectionEnabled(
  database?: AcDbDatabase
): boolean {
  const raw = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.PICKSTYLE,
    database as AcDbDatabase
  )
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return false
  return (Math.trunc(value) & 2) !== 0
}

/**
 * Normalizes a user-entered group name (trim + uppercase).
 */
export function acapNormalizeGroupName(name: string): string {
  return String(name ?? '')
    .trim()
    .toUpperCase()
}

/**
 * Validates a named (non-anonymous) group name per AutoCAD rules.
 *
 * @returns Normalized name, or `undefined` when invalid.
 */
export function acapValidateGroupName(name: string): string | undefined {
  const normalized = acapNormalizeGroupName(name)
  if (!normalized || normalized.startsWith('*')) return undefined
  if (normalized.length > ACAP_GROUP_NAME_MAX_LENGTH) return undefined
  if (!NAMED_GROUP_RE.test(normalized)) return undefined
  return normalized
}

/**
 * Returns the next unused anonymous group name (`*A1`, `*A2`, …).
 */
export function acapNextAnonymousGroupName(db: AcDbDatabase): string {
  let max = 0
  for (const [key] of db.objects.group.entries()) {
    const match = ANONYMOUS_GROUP_RE.exec(key)
    if (!match) continue
    const n = Number(match[1])
    if (Number.isFinite(n) && n > max) max = n
  }
  return `*A${max + 1}`
}

/**
 * Returns whether a group is unnamed / anonymous (`*A…`), matching AutoCAD's
 * "Include Unnamed" filter (flag and/or `*` name prefix).
 */
export function acapIsUnnamedGroup(group: AcDbGroup): boolean {
  if (group.isAnonymous()) return true
  const name = group.name ?? ''
  return name.startsWith('*')
}

/**
 * Lists all groups in the dictionary (optionally including anonymous).
 */
export function acapListGroups(
  db: AcDbDatabase,
  includeUnnamed = true
): AcDbGroup[] {
  const groups: AcDbGroup[] = []
  for (const [, group] of db.objects.group.entries()) {
    if (!includeUnnamed && acapIsUnnamedGroup(group)) continue
    groups.push(group)
  }
  groups.sort((a, b) => a.name.localeCompare(b.name))
  return groups
}

/**
 * Finds groups that contain the given entity id.
 */
export function acapFindGroupsContaining(
  db: AcDbDatabase,
  entityId: AcDbObjectId
): AcDbGroup[] {
  if (!entityId) return []
  const result: AcDbGroup[] = []
  for (const [, group] of db.objects.group.entries()) {
    if (group.has(entityId)) result.push(group)
  }
  return result
}

/**
 * Unique groups that contain any of the given entity ids (selection order).
 */
export function acapFindGroupsContainingAny(
  db: AcDbDatabase,
  entityIds: readonly AcDbObjectId[]
): AcDbGroup[] {
  const seen = new Set<string>()
  const result: AcDbGroup[] = []
  for (const id of entityIds) {
    for (const group of acapFindGroupsContaining(db, id)) {
      const key = group.name || group.objectId
      if (seen.has(key)) continue
      seen.add(key)
      result.push(group)
    }
  }
  return result
}

/**
 * Resolves a group by dictionary name (case-insensitive).
 */
export function acapGetGroupByName(
  db: AcDbDatabase,
  name: string
): AcDbGroup | undefined {
  const normalized = acapNormalizeGroupName(name)
  if (!normalized) return undefined
  const direct = db.objects.group.getAt(normalized)
  if (direct) return direct
  for (const [key, group] of db.objects.group.entries()) {
    if (key.toUpperCase() === normalized) return group
  }
  return undefined
}

/**
 * Returns whether an entity's layer is locked or frozen (not selectable with group).
 */
function isMemberSelectable(db: AcDbDatabase, entityId: AcDbObjectId): boolean {
  const entity = db.tables.blockTable.getEntityById(entityId)
  if (!entity) return false
  if (isEntityOnLockedLayer(db, entity)) return false
  const layer = db.tables.layerTable.getAt(entity.layer)
  if (layer?.isFrozen || layer?.isOff) return false
  return true
}

/**
 * Expands picked entity ids by selectable groups when group selection is on.
 *
 * When an object belongs to multiple selectable groups, all of those groups'
 * members are included. Locked / frozen / off-layer members are skipped.
 */
export function acapExpandSelectionByGroups(
  db: AcDbDatabase,
  ids: readonly AcDbObjectId[]
): AcDbObjectId[] {
  if (!acapIsGroupSelectionEnabled(db) || ids.length === 0) {
    return [...ids]
  }

  const out = new Set<AcDbObjectId>()
  for (const id of ids) {
    out.add(id)
    const groups = acapFindGroupsContaining(db, id)
    for (const group of groups) {
      if (!group.selectable) continue
      for (const memberId of group.entityIds) {
        if (isMemberSelectable(db, memberId)) out.add(memberId)
      }
    }
  }
  return [...out]
}

export interface AcApCreateGroupOptions {
  /** Named group name; omit / empty with `unnamed` for `*An`. */
  name?: string
  description?: string
  selectable?: boolean
  unnamed?: boolean
  entityIds: readonly AcDbObjectId[]
}

/** Stable create-group failure codes for callers to map to i18n. */
export type AcApGroupCreateErrorCode = 'invalidName' | 'nameExists'

/**
 * Thrown by {@link acapCreateGroup} for invalid or colliding names.
 */
export class AcApGroupCreateError extends Error {
  readonly code: AcApGroupCreateErrorCode

  constructor(code: AcApGroupCreateErrorCode) {
    super(code)
    this.name = 'AcApGroupCreateError'
    this.code = code
  }
}

/**
 * Creates a group, adds it to `ACAD_GROUP`, and appends members.
 */
export function acapCreateGroup(
  db: AcDbDatabase,
  options: AcApCreateGroupOptions
): AcDbGroup {
  const unnamed = options.unnamed === true || !options.name
  let name: string
  if (unnamed) {
    name = acapNextAnonymousGroupName(db)
  } else {
    const validated = acapValidateGroupName(options.name ?? '')
    if (!validated) {
      throw new AcApGroupCreateError('invalidName')
    }
    if (db.objects.group.getAt(validated)) {
      throw new AcApGroupCreateError('nameExists')
    }
    name = validated
  }

  const description = String(options.description ?? '').slice(
    0,
    ACAP_GROUP_DESCRIPTION_MAX_LENGTH
  )
  const selectable = options.selectable !== false
  const group = new AcDbGroup(description, selectable)
  if (unnamed) group.setAnonymous()
  group.name = name
  group.database = db
  db.objects.group.setAt(name, group)
  group.append([...options.entityIds])
  return group
}

/**
 * Removes a group definition from the dictionary (entities remain).
 */
export function acapExplodeGroup(db: AcDbDatabase, group: AcDbGroup): void {
  const name = group.name
  if (!name) return
  db.objects.group.remove(name)
}

/**
 * Explodes every group in the drawing.
 */
export function acapExplodeAllGroups(db: AcDbDatabase): number {
  const names = [...db.objects.group.entries()].map(([key]) => key)
  for (const name of names) {
    db.objects.group.remove(name)
  }
  return names.length
}

/**
 * Reads `GROUPDISPLAYMODE` (0–2); defaults to `2`.
 */
export function acapGetGroupDisplayMode(database?: AcDbDatabase): number {
  const raw = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.GROUPDISPLAYMODE,
    database as AcDbDatabase
  )
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return 2
  const truncated = Math.trunc(value)
  if (truncated < 0 || truncated > 2) return 2
  return truncated
}
