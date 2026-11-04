import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbEntity
} from '@mlightcad/data-model'

import { readEntityGeometry } from './entityGeometry'
import {
  readOptionalBoolean,
  readOptionalNumber,
  readOptionalPoint,
  readOptionalProperty,
  type SnapshotPoint,
  toSnapshotEntityColor,
  toSnapshotPoint,
  toSnapshotTransparency
} from './snapshotValue'

export type { SnapshotPoint } from './snapshotValue'

/** Plain color copied from an entity. */
export interface EntityColorSnapshot {
  /** Red component (0-255). Absent when the color is ByLayer / ByBlock. */
  red?: number
  /** Green component (0-255). Absent when the color is ByLayer / ByBlock. */
  green?: number
  /** Blue component (0-255). Absent when the color is ByLayer / ByBlock. */
  blue?: number
  /** `0xRRGGBB` text, for example `0x1A2B3C`. Absent for ByLayer / ByBlock. */
  hex?: string
  /** ACI palette index (1-255). Only set for ByACI colors. */
  colorIndex?: number
  /** True when the color is an explicit RGB value. */
  isByColor: boolean
  /** True when the color comes from an ACI index. */
  isByACI: boolean
  /** True when the entity inherits its layer color. */
  isByLayer: boolean
  /** True when the entity inherits the containing block reference color. */
  isByBlock: boolean
  /** True for ACI 7, the automatic black/white foreground color. */
  isForeground: boolean
}

/** Plain transparency copied from an entity. */
export interface EntityTransparencySnapshot {
  /** `AcCmTransparencyMethod` value: 0 ByLayer, 1 ByBlock, 2 ByAlpha, 3 error. */
  method: number
  /** Alpha in 0-255, where 255 is fully opaque. */
  alpha: number
  /** AutoCAD-style transparency percentage in 0-100. ByAlpha colors only. */
  percentage?: number
  /** True when the alpha value is explicit. */
  isByAlpha: boolean
  /** True when transparency is inherited from the layer. */
  isByLayer: boolean
  /** True when transparency is inherited from the containing block. */
  isByBlock: boolean
}

/**
 * Plain description of one database entity.
 *
 * `geometry` is filled for every concrete entity type in data-model.
 * `ownerId` is the block table record that contains the entity, or the
 * block reference that owns an attribute.
 *
 * Display properties (`color`, `lineType`, `lineWeight`, and friends) describe
 * how the entity is drawn, which is often the only way to tell walls, axes,
 * dimensions, and fills apart in a real drawing.
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
  /** Stored color, before ByLayer / ByBlock resolution. */
  color?: EntityColorSnapshot
  /** Color after ByLayer / ByBlock resolution. */
  resolvedColor?: EntityColorSnapshot
  /** Linetype name. `ByLayer` and `ByBlock` appear as stored. */
  lineType?: string
  /** `AcGiLineWeight` value. Negative values mean ByLayer / ByBlock. */
  lineWeight?: number
  /** Linetype scale factor. */
  linetypeScale?: number
  /** False when the entity is hidden. */
  visibility?: boolean
  /** Entity transparency. */
  transparency?: EntityTransparencySnapshot
  /** Extrusion thickness, when the entity type has one. */
  thickness?: number
  /** Extrusion / plane normal, when the entity type has one. */
  normal?: SnapshotPoint
  /** World extents when the entity can report them. */
  extents?: { min: SnapshotPoint; max: SnapshotPoint }
  /** Type-specific geometry fields. */
  geometry?: Record<string, unknown>
}

/** Names of the display properties copied onto every snapshot. */
const COMMON_FIELD_NAMES = [
  'color',
  'resolvedColor',
  'lineType',
  'lineWeight',
  'linetypeScale',
  'visibility',
  'transparency',
  'thickness',
  'normal'
] as const

/**
 * Copies the entity display properties shared by every entity type.
 *
 * Each field is read defensively: a getter that throws, or a value that cannot
 * be represented in JSON, is omitted instead of failing the snapshot.
 *
 * @param entity - Live database entity.
 * @returns Copied display properties, possibly empty.
 */
