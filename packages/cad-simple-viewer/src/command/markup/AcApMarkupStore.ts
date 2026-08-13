import type {
  AcApMarkupRecord,
  AcApMarkupSidecarFile,
  AcApMarkupStatus,
  AcApMarkupStoreListener
} from './AcApMarkupTypes'

/** HTML transient layer for committed markup overlays. */
export const MARKUP_LAYER = 'markup'

/** HTML transient layer for in-progress markup jig / live preview. */
export const MARKUP_LIVE_LAYER = 'markup-live'

/**
 * In-memory store for Design Review markups.
 *
 * Presentation (HTML / CAD transients) is owned by {@link AcApMarkupPresenter}.
 * This store holds the serializable records and selection / dirty state.
 */
export class AcApMarkupStore {
  private readonly records = new Map<string, AcApMarkupRecord>()
  private readonly listeners = new Set<AcApMarkupStoreListener>()
  private _selectedId: string | undefined
  private _dirty = false
  private _drawingName: string | undefined

  /** Drawing file name associated with the current sidecar. */
  get drawingName(): string | undefined {
    return this._drawingName
  }
  set drawingName(value: string | undefined) {
    this._drawingName = value
  }

  /** Whether the store has unsaved changes since last import/export/clear. */
  get dirty(): boolean {
    return this._dirty
  }

  /** Currently selected markup id (if any). */
  get selectedId(): string | undefined {
    return this._selectedId
  }

  /** All markup records in insertion order. */
  list(): AcApMarkupRecord[] {
    return [...this.records.values()]
  }

  /** Look up one record by id. */
  get(id: string): AcApMarkupRecord | undefined {
    return this.records.get(id)
  }

  /** Whether a record exists. */
  has(id: string): boolean {
    return this.records.has(id)
  }

  /** Number of stored markups. */
  get size(): number {
    return this.records.size
  }

  /**
   * Insert or replace a record.
   * Does not touch presentation — callers must publish via the presenter.
   */
  upsert(record: AcApMarkupRecord, options?: { markDirty?: boolean }): void {
    this.records.set(record.id, record)
    if (options?.markDirty !== false) this._dirty = true
    this.emit()
  }

  /**
   * Patch metadata fields on an existing record.
   * @returns the updated record, or undefined if missing.
   */
  updateMeta(
    id: string,
    patch: Partial<
      Pick<AcApMarkupRecord, 'comment' | 'status' | 'author' | 'text'>
    >
  ): AcApMarkupRecord | undefined {
    const existing = this.records.get(id)
    if (!existing) return undefined
    const next: AcApMarkupRecord = {
      ...existing,
      ...patch,
      geometry:
        patch.text !== undefined
          ? withAttachedCalloutText(existing.geometry, patch.text)
          : existing.geometry,
      updatedAt: new Date().toISOString()
    }
    this.records.set(id, next)
    this._dirty = true
    this.emit()
    return next
  }

  /**
   * Patch drawing style on an existing record.
   * @returns the updated record, or undefined if missing.
   */
  updateStyle(
    id: string,
    patch: Partial<AcApMarkupRecord['style']>
  ): AcApMarkupRecord | undefined {
    const existing = this.records.get(id)
    if (!existing) return undefined
    const next: AcApMarkupRecord = {
      ...existing,
      style: { ...existing.style, ...patch },
      updatedAt: new Date().toISOString()
    }
    this.records.set(id, next)
    this._dirty = true
    this.emit()
    return next
  }

  /**
   * Replace geometry on an existing record (e.g. after callout grip drag).
   * @returns the updated record, or undefined if missing.
   */
  updateGeometry(
    id: string,
    geometry: AcApMarkupRecord['geometry']
  ): AcApMarkupRecord | undefined {
    const existing = this.records.get(id)
    if (!existing) return undefined
    const next: AcApMarkupRecord = {
      ...existing,
      geometry,
      updatedAt: new Date().toISOString()
    }
    this.records.set(id, next)
    this._dirty = true
    this.emit()
    return next
  }

  /**
   * Remove a record from the store only (no presentation cleanup).
   * @returns true when a record was removed.
   */
  removeRecord(id: string, options?: { markDirty?: boolean }): boolean {
    if (!this.records.delete(id)) return false
    if (this._selectedId === id) this._selectedId = undefined
    if (options?.markDirty !== false) this._dirty = true
    this.emit()
    return true
  }

  /** Replace all records from a sidecar payload (does not mark dirty). */
  replaceAll(records: AcApMarkupRecord[], drawingName?: string): void {
    this.records.clear()
    for (const r of records) {
      this.records.set(r.id, r)
    }
    if (drawingName !== undefined) this._drawingName = drawingName
    this._selectedId = undefined
    this._dirty = false
    this.emit()
  }

  /**
   * Replace store contents from an undo/redo snapshot.
   * Preserves dirty flag from the snapshot epoch.
   */
  restore(
    records: AcApMarkupRecord[],
    options?: { dirty?: boolean }
  ): void {
    this.records.clear()
    for (const r of records) {
      this.records.set(r.id, r)
    }
    this._selectedId = undefined
    if (options?.dirty !== undefined) this._dirty = options.dirty
    this.emit()
  }

  /** Clear every record. */
  clear(options?: { markDirty?: boolean }): void {
    if (this.records.size === 0 && this._selectedId == null) return
    this.records.clear()
    this._selectedId = undefined
    if (options?.markDirty !== false) this._dirty = true
    this.emit()
  }

  /**
   * Drop all session state when the drawing is replaced (open / new).
   * Does not mark dirty and does not create an undo step.
   */
  reset(): void {
    this.records.clear()
    this._selectedId = undefined
    this._dirty = false
    this._drawingName = undefined
    this.emit()
  }

  /** Select a markup by id (or clear when undefined). */
  setSelectedId(id: string | undefined): void {
    if (this._selectedId === id) return
    this._selectedId = id
    this.emit()
  }

  /** Build a sidecar JSON object from current records. */
  toSidecar(): AcApMarkupSidecarFile {
    return {
      version: 1,
      drawingName: this._drawingName,
      markups: this.list()
    }
  }

  /** Mark the store as clean after a successful export. */
  markClean(): void {
    this._dirty = false
    this.emit()
  }

  /** Subscribe to store changes. Returns an unsubscribe function. */
  subscribe(listener: AcApMarkupStoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch {
        // Listener errors must not break the store.
      }
    }
  }
}

/** Process-wide markup store (one active drawing session). */
let sharedStore: AcApMarkupStore | undefined

/** Returns the shared markup store, creating it on first use. */
export function getMarkupStore(): AcApMarkupStore {
  if (!sharedStore) sharedStore = new AcApMarkupStore()
  return sharedStore
}

/**
 * Keep shape-attached callout bubble text in sync with the record label.
 */
function withAttachedCalloutText(
  geometry: AcApMarkupRecord['geometry'],
  text: string | undefined
): AcApMarkupRecord['geometry'] {
  if (
    (geometry.type === 'cloud' ||
      geometry.type === 'rect' ||
      geometry.type === 'circle') &&
    geometry.callout
  ) {
    return {
      ...geometry,
      callout: { ...geometry.callout, text }
    }
  }
  return geometry
}

/** Valid status values for UI / validation. */
export const MARKUP_STATUSES: readonly AcApMarkupStatus[] = [
  'open',
  'question',
  'answered',
  'closed'
] as const
