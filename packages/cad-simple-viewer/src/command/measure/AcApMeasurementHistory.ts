import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcEdBaseView } from '../../editor'
import { acapNotifyUndoStackChanged } from '../../util/AcApDatabaseEdit'
import {
  type AcApMeasurementStyle,
  cloneMeasurementStyle} from '../../util/AcApMeasurementUtil'
import type { AcTrView2d } from '../../view'
import {
  bindOverlayHistory,
  getSessionUndo
} from '../markup/AcApMarkupHistory'
import {
  applyMeasurementStyle,
  getMeasurementStyle,
  MEASUREMENT_LAYER,
  resetMeasurementStyleState
} from './AcApMeasurementStore'

/**
 * One undoable measurement overlay mutation.
 *
 * Groups in {@link AcApMeasurementHistoryEntry.added} /
 * {@link AcApMeasurementHistoryEntry.removed} are
 * {@link AcTrHtmlTransientManager.detach}ed (kept alive) so undo can
 * {@link AcTrHtmlTransientManager.reattach} them.
 */
interface AcApMeasurementHistoryEntry {
  /** Human-readable undo label (e.g. command name). */
  label: string
  /** View whose HTML transients this entry belongs to. */
  view: AcTrView2d
  /** Groups present after the mutation but not before. */
  added: AcTrHtmlGroup[]
  /** Groups present before the mutation but not after. */
  removed: AcTrHtmlGroup[]
  /** Per-group style before the mutation. */
  stylesBefore: Record<string, AcApMeasurementStyle>
  /** Per-group style after the mutation. */
  stylesAfter: Record<string, AcApMeasurementStyle>
}

/**
 * Snapshot-based undo/redo for measurement HTML overlays.
 *
 * Measurements are not DWG objects and have no sidecar. Groups are
 * {@link AcTrHtmlTransientManager.detach}ed (kept alive) so undo can
 * {@link AcTrHtmlTransientManager.reattach} them.
 */
export class AcApMeasurementHistory {
  /** Undo stack of measurement overlay mutations (oldest first). */
  private readonly undoStack: AcApMeasurementHistoryEntry[] = []
  /** Redo stack of measurement overlay mutations (oldest first). */
  private readonly redoStack: AcApMeasurementHistoryEntry[] = []
  /**
   * Nesting depth of {@link run} / {@link apply}. Greater than zero means a
   * mutation is in progress and nested {@link run} calls are not recorded.
   */
  private depth = 0

  /** True while applying undo/redo or nested inside {@link run}. */
  get isBusy(): boolean {
    return this.depth > 0
  }

  /** Whether there is at least one measurement overlay undo step. */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** Whether there is at least one measurement overlay redo step. */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Drop redo entries and dispose detached groups they still hold.
   * Called after a new undoable edit so redo cannot jump over it.
   */
  clearRedo(): void {
    for (const entry of this.redoStack) {
      disposeDetachedGroups(entry)
    }
    this.redoStack.length = 0
  }

  /**
   * Drop history. Detached groups still referenced by the stacks are disposed.
   * Groups that remain on the view are left for {@link AcTrView2d.clear}.
   */
  clear(): void {
    for (const entry of [...this.undoStack, ...this.redoStack]) {
      disposeDetachedGroups(entry)
    }
    this.undoStack.length = 0
    this.redoStack.length = 0
  }

  /**
   * Run a measurement mutation and record one undo step when the committed
   * measurement groups on the view change. Nested calls do not create extra
   * entries.
   * @param view - View whose measurement HTML overlays are snapshotted.
   * @param label - Human-readable undo label.
   * @param mutate - Mutation that adds or removes measurement groups.
   */
  run(view: AcEdBaseView, label: string, mutate: () => void): void {
    if (this.depth > 0) {
      mutate()
      return
    }

    const view2d = view as AcTrView2d
    const before = snapshotMeasurementGroups(view2d)
    const stylesBefore = snapshotMeasurementStyles(before)

    this.depth++
    try {
      mutate()
    } finally {
      this.depth--
    }

    const after = snapshotMeasurementGroups(view2d)
    const added = after.filter(group => before.indexOf(group) < 0)
    const removed = before.filter(group => after.indexOf(group) < 0)
    const stylesAfter = snapshotMeasurementStyles(after)
    if (
      added.length === 0 &&
      removed.length === 0 &&
      !stylesChanged(stylesBefore, stylesAfter)
    ) {
      return
    }

    this.undoStack.push({
      label,
      view: view2d,
      added,
      removed,
      stylesBefore,
      stylesAfter
    })
    this.clearRedo()
    getSessionUndo().recordOverlay()
    acapNotifyUndoStackChanged()
  }

