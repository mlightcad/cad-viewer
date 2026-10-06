/**
 * Snapshot undo/redo for offline HTML markup + measurement overlays.
 *
 * Mirrors cad-simple-viewer {@link AcApMarkupHistory} / {@link AcApSessionUndo}
 * without DocManager, database transactions, or AcTrHtmlGroup detach/reattach.
 * HTML controllers own DOM/canvas visuals; history only stores sidecar records
 * and asks controllers to {@link AcExHistoryTarget.restore}.
 *
 * @module AcExSessionHistory
 * @packageDocumentation
 */

/** Kind of committed overlay edit in chronological session undo. */
export type AcExSessionOpKind = 'markup' | 'measure'

/** Controller binding used by {@link AcExSessionHistory}. */
export interface AcExHistoryTarget<T> {
  /** Deep-cloned sidecar records for the whole drawing. */
  snapshot: () => T
  /** Replace all committed overlays from a snapshot. */
  restore: (records: T) => void
}

interface SnapshotEntry<T> {
  label: string
  before: T
  after: T
}

/**
 * One overlay domain's undo/redo stack (markup or measure).
 */
class AcExSnapshotStack<T> {
  private readonly undoStack: SnapshotEntry<T>[] = []
  private readonly redoStack: SnapshotEntry<T>[] = []

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clearRedo(): void {
    this.redoStack.length = 0
  }

  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }

  push(entry: SnapshotEntry<T>): void {
    this.undoStack.push(entry)
    this.redoStack.length = 0
  }

  undo(restore: (records: T) => void): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false
    restore(entry.before)
    this.redoStack.push(entry)
    return true
  }

  redo(restore: (records: T) => void): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false
    restore(entry.after)
    this.undoStack.push(entry)
    return true
  }
}

function snapshotsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Chronological undo coordinator for HTML markup and measurement edits.
 */
export class AcExSessionHistory {
  private markupTarget: AcExHistoryTarget<unknown> | null = null
  private measureTarget: AcExHistoryTarget<unknown> | null = null
  private readonly markupStack = new AcExSnapshotStack<unknown>()
  private readonly measureStack = new AcExSnapshotStack<unknown>()
  private readonly undoKinds: AcExSessionOpKind[] = []
  private readonly redoKinds: AcExSessionOpKind[] = []
  private readonly listeners = new Set<() => void>()
  /** Nesting depth of {@link runMarkup} / {@link runMeasure}. */
  private depth = 0
  /** In-progress grip/text capture (before snapshot), by domain. */
  private markupCapture: unknown | null = null
  private measureCapture: unknown | null = null

  /** True while applying undo/redo or nested inside a recorded edit. */
  get isBusy(): boolean {
    return this.depth > 0
  }

  /**
   * Binds the markup controller snapshot/restore API.
   *
   * @param target - Markup history target.
   */
  attachMarkup<T>(target: AcExHistoryTarget<T>): void {
    this.markupTarget = target as AcExHistoryTarget<unknown>
  }

  /**
   * Binds the measurement controller snapshot/restore API.
   *
   * @param target - Measurement history target.
   */
  attachMeasure<T>(target: AcExHistoryTarget<T>): void {
    this.measureTarget = target as AcExHistoryTarget<unknown>
  }

  /**
   * Subscribe to stack changes (shortcut toolbar enable state).
   *
   * @returns Unsubscriber.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Whether any markup/measure session op can be undone. */
  canUndo(): boolean {
    return (
      this.undoKinds.length > 0 ||
      this.markupStack.canUndo() ||
      this.measureStack.canUndo()
    )
  }

  /** Whether any markup/measure session op can be redone. */
  canRedo(): boolean {
    return (
      this.redoKinds.length > 0 ||
      this.markupStack.canRedo() ||
      this.measureStack.canRedo()
    )
  }

  /**
   * Run a markup mutation and record one undo step when records change.
   *
   * @param _label - Human-readable undo label (kept for parity / debugging).
   * @param mutate - Mutation against the markup controller.
   */
  runMarkup(_label: string, mutate: () => void): void {
    this.run('markup', _label, mutate)
  }

  /**
   * Run a measurement mutation and record one undo step when records change.
   *
   * @param _label - Human-readable undo label.
   * @param mutate - Mutation against the measurement controller.
   */
  runMeasure(_label: string, mutate: () => void): void {
    this.run('measure', _label, mutate)
  }

  /**
   * Snapshot markup before an in-place grip / text edit.
   * Pair with {@link commitMarkupCapture}.
   */
  beginMarkupCapture(): void {
    if (this.depth > 0 || !this.markupTarget || this.markupCapture != null) {
      return
    }
    this.markupCapture = this.markupTarget.snapshot()
  }

