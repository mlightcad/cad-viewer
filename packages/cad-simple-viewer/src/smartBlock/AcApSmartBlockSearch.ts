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
   * texts can later become block attributes. When off, selected texts must
   * read the same in every copy. Either way texts are located by where they
   * sit in the copy, not matched as geometry. Default `true`, like
   * AutoCAD's `TEXTTOATTRIBUTE` = 1.
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
  const textVariations = options.textVariations ?? true
  // Rebuilt per search: layer matching may have been toggled since the
  // template was built.
  const templateFeatures = template.entities.map(
    entity => cache.get(entity, matchLayer)!
  )
  // Like AutoCAD, selected single-line texts do not take part in the
  // geometry match: texts with other strings (room numbers, axis labels)
  // are rarely placed at exactly the same spot, e.g. left-aligned "1" and
  // "10" start at different points. Geometry fixes the transform; each
  // template text then picks up the text found at its place in the copy.
  // A template made of texts only is matched as plain shapes.
  const textIndices: number[] = []
  const shapeIndices: number[] = []
  templateFeatures.forEach((f, i) =>
    (f.label === undefined ? shapeIndices : textIndices).push(i)
  )
  if (shapeIndices.length === 0) textIndices.length = 0
  const shapeFeatures = shapeIndices.map(i => templateFeatures[i])
  const templateIds = new Set(template.ids)
  const shapeKinds = new Set(shapeFeatures.map(f => f.kind))
  const textKinds = new Set(textIndices.map(i => templateFeatures[i].kind))

  const candidateIds: AcDbObjectId[] = []
  const candidateFeatures = new Map<AcDbObjectId, AcEdShapeFeature<string>>()
  const textCandidateIds: AcDbObjectId[] = []
  for (const entity of modelSpace.newIterator()) {
    if (templateIds.has(entity.objectId)) continue
    if (!entity.visibility) continue
    const feature = cache.get(entity, matchLayer)
    if (!feature) continue
    // Only shapes of the template's kinds can take part in a copy.
    if (feature.label === undefined || textIndices.length === 0) {
      if (!shapeKinds.has(feature.kind)) continue
      candidateIds.push(entity.objectId)
    } else {
      if (!textKinds.has(feature.kind)) continue
      textCandidateIds.push(entity.objectId)
    }
    candidateFeatures.set(entity.objectId, feature)
  }
  const unlocked = excludeLockedLayerIds(db, candidateIds).ids
  const candidates = unlocked.map(id => candidateFeatures.get(id)!)

  const texts = new TextPicker(
    db,
    textIndices.map(i => ({
      entity: template.entities[i],
      feature: templateFeatures[i]
    })),
    excludeLockedLayerIds(db, textCandidateIds).ids.map(
      id => candidateFeatures.get(id)!
    ),
    textVariations
  )
  const textIdsOf = new Map<AcEdShapeMatch<AcDbObjectId>, AcDbObjectId[]>()
  const shapeMatches = acedFindShapeMatches(shapeFeatures, candidates, {
    tolerance: options.tolerance,
    allowRotation: options.allowRotation,
    allowMirror: options.allowMirror,
    allowScale: options.allowScale,
    ignoreLabels: textVariations,
    // A copy must hold every selected text at its place. Checked inside the
    // search so symmetric geometry tries the transform that fits the texts.
    accept: match => {
      const ids = texts.pick(match)
      if (ids) textIdsOf.set(match, ids)
      return !!ids
    }
  })

  const matches: AcApSmartBlockMatch[] = []
  for (const match of shapeMatches) {
    const textIds = textIdsOf.get(match) ?? []
    const ids = new Array<AcDbObjectId>(templateFeatures.length)
    shapeIndices.forEach((index, i) => (ids[index] = match.ids[i]))
    textIndices.forEach((index, i) => (ids[index] = textIds[i]))
    matches.push({
      ...match,
      ids,
      included: true,
      texts: templateFeatures.map((f, i) =>
        f.label === undefined ? undefined : candidateFeatures.get(ids[i])?.label
      )
    })
  }

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
      ignoreLabels: options.textVariations ?? true
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

/** Candidate text with the center of its extents. */
interface TextCandidate {
  feature: AcEdShapeFeature<AcDbObjectId>
  center: AcEdPoint2d
}

/**
 * Pairs the template texts with the texts of a geometry copy.
 *
 * A text belongs to a copy when it lies where the template text lands under
 * the copy's transform: its extents center within one text height, with
 * the same height and orientation (mirrored copies may keep their text
 * readable, as with `MIRRTEXT` = 0). Extents centers rather than insertion
 * points are compared so differently long strings still pair up. Strings
 * must be equal unless text variations are searched. Each text belongs to
 * one copy only.
 */
