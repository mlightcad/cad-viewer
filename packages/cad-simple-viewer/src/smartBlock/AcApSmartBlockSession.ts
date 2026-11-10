import {
  type AcDbDatabase,
  type AcDbObjectId,
  AcGeBox2d
} from '@mlightcad/data-model'

import {
  acapBuildSmartBlockTemplate,
  acapFindSmartBlockMatches,
  AcApSmartBlockFeatureCache,
  type AcApSmartBlockMatch,
  type AcApSmartBlockSearchOptions,
  type AcApSmartBlockTemplate,
  acapSmartBlockTemplateCenter,
  acapSmartBlockVariableTexts
} from './AcApSmartBlockSearch'
import type { AcEdPoint2d } from './AcEdShapeMatcher'

/** View features the review session drives (an `AcEdBaseView` fits). */
export interface AcApSmartBlockReviewView {
  selectionSet: {
    clear(): void
    add(ids: AcDbObjectId[]): void
  }
  zoomTo(box: AcGeBox2d, margin?: number): void
}

/**
 * Review state of one Smart Blocks search (`BSEARCH`): the template, its
 * matches, which ones are included and which one is current.
 *
 * The session is UI-agnostic; the command-line `-BSEARCH` and the editor's
 * review toolbar both drive it and listen to {@link onChange}.
 */
export class AcApSmartBlockSearch {
  readonly db: AcDbDatabase
  readonly template: AcApSmartBlockTemplate
  private _options: AcApSmartBlockSearchOptions
  private _matches: AcApSmartBlockMatch[] = []
  private _current = -1
  private readonly listeners = new Set<() => void>()
  private readonly cache = new AcApSmartBlockFeatureCache()

  /**
   * Builds the template from `ids` and runs the first search.
   *
   * @param db - Drawing database.
   * @param ids - Selected source entity ids.
   * @param options - Initial search options.
   */
  constructor(
    db: AcDbDatabase,
    ids: AcDbObjectId[],
    options: AcApSmartBlockSearchOptions = {}
  ) {
    this.db = db
    this._options = {
      ...options,
      textVariations: options.textVariations ?? true
    }
    this.template = acapBuildSmartBlockTemplate(db, ids, options)
    this.search()
  }

  /** Current search options. */
  get options(): Readonly<AcApSmartBlockSearchOptions> {
    return this._options
  }

  /** All found instances (the source selection is not one of them). */
  get matches(): readonly AcApSmartBlockMatch[] {
    return this._matches
  }

  /** Number of instances that will be converted. */
  get includedCount() {
    return this._matches.filter(m => m.included).length
  }

  /** Index of the instance under review, or `-1` before navigation. */
  get current() {
    return this._current
  }

  /** Default insertion point: the center of the selected geometry. */
  get defaultBasePoint(): AcEdPoint2d {
    return acapSmartBlockTemplateCenter(this.template)
  }

  /** Indices of template texts that differ in included instances. */
  get variableTexts(): number[] {
    return acapSmartBlockVariableTexts(this.template, this._matches)
  }

  /**
   * Changes options and searches again. Inclusion choices are reset because
   * the instance list changes.
   */
  setOptions(options: Partial<AcApSmartBlockSearchOptions>) {
    this._options = { ...this._options, ...options }
    this.search()
  }

  /** Moves to instance `index` (clamped and wrapped around). */
  setCurrent(index: number) {
    const n = this._matches.length
    if (n === 0) return
    this._current = ((index % n) + n) % n
    this.emit()
  }

  /** Moves to the next instance. */
  next() {
    this.setCurrent(this._current + 1)
  }

  /** Moves to the previous instance. */
  prev() {
    this.setCurrent(this._current < 0 ? -1 : this._current - 1)
  }

  /** Includes or excludes instance `index`; toggles when `value` is omitted. */
  setIncluded(index: number, value?: boolean) {
    const match = this._matches[index]
    if (!match) return
    match.included = value ?? !match.included
    this.emit()
  }

  /** Includes or excludes every instance. */
  setAllIncluded(value: boolean) {
    this._matches.forEach(m => (m.included = value))
    this.emit()
  }

  /** Index of the instance containing entity `id`, or `-1`. */
  indexOfEntity(id: AcDbObjectId) {
    return this._matches.findIndex(m => m.ids.includes(id))
  }

  /** WCS extents of instance `index` (the source selection for `-1`). */
  extentsOf(index: number): AcGeBox2d {
    const ids =
      index < 0 ? this.template.ids : (this._matches[index]?.ids ?? [])
    const box = new AcGeBox2d()
    const blockTable = this.db.tables.blockTable
    for (const id of ids) {
      const ext = blockTable.getEntityById(id)?.geometricExtents
      if (!ext || ext.isEmpty()) continue
      box.expandByPoint(ext.min)
      box.expandByPoint(ext.max)
    }
    return box
  }

  /**
   * Highlights the source selection and every included instance.
   *
   * @param view - View whose selection set is used as highlight.
   */
  highlight(view: AcApSmartBlockReviewView) {
    view.selectionSet.clear()
    view.selectionSet.add([
      ...this.template.ids,
      ...this._matches.filter(m => m.included).flatMap(m => m.ids)
    ])
  }

  /** Zooms `view` to the current instance (or the source selection). */
  zoomToCurrent(view: AcApSmartBlockReviewView, margin = 2) {
    const box = this.extentsOf(this._current)
    if (!box.isEmpty()) view.zoomTo(box, margin)
  }

  /**
   * Subscribes to state changes.
   *
   * @returns Function that removes the listener.
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Drops listeners; call when the review ends. */
  dispose() {
    this.listeners.clear()
  }

  private search() {
    this._matches = acapFindSmartBlockMatches(
      this.db,
      this.template,
      this._options,
      this.cache
    )
    this._current = -1
    this.emit()
  }

  private emit() {
    this.listeners.forEach(listener => listener())
  }
}
