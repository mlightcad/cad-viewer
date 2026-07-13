import { AcApDocManager, eventBus } from '@mlightcad/cad-simple-viewer'
import { type DeepReadonly, readonly, type Ref, ref } from 'vue'

/**
 * Reactive undo/redo availability for the active document database.
 */
export interface UseUndoRedoReturn {
  /** Whether the active database has undoable operations. */
  canUndo: DeepReadonly<Ref<boolean>>
  /** Whether the active database has redoable operations. */
  canRedo: DeepReadonly<Ref<boolean>>
  /** Re-reads undo/redo state from the active document. */
  syncUndoRedoState: () => void
}

/** Shared undo availability for the active document. */
const canUndo = ref(false)

/** Shared redo availability for the active document. */
const canRedo = ref(false)

/** Whether lifecycle listeners have already been attached. */
let isBound = false

function syncUndoRedoState() {
  const db = AcApDocManager.instance?.curDocument?.database
  const manager = db?.transactionManager
  canUndo.value = manager?.canUndo() ?? false
  canRedo.value = manager?.canRedo() ?? false
}

/** Polling interval while waiting for {@link AcApDocManager.instance}. */
const BIND_RETRY_INTERVAL_MS = 50

/** Stop polling after this many attempts (~5 seconds). */
const MAX_BIND_RETRIES = 100

/** Polling timer used while waiting for {@link AcApDocManager.instance}. */
let retryTimer: ReturnType<typeof setInterval> | undefined

/** Number of bind attempts since the current retry timer started. */
let bindRetryCount = 0

function stopRetryTimer() {
  if (!retryTimer) return
  clearInterval(retryTimer)
  retryTimer = undefined
  bindRetryCount = 0
}

function tryBind(): boolean {
  if (isBound) {
    return true
  }

  try {
    const manager = AcApDocManager.instance
    manager.events.documentActivated.addEventListener(syncUndoRedoState)
    eventBus.on('undo-stack-changed', syncUndoRedoState)
    isBound = true
    stopRetryTimer()
    syncUndoRedoState()
    return true
  } catch {
    return false
  }
}

function ensureBound() {
  if (tryBind() || retryTimer) {
    return
  }

  retryTimer = setInterval(() => {
    bindRetryCount++
    if (tryBind() || bindRetryCount >= MAX_BIND_RETRIES) {
      stopRetryTimer()
    }
  }, BIND_RETRY_INTERVAL_MS)
}

/**
 * Tracks undo/redo availability for the active CAD document.
 *
 * State updates when the undo stack changes and when the active document changes.
 */
export function useUndoRedo(): UseUndoRedoReturn {
  ensureBound()

  return {
    canUndo: readonly(canUndo),
    canRedo: readonly(canRedo),
    syncUndoRedoState
  }
}
