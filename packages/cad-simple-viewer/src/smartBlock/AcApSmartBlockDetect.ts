import type {
  AcDbDatabase,
  AcDbEntity,
  AcDbObjectId
} from '@mlightcad/data-model'

import { excludeLockedLayerIds } from '../service/AcApLockedLayer'
import {
  acapConvertSmartBlock,
  acapInvertAffine2d,
  type AcApSmartBlockAttributeSpec,
  type AcApSmartBlockConvertResult
} from './AcApSmartBlockConvert'
import {
  acapBuildSmartBlockTemplate,
  acapComposeAffine2d,
  acapFindSmartBlockMatches,
  AcApSmartBlockCandidatePool,
  AcApSmartBlockFeatureCache,
  type AcApSmartBlockMatch,
  type AcApSmartBlockSearchOptions,
  acapSmartBlockTemplateCenter,
  acapSmartBlockVariableTexts
} from './AcApSmartBlockSearch'
import {
  type AcEdAffine2d,
  acedApplyAffine2d,
  acedFindShapeMatches,
  type AcEdPoint2d,
  type AcEdShapeFeature,
  acedShapeLandsOn} from './AcEdShapeMatcher'

/** Options of {@link acapDetectSmartBlocks} (`BDETECT`). */
export interface AcApSmartBlockDetectOptions extends Pick<
  AcApSmartBlockSearchOptions,
  | 'allowRotation'
  | 'allowMirror'
  | 'allowScale'
  | 'matchLayer'
  | 'textVariations'
> {
  /** Fewest instances (source included) a group needs. Default `3`. */
  minInstances?: number
  /** Fewest non-text shapes per instance. Default `2`. */
  minEntities?: number
  /**
   * Smallest saving worth reporting: `instances × (entities − 1)`, the
   * entities a conversion removes. Also prunes seeds whose estimate stays
   * below it before the exact search runs. Default `10`.
   */
  minSavings?: number
  /** Most shapes per instance; growth stops there. Default `64`. */
  maxEntities?: number
  /**
   * Share of the seed occurrences that must agree on a shape before it
   * joins the group. Default `0.8`.
   */
  agreement?: number
  /** Neighbors kept per shape (nearest first). Default `24`. */
  neighborLimit?: number
  /**
   * Most seed pair kinds tried, most frequent first. Default: all of them.
   */
  maxSeeds?: number
}

/** One group of identical shapes found by {@link acapDetectSmartBlocks}. */
export interface AcApSmartBlockCluster {
  /**
   * Entity ids of the representative instance. Pass them to
   * `AcApSmartBlockSearch` to review and convert the group.
   */
  ids: AcDbObjectId[]
  /** The other instances, verified by the Smart Blocks search. */
  matches: AcApSmartBlockMatch[]
  /** Number of instances, the representative included. */
  instanceCount: number
  /** Entities per instance (texts included). */
  entityCount: number
  /** Entities the conversion removes: `instances × (entities − 1)`. */
  savings: number
}

/** Options of {@link acapConvertSmartBlockCluster}. */
export interface AcApSmartBlockClusterConvertOptions {
  /** Name of the new block; must not exist yet. */
  name: string
  /**
   * Template point that becomes the insertion point. Default: the center of
   * the representative, like AutoCAD.
   */
  basePoint?: { x: number; y: number }
  /**
   * Texts to store as attributes. Default: every text whose string differs
   * between instances, tagged `TEXT1`, `TEXT2`, ...; pass `[]` for none.
   */
  attributes?: AcApSmartBlockAttributeSpec[]
  /**
   * Must equal the `matchLayer` the group was detected with, so the
   * template lines up with the instances. Default `true`.
   */
  matchLayer?: boolean
}

/**
 * Converts a detected group into a new block: the representative and every
 * instance become references of it. Call it inside one undo mark, like
 * {@link acapConvertSmartBlock}. Instances must still be unchanged since
 * detection.
 *
 * @param db - Drawing database the group was detected in.
 * @param cluster - Group from {@link acapDetectSmartBlocks}.
 * @param options - Block name, insertion point and attributes.
 */
export function acapConvertSmartBlockCluster(
  db: AcDbDatabase,
  cluster: AcApSmartBlockCluster,
  options: AcApSmartBlockClusterConvertOptions
): AcApSmartBlockConvertResult {
  const template = acapBuildSmartBlockTemplate(db, cluster.ids, {
    matchLayer: options.matchLayer ?? true
  })
  if (template.ids.length !== cluster.ids.length) {
    throw new Error('Detected group changed since detection')
  }
  const attributes =
    options.attributes ??
    acapSmartBlockVariableTexts(template, cluster.matches).map((index, i) => ({
      index,
      tag: `TEXT${i + 1}`
    }))
  return acapConvertSmartBlock(db, template, cluster.matches, {
    target: {
      kind: 'new',
      name: options.name,
      basePoint: options.basePoint ?? acapSmartBlockTemplateCenter(template),
      attributes
    }
  })
}

/** A describable, non-text shape of the drawing. */
interface Node {
  id: AcDbObjectId
  feature: AcEdShapeFeature<AcDbObjectId>
  /** Farthest characteristic point from the center (or the size). */
  radius: number
  neighbors: number[]
}