function readCommonProperties(entity: AcDbEntity): Partial<EntitySnapshot> {
  const fields: Partial<EntitySnapshot> = {}

  const color = readOptionalProperty(entity, 'color')
  if (color && typeof color === 'object') {
    const copy = toSnapshotEntityColor(color)
    if (copy) fields.color = copy as unknown as EntityColorSnapshot
  }

  const resolvedColor = readOptionalProperty(entity, 'resolvedColor')
  if (resolvedColor && typeof resolvedColor === 'object') {
    const copy = toSnapshotEntityColor(resolvedColor)
    if (copy) fields.resolvedColor = copy as unknown as EntityColorSnapshot
  }

  const lineType = readOptionalProperty(entity, 'lineType')
  if (typeof lineType === 'string') fields.lineType = lineType

  const lineWeight = readOptionalNumber(entity, 'lineWeight')
  if (lineWeight !== undefined) fields.lineWeight = lineWeight

  const linetypeScale = readOptionalNumber(entity, 'linetypeScale')
  if (linetypeScale !== undefined) fields.linetypeScale = linetypeScale

  const visibility = readOptionalBoolean(entity, 'visibility')
  if (visibility !== undefined) fields.visibility = visibility

  const transparency = readOptionalProperty(entity, 'transparency')
  if (transparency && typeof transparency === 'object') {
    const copy = toSnapshotTransparency(transparency)
    if (copy) {
      fields.transparency = copy as unknown as EntityTransparencySnapshot
    }
  }

  const thickness = readOptionalNumber(entity, 'thickness')
  if (thickness !== undefined) fields.thickness = thickness

  const normal = readOptionalPoint(entity, 'normal')
  if (normal) fields.normal = normal

  return fields
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
    layer: entity.layer,
    ...readCommonProperties(entity)
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
 * `id`, `ownerId`, `type`, and `layer` are copied immediately. Every other
 * field is read from the live entity on first access.
 * {@link EntityFilterView.release} drops that entity so the predicate cannot
 * keep it.
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
 * @returns A view whose display properties stay unread until asked for.
 */
export function openEntityFilterView(entity: AcDbEntity): EntityFilterView {
  let source: AcDbEntity | undefined = entity
  const cache = new Map<string, unknown>()

  const readSource = (): AcDbEntity => {
    if (!source) {
      throw new Error('entity filter view expired')
    }
    return source
  }

  const readCommonField = (name: string): unknown => {
    if (cache.has(name)) return cache.get(name)
    const live = readSource()
    let value: unknown
    switch (name) {
      case 'color':
      case 'resolvedColor': {
        const color = readOptionalProperty(live, name)
        value =
          color && typeof color === 'object'
            ? toSnapshotEntityColor(color)
            : undefined
        break
      }
      case 'transparency': {
        const transparency = readOptionalProperty(live, name)
        value =
          transparency && typeof transparency === 'object'
            ? toSnapshotTransparency(transparency)
            : undefined
        break
      }
      case 'normal':
        value = readOptionalPoint(live, name)
        break
      case 'visibility':
        value = readOptionalBoolean(live, name)
        break
      case 'lineType': {
        const lineType = readOptionalProperty(live, name)
        value = typeof lineType === 'string' ? lineType : undefined
        break
      }
      default:
        value = readOptionalNumber(live, name)
        break
    }
    cache.set(name, value)
    return value
  }

  const readExtents = (): EntitySnapshot['extents'] => {
    if (cache.has('extents')) {
      return cache.get('extents') as EntitySnapshot['extents']
    }
    const value = readSnapshotExtents(readSource())
    cache.set('extents', value)
    return value
  }

  const readGeometryValue = (): Record<string, unknown> | undefined => {
    if (cache.has('geometry')) {
      return cache.get('geometry') as Record<string, unknown> | undefined
    }
    const value = readGeometry(readSource())
    cache.set('geometry', value)
    return value
  }

  const id = entity.objectId
  const ownerId = entity.ownerId
  const type = entity.type
  const layer = entity.layer
  const value = {} as EntitySnapshot
  Object.defineProperties(value, {
    id: { enumerable: true, value: id },
    ownerId: { enumerable: true, value: ownerId },
    type: { enumerable: true, value: type },
    layer: { enumerable: true, value: layer },
    extents: {
      enumerable: true,
      get() {
        return readExtents()
      }
    },
    geometry: {
      enumerable: true,
      get() {
        return readGeometryValue()
      }
    }
  })
  for (const name of COMMON_FIELD_NAMES) {
    Object.defineProperty(value, name, {
      enumerable: true,
      get() {
        return readCommonField(name)
      }
    })
  }

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
