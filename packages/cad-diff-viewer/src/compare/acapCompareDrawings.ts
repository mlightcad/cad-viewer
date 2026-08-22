import type { AcDbDatabase, AcDbEntity } from '@mlightcad/data-model'

/** Change classification for one compared entity. */
export type AcApDiffChangeKind = 'added' | 'deleted' | 'modified' | 'unchanged'

/** Which drawing an entity hit belongs to. */
export type AcApDiffHitSide = 'left' | 'right'

/** One entity contribution to a compare result. */
export interface AcApDiffEntityHit {
  /** Drawing this entity was read from. */
  side: AcApDiffHitSide
  /** DWG/DXF handle used as the object id. */
  objectId: string
  /** DXF type name (e.g. `LINE`, `CIRCLE`). */
  dxfType: string
  /** Layer name at compare time. */
  layer: string
  /** Change classification for this hit. */
  kind: AcApDiffChangeKind
  /** Paired entity objectId on the opposite side (modified / unchanged). */
  pairedId?: string
  /** Axis-aligned extents in WCS, when available. */
  extents?: {
    /** Minimum X in WCS. */
    minX: number
    /** Minimum Y in WCS. */
    minY: number
    /** Maximum X in WCS. */
    maxX: number
    /** Maximum Y in WCS. */
    maxY: number
  }
}

/** Full compare output for two drawings. */
export interface AcApDiffCompareResult {
  /** Entities present only in the right (new) drawing. */
  added: AcApDiffEntityHit[]
  /** Entities present only in the left (old) drawing. */
  deleted: AcApDiffEntityHit[]
  /** Matched pairs whose geometry or properties differ (both sides). */
  modified: AcApDiffEntityHit[]
  /** Matched pairs with identical geometry and properties (optional). */
  unchanged: AcApDiffEntityHit[]
  /** Flat navigation list: deleted → modified → added. */
  navigation: AcApDiffEntityHit[]
}

/** Options for {@link acapCompareDrawings}. */
export interface AcApDiffCompareOptions {
  /** Absolute distance tolerance. Defaults to a fraction of drawing size. */
  tolerance?: number
  /** Include unchanged pairs in {@link AcApDiffCompareResult.unchanged}. Default false. */
  includeUnchanged?: boolean
}

/** Cached geometry/property snapshot for one model-space entity. */
interface EntitySnapshot {
  /** Source entity used to build this snapshot. */
  entity: AcDbEntity
  /** DWG/DXF handle. */
  objectId: string
  /** DXF type name. */
  dxfType: string
  /** Layer name. */
  layer: string
  /** Quantized geometry fingerprint used for matching. */
  fingerprint: string
  /** Layer/color/linetype/lineweight/visibility key. */
  propKey: string
  /** Axis-aligned extents, when the entity exposes them. */
  extents?: AcApDiffEntityHit['extents']
}

/**
 * Rounds `value` onto a `tol` grid so nearby coordinates compare equal.
 *
 * @param value - Coordinate or angle to quantize.
 * @param tol - Absolute grid size.
 */
function quantize(value: number, tol: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value / tol) * tol
}

/**
 * Reads axis-aligned geometric extents from an entity when available.
 *
 * @param entity - Entity to inspect.
 */
function readExtents(
  entity: AcDbEntity
): AcApDiffEntityHit['extents'] | undefined {
  try {
    const box = (
      entity as AcDbEntity & {
        geometricExtents?: {
          min?: { x: number; y: number }
          max?: { x: number; y: number }
        }
      }
    ).geometricExtents
    if (!box?.min || !box?.max) return undefined
    return {
      minX: box.min.x,
      minY: box.min.y,
      maxX: box.max.x,
      maxY: box.max.y
    }
  } catch {
    return undefined
  }
}

/**
 * Serializes a 3D point onto the quantization grid.
 *
 * @param p - Point-like value; missing axes default to `0`.
 * @param tol - Absolute grid size.
 */
function pointKey(
  p: { x?: number; y?: number; z?: number } | undefined,
  tol: number
): string {
  if (!p) return ''
  return `${quantize(p.x ?? 0, tol)},${quantize(p.y ?? 0, tol)},${quantize(p.z ?? 0, tol)}`
}

/**
 * Builds a geometry fingerprint from common entity properties.
 *
 * @param entity - Entity to fingerprint.
 * @param tol - Absolute distance/angle tolerance.
 */
