import {
  AcDbAttribute,
  AcDbAttributeDefinition,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  type AcDbDatabase,
  type AcDbEntity,
  type AcDbObjectId,
  AcDbText,
  AcGeMatrix3d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApEntityService } from '../service/AcApEntityService'
import {
  acapComposeAffine2d,
  acapDecomposeAffine2d,
  type AcApSmartBlockMatch,
  type AcApSmartBlockTemplate
} from './AcApSmartBlockSearch'
import type { AcEdAffine2d, AcEdPoint2d } from './AcEdShapeMatcher'

/** Turns one varying template text into a block attribute. */
export interface AcApSmartBlockAttributeSpec {
  /** Index of the text in the template features. */
  index: number
  /** Attribute tag. */
  tag: string
  /** Prompt shown when inserting the block. */
  prompt?: string
}

/** Convert into a new block definition built from the template. */
export interface AcApSmartBlockNewTarget {
  kind: 'new'
  /** Name of the new block; must not exist yet. */
  name: string
  /** Template point that becomes the block's insertion point. */
  basePoint: AcEdPoint2d
  /** Varying texts to store as attributes. */
  attributes?: AcApSmartBlockAttributeSpec[]
}

/** Convert into references of a block that already exists. */
export interface AcApSmartBlockExistingTarget {
  kind: 'existing'
  /** Name of the existing block definition. */
  blockName: string
  /**
   * Maps the block definition's coordinates onto the template, i.e. how the
   * block must be placed to cover the selected geometry. Build it with
   * {@link acapSmartBlockPlacement} or {@link acapInvertAffine2d}.
   */
  placement: AcEdAffine2d
}

/** Options for {@link acapConvertSmartBlock}. */
export interface AcApSmartBlockConvertOptions {
  /** Block the geometry becomes. */
  target: AcApSmartBlockNewTarget | AcApSmartBlockExistingTarget
  /**
   * Convert only the selected source geometry and leave the found instances
   * untouched ("Source objects only"). Default `false`.
   */
  sourceOnly?: boolean
}

/** Outcome of {@link acapConvertSmartBlock}. */
export interface AcApSmartBlockConvertResult {
  /** Name of the block the references point to. */
  blockName: string
  /** Inserted references (source first, then included instances). */
  references: AcDbBlockReference[]
  /** Number of erased source entities. */
  erasedCount: number
}

/**
 * Returns `${prefix}${n}` with the smallest `n >= 1` not used by a block.
 *
 * @param db - Drawing database.
 * @param prefix - Name prefix. Default `Block`.
 */
export function acapAllocateBlockName(db: AcDbDatabase, prefix = 'Block') {
  const blockTable = db.tables.blockTable
  let index = 1
  while (blockTable.has(`${prefix}${index}`)) index++
  return `${prefix}${index}`
}

/**
 * Validates a name for a new block: non-empty, not anonymous (`*`), free of
 * characters AutoCAD rejects in symbol names, and not already used.
 *
 * @returns `undefined` when valid, otherwise a reason code.
 */
