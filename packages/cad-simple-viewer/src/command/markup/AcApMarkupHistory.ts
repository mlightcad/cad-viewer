import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import { eventBus } from '../../editor/global/eventBus'
import { acapNotifyUndoStackChanged } from '../../util/AcApDatabaseEdit'
import { getMarkupStore } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'

/**
 * One undoable markup store mutation (full-store snapshots).
 */
interface AcApMarkupHistoryEntry {
  /** Human-readable undo label (e.g. command name). */
  label: string
  /** Markup records before the mutation. */
  before: AcApMarkupRecord[]
  /** Markup records after the mutation. */
  after: AcApMarkupRecord[]
  /** Store dirty flag before the mutation. */
  beforeDirty: boolean
  /** Store dirty flag after the mutation. */
  afterDirty: boolean
}

/**
 * Kind of session-level undoable operation.
 * - `'db'`: CAD database transaction
 * - `'markup'`: Design Review markup store snapshot
 * - `'overlay'`: HTML overlay (e.g. measurement) history
 */
type SessionOpKind = 'db' | 'markup' | 'overlay'

/** Undo/redo binding for HTML overlay histories (e.g. measurements). */
export interface AcApOverlayHistoryBinding {
  /** Whether the overlay history has an undo step. */
  canUndo(): boolean
  /** Whether the overlay history has a redo step. */
  canRedo(): boolean
  /**
   * Undo the last overlay mutation.
   * @returns true when a step was applied.
   */
  undo(): boolean
  /**
   * Redo the last undone overlay mutation.
   * @returns true when a step was applied.
   */
  redo(): boolean
  /** Drop redo entries (e.g. after a new DB or markup edit). */
  clearRedo(): void
  /** Drop all overlay history (e.g. document close). */
  clear(): void
}

/** Bound HTML overlay history consulted by {@link AcApSessionUndo}. */
let overlayHistory: AcApOverlayHistoryBinding | undefined

/**
 * Register the measurement / HTML overlay history with session undo.
 * Pass `undefined` to unbind.
 * @param history - Overlay history adapter, or `undefined` to clear the binding.
 */
export function bindOverlayHistory(
  history: AcApOverlayHistoryBinding | undefined
): void {
  overlayHistory = history
}

/**
 * Snapshot-based undo/redo for Design Review markups.
 *
 * Markups are not DWG objects, so they cannot use database undo. This stack is
 * coordinated with DB undo via {@link AcApSessionUndo}.
 *
 * Visual republish is the caller's responsibility after {@link undo}/{@link redo}.
 */
export class AcApMarkupHistory {
  /** Undo stack of markup store snapshots (oldest first). */
  private readonly undoStack: AcApMarkupHistoryEntry[] = []
  /** Redo stack of markup store snapshots (oldest first). */
  private readonly redoStack: AcApMarkupHistoryEntry[] = []
  /**
   * Nesting depth of {@link run} / {@link apply}. Greater than zero means a
   * mutation is in progress and nested {@link run} calls are not recorded.
   */
  private depth = 0

  /** True while applying undo/redo or nested inside {@link run}. */
  get isBusy(): boolean {
    return this.depth > 0
  }

  /** Whether there is at least one markup undo step. */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** Whether there is at least one markup redo step. */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Drop redo entries (e.g. after a new DB edit). */
  clearRedo(): void {
    this.redoStack.length = 0
  }

