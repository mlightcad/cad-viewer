import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  type AcDbDatabase,
  type AcDbEntity,
  type AcDbObjectId,
  AcGeBox2d
} from '@mlightcad/data-model'

import { excludeLockedLayerIds } from '../service/AcApLockedLayer'
import {
  acedEntityToShapeFeature,
  type AcEdShapeFeatureOptions
} from './AcEdShapeFeatures'
import {
  type AcEdAffine2d,
  acedFindShapeMatches,
  type AcEdPoint2d,
  type AcEdShapeFeature,
  type AcEdShapeMatch
} from './AcEdShapeMatcher'

/** Options of a Smart Blocks search (`BSEARCH`). */
export interface AcApSmartBlockSearchOptions {
  /** Accept rotated copies. Default `true`. */
  allowRotation?: boolean
  /** Accept mirrored copies. Default `true`. */
  allowMirror?: boolean
  /** Accept uniformly scaled copies. Default `false`. */
  allowScale?: boolean
  /** Copies must sit on the same layers as the template. Default `true`. */
  matchLayer?: boolean
  /**
   * Also report existing references of blocks whose definition equals the
   * template (`BSEARCHINCLUDEEXISTINGBLOCKS`). Default `false`.
   */
  includeExistingBlocks?: boolean
  /**
   * Accept copies whose text strings differ (`TEXTTOATTRIBUTE`). Varying
   * texts can later become block attributes. Default `false`.
   */
  textVariations?: boolean
  /** Absolute matching tolerance; default is relative to the template size. */
  tolerance?: number
}

/** One found instance of the template. */
export interface AcApSmartBlockMatch extends AcEdShapeMatch<AcDbObjectId> {
  /** Whether the instance takes part in the conversion. */
  included: boolean
  /**
   * Set when the instance is an existing block reference rather than loose
   * geometry; `ids` then holds just that reference.
   */
  blockReference?: boolean
  /**
   * Text strings of the instance, indexed like the template features
   * (`undefined` for non-text shapes and for block-reference instances).
   */
  texts: (string | undefined)[]
}

/** The selected geometry a search looks for. */
export interface AcApSmartBlockTemplate {
  /** Entities matching can describe, in feature order. */
  entities: AcDbEntity[]
  /** Ids of {@link entities}. */
  ids: AcDbObjectId[]
  /** Selected ids skipped because matching cannot describe them. */
  unsupportedIds: AcDbObjectId[]
  /** Features of {@link entities}. */
  features: AcEdShapeFeature<AcDbObjectId>[]
  /** Text string per feature (`undefined` for non-text shapes). */
  texts: (string | undefined)[]
}

/**
 * Caches entity features for one search session, so changing review
 * filters does not describe the whole drawing again. Features are stored
 * without the layer prefix; layer matching is applied on read.
 */
export class AcApSmartBlockFeatureCache {
  private readonly raw = new Map<
    AcDbObjectId,
    AcEdShapeFeature<AcDbObjectId> | null
  >()

  /**
   * Feature of `entity`, or `undefined` when matching cannot describe it.
   *
   * @param entity - Entity to describe.
   * @param matchLayer - Prefix the kind with the layer name.
   */
  get(
    entity: AcDbEntity,
    matchLayer: boolean
  ): AcEdShapeFeature<AcDbObjectId> | undefined {
    let feature = this.raw.get(entity.objectId)
    if (feature === undefined) {
      feature =
        acedEntityToShapeFeature(entity, entity.objectId, {
          matchLayer: false
        }) ?? null
      this.raw.set(entity.objectId, feature)
    }
    if (!feature) return undefined
    return matchLayer
      ? { ...feature, kind: `${entity.layer}|${feature.kind}` }
      : feature
  }
}

/**
 * Builds the search template from selected entity ids.
 *
 * @param db - Drawing database.
 * @param ids - Selected entity ids.
 * @param options - Search options (layer matching).
 */
export function acapBuildSmartBlockTemplate(
  db: AcDbDatabase,
  ids: AcDbObjectId[],
  options: AcApSmartBlockSearchOptions = {}
): AcApSmartBlockTemplate {
  const blockTable = db.tables.blockTable
  const template: AcApSmartBlockTemplate = {
    entities: [],
    ids: [],
    unsupportedIds: [],
    features: [],
    texts: []
  }
  const featureOptions = toFeatureOptions(options)
  for (const id of ids) {
    const entity = blockTable.getEntityById(id)
    if (!entity) continue
    const feature = acedEntityToShapeFeature(entity, id, featureOptions)
    if (!feature) {
      template.unsupportedIds.push(id)
      continue
    }
    template.entities.push(entity)
    template.ids.push(id)
    template.features.push(feature)
    template.texts.push(feature.label)
  }
  return template
}