class TextPicker {
  private readonly byKind = new Map<string, TextCandidate[]>()
  private readonly claimed = new Set<AcDbObjectId>()
  private readonly templateTexts: TextCandidate[]

  /**
   * @param db - Drawing database.
   * @param texts - Template texts with their features (search layer mode).
   * @param candidates - Text features the copies may use.
   * @param ignoreLabels - Accept texts with other strings.
   */
  constructor(
    db: AcDbDatabase,
    texts: { entity: AcDbEntity; feature: AcEdShapeFeature<AcDbObjectId> }[],
    candidates: AcEdShapeFeature<AcDbObjectId>[],
    private readonly ignoreLabels: boolean
  ) {
    const blockTable = db.tables.blockTable
    this.templateTexts = texts.map(({ entity, feature }) => ({
      feature,
      center: textCenter(entity, feature)
    }))
    for (const feature of candidates) {
      const entity = blockTable.getEntityById(feature.id)
      const candidate = {
        feature,
        center: entity ? textCenter(entity, feature) : feature.center
      }
      const list = this.byKind.get(feature.kind)
      if (list) list.push(candidate)
      else this.byKind.set(feature.kind, [candidate])
    }
    // Sorted by x so a lookup only scans a narrow band.
    for (const list of this.byKind.values()) {
      list.sort((a, b) => a.center.x - b.center.x)
    }
  }

  /**
   * Ids of the copy's texts in template text order, or `undefined` when a
   * template text has no counterpart. Found texts are claimed.
   */
  pick(match: AcEdShapeMatch<AcDbObjectId>): AcDbObjectId[] | undefined {
    const ids: AcDbObjectId[] = []
    const taken = new Set<AcDbObjectId>()
    for (const source of this.templateTexts) {
      const found = this.find(source, match, taken)
      if (!found) return undefined
      ids.push(found)
      taken.add(found)
    }
    ids.forEach(id => this.claimed.add(id))
    return ids
  }

  private find(
    source: TextCandidate,
    match: AcEdShapeMatch<AcDbObjectId>,
    taken: Set<AcDbObjectId>
  ): AcDbObjectId | undefined {
    const list = this.byKind.get(source.feature.kind)
    if (!list) return undefined
    const t = match.transform
    const f = source.feature
    const scale = match.scale
    const height = f.size * scale
    const radius = Math.max(height, 1e-9)
    const center = applyAffine(t, source.center)
    const dir = textDirection(f)
    const mapped = normalize({
      x: t.a * dir.x + t.c * dir.y,
      y: t.b * dir.x + t.d * dir.y
    })
    const cosTol = Math.cos((2 * Math.PI) / 180)

    let best: AcDbObjectId | undefined
    let bestDist = radius
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (list[mid].center.x < center.x - radius) lo = mid + 1
      else hi = mid
    }
    for (let k = lo; k < list.length; k++) {
      const c = list[k]
      if (c.center.x > center.x + radius) break
      const g = c.feature
      if (this.claimed.has(g.id) || taken.has(g.id)) continue
      if (!this.ignoreLabels && (g.label ?? '') !== (f.label ?? '')) continue
      if (Math.abs(g.size - height) > Math.max(height * 0.02, 1e-9)) continue
      const d = Math.hypot(c.center.x - center.x, c.center.y - center.y)
      if (d > bestDist) continue
      const v = textDirection(g)
      const dot = v.x * mapped.x + v.y * mapped.y
      if (dot < cosTol && !(match.mirrored && dot <= -cosTol)) continue
      best = g.id
      bestDist = d
    }
    return best
  }
}

/** Center of a text's extents; its insertion point when they are empty. */
function textCenter(
  entity: AcDbEntity,
  feature: AcEdShapeFeature<AcDbObjectId>
): AcEdPoint2d {
  const ext = entity.geometricExtents
  if (ext.isEmpty()) return feature.center
  return { x: (ext.min.x + ext.max.x) / 2, y: (ext.min.y + ext.max.y) / 2 }
}

/** Unit baseline direction of a text feature. */
function textDirection(feature: AcEdShapeFeature): AcEdPoint2d {
  const [p0, p1] = feature.points
  if (!p0 || !p1) return { x: 1, y: 0 }
  return normalize({ x: p1.x - p0.x, y: p1.y - p0.y })
}

function normalize(v: AcEdPoint2d): AcEdPoint2d {
  const len = Math.hypot(v.x, v.y)
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 1, y: 0 }
}
