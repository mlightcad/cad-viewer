import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import { eventBus } from '../../editor/global/eventBus'
import { acapNotifyUndoStackChanged } from '../../util/AcApDatabaseEdit'
import { getMarkupStore } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'

/** One undoable markup store mutation (full-store snapshots). */
interface AcApMarkupHistoryEntry {
  label: string
  before: AcApMarkupRecord[]
  after: AcApMarkupRecord[]
  beforeDirty: boolean
  afterDirty: boolean
}

type SessionOpKind = 'db' | 'markup'

/**
 * Snapshot-based undo/redo for Design Review markups.
 *
 * Markups are not DWG objects, so they cannot use database undo. This stack is
 * coordinated with DB undo via {@link AcApSessionUndo}.
 *
 * Visual republish is the caller's responsibility after {@link undo}/{@link redo}.
 */
export class AcApMarkupHistory {
  private readonly undoStack: AcApMarkupHistoryEntry[] = []
  private readonly redoStack: AcApMarkupHistoryEntry[] = []
  private depth = 0

  /** True while applying undo/redo or nested inside {@link run}. */
  get isBusy(): boolean {
    return this.depth > 0
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

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
 * Chronological session undo that interleaves DB edits and markup edits.
 */
export class AcApSessionUndo {
  private readonly undoKinds: SessionOpKind[] = []
  private readonly redoKinds: SessionOpKind[] = []

  /** Call when a new outermost DB undo mark is committed. */
  recordDb(): void {
    this.undoKinds.push('db')
    this.redoKinds.length = 0
    getMarkupHistory().clearRedo()
  }

  /** Call when a new markup history entry is pushed. */
  recordMarkup(): void {
    this.undoKinds.push('markup')
    this.redoKinds.length = 0
  }

  canUndo(db: AcDbDatabase): boolean {
    return (
      this.undoKinds.length > 0 ||
      getMarkupHistory().canUndo() ||
      (db.transactionManager?.canUndo() ?? false)
    )
  }

  canRedo(db: AcDbDatabase): boolean {
    return (
      this.redoKinds.length > 0 ||
      getMarkupHistory().canRedo() ||
      (db.transactionManager?.canRedo() ?? false)
    )
  }

  /**
   * Undo the chronologically last session op.
   * @returns `'markup'` when visuals must be republished, `'db'` when only DB
   *   changed, or `false` when nothing was undone.
   */
  undo(db: AcDbDatabase): 'markup' | 'db' | false {
    while (true) {
      const kind = this.undoKinds.pop()
      if (kind === 'markup') {
        if (getMarkupHistory().undo()) {
          this.redoKinds.push('markup')
          return 'markup'
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
      if (db.transactionManager?.undo()) {
        this.redoKinds.push('db')
        return 'db'
      }
      return false
    }
  }

  /**
   * Redo the chronologically last undone session op.
   * @returns `'markup'` when visuals must be republished, `'db'` when only DB
   *   changed, or `false` when nothing was redone.
   */
  redo(db: AcDbDatabase): 'markup' | 'db' | false {
    while (true) {
      const kind = this.redoKinds.pop()
      if (kind === 'markup') {
        if (getMarkupHistory().redo()) {
          this.undoKinds.push('markup')
          return 'markup'
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
      if (db.transactionManager?.redo()) {
        this.undoKinds.push('db')
        return 'db'
      }
      return false
    }
  }

  clear(): void {
    this.undoKinds.length = 0
    this.redoKinds.length = 0
  }
}

let sharedHistory: AcApMarkupHistory | undefined
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

function cloneRecords(records: AcApMarkupRecord[]): AcApMarkupRecord[] {
  return structuredClone(records)
}

function recordsEqual(a: AcApMarkupRecord[], b: AcApMarkupRecord[]): boolean {
  if (a.length !== b.length) return false
  return JSON.stringify(a) === JSON.stringify(b)
}