  /** Drop all markup history (e.g. document close). */
  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }

  /**
   * Run a markup mutation and record one undo step when the store changes.
   * Nested calls do not create extra entries.
   * @param _view - Active view (unused; kept for API symmetry with overlay history).
   * @param label - Human-readable undo label.
   * @param mutate - Mutation to run against the markup store.
   */
  run(_view: AcEdBaseView, label: string, mutate: () => void): void {
    if (this.depth > 0) {
      mutate()
      return
    }

    const store = getMarkupStore()
    const before = cloneRecords(store.list())
    const beforeDirty = store.dirty

    this.depth++
    try {
      mutate()
    } finally {
      this.depth--
    }

    const after = cloneRecords(store.list())
    const afterDirty = store.dirty
    if (recordsEqual(before, after) && beforeDirty === afterDirty) {
      return
    }

    this.undoStack.push({ label, before, after, beforeDirty, afterDirty })
    this.redoStack.length = 0
    getSessionUndo().recordMarkup()
    acapNotifyUndoStackChanged()
  }

  /**
   * Restore the previous markup store snapshot.
   * @returns true when a snapshot was applied (caller should republish).
   */
  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false
    this.apply(entry.before, entry.beforeDirty)
    this.redoStack.push(entry)
    return true
  }

  /**
   * Restore the next markup store snapshot.
   * @returns true when a snapshot was applied (caller should republish).
   */
  redo(): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false
    this.apply(entry.after, entry.afterDirty)
    this.undoStack.push(entry)
    return true
  }

  /**
   * Replace the markup store with a snapshot and restore its dirty flag.
   * @param records - Markup records to restore.
   * @param dirty - Dirty flag to restore alongside the records.
   */
  private apply(records: AcApMarkupRecord[], dirty: boolean): void {
    this.depth++
    try {
      getMarkupStore().restore(records, { dirty })
    } finally {
      this.depth--
    }
  }
}

/**
 * Chronological session undo that interleaves DB edits, markup edits,
 * and HTML overlay (measurement) edits.
 */
export class AcApSessionUndo {
  /** Chronological kinds of committed session ops (oldest first). */
  private readonly undoKinds: SessionOpKind[] = []
  /** Chronological kinds of undone session ops waiting to redo (oldest first). */
  private readonly redoKinds: SessionOpKind[] = []

  /** Call when a new outermost DB undo mark is committed. */
  recordDb(): void {
    this.undoKinds.push('db')
    this.redoKinds.length = 0
    getMarkupHistory().clearRedo()
    overlayHistory?.clearRedo()
  }

  /** Call when a new markup history entry is pushed. */
  recordMarkup(): void {
    this.undoKinds.push('markup')
    this.redoKinds.length = 0
    overlayHistory?.clearRedo()
  }

  /** Call when a new HTML overlay (measurement) history entry is pushed. */
  recordOverlay(): void {
    this.undoKinds.push('overlay')
    this.redoKinds.length = 0
    getMarkupHistory().clearRedo()
  }

  /**
   * Whether any session op (DB, markup, or overlay) can be undone.
   * @param db - Database whose transaction manager is consulted for DB undo.
   */
  canUndo(db: AcDbDatabase): boolean {
    return (
      this.undoKinds.length > 0 ||
      getMarkupHistory().canUndo() ||
      (overlayHistory?.canUndo() ?? false) ||
      (db.transactionManager?.canUndo() ?? false)
    )
  }

  /**
   * Whether any session op (DB, markup, or overlay) can be redone.
   * @param db - Database whose transaction manager is consulted for DB redo.
   */
  canRedo(db: AcDbDatabase): boolean {
    return (
      this.redoKinds.length > 0 ||
      getMarkupHistory().canRedo() ||
      (overlayHistory?.canRedo() ?? false) ||
      (db.transactionManager?.canRedo() ?? false)
    )
  }

  /**
   * Undo the chronologically last session op.
   * @param db - Database used when the last op was a DB transaction.
   * @returns `'markup'` when markup visuals must be republished, `'overlay'`
   *   when HTML overlay undo already updated the view, `'db'` when only DB
   *   changed, or `false` when nothing was undone.
   */
  undo(db: AcDbDatabase): 'markup' | 'overlay' | 'db' | false {
    while (true) {
      const kind = this.undoKinds.pop()
      if (kind === 'markup') {
        if (getMarkupHistory().undo()) {
          this.redoKinds.push('markup')
          return 'markup'
        }
        continue
      }
      if (kind === 'overlay') {
        if (overlayHistory?.undo()) {
          this.redoKinds.push('overlay')
          return 'overlay'
        }
        continue
      }
      if (kind === 'db') {
        if (db.transactionManager.undo()) {
          this.redoKinds.push('db')
          return 'db'
        }
        continue
      }
      if (getMarkupHistory().undo()) {
        this.redoKinds.push('markup')
        return 'markup'
      }
      if (overlayHistory?.undo()) {
        this.redoKinds.push('overlay')
        return 'overlay'
      }
      if (db.transactionManager?.undo()) {
        this.redoKinds.push('db')
        return 'db'
      }
      return false
    }
  }

