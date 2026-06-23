import {
  AcApDocManager,
  AcApDocument,
  AcDbDocumentEventArgs,
  AcEdOpenMode,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import {
  computed,
  type ComputedRef,
  type DeepReadonly,
  onMounted,
  readonly,
  type Ref,
  ref
} from 'vue'

/**
 * Reactive view of the active CAD document and its open lifecycle.
 *
 * Returned by {@link useDocument}. All refs are shared module singletons, so
 * every caller observes the same document state.
 */
export interface UseDocumentReturn {
  /**
   * Whether a document open operation is currently in progress.
   *
   * Becomes `true` when {@link AcApDocManager.events.documentToBeOpened} fires
   * or when {@link beginDocumentOpening} is called manually, and becomes
   * `false` when the document is activated, opening fails, or
   * {@link endDocumentOpening} is called manually.
   */
  isDocumentOpening: DeepReadonly<Ref<boolean>>

  /**
   * Current or pending document access mode.
   *
   * During an open request this reflects the mode carried by
   * {@link AcDbDocumentEventArgs.mode} from `documentToBeOpened`. After
   * activation it mirrors {@link AcApDocument.openMode}.
   */
  openMode: DeepReadonly<Ref<AcEdOpenMode>>

  /**
   * File name of the active document.
   *
   * Mirrors {@link AcApDocument.fileName}. Empty for a new untitled document
   * that has not been saved or opened from disk.
   */
  fileName: DeepReadonly<Ref<string>>

  /**
   * Display title of the active document.
   *
   * Mirrors {@link AcApDocument.docTitle}. For a new document this is
   * typically `"Untitled"` until a file is opened.
   */
  docTitle: DeepReadonly<Ref<string>>

  /**
   * User-facing document label for UI display.
   *
   * Resolves to {@link docTitle} when present, otherwise falls back to
   * {@link fileName}.
   */
  displayName: ComputedRef<string>

  /**
   * Marks the viewer as entering a document open operation.
   *
   * Prefer relying on {@link AcApDocManager.events.documentToBeOpened} when
   * possible. Call this manually only for open flows that bypass the manager
   * events but still need UI affordances such as disabling the ribbon.
   */
  beginDocumentOpening: () => void

  /**
   * Marks the viewer as leaving a document open operation.
   *
   * Prefer relying on {@link AcApDocManager.events.documentActivated} or the
   * `failed-to-open-file` event. Call this manually to pair with
   * {@link beginDocumentOpening} in custom open handlers.
   */
  endDocumentOpening: () => void
}

/** Shared flag indicating whether a document open operation is in progress. */
const isDocumentOpening = ref(false)

/** Shared current or pending document access mode. */
const openMode = ref<AcEdOpenMode>(AcEdOpenMode.Read)

/** Shared active document file name sourced from {@link AcApDocument.fileName}. */
const fileName = ref('')

/** Shared active document title sourced from {@link AcApDocument.docTitle}. */
const docTitle = ref('')

/** Shared computed label for UI surfaces that show the current document name. */
const displayName = computed(() => docTitle.value || fileName.value)

/** Whether lifecycle listeners have already been attached to the doc manager. */
let isBound = false

/** Polling timer used while waiting for {@link AcApDocManager.instance}. */
let retryTimer: ReturnType<typeof setInterval> | undefined

/**
 * Returns the existing {@link AcApDocManager} singleton without throwing.
 *
 * Useful before the viewer finishes initialization, when
 * {@link AcApDocManager.instance} is not yet available.
 *
 * @returns The initialized manager, or `null` when the viewer has not been created
 */
function getExistingDocManager(): AcApDocManager | null {
  const singleton = AcApDocManager as unknown as {
    _instance?: AcApDocManager
  }
  return singleton._instance ?? null
}

/**
 * Copies document metadata from {@link AcApDocument} into the shared reactive refs.
 *
 * @param doc - Document to read from. When omitted, the currently active
 *   document from {@link AcApDocManager.curDocument} is used.
 */
function syncFromDocument(doc?: AcApDocument) {
  const document = doc ?? getExistingDocManager()?.curDocument
  if (!document) return

  openMode.value = document.openMode
  fileName.value = document.fileName
  docTitle.value = document.docTitle
}

/**
 * Sets {@link isDocumentOpening} to `true`.
 */
function beginDocumentOpening() {
  isDocumentOpening.value = true
}

/**
 * Sets {@link isDocumentOpening} to `false`.
 */
function endDocumentOpening() {
  isDocumentOpening.value = false
}

/**
 * Handles {@link AcApDocManager.events.documentToBeOpened}.
 *
 * Starts the opening state early and applies the requested open mode from the
 * event payload so UI can react before activation completes.
 *
 * @param args - Document lifecycle event arguments emitted by the manager
 */
function onDocumentToBeOpened(args: AcDbDocumentEventArgs) {
  beginDocumentOpening()
  openMode.value = args.mode
}

/**
 * Handles {@link AcApDocManager.events.documentActivated}.
 *
 * Ends the opening state and synchronizes file name, title, and open mode
 * from the activated document.
 *
 * @param args - Document lifecycle event arguments emitted by the manager
 */
function onDocumentActivated(args: AcDbDocumentEventArgs) {
  endDocumentOpening()
  syncFromDocument(args.doc)
}

/**
 * Handles the global `failed-to-open-file` event.
 *
 * Ensures {@link isDocumentOpening} is cleared when an open attempt fails.
 */
function onFailedToOpenFile() {
  endDocumentOpening()
}

/**
 * Stops the retry timer used while waiting for viewer initialization.
 */
function stopRetryTimer() {
  if (!retryTimer) return
  clearInterval(retryTimer)
  retryTimer = undefined
}

/**
 * Attempts to connect lifecycle listeners to {@link AcApDocManager.instance}.
 *
 * On success, the current document state is synchronized immediately and
 * listeners are registered for future open, activation, and failure events.
 *
 * @returns `true` when binding succeeded; otherwise `false`
 */
function tryBind() {
  if (isBound) return true

  try {
    const manager = AcApDocManager.instance
    syncFromDocument(manager.curDocument)
    manager.events.documentToBeOpened.addEventListener(onDocumentToBeOpened)
    manager.events.documentActivated.addEventListener(onDocumentActivated)
    eventBus.on('failed-to-open-file', onFailedToOpenFile)
    isBound = true
    stopRetryTimer()
    return true
  } catch {
    return false
  }
}

/**
 * Ensures lifecycle listeners are bound, polling until the viewer exists.
 *
 * This is invoked synchronously from {@link useDocument} and again on mount
 * for components created before {@link AcApDocManager.createInstance}.
 */
function ensureBound() {
  if (tryBind() || retryTimer) return

  retryTimer = setInterval(() => {
    tryBind()
  }, 50)
}

/**
 * Tracks the active CAD document and its open lifecycle for UI consumers.
 *
 * This composable centralizes reactive document metadata from
 * {@link AcApDocManager} and {@link AcApDocument}, including:
 * - Current or pending document open mode
 * - Whether a document open operation is in progress
 * - Current document file name and display title
 *
 * Behavior:
 * - Initializes from the currently active document once the viewer exists
 * - Retries binding after mount when the viewer has not been created yet
 * - Updates {@link openMode} as soon as `documentToBeOpened` fires
 * - Synchronizes {@link fileName}, {@link docTitle}, and {@link openMode}
 *   when `documentActivated` fires
 * - Clears the opening state when `failed-to-open-file` is emitted
 *
 * @returns Shared reactive document state and manual open-state helpers
 */
export function useDocument(): UseDocumentReturn {
  ensureBound()

  onMounted(() => {
    ensureBound()
  })

  return {
    isDocumentOpening: readonly(isDocumentOpening),
    openMode: readonly(openMode),
    fileName: readonly(fileName),
    docTitle: readonly(docTitle),
    displayName,
    beginDocumentOpening,
    endDocumentOpening
  }
}
