import { type AcDbDatabase, type AcDbEntity } from '@mlightcad/data-model'

import {
  acapBuildCompareChangeSets,
  type AcApDiffChangeSet
} from './acapCompareChangeSets'
import {
  ACAP_COMPAREHATCH_DEFAULT,
  ACAP_COMPAREPROPS_COLOR,
  ACAP_COMPAREPROPS_DEFAULT,
  ACAP_COMPAREPROPS_LAYER,
  ACAP_COMPAREPROPS_LINETYPE,
  ACAP_COMPAREPROPS_LINETYPESCALE,
  ACAP_COMPAREPROPS_LINEWEIGHT,
  ACAP_COMPAREPROPS_THICKNESS,
  ACAP_COMPAREPROPS_TRANSPARENCY,
  ACAP_COMPARERCMARGIN_DEFAULT,
  ACAP_COMPARETEXT_DEFAULT,
  ACAP_COMPARETOLERANCE_DEFAULT,
  acapToleranceFromCompareTolerance
} from './acapCompareSysVars'

/** Change classification for one compared entity. */
export type AcApDiffChangeKind = 'added' | 'deleted' | 'modified' | 'unchanged'

/** Which drawing an entity hit belongs to. */
export type AcApDiffHitSide = 'left' | 'right'

/** One changed property on a modified entity pair. */
export interface AcApDiffFieldChange {
  /** Stable field id (e.g. `layer`, `endPoint`). */
  field: string
  /** Formatted value from the old (left) drawing. Empty when the field is absent. */
  oldValue: string
  /** Formatted value from the new (right) drawing. Empty when the field is absent. */
  newValue: string
}

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
  /** Field-level old/new values; set on modified hits. */
  changes?: AcApDiffFieldChange[]
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
  /**
   * Nearby differences grouped for revision clouds
   * ({@link AcApDiffCompareOptions.compareRcMargin}).
   */
  changeSets: AcApDiffChangeSet[]
}

/** Options for {@link acapCompareDrawings}. */
export interface AcApDiffCompareOptions {
  /**
   * Absolute distance tolerance. When omitted, derived from
   * {@link compareTolerance} (AutoCAD COMPARETOLERANCE decimal places).
   */
  tolerance?: number
  /** Include unchanged pairs in {@link AcApDiffCompareResult.unchanged}. Default false. */
  includeUnchanged?: boolean
  /**
   * COMPAREPROPS bitcode. `0` (AutoCAD default) ignores object property
   * changes; only geometry differences count as modified.
   */
  compareProps?: number
  /** COMPAREHATCH. `0` (AutoCAD default) excludes hatch objects. */
  compareHatch?: number
  /** COMPARETEXT. `1` (AutoCAD default) includes text objects. */
  compareText?: number
  /**
   * COMPARETOLERANCE decimal places (0–14). AutoCAD default is `6`.
   * Used when {@link tolerance} is omitted.
   */
  compareTolerance?: number
  /**
   * COMPARERCMARGIN (1–25). AutoCAD default is `5`. Scales change-set
   * clustering and revision-cloud padding.
   */
  compareRcMargin?: number
}

/** COMPAREPROPS field id → bit. Fields not listed are geometry (always compared). */
const COMPAREPROPS_FIELD_BITS: Record<string, number> = {
  color: ACAP_COMPAREPROPS_COLOR,
  layer: ACAP_COMPAREPROPS_LAYER,
  lineType: ACAP_COMPAREPROPS_LINETYPE,
  lineTypeScale: ACAP_COMPAREPROPS_LINETYPESCALE,
  lineWeight: ACAP_COMPAREPROPS_LINEWEIGHT,
  transparency: ACAP_COMPAREPROPS_TRANSPARENCY,
  thickness: ACAP_COMPAREPROPS_THICKNESS
}

/** DXF types treated as hatch objects for COMPAREHATCH. */
const HATCH_DXF_TYPES = new Set(['HATCH'])