interface TextNode {
  id: AcDbObjectId
  center: AcEdPoint2d
}

/** Template after one growth round. */
interface GrowthRound {
  members: number[]
  /** Occurrences that found every member. */
  complete: number
  /** Shapes every other occurrence collected so far. */
  collected: number[]
}

/** Local frame of a shape pair: origin, unit axis and scale length. */
interface Frame {
  origin: AcEdPoint2d
  u: AcEdPoint2d
  length: number
}

/** Occurrence of a seed pair. */
interface Seed {
  a: number
  b: number
  frame: Frame
}

/** Seed occurrence with its maps from the reference occurrence. */
interface Occurrence extends Seed {
  /**
   * Maps the reference occurrence onto this one. Symmetric seed pairs fit
   * several maps; growth keeps only those that agree with every shape added.
   */
  transforms: AcEdAffine2d[]
  scale: number
}

/**
 * Finds groups of identical shapes anywhere in model space, without a
 * selection: the heuristic counterpart of AutoCAD's Detect and Convert
 * (`BDETECT`), which uses a cloud recognition model.
 *
 * Steps:
 *
 * 1. Every describable shape gets its neighbors, nearest first: shapes that
 *    touch it (a characteristic point in its padded bounds) and shapes
 *    whose bounds are closer than the smaller one's size.
 * 2. Each neighbor pair gets a key that does not change under translation,
 *    rotation and (optionally) mirroring: kinds, sizes, distance and the
 *    second moments of both shapes in the pair's own frame. Keys that occur
 *    at least `minInstances` times seed a group, most frequent first.
 * 3. The seed occurrences grow together, round by round: a shape touching
 *    the first occurrence joins when, in enough other occurrences, a shape
 *    lands on it under that occurrence's transform. Walls and other shapes
 *    that differ around each copy are left out.
 * 4. Every round is rated by the exact matcher on just the shapes growth
 *    collected; the best round is then verified on the whole drawing by
 *    the Smart Blocks search ({@link acapFindSmartBlockMatches}).
 * 5. A seed pair may play different roles in one symbol (an arc at a
 *    corner and at an end), which stops growth early. The verified copies
 *    are consistent, so the group grows again from them, absorbing earlier
 *    groups that turn out to be parts of it when the whole saves more.
 * 6. Texts inside the group join it when most copies have one there; with
 *    text variations they become attributes on conversion.
 * 7. The copies' entities are claimed so groups never share entities.
 *    Groups saving fewer than `minSavings` entities are dropped.
 *
 * Every group can be reviewed and converted with `AcApSmartBlockSearch`
 * from its {@link AcApSmartBlockCluster.ids}. That search may find more
 * copies than reported here: copies used by another group are not counted.
 *
 * Groups are returned largest saving first.
 *
 * @param db - Drawing database.
 * @param options - Thresholds and allowed transforms.
 * @param cache - Feature cache shared with later searches.
 */
export function acapDetectSmartBlocks(
  db: AcDbDatabase,
  options: AcApSmartBlockDetectOptions = {},
  cache: AcApSmartBlockFeatureCache = new AcApSmartBlockFeatureCache()
): AcApSmartBlockCluster[] {
  const run = detect(db, options, cache)
  for (;;) {
    const step = run.next()
    if (step.done) return step.value
  }
}

/** Progress of {@link acapDetectSmartBlocksAsync}. */
export interface AcApSmartBlockDetectProgress {
  /** Share of the work done, `0` to `1`. */
  fraction: number
  /** Groups found so far. */
  groups: number
}

/** Progress reporting and cancellation of {@link acapDetectSmartBlocksAsync}. */
export interface AcApSmartBlockDetectControl {
  /** Called between slices of work. */
  onProgress?: (progress: AcApSmartBlockDetectProgress) => void
  /** Aborts the detection; the promise then rejects with the signal's reason. */
  signal?: AbortSignal
  /** Longest stretch of work before yielding to the event loop. Default 30 ms. */
  sliceMs?: number
}

/**
 * {@link acapDetectSmartBlocks} in slices, yielding to the event loop
 * between them so a UI stays responsive, with progress and cancellation.
 * Single steps (one exact search) can still take a moment in large
 * drawings.
 *
 * @param db - Drawing database; do not edit it until the promise settles.
 * @param options - Thresholds and allowed transforms.
 * @param control - Progress callback, abort signal and slice length.
 * @param cache - Feature cache shared with later searches.
 */
export async function acapDetectSmartBlocksAsync(
  db: AcDbDatabase,
  options: AcApSmartBlockDetectOptions = {},
  control: AcApSmartBlockDetectControl = {},
  cache: AcApSmartBlockFeatureCache = new AcApSmartBlockFeatureCache()
): Promise<AcApSmartBlockCluster[]> {
  const slice = control.sliceMs ?? 30
  const run = detect(db, options, cache)
  let last = performance.now()
  for (;;) {
    control.signal?.throwIfAborted()
    const step = run.next()
    if (step.done) {
      control.onProgress?.({ fraction: 1, groups: step.value.length })
      return step.value
    }
    if (performance.now() - last >= slice) {
      control.onProgress?.(step.value)
      await yieldToEventLoop()
      last = performance.now()
    }
  }
}

