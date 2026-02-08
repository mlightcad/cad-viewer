import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcCmColorMethod,
  AcGiLineWeight
} from '@mlightcad/data-model'
import { computed, ref } from 'vue'

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
 * - Reactive & UI-friendly
 *
 * Typical usage:
 * - EntityDrawStyleToolbar
 * - Command logic for creating new entities
 */

/**
 * =============================================================
 * Composable
 * =============================================================
 */
export function useEntityDrawStyle(editor: AcApDocManager) {
  const db = editor.curDocument?.database
  if (!db) {
    throw new Error('useEntityDrawStyle: database not available')
  }

  /**
   * -------------------------------------------------------------
   * Reactive state
   * -------------------------------------------------------------
   */
  const color = ref<string>(db.cecolor.toString())
  const lineWeight = ref<AcGiLineWeight>(db.celweight)
  const isShowToolbar = ref<boolean>(false)

  editor.context.view.editor.events.commandWillStart.addEventListener(args => {
    const commands = ['SKETCH', 'REVCIRCLE', 'REVCLOUD', 'REVRECT']
    if (commands.includes(args.command.globalName.toUpperCase())) {
      isShowToolbar.value = true
    }
  })

  editor.context.view.editor.events.commandEnded.addEventListener(() => {
    isShowToolbar.value = false
  })

  /**
   * -------------------------------------------------------------
   * Derived values
   * -------------------------------------------------------------
   */
  const cssColor = computed(() => {
    const c = AcCmColor.fromString(color.value)
    return c?.cssColor || '#FFFFFF'
  })

  /**
   * -------------------------------------------------------------
   * Setters (explicit side effects)
   * -------------------------------------------------------------
   */
  function setColorIndex(v: number) {
    const c = new AcCmColor(AcCmColorMethod.ByACI, v)
    color.value = c.toString()
    db.cecolor = c
  }

  function setLineWeight(v: AcGiLineWeight) {
    lineWeight.value = v
    db.celweight = v
  }

  /**
   * -------------------------------------------------------------
   * Sync from database (optional but useful)
   * -------------------------------------------------------------
   *
   * Call this when:
   * - document switches
   * - external code mutates database defaults
   */
  function syncFromDatabase() {
    color.value = db.cecolor.toString()
    lineWeight.value = db.celweight
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
    syncFromDatabase
  }
}
