import { store } from '../app/store'
import { useMissedData } from './useMissedData'

export type MissingResourceTab = 'font' | 'image' | 'xref'

/**
 * Picks the best Missing Resources sub-tab for the current missed-data set.
 */
export function resolveMissingResourceTab(
  preferred?: MissingResourceTab
): MissingResourceTab {
  const { fonts, images, xrefs } = useMissedData()

  if (preferred === 'font' && fonts.size > 0) return 'font'
  if (preferred === 'image' && images.size > 0) return 'image'
  if (preferred === 'xref' && xrefs.length > 0) return 'xref'

  if (fonts.size > 0) return 'font'
  if (images.size > 0) return 'image'
  if (xrefs.length > 0) return 'xref'
  return preferred ?? 'font'
}

/**
 * Opens the tool palette on the Missing / External Resources tab.
 */
export function openMissingResourcesPalette(preferred?: MissingResourceTab) {
  store.dialogs.activePaletteTab = 'missingResources'
  store.dialogs.activeMissingResourceTab = resolveMissingResourceTab(preferred)
  store.dialogs.layerManager = true
}