/** DXF types treated as text objects for COMPARETEXT. */
const TEXT_DXF_TYPES = new Set(['TEXT', 'MTEXT', 'ATTRIB', 'ATTDEF'])

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
  /** Property key gated by COMPAREPROPS. */
  propKey: string
  /** Axis-aligned extents, when the entity exposes them. */
  extents?: AcApDiffEntityHit['extents']
  /** Comparable fields used to explain modified hits. */
  fields: SnapField[]
}

/** One comparable entity field used to explain a modified hit. */
interface SnapField {
  /** Stable field id. */
  id: string
  /** Human-readable value (locale-agnostic). */
  display: string
  /** Quantized value used for equality. */
  key: string
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

/** Trims float noise for display without changing compare keys. */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  return String(Number(value.toFixed(6)))
}

/** Formats a point, omitting Z when it is effectively zero. */
function formatPoint(p: { x?: number; y?: number; z?: number }): string {
  const x = formatNumber(p.x ?? 0)
  const y = formatNumber(p.y ?? 0)
  const z = p.z ?? 0
  if (Math.abs(z) < 1e-9) return `(${x}, ${y})`
  return `(${x}, ${y}, ${formatNumber(z)})`
}

/** Formats an angle stored in radians as degrees. */
function formatAngle(rad: number): string {
  return `${formatNumber((rad * 180) / Math.PI)}°`
}

/**
 * Collects property and geometry fields used to explain a modified pair.
 *
 * Geometry fields match {@link entityFingerprint}; extents are included only
 * as a fallback when no other geometry is present.
 *
 * @param entity - Entity to inspect.
 * @param tol - Absolute grid size used for equality keys.
 */
function collectEntityFields(entity: AcDbEntity, tol: number): SnapField[] {
  const e = entity as AcDbEntity &
    Record<string, unknown> & {
      color?: { toString?: () => string }
      lineType?: string
      lineWeight?: number
      visibility?: boolean
    }
  const fields: SnapField[] = []
  const add = (id: string, display: string, key: string) => {
    fields.push({ id, display, key })
  }

  add('layer', String(e.layer ?? ''), String(e.layer ?? ''))
  const color = e.color?.toString?.() ?? ''
  add('color', color, color)
  const lineType = e.lineType ?? ''
  add('lineType', lineType, lineType)
  add(
    'lineWeight',
    e.lineWeight != null ? String(e.lineWeight) : '',
    String(e.lineWeight ?? '')
  )
  if (typeof e.linetypeScale === 'number') {
    add(
      'lineTypeScale',
      formatNumber(e.linetypeScale),
      String(quantize(e.linetypeScale, tol))
    )
  }
  const transparency = (
    e.transparency as { toString?: () => string } | undefined
  )?.toString?.()
  if (transparency != null && transparency !== '') {
    add('transparency', transparency, transparency)
  }
  if (typeof e.thickness === 'number') {
    add(
      'thickness',
      formatNumber(e.thickness),
      String(quantize(e.thickness, tol))
    )
  }

  const geomCount = fields.length
  if (e.startPoint && e.endPoint) {
    const sp = e.startPoint as { x?: number; y?: number; z?: number }
    const ep = e.endPoint as { x?: number; y?: number; z?: number }
    add('startPoint', formatPoint(sp), pointKey(sp, tol))
    add('endPoint', formatPoint(ep), pointKey(ep, tol))
  }
  if (e.center) {
    const c = e.center as { x?: number; y?: number; z?: number }
    add('center', formatPoint(c), pointKey(c, tol))
  }
  if (typeof e.radius === 'number') {
    add('radius', formatNumber(e.radius), String(quantize(e.radius, tol)))
  }
  if (typeof e.startAngle === 'number' && typeof e.endAngle === 'number') {
    add(
      'startAngle',
      formatAngle(e.startAngle),
      String(quantize(e.startAngle, tol))
    )
    add('endAngle', formatAngle(e.endAngle), String(quantize(e.endAngle, tol)))
  }
  if (e.position) {
    const p = e.position as { x?: number; y?: number; z?: number }
    add('position', formatPoint(p), pointKey(p, tol))
  }
  if (e.location) {
    const p = e.location as { x?: number; y?: number; z?: number }
    add('location', formatPoint(p), pointKey(p, tol))
  }
  if (typeof e.rotation === 'number') {
    add('rotation', formatAngle(e.rotation), String(quantize(e.rotation, tol)))
  }
  if (typeof e.height === 'number') {
    add('height', formatNumber(e.height), String(quantize(e.height, tol)))
  }
  if (typeof e.blockName === 'string') {
    add('blockName', e.blockName, e.blockName)
  }
  if (e.scaleFactors) {
    const s = e.scaleFactors as { x?: number; y?: number; z?: number }
    add(
      'scale',
      `${formatNumber(s.x ?? 1)}, ${formatNumber(s.y ?? 1)}, ${formatNumber(s.z ?? 1)}`,
      `${quantize(s.x ?? 1, tol)},${quantize(s.y ?? 1, tol)},${quantize(s.z ?? 1, tol)}`
    )
  }
  if (typeof e.textString === 'string') {
    add('text', e.textString, e.textString)
  }
  if (typeof e.contents === 'string') {
    add('mtext', e.contents, e.contents)
  }
  const extents = readExtents(entity)
  if (extents && fields.length === geomCount) {
    add(
      'extents',
      `${formatPoint({ x: extents.minX, y: extents.minY })} – ${formatPoint({ x: extents.maxX, y: extents.maxY })}`,
      `${quantize(extents.minX, tol)},${quantize(extents.minY, tol)},${quantize(extents.maxX, tol)},${quantize(extents.maxY, tol)}`
    )
  }
  add('objectId', String(entity.objectId ?? ''), String(entity.objectId ?? ''))

  return fields
}