/**
 * Lets pending events run. A message is used rather than `setTimeout(0)`,
 * which browsers clamp to about a second in background tabs: detection
 * would crawl as soon as the user switched tabs.
 */
function yieldToEventLoop(): Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  return new Promise(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      resolve()
    }
    channel.port2.postMessage(undefined)
  })
}

/** The detection, yielding progress at points where it may pause. */
function* detect(
  db: AcDbDatabase,
  options: AcApSmartBlockDetectOptions,
  cache: AcApSmartBlockFeatureCache
): Generator<AcApSmartBlockDetectProgress, AcApSmartBlockCluster[]> {
  const minInstances = Math.max(2, options.minInstances ?? 3)
  const minEntities = Math.max(1, options.minEntities ?? 2)
  const minSavings = options.minSavings ?? 10
  const maxEntities = options.maxEntities ?? 64
  const agreement = options.agreement ?? 0.8
  const neighborLimit = options.neighborLimit ?? 24
  const maxSeeds = options.maxSeeds ?? Infinity
  const allowMirror = options.allowMirror ?? true
  const allowScale = options.allowScale ?? false
  const searchOptions: AcApSmartBlockSearchOptions = {
    allowRotation: options.allowRotation,
    allowMirror,
    allowScale,
    matchLayer: options.matchLayer ?? true,
    textVariations: options.textVariations ?? true
  }

  const { nodes, texts } = collect(db, searchOptions.matchLayer!, cache)
  if (nodes.length < minInstances * minEntities) return []
  yield { fraction: 0.02, groups: 0 }
  for (const done of linkNeighbors(nodes, neighborLimit)) {
    yield { fraction: 0.02 + 0.13 * done, groups: 0 }
  }

  const seeds = new Map<string, number[]>()
  for (let i = 0; i < nodes.length; i++) {
    if (i % 1000 === 0) {
      yield { fraction: 0.15 + (0.1 * i) / nodes.length, groups: 0 }
    }
    for (const j of nodes[i].neighbors) {
      if (j <= i) continue
      const ab = pairKey(nodes[i], nodes[j], allowMirror, allowScale)
      const ba = pairKey(nodes[j], nodes[i], allowMirror, allowScale)
      if (!ab || !ba) continue
      const [key, a, b] = ab <= ba ? [ab, i, j] : [ba, j, i]
      const list = seeds.get(key)
      if (list) list.push(a, b)
      else seeds.set(key, [a, b])
    }
  }
  const keys = [...seeds.entries()]
    .filter(([, pairs]) => pairs.length / 2 >= minInstances)
    .sort((x, y) => y[1].length - x[1].length)
    .slice(0, maxSeeds)

  const claimed = new Set<AcDbObjectId>()
  const index = new NodeIndex(nodes)
  const textGrid = new TextGrid(texts, medianRadius(nodes))
  const clusterOf = new Map<AcDbObjectId, AcApSmartBlockCluster>()
  const context: VerifyContext = {
    db,
    options: searchOptions,
    cache,
    claimed
  }
  const pool = AcApSmartBlockCandidatePool.fromDatabase(
    db,
    searchOptions.matchLayer!,
    cache
  )
  const clusters: AcApSmartBlockCluster[] = []

  for (let k = 0; k < keys.length; k++) {
    yield { fraction: 0.25 + (0.75 * k) / keys.length, groups: clusters.length }
    const pairs = keys[k][1]
    const occurrences = pickOccurrences(nodes, pairs, claimed)
    if (occurrences.length < minInstances) continue
    const aligned = alignOccurrences(nodes, occurrences, allowMirror)
    if (aligned.length < minInstances) continue
    const need = Math.max(minInstances, Math.ceil(agreement * aligned.length))
    const idsOf = (list: number[]) => list.map(i => nodes[i].id)
    // Growth tolerates more than the exact search, so a late round may add
    // a shape most copies only nearly share (axis stubs of slightly other
    // lengths), and dense regular line work can grow into tiles that are no
    // symbol at all. Rate every round with the exact matcher on just the
    // shapes growth collected (cheap), then search the drawing once for the
    // best round.
    const rounds = grow(nodes, aligned, claimed, need, maxEntities)
    let members: number[] = []
    let localSaving = 0
    let estimate = 0
    for (const round of rounds) {
      if (round.members.length < minEntities) continue
      if (round.complete < minInstances) continue
      // Labels inside the shapes join later; count them for the threshold
      // so small labelled symbols (axis bubbles) are not pruned. Rounds are
      // compared by shapes only: a round that adds a long line takes in
      // unrelated texts along it and would look better than it is.
      const labels = textsInside(
        textGrid,
        round.members.map(i => nodes[i]),
        claimed
      ).length
      const size = round.members.length + labels
      if (round.complete * (size - 1) < minSavings) continue
      if (isDegenerate(round.members.map(i => nodes[i].feature))) continue
      const local = localCopies(nodes, round, searchOptions)
      const saving = (local + 1) * (round.members.length - 1)
      if (local + 1 >= minInstances && saving >= localSaving) {
        members = round.members
        localSaving = saving
        estimate = (local + 1) * (size - 1)
      }
    }
    if (members.length === 0 || estimate < minSavings) continue
    let best = verify(context, idsOf(members), pool)
    if (best.length + 1 < minInstances) continue
    // The seed occurrences may play different roles inside one symbol
    // (the same arc-and-line pair at a corner and at an end), which stops
    // growth early. Verified copies are consistent, so grow again from them
    // and keep the result while it saves more.
    for (let pass = 0; pass < 8 && members.length < maxEntities; pass++) {
      const grown = refine(
        nodes,
        index,
        members,
        best,
        Math.max(minInstances, Math.ceil(agreement * (best.length + 1))),
        maxEntities
      )
      if (grown.length === members.length) break
      // Earlier groups that are parts of this one (claimed fragments of the
      // same symbol) are absorbed when the whole saves more.
      const absorbed = new Set<AcApSmartBlockCluster>()
      for (const i of grown) {
        const owner = clusterOf.get(nodes[i].id)
        if (owner) absorbed.add(owner)
      }
      const released = [...absorbed].flatMap(clusterIds)
      released.forEach(id => claimed.delete(id))
      const verified = verify(context, idsOf(grown), pool)
      const before =
        (best.length + 1) * (members.length - 1) +
        [...absorbed].reduce((sum, c) => sum + c.savings, 0)
      const after = (verified.length + 1) * (grown.length - 1)
      if (verified.length + 1 < minInstances || after <= before) {
        released.forEach(id => claimed.add(id))
        break
      }
      for (const cluster of absorbed) {
        clusters.splice(clusters.indexOf(cluster), 1)
        for (const id of clusterIds(cluster)) clusterOf.delete(id)
      }
      members = grown
      best = verified
    }

    const shapeIds = idsOf(members)
    const inside = textsInside(
      textGrid,
      members.map(i => nodes[i]),
      claimed
    )
    if (inside.length > 0) {
      const withTexts = verify(context, [...shapeIds, ...inside], pool)
      if (withTexts.length + 1 >= Math.max(2, agreement * (best.length + 1))) {
        best = withTexts
        shapeIds.push(...inside)
      }
    }
    if (best.length + 1 < minInstances) continue
    if ((best.length + 1) * (shapeIds.length - 1) < minSavings) continue

    const instanceCount = best.length + 1
    const cluster: AcApSmartBlockCluster = {
      ids: shapeIds,
      matches: best,
      instanceCount,
      entityCount: shapeIds.length,
      savings: instanceCount * (shapeIds.length - 1)
    }
    clusters.push(cluster)
    for (const id of clusterIds(cluster)) {
      claimed.add(id)
      clusterOf.set(id, cluster)
    }
  }
  return clusters.sort((x, y) => y.savings - x.savings)
}