function entityFingerprint(entity: AcDbEntity, tol: number): string {
  const e = entity as AcDbEntity & Record<string, unknown>
  const parts: string[] = [String(e.dxfTypeName ?? e.type ?? '')]

  if (e.startPoint && e.endPoint) {
    const a = pointKey(e.startPoint as { x: number; y: number }, tol)
    const b = pointKey(e.endPoint as { x: number; y: number }, tol)
    parts.push(a < b ? `${a}|${b}` : `${b}|${a}`)
  }
  if (e.center) {
    parts.push(`c:${pointKey(e.center as { x: number; y: number }, tol)}`)
  }
  if (typeof e.radius === 'number') {
    parts.push(`r:${quantize(e.radius, tol)}`)
  }
  if (typeof e.startAngle === 'number' && typeof e.endAngle === 'number') {
    parts.push(`a:${quantize(e.startAngle, tol)}:${quantize(e.endAngle, tol)}`)
  }
  if (e.position) {
    parts.push(`p:${pointKey(e.position as { x: number; y: number }, tol)}`)
  }
  if (e.location) {
    parts.push(`l:${pointKey(e.location as { x: number; y: number }, tol)}`)
  }
  if (typeof e.rotation === 'number') {
    parts.push(`rot:${quantize(e.rotation, tol)}`)
  }
  if (typeof e.height === 'number') {
    parts.push(`h:${quantize(e.height, tol)}`)
  }
  if (typeof e.blockName === 'string') {
    parts.push(`blk:${e.blockName}`)
  }
  if (e.scaleFactors) {
    const s = e.scaleFactors as { x?: number; y?: number; z?: number }
    parts.push(
      `s:${quantize(s.x ?? 1, tol)},${quantize(s.y ?? 1, tol)},${quantize(s.z ?? 1, tol)}`
    )
  }
  if (typeof e.textString === 'string') {
    parts.push(`t:${e.textString}`)
  }
  if (typeof e.contents === 'string') {
    parts.push(`m:${e.contents}`)
  }

  const extents = readExtents(entity)
  if (extents && parts.length <= 1) {
    parts.push(
      `ext:${quantize(extents.minX, tol)},${quantize(extents.minY, tol)},${quantize(extents.maxX, tol)},${quantize(extents.maxY, tol)}`
    )
  }

  return parts.join(';')
}

/**
 * Builds a property key from layer, color, linetype, lineweight, and visibility.
 *
 * @param entity - Entity to inspect.
 */
function entityPropKey(entity: AcDbEntity): string {
  const e = entity as AcDbEntity & {
    color?: { toString?: () => string }
    lineType?: string
    lineWeight?: number
    visibility?: boolean
  }
  return [
    e.layer ?? '',
    e.color?.toString?.() ?? '',
    e.lineType ?? '',
    String(e.lineWeight ?? ''),
    String(e.visibility !== false)
  ].join('|')
}

/**
 * Collects top-level model-space entities from `db`.
 *
 * @param db - Drawing database.
 * @param tol - Tolerance used for fingerprints.
 */
function collectModelSpace(db: AcDbDatabase, tol: number): EntitySnapshot[] {
  const out: EntitySnapshot[] = []
  const modelSpace = db.tables.blockTable.modelSpace
  for (const entity of modelSpace.newIterator()) {
    const objectId = String(entity.objectId ?? '')
    if (!objectId) continue
    out.push({
      entity,
      objectId,
      dxfType: String(entity.dxfTypeName ?? entity.type ?? 'UNKNOWN'),
      layer: String(entity.layer ?? '0'),
      fingerprint: entityFingerprint(entity, tol),
      propKey: entityPropKey(entity),
      extents: readExtents(entity)
    })
  }
  return out
}

/**
 * Chooses a compare tolerance from extents, or returns `explicit` when positive.
 *
 * @param left - Left-drawing snapshots (rough pass).
 * @param right - Right-drawing snapshots (rough pass).
 * @param explicit - Host-provided tolerance.
 */
function estimateTolerance(
  left: EntitySnapshot[],
  right: EntitySnapshot[],
  explicit?: number
): number {
  if (explicit != null && explicit > 0) return explicit
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const snap of [...left, ...right]) {
    const e = snap.extents
    if (!e) continue
    minX = Math.min(minX, e.minX)
    minY = Math.min(minY, e.minY)
    maxX = Math.max(maxX, e.maxX)
    maxY = Math.max(maxY, e.maxY)
  }
  if (!Number.isFinite(minX)) return 1e-4
  const size = Math.max(maxX - minX, maxY - minY, 1)
  return Math.max(size * 1e-6, 1e-6)
}

/**
 * Converts a snapshot into a public hit record.
 *
 * @param snap - Source snapshot.
 * @param side - Drawing the snapshot came from.
 * @param kind - Change classification.
 * @param pairedId - Opposite-side object id for matched pairs.
 */
