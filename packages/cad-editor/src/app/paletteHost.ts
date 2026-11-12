import {
  ACAP_PALETTE_NAMED_TAB,
  type AcApPaletteContent,
  type AcApPaletteHost,
  type AcApPaletteHostHandle,
  type AcApPaletteNamedTabId
} from '@mlightcad/cad-simple-viewer'
import { markRaw, watch } from 'vue'

import { store } from './store'

/** Palette tab name of a hosted panel. */
export const hostedPanelTab = (id: string) => `hosted:${id}`

/** Maps shared named-tab ids to cad-editor tool-palette tab names. */
const NAMED_TAB_TO_EDITOR: Record<string, string> = {
  [ACAP_PALETTE_NAMED_TAB.layers]: 'layerManager',
  [ACAP_PALETTE_NAMED_TAB.find]: 'find',
  [ACAP_PALETTE_NAMED_TAB.review]: 'designReview',
  [ACAP_PALETTE_NAMED_TAB.measurements]: 'measurements',
  [ACAP_PALETTE_NAMED_TAB.entityProperties]: 'entityProperties',
  [ACAP_PALETTE_NAMED_TAB.blocks]: 'blocks',
  [ACAP_PALETTE_NAMED_TAB.countList]: 'countList',
  [ACAP_PALETTE_NAMED_TAB.missingResources]: 'missingResources',
  [ACAP_PALETTE_NAMED_TAB.memoryProfile]: 'memoryProfile',
  [ACAP_PALETTE_NAMED_TAB.openFileProfile]: 'openFileProfile'
}

/**
 * Shows command panels from `AcApPaletteService` as tool palette tabs, like
 * the BDETECT tab: the tab exists only while the panel is open, and closing
 * the palette closes the panel. The palette is restored afterwards (closed if
 * it was closed, otherwise on its previous tab).
 */
export const mlPaletteHost: AcApPaletteHost = {
  show(
    content: AcApPaletteContent,
    onUserClose: () => void
  ): AcApPaletteHostHandle {
    const dialogs = store.dialogs
    const tab = hostedPanelTab(content.id)
    const wasOpen = dialogs.layerManager
    const previousTab = dialogs.activePaletteTab
    dialogs.hostedPanels = [
      ...dialogs.hostedPanels.filter(panel => panel.tab !== tab),
      { tab, title: content.title, element: markRaw(content.element) }
    ]
    dialogs.activePaletteTab = tab
    dialogs.layerManager = true
    const stopWatching = watch(
      () => dialogs.layerManager,
      open => {
        if (!open) onUserClose()
      }
    )
    return {
      close() {
        stopWatching()
        dialogs.hostedPanels = dialogs.hostedPanels.filter(
          panel => panel.tab !== tab
        )
        if (!wasOpen) dialogs.layerManager = false
        else if (dialogs.activePaletteTab === tab) {
          dialogs.activePaletteTab =
            previousTab === tab ? 'layerManager' : previousTab
        }
      }
    }
  },

  openNamedTab(id: AcApPaletteNamedTabId | string): boolean {
    const tab = NAMED_TAB_TO_EDITOR[id]
    if (!tab) return false
    const dialogs = store.dialogs
    if (id === ACAP_PALETTE_NAMED_TAB.openFileProfile) {
      dialogs.openFileProfileTabVisible = true
    }
    dialogs.activePaletteTab = tab
    dialogs.layerManager = true
    if (id === ACAP_PALETTE_NAMED_TAB.find) {
      dialogs.findFocusTick++
    }
    return true
  }
}