function collect(
  db: AcDbDatabase,
  matchLayer: boolean,
  cache: AcApSmartBlockFeatureCache
) {
  const entities = new Map<AcDbObjectId, AcDbEntity>()
  for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
    if (entity.visibility) entities.set(entity.objectId, entity)
  }
  const unlocked = excludeLockedLayerIds(db, [...entities.keys()]).ids
  const nodes: Node[] = []
  const texts: TextNode[] = []
  for (const id of unlocked) {
    const entity = entities.get(id)!
    const feature = cache.get(entity, matchLayer)
    if (!feature) continue
    if (feature.label !== undefined) {
      const ext = entity.geometricExtents
      texts.push({
        id,
        center: ext.isEmpty()
          ? feature.center
          : {
              x: (ext.min.x + ext.max.x) / 2,
              y: (ext.min.y + ext.max.y) / 2
            }
      })
      continue
    }
    let radius = 0
    for (const p of feature.points)
      radius = Math.max(radius, dist(p, feature.center))
    if (feature.points.length === 0) radius = feature.size
    nodes.push({ id, feature, radius, neighbors: [] })
  }
  return { nodes, texts }
}

/**
 * Links shapes that touch: a characteristic point (or center) of one lies
 * in the other's padded bounds. Points are indexed in a uniform grid, so a
 * lookup only scans the cells the bounds cover; very long shapes only look
 * around their own points.
 */