function toHit(
  snap: EntitySnapshot,
  side: AcApDiffHitSide,
  kind: AcApDiffChangeKind,
  pairedId?: string
): AcApDiffEntityHit {
  return {
    side,
    objectId: snap.objectId,
    dxfType: snap.dxfType,
    layer: snap.layer,
    kind,
    pairedId,
    extents: snap.extents
  }
}

/**
 * Compares two drawing databases (model space, top-level entities).
 *
 * Matching order:
 * 1. Same handle (`objectId`) **and** the same DXF type. Handles collide
 *    across unrelated files, so a LINE and a CIRCLE that share a handle
 *    are not treated as one entity.
 * 2. Same `dxfType` + layer + geometric fingerprint
 *
 * Left is treated as the old drawing; right as the new drawing.
 *
 * @param leftDb - Old drawing (deletions are reported from this side).
 * @param rightDb - New drawing (additions are reported from this side).
 * @param options - Matching tolerance and whether to keep unchanged pairs.
 * @returns Classified hits plus a flat {@link AcApDiffCompareResult.navigation} list.
 */
export function acapCompareDrawings(
  leftDb: AcDbDatabase,
  rightDb: AcDbDatabase,
  options: AcApDiffCompareOptions = {}
): AcApDiffCompareResult {
  const roughLeft = collectModelSpace(leftDb, 1e-4)
  const roughRight = collectModelSpace(rightDb, 1e-4)
  const tol = estimateTolerance(roughLeft, roughRight, options.tolerance)
  const left = collectModelSpace(leftDb, tol)
  const right = collectModelSpace(rightDb, tol)

  const rightById = new Map(right.map(s => [s.objectId, s]))
  const usedRight = new Set<string>()

  const added: AcApDiffEntityHit[] = []
  const deleted: AcApDiffEntityHit[] = []
  const modified: AcApDiffEntityHit[] = []
  const unchanged: AcApDiffEntityHit[] = []

  const leftUnmatched: EntitySnapshot[] = []

  for (const l of left) {
    const r = rightById.get(l.objectId)
    if (r && l.dxfType === r.dxfType) {
      usedRight.add(r.objectId)
      const sameGeom = l.fingerprint === r.fingerprint
      const sameProp = l.propKey === r.propKey
      if (sameGeom && sameProp) {
        if (options.includeUnchanged) {
          unchanged.push(toHit(l, 'left', 'unchanged', r.objectId))
          unchanged.push(toHit(r, 'right', 'unchanged', l.objectId))
        }
      } else {
        modified.push(toHit(l, 'left', 'modified', r.objectId))
        modified.push(toHit(r, 'right', 'modified', l.objectId))
      }
    } else {
      leftUnmatched.push(l)
    }
  }

  const rightUnmatched = right.filter(s => !usedRight.has(s.objectId))

  // Fingerprint matching within type+layer buckets
  /** Groups unmatched right entities by DXF type and layer. */
  const bucketKey = (s: EntitySnapshot) => `${s.dxfType}\0${s.layer}`
  const rightBuckets = new Map<string, EntitySnapshot[]>()
  for (const r of rightUnmatched) {
    const key = bucketKey(r)
    const list = rightBuckets.get(key)
    if (list) list.push(r)
    else rightBuckets.set(key, [r])
  }

  for (const l of leftUnmatched) {
    const bucket = rightBuckets.get(bucketKey(l))
    let matchIndex = -1
    if (bucket) {
      matchIndex = bucket.findIndex(r => r.fingerprint === l.fingerprint)
    }
    if (matchIndex >= 0 && bucket) {
      const r = bucket.splice(matchIndex, 1)[0]!
      usedRight.add(r.objectId)
      const sameProp = l.propKey === r.propKey
      if (sameProp) {
        if (options.includeUnchanged) {
          unchanged.push(toHit(l, 'left', 'unchanged', r.objectId))
          unchanged.push(toHit(r, 'right', 'unchanged', l.objectId))
        }
      } else {
        modified.push(toHit(l, 'left', 'modified', r.objectId))
        modified.push(toHit(r, 'right', 'modified', l.objectId))
      }
    } else {
      deleted.push(toHit(l, 'left', 'deleted'))
    }
  }

  for (const r of rightUnmatched) {
    if (!usedRight.has(r.objectId)) {
      added.push(toHit(r, 'right', 'added'))
    }
  }

  // Navigation: one entry per logical change (prefer left for modified)
  const navigation: AcApDiffEntityHit[] = [
    ...deleted,
    ...modified.filter(h => h.side === 'left'),
    ...added
  ]

  return { added, deleted, modified, unchanged, navigation }
}