  /**
   * Redo the chronologically last undone session op.
   * @param db - Database used when the last undone op was a DB transaction.
   * @returns `'markup'` when markup visuals must be republished, `'overlay'`
   *   when HTML overlay redo already updated the view, `'db'` when only DB
   *   changed, or `false` when nothing was redone.
   */
  redo(db: AcDbDatabase): 'markup' | 'overlay' | 'db' | false {
    while (true) {
      const kind = this.redoKinds.pop()
      if (kind === 'markup') {
        if (getMarkupHistory().redo()) {
          this.undoKinds.push('markup')
          return 'markup'
        }
        continue
      }
      if (kind === 'overlay') {
        if (overlayHistory?.redo()) {
          this.undoKinds.push('overlay')
          return 'overlay'
        }
        continue
      }
      if (kind === 'db') {
        if (db.transactionManager.redo()) {
          this.undoKinds.push('db')
          return 'db'
        }
        continue
      }
      if (getMarkupHistory().redo()) {
        this.undoKinds.push('markup')
        return 'markup'
      }
      if (overlayHistory?.redo()) {
        this.undoKinds.push('overlay')
        return 'overlay'
      }
      if (db.transactionManager?.redo()) {
        this.undoKinds.push('db')
        return 'db'
      }
      return false
    }
  }

  /** Drop session undo/redo kinds and bound overlay history. */
  clear(): void {
    this.undoKinds.length = 0
    this.redoKinds.length = 0
    overlayHistory?.clear()
  }
}

/** Session-wide markup history singleton. */
let sharedHistory: AcApMarkupHistory | undefined
/** Session-wide DB / markup / overlay undo coordinator singleton. */
let sharedSessionUndo: AcApSessionUndo | undefined

/** Shared markup history for the active session. */
export function getMarkupHistory(): AcApMarkupHistory {
  if (!sharedHistory) sharedHistory = new AcApMarkupHistory()
  return sharedHistory
}

/** Shared session undo coordinator. */
export function getSessionUndo(): AcApSessionUndo {
  if (!sharedSessionUndo) sharedSessionUndo = new AcApSessionUndo()
  return sharedSessionUndo
}

/**
 * Record an undoable markup edit.
 * Prefer this over mutating the store directly from UI / commands.
 * @param view - Active view (unused by history; kept for API symmetry).
 * @param label - Human-readable undo label.
 * @param mutate - Mutation to run against the markup store.
 */
export function runMarkupEdit(
  view: AcEdBaseView,
  label: string,
  mutate: () => void
): void {
  getMarkupHistory().run(view, label, mutate)
}

// Bind at module load so early DB edits are not missed before first markup use.
eventBus.on('session-db-edit-committed', () => {
  getSessionUndo().recordDb()
})

/**
 * Deep-clone markup records so later store mutations cannot alias history.
 * @param records - Records to snapshot.
 * @returns Independent copies of `records`.
 */
function cloneRecords(records: AcApMarkupRecord[]): AcApMarkupRecord[] {
  return structuredClone(records)
}

/**
 * Whether two markup-record snapshots are structurally equal.
 * @param a - First snapshot.
 * @param b - Second snapshot.
 * @returns true when both arrays stringify to the same JSON.
 */
function recordsEqual(a: AcApMarkupRecord[], b: AcApMarkupRecord[]): boolean {
  if (a.length !== b.length) return false
  return JSON.stringify(a) === JSON.stringify(b)
}
