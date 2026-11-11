import {
  type AcApPaletteContent,
  type AcApPaletteHost,
  type AcApPaletteHostHandle
} from '@mlightcad/cad-simple-viewer'
import { markRaw, watch } from 'vue'

import { store } from './store'

/** Palette tab name of a hosted panel. */
export const hostedPanelTab = (id: string) => `hosted:${id}`

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
  }
}