export function acapValidateNewBlockName(
  db: AcDbDatabase,
  name: string
): 'empty' | 'invalid' | 'exists' | undefined {
  const trimmed = name.trim()
  if (!trimmed) return 'empty'
  if (trimmed.startsWith('*') || /[<>/\\":;?*|,=`\r\n]/.test(trimmed)) {
    return 'invalid'
  }
  if (db.tables.blockTable.has(trimmed)) return 'exists'
  return undefined
}

/**
 * Creates a block definition from copies of `entities`, moved so that
 * `basePoint` becomes the block origin.
 *
 * @param db - Drawing database; the new record is added to its block table.
 * @param name - Block name (must be free).
 * @param entities - Source entities; they are cloned, not moved.
 * @param basePoint - WCS point that becomes the insertion point.
 */
export function acapCreateBlockFromEntities(
  db: AcDbDatabase,
  name: string,
  entities: AcDbEntity[],
  basePoint: AcEdPoint2d
): AcDbBlockTableRecord {
  const record = new AcDbBlockTableRecord({
    name,
    origin: new AcGePoint3d(0, 0, 0)
  })
  db.tables.blockTable.add(record)
  const toOrigin = new AcGeMatrix3d().makeTranslation(
    -basePoint.x,
    -basePoint.y,
    0
  )
  record.appendEntity(entities.map(e => e.clone().transformBy(toOrigin)))
  return record
}

/**
 * Placement of a block relative to the template: the block origin goes to
 * `basePoint`, then the block is rotated and uniformly scaled about it.
 */
export function acapSmartBlockPlacement(
  basePoint: AcEdPoint2d,
  rotation = 0,
  scale = 1
): AcEdAffine2d {
  const cos = Math.cos(rotation) * scale
  const sin = Math.sin(rotation) * scale
  return { a: cos, b: sin, c: -sin, d: cos, e: basePoint.x, f: basePoint.y }
}

/** Inverts an invertible 2D affine map. */
export function acapInvertAffine2d(t: AcEdAffine2d): AcEdAffine2d {
  const det = t.a * t.d - t.b * t.c
  const a = t.d / det
  const b = -t.b / det
  const c = -t.c / det
  const d = t.a / det
  return { a, b, c, d, e: -(a * t.e + c * t.f), f: -(b * t.e + d * t.f) }
}

const IDENTITY: AcEdAffine2d = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

/**
 * Converts the template and its included instances into block references
 * and erases the replaced geometry.
 *
 * Call it inside one undo mark (a Write-mode command or
 * `acapRunDatabaseEdit`) so the conversion undoes in one step.
 *
 * @param db - Drawing database.
 * @param template - Searched geometry.
 * @param matches - Search results; only `included` ones are converted.
 * @param options - Target block and scope.
 */
export function acapConvertSmartBlock(
  db: AcDbDatabase,
  template: AcApSmartBlockTemplate,
  matches: readonly AcApSmartBlockMatch[],
  options: AcApSmartBlockConvertOptions
): AcApSmartBlockConvertResult {
  const blockTable = db.tables.blockTable
  const target = options.target
  const instances = options.sourceOnly ? [] : matches.filter(m => m.included)
  const attributes =
    target.kind === 'new'
      ? (target.attributes ?? []).filter(
          spec =>
            isTextSpec(spec) &&
            template.entities[spec.index] instanceof AcDbText
        )
      : []
  const attributeIndices = new Set(attributes.map(a => a.index))

  let blockName: string
  let placement: AcEdAffine2d
  if (target.kind === 'new') {
    const reason = acapValidateNewBlockName(db, target.name)
    if (reason)
      throw new Error(`Invalid block name '${target.name}': ${reason}`)
    blockName = target.name.trim()
    const record = acapCreateBlockFromEntities(
      db,
      blockName,
      template.entities.filter((_, i) => !attributeIndices.has(i)),
      target.basePoint
    )
    if (attributes.length > 0) {
      const toOrigin = new AcGeMatrix3d().makeTranslation(
        -target.basePoint.x,
        -target.basePoint.y,
        0
      )
      record.appendEntity(
        attributes.map(spec => {
          const def = new AcDbAttributeDefinition()
          copyText(template.entities[spec.index] as AcDbText, def)
          def.tag = spec.tag
          def.prompt = spec.prompt ?? spec.tag
          return def.transformBy(toOrigin)
        })
      )
    }
    placement = acapSmartBlockPlacement(target.basePoint)
  } else {
    if (!blockTable.has(target.blockName)) {
      throw new Error(`Block '${target.blockName}' does not exist`)
    }
    blockName = target.blockName
    placement = target.placement
  }
  const origin = blockTable.getAt(blockName)?.origin ?? { x: 0, y: 0 }

  const layer = template.entities[0]?.layer ?? '0'
  const references: AcDbBlockReference[] = []
  const addReference = (
    transform: AcEdAffine2d,
    texts: (AcDbText | undefined)[]
  ) => {
    const map = acapComposeAffine2d(transform, placement)
    const { rotation, scale, mirrored } = acapDecomposeAffine2d(map)
    const ref = new AcDbBlockReference(blockName)
    ref.position = new AcGePoint3d(
      map.a * origin.x + map.c * origin.y + map.e,
      map.b * origin.x + map.d * origin.y + map.f,
      0
    )
    // A mirrored similarity is R(θ)·diag(s, -s): rotate by θ, flip Y.
    ref.rotation = rotation
    ref.scaleFactors = new AcGePoint3d(scale, mirrored ? -scale : scale, 1)
    ref.layer = layer
    for (const spec of attributes) {
      const source = texts[spec.index]
      if (!source) continue
      const attr = new AcDbAttribute()
      copyText(source, attr)
      attr.tag = spec.tag
      ref.appendAttributes(attr)
    }
    references.push(ref)
  }

  const textAt = (ids: AcDbObjectId[]) =>
    template.entities.map((_, i) => {
      if (!attributeIndices.has(i)) return undefined
      const entity = blockTable.getEntityById(ids[i])
      return entity instanceof AcDbText ? entity : undefined
    })

  addReference(IDENTITY, textAt(template.ids))
  for (const match of instances) {
    addReference(
      match.transform,
      match.blockReference
        ? referenceTexts(db, template, match, attributeIndices)
        : textAt(match.ids)
    )
  }
  blockTable.modelSpace.appendEntity(references)

  const replaced = [...template.ids, ...instances.flatMap(m => m.ids)]
  const erasedCount = new AcApEntityService(db).eraseEntities(replaced)
  return { blockName, references, erasedCount }
}

/**
 * Texts that supply the attributes of an existing block reference instance.
 * It has no loose text of its own, so each attribute takes the reference's
 * attribute found where the template text lands (its value and placement);
 * without one, the template text moved onto the reference.
 */
function referenceTexts(
  db: AcDbDatabase,
  template: AcApSmartBlockTemplate,
  match: AcApSmartBlockMatch,
  indices: ReadonlySet<number>
): (AcDbText | undefined)[] {
  const ref = db.tables.blockTable.getEntityById(match.ids[0])
  const own =
    ref instanceof AcDbBlockReference ? [...ref.attributeIterator()] : []
  const used = new Set<AcDbAttribute>()
  const t = match.transform
  const matrix = new AcGeMatrix3d().set(
    t.a,
    t.c,
    0,
    t.e,
    t.b,
    t.d,
    0,
    t.f,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  )
  return template.entities.map((entity, i) => {
    if (!indices.has(i) || !(entity instanceof AcDbText)) return undefined
    const center = extentsCenter(entity)
    const expected = {
      x: t.a * center.x + t.c * center.y + t.e,
      y: t.b * center.x + t.d * center.y + t.f
    }
    let best: AcDbAttribute | undefined
    let bestDist = entity.height * match.scale
    for (const attr of own) {
      if (used.has(attr)) continue
      const c = extentsCenter(attr)
      const d = Math.hypot(c.x - expected.x, c.y - expected.y)
      if (d <= bestDist) {
        best = attr
        bestDist = d
      }
    }
    if (best) {
      used.add(best)
      return best
    }
    return (entity.clone() as AcDbText).transformBy(matrix)
  })
}

function extentsCenter(text: AcDbText): AcEdPoint2d {
  const ext = text.geometricExtents
  if (ext.isEmpty()) return { x: text.position.x, y: text.position.y }
  return { x: (ext.min.x + ext.max.x) / 2, y: (ext.min.y + ext.max.y) / 2 }
}

function isTextSpec(spec: AcApSmartBlockAttributeSpec) {
  return Number.isInteger(spec.index) && spec.index >= 0 && !!spec.tag.trim()
}

/** Copies text geometry, style and display traits onto an attribute. */
function copyText(source: AcDbText, target: AcDbText) {
  AcApEntityService.copyDisplayTraits(source, target)
  target.textString = source.textString
  target.height = source.height
  target.position = new AcGePoint3d(source.position)
  target.alignmentPoint = new AcGePoint3d(source.alignmentPoint)
  target.rotation = source.rotation
  target.oblique = source.oblique
  target.widthFactor = source.widthFactor
  target.styleName = source.styleName
  target.horizontalMode = source.horizontalMode
  target.verticalMode = source.verticalMode
}
