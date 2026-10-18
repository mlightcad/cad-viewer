import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbEntity
} from '@mlightcad/data-model'

import { readEntityGeometry } from './entityGeometry'
import { type SnapshotPoint, toSnapshotPoint } from './snapshotValue'

export type { SnapshotPoint } from './snapshotValue'

/**
 * Plain description of one database entity.
 *
 * `geometry` is filled for every concrete entity type in data-model.
 * `ownerId` is the block table record that contains the entity, or the
 * block reference that owns an attribute.
 */
export interface EntitySnapshot {
  /** Entity object id. */
  id: string
  /** Object id of the block table record or block reference that owns this entity. */
  ownerId: string
  /** Runtime type without the `AcDb` prefix, for example `Circle`. */
  type: string
  /** Layer name. */
  layer: string
  /** World extents when the entity can report them. */
  extents?: { min: SnapshotPoint; max: SnapshotPoint }
  /** Type-specific geometry fields. */
  geometry?: Record<string, unknown>
}

/**
 * Copies one entity into a JSON snapshot.
 *
 * @param entity - Live database entity. The snapshot does not retain it.
 * @returns A plain object safe to return from a script.
 */
export function toEntitySnapshot(entity: AcDbEntity): EntitySnapshot {
  const snapshot: EntitySnapshot = {
    id: entity.objectId,
    ownerId: entity.ownerId,
    type: entity.type,
    layer: entity.layer
  }
  const extents = readSnapshotExtents(entity)
  if (extents) snapshot.extents = extents
  const geometry = readGeometry(entity)
  if (geometry) snapshot.geometry = geometry
  return snapshot
}

/**
 * Lists every entity stored in the database.
 *
 * The list covers model space, every paper space, and every block definition.
 * Attributes attached to a block reference are included after that reference.
 * Their `ownerId` is the reference. Other entities use the owning block id.
 *
 * @param database - Open drawing database.
 * @returns Entities in block-table order.
 */
export function iterateDatabaseEntities(database: AcDbDatabase): AcDbEntity[] {
  const entities: AcDbEntity[] = []
  const seen = new Set<string>()
  const push = (entity: AcDbEntity) => {
    const id = entity.objectId
    if (!id || seen.has(id)) return
    seen.add(id)
    entities.push(entity)
  }

  for (const block of database.tables.blockTable.newIterator(true)) {
    for (const entity of block.newIterator()) {
      push(entity)
      if (!(entity instanceof AcDbBlockReference)) continue
      try {
        for (const attribute of entity.attributeIterator()) push(attribute)
      } catch {
        // A reference without attributes throws nothing; ignore a broken iterator.
      }
    }
  }
  return entities
}

/**
 * View passed into a `where` predicate.
 *
 * `id`, `ownerId`, `type`, and `layer` are copied immediately. `extents` and `geometry`
 * are read from the live entity on first access. {@link EntityFilterView.release}
 * drops that entity so the predicate cannot keep it.
 */
export interface EntityFilterView {
  /** Snapshot-shaped object the predicate reads. */
  readonly value: EntitySnapshot
  /** Drops the live entity. Cached plain fields stay readable. */
  release(): void
}

/**
 * Opens a filter view for one entity.
 *
 * Call {@link EntityFilterView.release} after the predicate returns, then
 * {@link toEntitySnapshot} only when the entity matched.
 *
 * @param entity - Live database entity. The view does not retain it after release.
 * @returns A view whose geometry stays unread until the predicate asks for it.
 */
export function openEntityFilterView(entity: AcDbEntity): EntityFilterView {
  let source: AcDbEntity | undefined = entity
  let extents: EntitySnapshot['extents']
  let extentsRead = false
  let geometry: Record<string, unknown> | undefined
  let geometryRead = false

  const readSource = (): AcDbEntity => {
    if (!source) {
      throw new Error('entity filter view expired')
    }
    return source
  }

  const id = entity.objectId
  const ownerId = entity.ownerId
  const type = entity.type
  const layer = entity.layer
  const value = Object.create(null) as EntitySnapshot
  Object.defineProperties(value, {
    id: { enumerable: true, value: id },
    ownerId: { enumerable: true, value: ownerId },
    type: { enumerable: true, value: type },
    layer: { enumerable: true, value: layer },
    extents: {
      enumerable: true,
      get() {
        if (!extentsRead) {
          extentsRead = true
          extents = readSnapshotExtents(readSource())
        }
        return extents
      }
    },
    geometry: {
      enumerable: true,
      get() {
        if (!geometryRead) {
          geometryRead = true
          geometry = readGeometry(readSource())
        }
        return geometry
      }
    }
  })

  return {
    value,
    release() {
      source = undefined
    }
  }
}

function readSnapshotExtents(
  entity: AcDbEntity
): EntitySnapshot['extents'] | undefined {
  try {
    const extents = entity.geometricExtents
    if (extents && !extents.isEmpty()) {
      return {
        min: toSnapshotPoint(extents.min),
        max: toSnapshotPoint(extents.max)
      }
    }
  } catch {
    // Some entities cannot report extents until they are fully drawn.
  }
  return undefined
}

function readGeometry(entity: AcDbEntity): Record<string, unknown> | undefined {
  try {
    return readEntityGeometry(entity)
  } catch {
    return undefined
  }
}
