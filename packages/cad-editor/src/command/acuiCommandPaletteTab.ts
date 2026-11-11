import { watch } from 'vue'

import { store } from '../app'

/** Tool palette tabs that exist only while their command runs. */
export type MlCommandPaletteTab = 'bdetect' | 'bsearch'

const VISIBLE_FLAG = {
  bdetect: 'bdetectTabVisible',
  bsearch: 'bsearchTabVisible'
} as const

/**
 * Shows a command's tab in the tool palette while the command runs.
 * Closing the palette calls `onClose`, which should end the command.
 *
 * @param tab - Tab to reveal and activate.
 * @param onClose - Called when the user closes the palette.
 * @returns Function that hides the tab again and restores the palette:
 * closed if it was closed, otherwise on its previous tab.
 */
export function acuiOpenCommandPaletteTab(
  tab: MlCommandPaletteTab,
  onClose: () => void
): () => void {
  const dialogs = store.dialogs
  const wasOpen = dialogs.layerManager
  const previousTab = dialogs.activePaletteTab
  dialogs[VISIBLE_FLAG[tab]] = true
  dialogs.activePaletteTab = tab
  dialogs.layerManager = true
  const stopWatching = watch(
    () => dialogs.layerManager,
    open => {
      if (!open) onClose()
    }
  )
  return () => {
    stopWatching()
    dialogs[VISIBLE_FLAG[tab]] = false
    if (!wasOpen) dialogs.layerManager = false
    else if (dialogs.activePaletteTab === tab) {
      dialogs.activePaletteTab = previousTab
    }
  }
}