function* linkNeighbors(nodes: Node[], limit: number): Generator<number> {
  const grid = new CellGrid(medianRadius(nodes))
  const points = nodes.map(n => [n.feature.center, ...n.feature.points])
  points.forEach((list, i) => {
    for (const p of list) grid.add(p.x, p.y, i)
  })
  const found = nodes.map(() => new Set<number>())
  const scan = (
    i: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) => {
    grid.forEachIn(minX, minY, maxX, maxY, j => {
      if (j === i || found[i].has(j)) return
      for (const p of points[j]) {
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
          found[i].add(j)
          found[j].add(i)
          return
        }
      }
    })
  }
  const boxes: Box[] = []
  for (let i = 0; i < nodes.length; i++) {
    if (i % 2000 === 0) yield (0.6 * i) / nodes.length
    const n = nodes[i]
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of points[i]) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    if (n.feature.points.length === 0) {
      minX -= n.radius
      minY -= n.radius
      maxX += n.radius
      maxY += n.radius
    }
    boxes.push({ minX, minY, maxX, maxY })
    const pad = Math.max(n.radius * 0.05, grid.cell * 1e-3)
    const cells =
      ((maxX - minX) / grid.cell + 1) * ((maxY - minY) / grid.cell + 1)
    if (cells <= 400) {
      scan(i, minX - pad, minY - pad, maxX + pad, maxY + pad)
    } else {
      // Long shapes only look around their own points.
      for (const p of points[i]) {
        scan(i, p.x - pad, p.y - pad, p.x + pad, p.y + pad)
      }
    }
  }

  // Symbols often have parts that do not touch (a marker circle inside a
  // door, dots beside a fixture). Shapes also count as neighbors when the
  // gap between their bounds is at most the smaller one's size.
  // Very long shapes (walls, grid lines) keep touching links only, which
  // keeps the search local; growth votes drop unrelated neighbors anyway.
  const centers = new CellGrid(grid.cell)
  nodes.forEach((n, i) =>
    centers.add(n.feature.center.x, n.feature.center.y, i)
  )
  const extent = (b: Box) => Math.max(b.maxX - b.minX, b.maxY - b.minY)
  for (let i = 0; i < nodes.length; i++) {
    if (i % 2000 === 0) yield 0.6 + (0.3 * i) / nodes.length
    const n = nodes[i]
    if (!(n.radius > 0) || n.radius > grid.cell * 10) continue
    const reach = n.radius * 3
    const c = n.feature.center
    const box = boxes[i]
    centers.forEachIn(c.x - reach, c.y - reach, c.x + reach, c.y + reach, j => {
      if (j === i || found[i].has(j)) return
      const other = boxes[j]
      const gap = Math.max(
        other.minX - box.maxX,
        box.minX - other.maxX,
        other.minY - box.maxY,
        box.minY - other.maxY,
        0
      )
      if (gap <= Math.min(extent(box), extent(other))) {
        found[i].add(j)
        found[j].add(i)
      }
    })
  }

  yield 0.9
  nodes.forEach((n, i) => {
    n.neighbors = [...found[i]]
      .sort(
        (a, b) =>
          dist(nodes[a].feature.center, n.feature.center) -
          dist(nodes[b].feature.center, n.feature.center)
      )
      .slice(0, limit)
  })
  // Keep the relation symmetric after the cut.
  nodes.forEach((n, i) => {
    for (const j of n.neighbors) {
      if (!nodes[j].neighbors.includes(i)) nodes[j].neighbors.push(i)
    }
  })
}

/**
 * Frame of the pair `a → b`: the axis runs between the centers; for shapes
 * sharing a center it points at `a`'s (else `b`'s) farthest point.
 */
function pairFrame(a: Node, b: Node): Frame | undefined {
  const origin = a.feature.center
  const length = Math.max(dist(origin, b.feature.center), a.radius, b.radius)
  if (!(length > 0)) return undefined
  // Centers closer than the key's resolution count as shared: the
  // direction between them is noise (concentric arcs from PDF imports).
  const eps = length * 0.01
  let v = sub(b.feature.center, origin)
  if (Math.hypot(v.x, v.y) <= eps) {
    const far = farthest(a) ?? farthest(b)
    v = far ? sub(far, origin) : { x: 1, y: 0 }
  }
  const len = Math.hypot(v.x, v.y)
  if (!(len > 0)) return undefined
  return { origin, u: { x: v.x / len, y: v.y / len }, length }
}

function farthest(n: Node): AcEdPoint2d | undefined {
  let max = 0
  for (const p of n.feature.points)
    max = Math.max(max, dist(p, n.feature.center))
  if (!(max > 0)) return undefined
  // Near-ties (arc end points, symmetric outlines) go to the first point,
  // so copies pick the same one despite rounding noise.
  return n.feature.points.find(p => dist(p, n.feature.center) >= max * 0.999)
}

/** Second moments of a shape's points about its center, in `frame`. */
function moments(n: Node, frame: Frame) {
  const points = n.feature.points
  if (points.length === 0) return [0, 0, 0]
  let xx = 0
  let yy = 0
  let xy = 0
  for (const p of points) {
    const d = sub(p, n.feature.center)
    const x = d.x * frame.u.x + d.y * frame.u.y
    const y = d.y * frame.u.x - d.x * frame.u.y
    xx += x * x
    yy += y * y
    xy += x * y
  }
  const k = points.length * frame.length * frame.length
  return [xx / k, yy / k, xy / k]
}

/**
 * Key of the ordered pair `a → b` that is invariant under translation and
 * rotation, under mirroring when allowed, and under scaling when allowed.
 */