/**
 * Finds every copy of `template` in model space.
 *
 * Loose-geometry copies come from {@link acedFindShapeMatches}. With
 * `includeExistingBlocks`, references of blocks whose definition is the same
 * geometry are reported as well. Shapes on locked layers are never matched,
 * since they could not be replaced.
 *
 * @param db - Drawing database.
 * @param template - Template from {@link acapBuildSmartBlockTemplate}.
 * @param options - Search options.
 * @returns Matches sorted by position (left to right, then bottom to top).
 */
export function acapFindSmartBlockMatches(
  db: AcDbDatabase,
  template: AcApSmartBlockTemplate,
  options: AcApSmartBlockSearchOptions = {},
  cache: AcApSmartBlockFeatureCache = new AcApSmartBlockFeatureCache()
): AcApSmartBlockMatch[] {
  if (template.entities.length === 0) return []
  const modelSpace = db.tables.blockTable.modelSpace
  const matchLayer = options.matchLayer ?? true
  // Rebuilt per search: layer matching may have been toggled since the
  // template was built.
  const templateFeatures = template.entities.map(
    entity => cache.get(entity, matchLayer)!
  )
  const templateIds = new Set(template.ids)
  const kinds = new Set(templateFeatures.map(f => f.kind))

  const candidateIds: AcDbObjectId[] = []
  const candidateFeatures = new Map<AcDbObjectId, AcEdShapeFeature<string>>()
  for (const entity of modelSpace.newIterator()) {
    if (templateIds.has(entity.objectId)) continue
    if (!entity.visibility) continue
    const feature = cache.get(entity, matchLayer)
    // Only shapes of the template's kinds can take part in a copy.
    if (!feature || !kinds.has(feature.kind)) continue
    candidateIds.push(entity.objectId)
    candidateFeatures.set(entity.objectId, feature)
  }
  const unlocked = excludeLockedLayerIds(db, candidateIds).ids
  const candidates = unlocked.map(id => candidateFeatures.get(id)!)

  const shapeMatches = acedFindShapeMatches(templateFeatures, candidates, {
    tolerance: options.tolerance,
    allowRotation: options.allowRotation,
    allowMirror: options.allowMirror,
    allowScale: options.allowScale,
    ignoreLabels: options.textVariations
  })

  const matches: AcApSmartBlockMatch[] = shapeMatches.map(match => ({
    ...match,
    included: true,
    texts: templateFeatures.map((f, i) =>
      f.label === undefined
        ? undefined
        : candidateFeatures.get(match.ids[i])?.label
    )
  }))

  if (options.includeExistingBlocks) {
    matches.push(...findBlockReferenceMatches(db, template, options))
  }

  const origin = matchOrigin(template)
  const keyOf = (m: AcApSmartBlockMatch) => applyAffine(m.transform, origin)
  return matches.sort((a, b) => {
    const pa = keyOf(a)
    const pb = keyOf(b)
    return Math.abs(pa.x - pb.x) > 1e-9 ? pa.x - pb.x : pa.y - pb.y
  })
}

/** A block definition holding exactly the template geometry. */
export interface AcApEquivalentBlock {
  /** Block table record name. */
  blockName: string
  /** Maps template coordinates into the block definition's coordinates. */
  transform: AcEdAffine2d
}

/**
 * Lists blocks whose definition is the template geometry (same shapes and
 * nothing else), up to rotation, mirroring and uniform scale. Layers are not
 * compared since block content usually lives on layer `0`.
 *
 * @param db - Drawing database.
 * @param template - Template from {@link acapBuildSmartBlockTemplate}.
 */
export function acapFindEquivalentBlocks(
  db: AcDbDatabase,
  template: AcApSmartBlockTemplate,
  options: Pick<AcApSmartBlockSearchOptions, 'textVariations'> = {}
): AcApEquivalentBlock[] {
  const result: AcApEquivalentBlock[] = []
  if (template.entities.length === 0) return result
  const featureOptions: AcEdShapeFeatureOptions = { matchLayer: false }
  const templateFeatures = template.entities.map(
    (entity, i) =>
      acedEntityToShapeFeature(entity, template.ids[i], featureOptions)!
  )
  for (const record of db.tables.blockTable.newIterator()) {
    if (!isUserBlock(record)) continue
    // Cheap size check before describing the definition.
    const entities = [...record.newIterator()]
    if (entities.length !== templateFeatures.length) continue
    const features: AcEdShapeFeature<string>[] = []
    for (const entity of entities) {
      const feature = acedEntityToShapeFeature(
        entity,
        entity.objectId,
        featureOptions
      )
      if (!feature) break
      features.push(feature)
    }
    if (features.length !== templateFeatures.length) continue
    const [match] = acedFindShapeMatches(templateFeatures, features, {
      allowRotation: true,
      allowMirror: true,
      allowScale: true,
      ignoreLabels: options.textVariations
    })
    if (match)
      result.push({ blockName: record.name, transform: match.transform })
  }
  return result
}

