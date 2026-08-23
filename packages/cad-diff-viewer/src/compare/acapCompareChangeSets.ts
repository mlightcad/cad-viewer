import type {
  AcApDiffChangeKind,
  AcApDiffEntityHit
} from './acapCompareDrawings'

/** Markup-cloud color role derived from a change set's kinds. */
export type AcApDiffCloudColorRole = 'added' | 'deleted' | 'modified'

/** Axis-aligned box used by {@link AcApDiffChangeSet}. */
export interface AcApDiffChangeSetExtents {
  /** Minimum X in WCS. */
  minX: number
  /** Minimum Y in WCS. */
  minY: number
  /** Maximum X in WCS. */
  maxX: number
  /** Maximum Y in WCS. */
  maxY: number
}

/**
 * One AutoCAD-style change set: nearby differences grouped so a single
 * revision cloud can enclose them.
 */
export interface AcApDiffChangeSet {
  /** Padded extents of the grouped hits (WCS). */
  extents: AcApDiffChangeSetExtents
  /** Object ids of hits in this set. */
  objectIds: string[]
  /** True when the set contains a left-drawing hit. */
  hasLeft: boolean
  /** True when the set contains a right-drawing hit. */
  hasRight: boolean
  /**
   * Unique change kinds in this set (`added` / `deleted` / `modified`).
   * Used to pick the revision-cloud markup color.
   */
  kinds: AcApDiffChangeKind[]
}

/**
 * Picks the Settings color role for a revision-cloud markup.
 *
 * A set that contains only one of added / deleted / modified uses that role.
 * Mixed-kind sets use the modified color.
 *
 * @param set - Change set whose `kinds` were collected at compare time.
 */
export function acapChangeSetCloudRole(
  set: Pick<AcApDiffChangeSet, 'kinds'>
): AcApDiffCloudColorRole {
  const unique: AcApDiffCloudColorRole[] = []
  for (const kind of set.kinds) {
    if (kind !== 'added' && kind !== 'deleted' && kind !== 'modified') continue
    if (!unique.includes(kind)) unique.push(kind)
  }
  if (unique.length === 1) return unique[0]!
  return 'modified'
}

/** Records a compare kind on a change set, ignoring unchanged hits. */
function pushKind(kinds: AcApDiffChangeKind[], kind: AcApDiffChangeKind) {
  if (kind === 'unchanged') return
  if (!kinds.includes(kind)) kinds.push(kind)
}

/** Converts COMPARERCMARGIN (1–25) into a WCS clustering/padding distance. */
function gapFromMargin(drawingSize: number, margin: number): number {
  const m = Math.max(1, Math.min(25, Math.trunc(margin)))
  const size = Math.max(drawingSize, 1)
  return size * (m / 250)
}

/** Expands a box by `gap` on every side. */
function inflate(
  box: AcApDiffChangeSetExtents,
  gap: number
): AcApDiffChangeSetExtents {
  return {
    minX: box.minX - gap,
    minY: box.minY - gap,
    maxX: box.maxX + gap,
    maxY: box.maxY + gap
  }
}

/** True when two boxes overlap or touch. */
function overlaps(
  a: AcApDiffChangeSetExtents,
  b: AcApDiffChangeSetExtents
): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

/** Union of two boxes. */
function union(
  a: AcApDiffChangeSetExtents,
  b: AcApDiffChangeSetExtents
): AcApDiffChangeSetExtents {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  }
}

/**
 * Groups difference hits into revision-cloud change sets.
 *
 * Nearby extents that overlap after expanding by COMPARERCMARGIN are merged.
 * Hits without extents are omitted.
 *
 * @param hits - Deleted, added, and modified hits (both sides).
 * @param drawingSize - Characteristic drawing size used to scale the margin.
 * @param margin - COMPARERCMARGIN (1–25).
 */
export function acapBuildCompareChangeSets(
  hits: readonly AcApDiffEntityHit[],
  drawingSize: number,
  margin: number
): AcApDiffChangeSet[] {
  const items: Array<{
    box: AcApDiffChangeSetExtents
    objectId: string
    side: AcApDiffEntityHit['side']
    kind: AcApDiffChangeKind
  }> = []
  for (const hit of hits) {
    if (hit.kind === 'unchanged') continue
    const e = hit.extents
    if (!e) continue
    items.push({
      box: { minX: e.minX, minY: e.minY, maxX: e.maxX, maxY: e.maxY },
      objectId: hit.objectId,
      side: hit.side,
      kind: hit.kind
    })
  }
  if (items.length === 0) return []

  const gap = gapFromMargin(drawingSize, margin)
  const expanded = items.map(item => inflate(item.box, gap))
  const parent = items.map((_, i) => i)
  const find = (i: number): number => {
    let root = i
    while (parent[root] !== root) root = parent[root]!
    let cur = i
    while (parent[cur] !== root) {
      const next = parent[cur]!
      parent[cur] = root
      cur = next
    }
    return root
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(expanded[i]!, expanded[j]!)) {
        const a = find(i)
        const b = find(j)
        if (a !== b) parent[b] = a
      }
    }
  }

  const groups = new Map<number, AcApDiffChangeSet>()
  for (let i = 0; i < items.length; i++) {
    const root = find(i)
    const item = items[i]!
    const existing = groups.get(root)
    if (!existing) {
      groups.set(root, {
        extents: inflate(item.box, gap),
        objectIds: [item.objectId],
        hasLeft: item.side === 'left',
        hasRight: item.side === 'right',
        kinds: [item.kind]
      })
      continue
    }
    existing.extents = union(existing.extents, inflate(item.box, gap))
    existing.objectIds.push(item.objectId)
    if (item.side === 'left') existing.hasLeft = true
    else existing.hasRight = true
    pushKind(existing.kinds, item.kind)
  }
  return [...groups.values()]
}