function pairKey(
  a: Node,
  b: Node,
  allowMirror: boolean,
  allowScale: boolean
): string | undefined {
  const frame = pairFrame(a, b)
  if (!frame) return undefined
  const q = (v: number) => Math.round(v * 50)
  const qm = (v: number) => Math.round(v * 200)
  const ma = moments(a, frame).map(qm)
  const mb = moments(b, frame).map(qm)
  if (allowMirror) {
    // Mirroring across the axis flips the xy moments of both shapes.
    const first = ma[2] !== 0 ? ma[2] : mb[2]
    if (first < 0) {
      ma[2] = -ma[2]
      mb[2] = -mb[2]
    }
  }
  const scale = allowScale
    ? 0
    : Math.round(Math.log(frame.length) / Math.log(1.05))
  return [
    a.feature.kind,
    b.feature.kind,
    q(a.feature.size / frame.length),
    q(b.feature.size / frame.length),
    q(dist(a.feature.center, b.feature.center) / frame.length),
    ...ma,
    ...mb,
    scale
  ].join('|')
}

/** Free, non-overlapping occurrences of a seed key (evenly sampled). */
function pickOccurrences(
  nodes: Node[],
  pairs: number[],
  claimed: Set<AcDbObjectId>
): Seed[] {
  const used = new Set<number>()
  const result: Seed[] = []
  for (let k = 0; k < pairs.length; k += 2) {
    const a = pairs[k]
    const b = pairs[k + 1]
    if (used.has(a) || used.has(b)) continue
    if (claimed.has(nodes[a].id) || claimed.has(nodes[b].id)) continue
    const frame = pairFrame(nodes[a], nodes[b])
    if (!frame) continue
    used.add(a)
    used.add(b)
    result.push({ a, b, frame })
  }
  // Voting on a sample keeps dense patterns cheap; verification later
  // finds every copy anyway.
  const max = 200
  if (result.length <= max) return result
  const step = result.length / max
  return Array.from({ length: max }, (_, i) => result[Math.floor(i * step)])
}

/** Maps a frame's local coordinates (scaled) into the drawing. */
function frameAffine(frame: Frame, scale: number): AcEdAffine2d {
  const { u, origin } = frame
  return {
    a: u.x * scale,
    b: u.y * scale,
    c: -u.y * scale,
    d: u.x * scale,
    e: origin.x,
    f: origin.y
  }
}

/**
 * Computes, for every occurrence, the similarity that maps the first
 * occurrence onto it, checking that both seed shapes really land on their
 * counterparts. Occurrences that do not fit are dropped.
 */
function alignOccurrences(
  nodes: Node[],
  occurrences: Seed[],
  allowMirror: boolean
): Occurrence[] {
  const ref = occurrences[0]
  const toLocal = acapInvertAffine2d(frameAffine(ref.frame, 1))
  const flip: AcEdAffine2d = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 }
  const locals = allowMirror
    ? [toLocal, acapComposeAffine2d(flip, toLocal)]
    : [toLocal]
  const result: Occurrence[] = []
  for (const occ of occurrences) {
    const scale = occ.frame.length / ref.frame.length
    const tol = occ.frame.length * 0.01
    // A pair of equal shapes may appear in either order.
    const orders: [number, number][] = [[occ.a, occ.b]]
    if (nodes[occ.a].feature.kind === nodes[occ.b].feature.kind) {
      orders.push([occ.b, occ.a])
    }
    const transforms: AcEdAffine2d[] = []
    for (const [a, b] of orders) {
      const frame = pairFrame(nodes[a], nodes[b])
      if (!frame) continue
      const toWorld = frameAffine(frame, scale)
      for (const local of locals) {
        const t = acapComposeAffine2d(toWorld, local)
        if (
          lands(nodes[ref.a], nodes[a], t, scale, tol) &&
          lands(nodes[ref.b], nodes[b], t, scale, tol)
        ) {
          transforms.push(t)
        }
      }
    }
    if (transforms.length > 0) result.push({ ...occ, transforms, scale })
  }
  return result
}

function lands(
  from: Node,
  to: Node,
  t: AcEdAffine2d,
  scale: number,
  tol: number
) {
  if (Math.abs(from.feature.size * scale - to.feature.size) > tol) return false
  if (dist(acedApplyAffine2d(t, from.feature.center), to.feature.center) > tol)
    return false
  return acedShapeLandsOn(from.feature, to.feature, t, tol)
}

/**
 * Grows the seed pair into the shapes most occurrences share. Returns one
 * snapshot per round (the seed pair first): the member nodes of the first
 * (reference) occurrence and how many occurrences found all of them.
 *
 * Each round looks at the free shapes touching the reference occurrence's
 * newest members. A shape joins when, in enough other occurrences, a
 * touching shape lands on it under that occurrence's transform (same kind,
 * size and characteristic points). Shapes that differ around each copy,
 * such as walls of varying length, never collect enough votes.
 */