  /**
   * Commit an in-place markup edit started with {@link beginMarkupCapture}.
   *
   * @param label - Human-readable undo label.
   */
  commitMarkupCapture(label: string): void {
    if (!this.markupTarget || this.markupCapture == null) {
      this.markupCapture = null
      return
    }
    const before = this.markupCapture
    this.markupCapture = null
    const after = this.markupTarget.snapshot()
    if (snapshotsEqual(before, after)) return
    this.markupStack.push({ label, before, after })
    this.undoKinds.push('markup')
    this.redoKinds.length = 0
    this.measureStack.clearRedo()
    this.notify()
  }

  /** Snapshot measure before an in-place grip edit. */
  beginMeasureCapture(): void {
    if (this.depth > 0 || !this.measureTarget || this.measureCapture != null) {
      return
    }
    this.measureCapture = this.measureTarget.snapshot()
  }

  /**
   * Commit an in-place measure edit started with {@link beginMeasureCapture}.
   *
   * @param label - Human-readable undo label.
   */
  commitMeasureCapture(label: string): void {
    if (!this.measureTarget || this.measureCapture == null) {
      this.measureCapture = null
      return
    }
    const before = this.measureCapture
    this.measureCapture = null
    const after = this.measureTarget.snapshot()
    if (snapshotsEqual(before, after)) return
    this.measureStack.push({ label, before, after })
    this.undoKinds.push('measure')
    this.redoKinds.length = 0
    this.markupStack.clearRedo()
    this.notify()
  }

  /**
   * Undo the chronologically last overlay edit.
   *
   * @returns Kind undone, or `false` when nothing changed.
   */
  undo(): AcExSessionOpKind | false {
    while (true) {
      const kind = this.undoKinds.pop()
      if (kind === 'markup') {
        if (
          this.markupTarget &&
          this.markupStack.undo(records => this.markupTarget!.restore(records))
        ) {
          this.redoKinds.push('markup')
          this.notify()
          return 'markup'
        }
        continue
      }
      if (kind === 'measure') {
        if (
          this.measureTarget &&
          this.measureStack.undo(records => this.measureTarget!.restore(records))
        ) {
          this.redoKinds.push('measure')
          this.notify()
          return 'measure'
        }
        continue
      }
      if (
        this.markupTarget &&
        this.markupStack.undo(records => this.markupTarget!.restore(records))
      ) {
        this.redoKinds.push('markup')
        this.notify()
        return 'markup'
      }
      if (
        this.measureTarget &&
        this.measureStack.undo(records => this.measureTarget!.restore(records))
      ) {
        this.redoKinds.push('measure')
        this.notify()
        return 'measure'
      }
      return false
    }
  }

  /**
   * Redo the chronologically last undone overlay edit.
   *
   * @returns Kind redone, or `false` when nothing changed.
   */
  redo(): AcExSessionOpKind | false {
    while (true) {
      const kind = this.redoKinds.pop()
      if (kind === 'markup') {
        if (
          this.markupTarget &&
          this.markupStack.redo(records => this.markupTarget!.restore(records))
        ) {
          this.undoKinds.push('markup')
          this.notify()
          return 'markup'
        }
        continue
      }
      if (kind === 'measure') {
        if (
          this.measureTarget &&
          this.measureStack.redo(records => this.measureTarget!.restore(records))
        ) {
          this.undoKinds.push('measure')
          this.notify()
          return 'measure'
        }
        continue
      }
      if (
        this.markupTarget &&
        this.markupStack.redo(records => this.markupTarget!.restore(records))
      ) {
        this.undoKinds.push('markup')
        this.notify()
        return 'markup'
      }
      if (
        this.measureTarget &&
        this.measureStack.redo(records => this.measureTarget!.restore(records))
      ) {
        this.undoKinds.push('measure')
        this.notify()
        return 'measure'
      }
      return false
    }
  }

  /** Drop all history (e.g. when tearing down the viewer). */
  clear(): void {
    this.undoKinds.length = 0
    this.redoKinds.length = 0
    this.markupStack.clear()
    this.measureStack.clear()
    this.markupCapture = null
    this.measureCapture = null
    this.notify()
  }

  private run(
    kind: AcExSessionOpKind,
    label: string,
    mutate: () => void
  ): void {
    const target = kind === 'markup' ? this.markupTarget : this.measureTarget
    const stack = kind === 'markup' ? this.markupStack : this.measureStack
    const otherStack = kind === 'markup' ? this.measureStack : this.markupStack
    if (!target || this.depth > 0) {
      mutate()
      return
    }
    const before = target.snapshot()
    this.depth++
    try {
      mutate()
    } finally {
      this.depth--
    }
    const after = target.snapshot()
    if (snapshotsEqual(before, after)) return
    stack.push({ label, before, after })
    this.undoKinds.push(kind)
    this.redoKinds.length = 0
    otherStack.clearRedo()
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}

/** Creates a fresh session history for one offline HTML viewer instance. */
export function createAcExSessionHistory(): AcExSessionHistory {
  return new AcExSessionHistory()
}
