import {
  AcApDocManager,
  AcDbDocumentEventArgs,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Tracks the current document open mode exposed by {@link AcApDocManager}.
 *
 * This composable is designed for UI state that needs to react as soon as a
 * new document starts opening, rather than waiting until activation finishes.
 * To achieve that it listens to `documentToBeOpened` and uses the event
 * payload's `mode` field as the source of truth during the open lifecycle.
 *
 * Behavior:
 * - Initializes from the currently active document when the viewer instance is already available
 * - Retries binding after mount when the viewer has not been created yet
 * - Keeps the returned ref synchronized with the next requested document mode
 * - Automatically removes listeners and timers when the component unmounts
 *
 * @returns A reactive ref containing the current or pending document open mode
 */
export function useDocOpenMode() {
  const mode = ref<AcEdOpenMode>(AcEdOpenMode.Read)
  let unbind: (() => void) | undefined
  let retryTimer: ReturnType<typeof setInterval> | undefined

  /**
   * Applies the open mode carried by a document lifecycle event.
   *
   * `documentToBeOpened` already resolves the requested mode from
   * `AcApOpenDatabaseOptions.mode`, so consumers do not need to inspect the
   * document instance itself.
   *
   * @param args - Document lifecycle event arguments emitted by the manager
   */
  function onDocumentToBeOpened(args: AcDbDocumentEventArgs) {
    mode.value = args.mode
  }

  /**
   * Attempts to connect the composable to the singleton document manager.
   *
   * The manager may not exist yet when this composable is created, especially
   * during component setup before the viewer initializes. When binding
   * succeeds, the current mode is synchronized immediately and a listener is
   * registered for future document open requests.
   *
   * @returns `true` when binding succeeded; otherwise `false`
   */
  function tryBind() {
    try {
      const manager = AcApDocManager.instance
      mode.value = manager.curDocument.openMode
      manager.events.documentToBeOpened.addEventListener(onDocumentToBeOpened)
      unbind = () => {
        manager.events.documentToBeOpened.removeEventListener(
          onDocumentToBeOpened
        )
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Stops the retry timer used while waiting for viewer initialization.
   */
  function stopRetryTimer() {
    if (retryTimer) {
      clearInterval(retryTimer)
      retryTimer = undefined
    }
  }

  /**
   * Starts polling for the document manager after component mount.
   *
   * This fallback is only used when the viewer singleton was not ready during
   * the initial synchronous bind attempt.
   */
  function startRetryBinding() {
    if (tryBind()) return
    retryTimer = setInterval(() => {
      if (!tryBind()) return
      stopRetryTimer()
    }, 50)
  }

  /**
   * Releases all side effects created by this composable.
   *
   * That includes the event listener bound to the document manager and the
   * polling timer that waits for late viewer initialization.
   */
  function cleanup() {
    unbind?.()
    unbind = undefined
    stopRetryTimer()
  }

  // Try immediately in case caller runs after viewer initialization.
  if (!tryBind()) {
    onMounted(() => {
      startRetryBinding()
    })
  }

  onUnmounted(() => {
    cleanup()
  })

  return mode
}