function grow(
  nodes: Node[],
  occurrences: Occurrence[],
  claimed: Set<AcDbObjectId>,
  need: number,
  maxEntities: number
): GrowthRound[] {
  const ref = occurrences[0]
  const members = occurrences.map(o => new Set([o.a, o.b]))
  let frontier = occurrences.map(o => [o.a, o.b])
  // Every shape belongs to one occurrence only.
  const owner = new Map<number, number>()
  occurrences.forEach((o, i) => {
    owner.set(o.a, i)
    owner.set(o.b, i)
  })
  const free = (i: number) => {
    const seen = new Set<number>()
    for (const f of frontier[i]) {
      for (const nb of nodes[f].neighbors) {
        if (members[i].has(nb) || claimed.has(nodes[nb].id)) continue
        const o = owner.get(nb)
        if (o === undefined || o === i) seen.add(nb)
      }
    }
    return [...seen]
  }

  const rounds: GrowthRound[] = []
  const snapshot = () => {
    const size = members[0].size
    rounds.push({
      members: [...members[0]],
      complete: members.filter(m => m.size === size).length,
      collected: members.slice(1).flatMap(m => [...m])
    })
  }
  snapshot()
  while (members[0].size < maxEntities) {
    const candidates = occurrences.map((_, i) => free(i))
    const next: number[][] = occurrences.map(() => [])
    for (const r of candidates[0]) {
      if (owner.has(r)) continue
      const hits: [number, number, AcEdAffine2d[]][] = []
      // Transform errors grow with the distance from the seed.
      const reach = dist(nodes[r].feature.center, ref.frame.origin)
      for (let i = 1; i < occurrences.length; i++) {
        const occ = occurrences[i]
        const tol = occ.scale * (ref.frame.length * 0.01 + reach * 0.03)
        for (const c of candidates[i]) {
          if (owner.has(c)) continue
          if (nodes[c].feature.kind !== nodes[r].feature.kind) continue
          const fits = occ.transforms.filter(t =>
            lands(nodes[r], nodes[c], t, occ.scale, tol)
          )
          if (fits.length > 0) {
            hits.push([i, c, fits])
            break
          }
        }
      }
      if (hits.length + 1 < need) continue
      owner.set(r, 0)
      members[0].add(r)
      next[0].push(r)
      for (const [i, x, fits] of hits) {
        occurrences[i].transforms = fits
        owner.set(x, i)
        members[i].add(x)
        next[i].push(x)
      }
      if (members[0].size >= maxEntities) break
    }
    if (next[0].length === 0) break
    frontier = next
    snapshot()
  }
  return rounds
}

/** Axis-aligned bounds. */
interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Uniform grid of indices; cells are nested numeric maps (no string keys). */
class CellGrid {
  private readonly cells = new Map<number, Map<number, number[]>>()

  constructor(readonly cell: number) {}

  /** Adds `index` at `(x, y)`; repeated adds of the same index are folded. */
  add(x: number, y: number, index: number) {
    const gx = Math.floor(x / this.cell)
    const gy = Math.floor(y / this.cell)
    let column = this.cells.get(gx)
    if (!column) this.cells.set(gx, (column = new Map()))
    const list = column.get(gy)
    if (!list) column.set(gy, [index])
    else if (list[list.length - 1] !== index) list.push(index)
  }

  /** Visits the indices of every cell the box touches (may repeat). */
  forEachIn(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    visit: (index: number) => void
  ) {
    const y0 = Math.floor(minY / this.cell)
    const y1 = Math.floor(maxY / this.cell)
    for (
      let gx = Math.floor(minX / this.cell);
      gx <= Math.floor(maxX / this.cell);
      gx++
    ) {
      const column = this.cells.get(gx)
      if (!column) continue
      for (let gy = y0; gy <= y1; gy++) {
        const list = column.get(gy)
        if (list) for (const index of list) visit(index)
      }
    }
  }
}

function medianRadius(nodes: Node[]) {
  const radii = nodes
    .map(n => n.radius)
    .filter(r => r > 0)
    .sort((a, b) => a - b)
  return Math.max(radii[Math.floor(radii.length / 2)] ?? 1, 1e-9)
}

/** Node lookup by center position. */
class NodeIndex {
  private readonly grid: CellGrid

  constructor(private readonly nodes: Node[]) {
    this.grid = new CellGrid(medianRadius(nodes))
    nodes.forEach((n, i) =>
      this.grid.add(n.feature.center.x, n.feature.center.y, i)
    )
  }

  /** Nodes whose center is within `radius` of `p`. */
  near(p: AcEdPoint2d, radius: number): number[] {
    const result: number[] = []
    this.grid.forEachIn(
      p.x - radius,
      p.y - radius,
      p.x + radius,
      p.y + radius,
      i => {
        if (dist(this.nodes[i].feature.center, p) <= radius) result.push(i)
      }
    )
    return result
  }
}

/**
 * Grows a verified group: a shape touching the representative joins when
 * enough verified copies have the same shape at the same place under their
 * exact transform. Shapes of other groups may join too; the caller decides
 * whether absorbing those groups pays off. Returns the member list.
 */