/**
 * Returns field-level old/new pairs for a modified snapshot pair.
 *
 * Line endpoints that only differ by direction are treated as equal, matching
 * {@link entityFingerprint}.
 *
 * @param left - Old-drawing snapshot.
 * @param right - New-drawing snapshot.
 */
function diffEntityFields(
  left: EntitySnapshot,
  right: EntitySnapshot,
  compareProps: number
): AcApDiffFieldChange[] {
  const leftMap = new Map(left.fields.map(f => [f.id, f]))
  const rightMap = new Map(right.fields.map(f => [f.id, f]))
  const ids: string[] = []
  const seen = new Set<string>()
  for (const field of [...left.fields, ...right.fields]) {
    if (seen.has(field.id)) continue
    seen.add(field.id)
    ids.push(field.id)
  }

  const lStart = leftMap.get('startPoint')
  const lEnd = leftMap.get('endPoint')
  const rStart = rightMap.get('startPoint')
  const rEnd = rightMap.get('endPoint')
  const reversedSame =
    lStart != null &&
    lEnd != null &&
    rStart != null &&
    rEnd != null &&
    [lStart.key, lEnd.key].sort().join('|') ===
      [rStart.key, rEnd.key].sort().join('|')

  const changes: AcApDiffFieldChange[] = []
  for (const id of ids) {
    if (reversedSame && (id === 'startPoint' || id === 'endPoint')) continue
    const propBit = COMPAREPROPS_FIELD_BITS[id]
    if (propBit != null && (compareProps & propBit) === 0) continue
    const l = leftMap.get(id)
    const r = rightMap.get(id)
    if ((l?.key ?? '') === (r?.key ?? '')) continue
    changes.push({
      field: id,
      oldValue: l?.display ?? '',
      newValue: r?.display ?? ''
    })
  }
  if (changes.length === 0 && left.fingerprint !== right.fingerprint) {
    changes.push({ field: 'geometry', oldValue: '', newValue: '' })
  }
  return changes
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
 * Builds a property key from the COMPAREPROPS bits that are enabled.
 *
 * When `compareProps` is `0`, the key is empty so property-only changes
 * do not mark an entity as modified (AutoCAD default).
 *
 * @param entity - Entity to inspect.
 * @param compareProps - COMPAREPROPS bitcode.
 */
function entityPropKey(entity: AcDbEntity, compareProps: number): string {
  if (compareProps === 0) return ''
  const e = entity as AcDbEntity & {
    color?: { toString?: () => string }
    lineType?: string
    lineWeight?: number
    linetypeScale?: number
    transparency?: { toString?: () => string }
    thickness?: number
  }
  const parts: string[] = []
  if (compareProps & ACAP_COMPAREPROPS_COLOR) {
    parts.push(e.color?.toString?.() ?? '')
  }
  if (compareProps & ACAP_COMPAREPROPS_LAYER) {
    parts.push(String(e.layer ?? ''))
  }
  if (compareProps & ACAP_COMPAREPROPS_LINETYPE) {
    parts.push(e.lineType ?? '')
  }
  if (compareProps & ACAP_COMPAREPROPS_LINETYPESCALE) {
    parts.push(String(e.linetypeScale ?? ''))
  }
  if (compareProps & ACAP_COMPAREPROPS_LINEWEIGHT) {
    parts.push(String(e.lineWeight ?? ''))
  }
  if (compareProps & ACAP_COMPAREPROPS_TRANSPARENCY) {
    parts.push(e.transparency?.toString?.() ?? '')
  }
  if (compareProps & ACAP_COMPAREPROPS_THICKNESS) {
    parts.push(String(e.thickness ?? ''))
  }
  return parts.join('|')
}

/** True when `dxfType` is a hatch object excluded by COMPAREHATCH=0. */
function isHatchDxfType(dxfType: string): boolean {
  return HATCH_DXF_TYPES.has(dxfType.toUpperCase())
}

/** True when `dxfType` is a text object excluded by COMPARETEXT=0. */
function isTextDxfType(dxfType: string): boolean {
  return TEXT_DXF_TYPES.has(dxfType.toUpperCase())
}

/**
 * Collects top-level model-space entities from `db`.
 *
 * Hatch and text objects are skipped according to COMPAREHATCH / COMPARETEXT.
 *
 * @param db - Drawing database.
 * @param tol - Tolerance used for fingerprints.
 * @param compareProps - COMPAREPROPS bitcode for the property key.
 * @param includeHatch - When false, hatch objects are omitted.
 * @param includeText - When false, text objects are omitted.
 */
function collectModelSpace(
  db: AcDbDatabase,
  tol: number,
  compareProps: number,
  includeHatch: boolean,
  includeText: boolean
): EntitySnapshot[] {
  const out: EntitySnapshot[] = []
  const modelSpace = db.tables.blockTable.modelSpace
  for (const entity of modelSpace.newIterator()) {
    const objectId = String(entity.objectId ?? '')
    if (!objectId) continue
    const dxfType = String(entity.dxfTypeName ?? entity.type ?? 'UNKNOWN')
    if (!includeHatch && isHatchDxfType(dxfType)) continue
    if (!includeText && isTextDxfType(dxfType)) continue
    out.push({
      entity,
      objectId,
      dxfType,
      layer: String(entity.layer ?? '0'),
      fingerprint: entityFingerprint(entity, tol),
      propKey: entityPropKey(entity, compareProps),
      extents: readExtents(entity),
      fields: collectEntityFields(entity, tol)
    })
  }
  return out
}

/**
 * Characteristic drawing size from snapshot extents, used to scale
 * COMPARERCMARGIN clustering.
 *
 * @param left - Left-drawing snapshots.
 * @param right - Right-drawing snapshots.
 */
function drawingSizeFromSnapshots(
  left: EntitySnapshot[],
  right: EntitySnapshot[]
): number {
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
  if (!Number.isFinite(minX)) return 1
  return Math.max(maxX - minX, maxY - minY, 1)
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
  pairedId?: string,
  changes?: AcApDiffFieldChange[]
): AcApDiffEntityHit {
  return {
    side,
    objectId: snap.objectId,
    dxfType: snap.dxfType,
    layer: snap.layer,
    kind,
    pairedId,
    extents: snap.extents,
    changes
  }
}

/** Pushes both sides of a modified pair, sharing the same field-level diff. */
function pushModified(
  modified: AcApDiffEntityHit[],
  left: EntitySnapshot,
  right: EntitySnapshot,
  compareProps: number
) {
  const changes = diffEntityFields(left, right, compareProps)
  modified.push(toHit(left, 'left', 'modified', right.objectId, changes))
  modified.push(toHit(right, 'right', 'modified', left.objectId, changes))
}

/**
 * Compares two drawing databases (model space, top-level entities).
 *
 * Matching order:
 * 1. Same handle (`objectId`) **and** the same DXF type. Handles collide
 *    across unrelated files, so a LINE and a CIRCLE that share a handle
 *    are not treated as one entity.
 * 2. Same `dxfType` (+ layer when COMPAREPROPS includes Layer) and the
 *    same geometric fingerprint
 *
 * Classification follows AutoCAD COMPARE:
 * - COMPAREPROPS `0` ignores object property changes (layer table color
 *   changes never count; only the entity's stored Color/Layer/… bits do).
 * - COMPAREHATCH `0` omits hatch objects.
 * - COMPARETEXT `0` omits text objects.
 * - COMPARETOLERANCE is decimal-place precision (`6` → `1e-6`).
 *
 * Left is treated as the old drawing; right as the new drawing.
 *
 * @param leftDb - Old drawing (deletions are reported from this side).
 * @param rightDb - New drawing (additions are reported from this side).
 * @param options - COMPARE sysvars, matching tolerance, unchanged pairs.
 * @returns Classified hits, navigation list, and revision-cloud change sets.
 */
export function acapCompareDrawings(
  leftDb: AcDbDatabase,
  rightDb: AcDbDatabase,
  options: AcApDiffCompareOptions = {}
): AcApDiffCompareResult {
  const compareProps = options.compareProps ?? ACAP_COMPAREPROPS_DEFAULT
  const includeHatch =
    (options.compareHatch ?? ACAP_COMPAREHATCH_DEFAULT) !== 0
  const includeText = (options.compareText ?? ACAP_COMPARETEXT_DEFAULT) !== 0
  const compareTolerance =
    options.compareTolerance ?? ACAP_COMPARETOLERANCE_DEFAULT
  const compareRcMargin =
    options.compareRcMargin ?? ACAP_COMPARERCMARGIN_DEFAULT
  const tol =
    options.tolerance != null && options.tolerance > 0
      ? options.tolerance
      : acapToleranceFromCompareTolerance(compareTolerance)

  const collect = (db: AcDbDatabase) =>
    collectModelSpace(db, tol, compareProps, includeHatch, includeText)
  const left = collect(leftDb)
  const right = collect(rightDb)

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
        pushModified(modified, l, r, compareProps)
      }
    } else {
      leftUnmatched.push(l)
    }
  }

  const rightUnmatched = right.filter(s => !usedRight.has(s.objectId))

  // Fingerprint matching: type (+ layer when COMPAREPROPS includes Layer)
  const matchByLayer = (compareProps & ACAP_COMPAREPROPS_LAYER) !== 0
  const bucketKey = (s: EntitySnapshot) =>
    matchByLayer ? `${s.dxfType}\0${s.layer}` : s.dxfType
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
        pushModified(modified, l, r, compareProps)
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

  const navigation: AcApDiffEntityHit[] = [
    ...deleted,
    ...modified.filter(h => h.side === 'left'),
    ...added
  ]

  const changeSets = acapBuildCompareChangeSets(
    [...deleted, ...modified, ...added],
    drawingSizeFromSnapshots(left, right),
    compareRcMargin
  )

  return { added, deleted, modified, unchanged, navigation, changeSets }
}
