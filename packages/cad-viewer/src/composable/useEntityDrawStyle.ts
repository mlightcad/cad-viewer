import {
  AcApAnnotation,
  AcApBaseRevCmd,
  AcApDocManager,
  AcEdCommandEventArgs
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcCmColorMethod,
  AcGiLineWeight
} from '@mlightcad/data-model'
import { computed, type Ref, ref, watch } from 'vue'

/**
 * =============================================================
 * useEntityDrawStyle
 * =============================================================
 *
 * Composable for managing draw style of newly created entities.
 *
 * - Source of truth: editor.curDocument.database
 * - Does NOT mutate layers
 * - Explicit setters for color & line weight
 * - Safe with async editor initialization
 * - Reactive & UI-friendly
 */

/**
 * =============================================================
 * Composable
 * =============================================================
 */
export function useEntityDrawStyle(editorRef: Ref<AcApDocManager | null>) {
  /**
   * -------------------------------------------------------------
   * Reactive state
   * -------------------------------------------------------------
   */
  const color = ref<string>(AcApAnnotation.DEFAULT_ANNOTATION_COLOR.toString())
  const lineWeight = ref<AcGiLineWeight>(AcGiLineWeight.ByLayer)
  const isShowToolbar = ref<boolean>(false)

  /**
   * -------------------------------------------------------------
   * Derived values
   * -------------------------------------------------------------
   */
  const cssColor = computed(() => {
    const c = AcCmColor.fromString(color.value)
    return c?.cssColor || '#FF0000'
  })

  /**
   * -------------------------------------------------------------
   * Internal helpers
   * -------------------------------------------------------------
   */
  let removeWillStart: (() => void) | undefined
  let removeEnded: (() => void) | undefined

  function detachEventListeners() {
    removeWillStart?.()
    removeEnded?.()
    removeWillStart = undefined
    removeEnded = undefined
  }

  /**
   * -------------------------------------------------------------
   * React to editor availability
   * -------------------------------------------------------------
   */
  watch(
    editorRef,
    editor => {
      detachEventListeners()
      isShowToolbar.value = false

      if (!editor) {
        return
      }

      const db = editor.curDocument?.database
      if (!db) {
        return
      }

      const willStart = (args: AcEdCommandEventArgs) => {
        const command = args.command
        if (command instanceof AcApBaseRevCmd) {
          isShowToolbar.value = command.isShowEntityDrawStyleToolbar
          syncToDatabase()
        }
      }

      const ended = () => {
        isShowToolbar.value = false
      }

      editor.context.view.editor.events.commandWillStart.addEventListener(
        willStart
      )
      editor.context.view.editor.events.commandEnded.addEventListener(ended)

      // store detach functions
      removeWillStart = () =>
        editor.context.view.editor.events.commandWillStart.removeEventListener(
          willStart
        )

      removeEnded = () =>
        editor.context.view.editor.events.commandEnded.removeEventListener(
          ended
        )
    },
    { immediate: true }
  )

  /**
   * -------------------------------------------------------------
   * Setters (explicit side effects)
   * -------------------------------------------------------------
   */
  function setColorIndex(v: number) {
    const editor = editorRef.value
    const db = editor?.curDocument?.database
    if (!db) return

    const c = new AcCmColor(AcCmColorMethod.ByACI, v)
    color.value = c.toString()
    db.cecolor = c
  }

  function setLineWeight(v: AcGiLineWeight) {
    const editor = editorRef.value
    const db = editor?.curDocument?.database
    if (!db) return

    lineWeight.value = v
    db.celweight = v
  }

  /**
   * -------------------------------------------------------------
   * Sync from database
   * -------------------------------------------------------------
   */
  function syncFromDatabase() {
    const editor = editorRef.value
    const db = editor?.curDocument?.database
    if (!db) return

    color.value = db.cecolor.toString()
    lineWeight.value = db.celweight
  }

  /**
   * -------------------------------------------------------------
   * Sync to database
   * -------------------------------------------------------------
   */
  function syncToDatabase() {
    const editor = editorRef.value
    const db = editor?.curDocument?.database
    if (!db) return

    db.cecolor = AcCmColor.fromString(color.value) ?? new AcCmColor()
    db.celweight = lineWeight.value
  }

  return {
    /* state */
    color,
    lineWeight,
    cssColor,
    isShowToolbar,

    /* setters */
    setColorIndex,
    setLineWeight,

    /* lifecycle */
    syncFromDatabase,
    syncToDatabase
  }
}