function refine(
  nodes: Node[],
  index: NodeIndex,
  members: number[],
  matches: AcApSmartBlockMatch[],
  need: number,
  maxEntities: number
): number[] {
  const result = new Set(members)
  let frontier = members
  let extent = 0
  for (const i of members) {
    extent = Math.max(
      extent,
      dist(nodes[i].feature.center, nodes[members[0]].feature.center) +
        nodes[i].radius
    )
  }
  while (frontier.length > 0 && result.size < maxEntities) {
    const next: number[] = []
    const seen = new Set<number>()
    for (const f of frontier) {
      for (const r of nodes[f].neighbors) {
        if (seen.has(r) || result.has(r)) continue
        seen.add(r)
        const node = nodes[r]
        const tol = Math.max(extent, node.radius) * 0.01
        let hits = 1
        for (const match of matches) {
          if (match.blockReference) continue
          const t = match.transform
          const c = acedApplyAffine2d(t, node.feature.center)
          const found = index
            .near(c, tol * match.scale)
            .some(
              k =>
                k !== r &&
                nodes[k].feature.kind === node.feature.kind &&
                lands(node, nodes[k], t, match.scale, tol * match.scale)
            )
          if (found) hits++
        }
        if (hits < need) continue
        result.add(r)
        next.push(r)
        if (result.size >= maxEntities) break
      }
      if (result.size >= maxEntities) break
    }
    frontier = next
  }
  return [...result]
}

/**
 * Rejects groups that are only lines running in one direction (dashed
 * line pieces, hatch strokes, grid lines) or just two lines (corners):
 * they repeat everywhere but are not symbols.
 */
function isDegenerate(features: AcEdShapeFeature[]) {
  // Two lines (a corner, a pair of strokes) occur everywhere in a drawing.
  if (features.length <= 2 && features.every(isLine)) {
    return true
  }
  let dir: AcEdPoint2d | undefined
  for (const f of features) {
    if (!isLine(f) || f.points.length !== 2) return false
    const d = sub(f.points[1], f.points[0])
    const len = Math.hypot(d.x, d.y)
    if (len === 0) continue
    const u = { x: d.x / len, y: d.y / len }
    if (!dir) dir = u
    else if (Math.abs(dir.x * u.y - dir.y * u.x) > 1e-3) return false
  }
  return true
}

function isLine(f: AcEdShapeFeature) {
  return f.kind === 'line' || f.kind.endsWith('|line')
}

/**
 * Copies of a growth round's template among the shapes the other
 * occurrences collected, found by the exact matcher: a cheap lower bound
 * of what searching the whole drawing finds.
 */
function localCopies(
  nodes: Node[],
  round: GrowthRound,
  options: AcApSmartBlockSearchOptions
): number {
  return acedFindShapeMatches(
    round.members.map(i => nodes[i].feature),
    round.collected.map(i => nodes[i].feature),
    {
      tolerance: options.tolerance,
      allowRotation: options.allowRotation,
      allowMirror: options.allowMirror,
      allowScale: options.allowScale
    }
  ).length
}

/** Every entity a group uses: the representative and its copies. */
function clusterIds(cluster: AcApSmartBlockCluster): AcDbObjectId[] {
  return [...cluster.ids, ...cluster.matches.flatMap(m => m.ids)]
}

/** Texts indexed by their extents center. */
class TextGrid {
  private readonly grid: CellGrid

  constructor(
    readonly texts: TextNode[],
    cell: number
  ) {
    this.grid = new CellGrid(cell)
    texts.forEach((t, i) => this.grid.add(t.center.x, t.center.y, i))
  }

  /** Texts whose center lies in the box. */
  inBox(minX: number, minY: number, maxX: number, maxY: number): TextNode[] {
    const found = new Set<number>()
    this.grid.forEachIn(minX, minY, maxX, maxY, i => {
      const c = this.texts[i].center
      if (c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY) {
        found.add(i)
      }
    })
    return [...found].map(i => this.texts[i])
  }
}

/** Free texts whose extents center lies within the group's bounds. */
function textsInside(
  texts: TextGrid,
  members: Node[],
  claimed: Set<AcDbObjectId>
): AcDbObjectId[] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of members) {
    const c = n.feature.center
    minX = Math.min(minX, c.x - n.radius)
    minY = Math.min(minY, c.y - n.radius)
    maxX = Math.max(maxX, c.x + n.radius)
    maxY = Math.max(maxY, c.y + n.radius)
  }
  return texts
    .inBox(minX, minY, maxX, maxY)
    .filter(t => !claimed.has(t.id))
    .map(t => t.id)
}

/** What {@link verify} searches with. */
interface VerifyContext {
  db: AcDbDatabase
  options: AcApSmartBlockSearchOptions
  cache: AcApSmartBlockFeatureCache
  claimed: Set<AcDbObjectId>
}

/** Verified copies of `ids` that use no claimed entity. */
function verify(
  context: VerifyContext,
  ids: AcDbObjectId[],
  pool: AcApSmartBlockCandidatePool
): AcApSmartBlockMatch[] {
  const { db, options, cache, claimed } = context
  const template = acapBuildSmartBlockTemplate(db, ids, options)
  const r = acapFindSmartBlockMatches(db, template, options, cache, pool)
  return r.filter(m => m.ids.every(id => !claimed.has(id)))
}

function dist(a: AcEdPoint2d, b: AcEdPoint2d) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function sub(a: AcEdPoint2d, b: AcEdPoint2d): AcEdPoint2d {
  return { x: a.x - b.x, y: a.y - b.y }
}
