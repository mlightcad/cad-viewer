/**
 * Whole-drawing text search (FIND across layouts).
 *
 * Builds on {@link acapFindTextInLayout}: every layout of the drawing (model
 * space and each paper space, in tab order) is searched with the same rules,
 * and every hit is tagged with the layout it lives in so a UI can show it and
 * navigate there.
 *
 * Pure TypeScript with no runtime imports (structural database shape), shared
 * by cad-simple-ui-plugin and the Vue cad-viewer.
 */
import {
  ACAP_FIND_MAX_RESULTS,
  type AcApFindDatabaseLike,
  type AcApFindHit,
  type AcApFindOptions,
  acapFindTextInLayout
} from './findText'

/**
 * Where to search.
 *
 * - `drawing` (default): every layout of the drawing
 * - `layout`: only the layout that is currently active in the view
 */
export type AcApFindScope = 'drawing' | 'layout'

/** One layout of the drawing (model space or paper space). */
export interface AcApFindLayoutInfo {
  /** Layout name as shown on the layout tab (e.g. `Model`, `Layout1`). */
  name: string
  /** Block table record id of the layout. */
  btrId: string
  /** Tab order; layouts are searched and listed in this order. */
  tabOrder: number
}

/** A hit that also identifies the layout that contains it. */
export interface AcApFindLayoutHit extends AcApFindHit {
  /** Block table record id of the layout containing the hit. */
  layoutId: string
  /** Name of the layout containing the hit. */
  layoutName: string
}

/** Result of one drawing-level search. */
export interface AcApFindDrawingResult {
  hits: AcApFindLayoutHit[]
  /** True when more than `maxResults` entities matched. */
  truncated: boolean
}

/** Options for {@link acapFindText}. */
export interface AcApFindDrawingOptions extends AcApFindOptions {
  /** Search scope; defaults to `drawing`. */
  scope?: AcApFindScope
  /**
   * Block table record id of the layout currently shown. Required for the
   * `layout` scope; also used as the only layout when the drawing exposes no
   * layout objects.
   */
  currentLayoutId: string
}

interface LayoutLike {
  layoutName?: string
  tabOrder?: number
  blockTableRecordId?: string
}

/** Database shape used to enumerate layouts. */
export interface AcApFindLayoutsDatabaseLike {
  objects?: {
    layout?: { newIterator?(): Iterable<LayoutLike> }
  }
}

/**
 * Lists the layouts of a drawing sorted by tab order (model space first in
 * practice). Returns an empty list when the drawing has no layout objects.
 */
export function acapListFindLayouts(
  db: AcApFindLayoutsDatabaseLike
): AcApFindLayoutInfo[] {
  const table = db.objects?.layout
  if (!table?.newIterator) return []
  const layouts: AcApFindLayoutInfo[] = []
  for (const layout of table.newIterator()) {
    if (!layout.blockTableRecordId) continue
    layouts.push({
      name: layout.layoutName ?? '',
      btrId: layout.blockTableRecordId,
      tabOrder: Number(layout.tabOrder) || 0
    })
  }
  return layouts.sort(
    (a, b) => a.tabOrder - b.tabOrder || a.name.localeCompare(b.name)
  )
}

/**
 * Finds text in the whole drawing or in the current layout only.
 *
 * Layouts are visited in tab order and the result cap is shared, so
 * `truncated` is true as soon as any match beyond `maxResults` exists in any
 * searched layout. Search runs on the database, not on the rendered scene, so
 * layouts that were never opened in the view are searched too.
 */
export function acapFindText(
  db: AcApFindDatabaseLike & AcApFindLayoutsDatabaseLike,
  query: string,
  options: AcApFindDrawingOptions
): AcApFindDrawingResult {
  const max = options.maxResults ?? ACAP_FIND_MAX_RESULTS
  const known = acapListFindLayouts(db)
  const nameOf = (btrId: string) =>
    known.find(layout => layout.btrId === btrId)?.name ?? ''

  let targets: Array<{ btrId: string; name: string }>
  if (options.scope === 'layout' || known.length === 0) {
    targets = [
      { btrId: options.currentLayoutId, name: nameOf(options.currentLayoutId) }
    ]
  } else {
    targets = known.map(layout => ({ btrId: layout.btrId, name: layout.name }))
  }

  const result: AcApFindDrawingResult = { hits: [], truncated: false }
  for (const target of targets) {
    const found = acapFindTextInLayout(db, target.btrId, query, {
      matchCase: options.matchCase,
      maxResults: max - result.hits.length
    })
    for (const hit of found.hits) {
      result.hits.push({
        ...hit,
        layoutId: target.btrId,
        layoutName: target.name
      })
    }
    if (found.truncated) {
      result.truncated = true
      break
    }
  }
  return result
}

/** Axis-aligned 2D box in WCS (plain numbers; no geometry library needed). */
export interface AcApFindBox {
  min: { x: number; y: number }
  max: { x: number; y: number }
}

type XY = { x: number; y: number }
interface WithExtents {
  geometricExtents?: { min: XY; max: XY }
}

/**
 * View box for a hit: the text extents (`hit.extents` for nested text), widened so a short label does not
 * zoom in absurdly far (at least ~10 text heights wide). Falls back to the
 * hit position when the entity has no usable extents.
 *
 * @param layoutBtrId - Layout that contains the hit (`hit.layoutId`).
 */
export function acapFindHitBox(
  db: AcApFindDatabaseLike,
  layoutBtrId: string,
  hit: AcApFindHit
): AcApFindBox {
  const btr = db.tables.blockTable.getIdAt(layoutBtrId)
  const owner = btr?.getIdAt?.(hit.entityId) as
    | (WithExtents & {
        attributeIterator?: () => Iterable<WithExtents & { objectId: string }>
      })
    | undefined
  let target: WithExtents | undefined = owner
  if (hit.kind === 'attribute' && owner?.attributeIterator) {
    for (const attribute of owner.attributeIterator()) {
      if (attribute.objectId === hit.textEntityId) {
        target = attribute
        break
      }
    }
  }
  let min: XY
  let max: XY
  try {
    // Text nested in a block / dimension / table: the search already
    // resolved its WCS extents (the owner's extents are the whole block).
    const extents = hit.extents ?? target?.geometricExtents
    if (!extents || !isFinite(extents.min.x) || !isFinite(extents.max.x)) {
      throw new Error('no extents')
    }
    min = extents.min
    max = extents.max
  } catch {
    min = max = hit.position
  }
  const cx = (min.x + max.x) / 2
  const cy = (min.y + max.y) / 2
  const w = max.x - min.x
  const h = max.y - min.y
  const width = Math.max(w * 3, h * 10, 1e-3)
  const height = Math.max(h * 3, width / 4, 1e-3)
  return {
    min: { x: cx - width / 2, y: cy - height / 2 },
    max: { x: cx + width / 2, y: cy + height / 2 }
  }
}