  /**
   * Undo the last measurement overlay mutation.
   * @returns true when an entry was applied.
   */
  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false
    this.apply(entry, 'undo')
    this.redoStack.push(entry)
    return true
  }

  /**
   * Redo the last undone measurement overlay mutation.
   * @returns true when an entry was applied.
   */
  redo(): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false
    this.apply(entry, 'redo')
    this.undoStack.push(entry)
    return true
  }

  /**
   * Apply one history entry by detaching and reattaching HTML groups.
   * @param entry - Snapshot of groups added and removed by the original edit.
   * @param direction - `'undo'` restores the pre-edit set; `'redo'` restores
   *   the post-edit set.
   */
  private apply(
    entry: AcApMeasurementHistoryEntry,
    direction: 'undo' | 'redo'
  ): void {
    this.depth++
    try {
      const ht = entry.view.htmlTransientManager
      const detach = direction === 'undo' ? entry.added : entry.removed
      const attach = direction === 'undo' ? entry.removed : entry.added
      for (const group of detach) {
        ht.detach(group.id)
      }
      for (const group of attach) {
        ht.reattach(group)
      }
      const styles = direction === 'undo' ? entry.stylesBefore : entry.stylesAfter
      for (const group of snapshotMeasurementGroups(entry.view)) {
        const style = styles[group.id]
        if (style) applyMeasurementStyle(entry.view, group, style)
      }
      entry.view.isDirty = true
    } finally {
      this.depth--
    }
  }
}

/**
 * Capture the committed measurement HTML groups currently on the view.
 * @param view - View whose measurement layer is snapshotted.
 * @returns Groups on {@link MEASUREMENT_LAYER}, in manager order.
 */
function snapshotMeasurementGroups(view: AcTrView2d): AcTrHtmlGroup[] {
  return view.htmlTransientManager.groupsOnLayer(MEASUREMENT_LAYER)
}

function snapshotMeasurementStyles(
  groups: AcTrHtmlGroup[]
): Record<string, AcApMeasurementStyle> {
  const styles: Record<string, AcApMeasurementStyle> = {}
  for (const group of groups) {
    const style = getMeasurementStyle(group.id)
    if (style) styles[group.id] = cloneMeasurementStyle(style)
  }
  return styles
}

function stylesChanged(
  before: Record<string, AcApMeasurementStyle>,
  after: Record<string, AcApMeasurementStyle>
): boolean {
  const beforeIds = Object.keys(before)
  const afterIds = Object.keys(after)
  if (beforeIds.length !== afterIds.length) return true
  for (const id of beforeIds) {
    const a = before[id]
    const b = after[id]
    if (!b) return true
    if (
      a.lineWeight !== b.lineWeight ||
      a.fontSize !== b.fontSize ||
      a.color.red !== b.color.red ||
      a.color.green !== b.color.green ||
      a.color.blue !== b.color.blue
    ) {
      return true
    }
  }
  return false
}

/**
 * Dispose groups in an entry that are no longer attached to the view.
 * Attached groups are left for the view / manager to own.
 * @param entry - History entry whose detached groups may be discarded.
 */
function disposeDetachedGroups(entry: AcApMeasurementHistoryEntry): void {
  const ht = entry.view.htmlTransientManager
  for (const group of [...entry.added, ...entry.removed]) {
    if (ht.has(group.id)) continue
    for (const child of group.children) {
      child.dispose()
    }
    group.dispose()
  }
}

/** Session-wide measurement overlay history singleton. */
let sharedHistory: AcApMeasurementHistory | undefined

/** Shared measurement overlay history for the active session. */
export function getMeasurementHistory(): AcApMeasurementHistory {
  if (!sharedHistory) sharedHistory = new AcApMeasurementHistory()
  return sharedHistory
}

/**
 * Record an undoable measurement overlay edit.
 * @param view - View whose measurement HTML overlays are snapshotted.
 * @param label - Human-readable undo label.
 * @param mutate - Mutation that adds or removes measurement groups.
 */
export function runMeasurementEdit(
  view: AcEdBaseView,
  label: string,
  mutate: () => void
): void {
  getMeasurementHistory().run(view, label, mutate)
}

/**
 * Drop measurement overlay history (document open / close).
 * Detached groups are disposed; attached groups stay for view.clear().
 */
export function resetMeasurementSession(): void {
  getMeasurementHistory().clear()
  resetMeasurementStyleState()
}

/** Bind this history into session undo (also runs at module load). */
export function bindMeasurementOverlayHistory(): void {
  bindOverlayHistory({
    canUndo: () => getMeasurementHistory().canUndo(),
    canRedo: () => getMeasurementHistory().canRedo(),
    undo: () => getMeasurementHistory().undo(),
    redo: () => getMeasurementHistory().redo(),
    clearRedo: () => getMeasurementHistory().clearRedo(),
    clear: () => getMeasurementHistory().clear()
  })
}

bindMeasurementOverlayHistory()