/**
 * Center of the template's extents: AutoCAD's default insertion point for a
 * new block.
 */
export function acapSmartBlockTemplateCenter(
  template: AcApSmartBlockTemplate
): AcEdPoint2d {
  const box = new AcGeBox2d()
  for (const entity of template.entities) {
    const ext = entity.geometricExtents
    if (ext.isEmpty()) continue
    box.expandByPoint(ext.min)
    box.expandByPoint(ext.max)
  }
  if (box.isEmpty()) return matchOrigin(template)
  return {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2
  }
}

/**
 * Indices of template texts whose string differs in at least one included
 * instance; these become attributes when converting with text variations.
 */
export function acapSmartBlockVariableTexts(
  template: AcApSmartBlockTemplate,
  matches: readonly AcApSmartBlockMatch[]
): number[] {
  const indices: number[] = []
  template.texts.forEach((text, i) => {
    if (text === undefined) return
    const varies = matches.some(
      m => m.included && !m.blockReference && m.texts[i] !== text
    )
    if (varies) indices.push(i)
  })
  return indices
}

/** Composes two affine maps: `outer ∘ inner`. */
export function acapComposeAffine2d(
  outer: AcEdAffine2d,
  inner: AcEdAffine2d
): AcEdAffine2d {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f
  }
}

/** Splits a similarity map into rotation, uniform scale and mirroring. */
export function acapDecomposeAffine2d(t: AcEdAffine2d): {
  rotation: number
  scale: number
  mirrored: boolean
} {
  const det = t.a * t.d - t.b * t.c
  return {
    rotation: Math.atan2(t.b, t.a),
    scale: Math.sqrt(Math.abs(det)),
    mirrored: det < 0
  }
}

function findBlockReferenceMatches(
  db: AcDbDatabase,
  template: AcApSmartBlockTemplate,
  options: AcApSmartBlockSearchOptions
): AcApSmartBlockMatch[] {
  const equivalents = acapFindEquivalentBlocks(db, template, options)
  if (equivalents.length === 0) return []
  const byName = new Map(equivalents.map(b => [b.blockName, b]))
  const templateIds = new Set(template.ids)
  const refIds: AcDbObjectId[] = []
  const refs = new Map<AcDbObjectId, AcDbBlockReference>()
  for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
    if (!(entity instanceof AcDbBlockReference)) continue
    if (templateIds.has(entity.objectId) || !byName.has(entity.blockName)) {
      continue
    }
    refIds.push(entity.objectId)
    refs.set(entity.objectId, entity)
  }
  const matches: AcApSmartBlockMatch[] = []
  for (const id of excludeLockedLayerIds(db, refIds).ids) {
    const ref = refs.get(id)!
    const e = ref.blockTransform.elements
    const refAffine: AcEdAffine2d = {
      a: e[0],
      b: e[1],
      c: e[4],
      d: e[5],
      e: e[12],
      f: e[13]
    }
    const transform = acapComposeAffine2d(
      refAffine,
      byName.get(ref.blockName)!.transform
    )
    const parts = acapDecomposeAffine2d(transform)
    // Non-uniformly scaled references are not a similarity of the template.
    const sx = Math.hypot(transform.a, transform.b)
    const sy = Math.hypot(transform.c, transform.d)
    if (Math.abs(sx - sy) > 1e-6 * Math.max(sx, sy, 1)) continue
    if (!options.allowScale && Math.abs(parts.scale - 1) > 1e-6) continue
    if (!(options.allowMirror ?? true) && parts.mirrored) continue
    matches.push({
      ...parts,
      transform,
      ids: [id],
      included: true,
      blockReference: true,
      texts: template.texts.map(() => undefined)
    })
  }
  return matches
}

function isUserBlock(record: AcDbBlockTableRecord): boolean {
  const name = record.name
  if (!name || name.startsWith('*')) return false
  if (record.isModelSapce || record.isPaperSapce) return false
  // External references are not editable definitions.
  return !record.isXref
}

function toFeatureOptions(
  options: AcApSmartBlockSearchOptions
): AcEdShapeFeatureOptions {
  return {
    matchLayer: options.matchLayer ?? true,
    includeBlockReferences: true
  }
}

function matchOrigin(template: AcApSmartBlockTemplate): AcEdPoint2d {
  return template.features[0]?.center ?? { x: 0, y: 0 }
}

function applyAffine(t: AcEdAffine2d, p: AcEdPoint2d): AcEdPoint2d {
  return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f }
}
