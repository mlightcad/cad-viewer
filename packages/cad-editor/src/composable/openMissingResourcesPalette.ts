import { store } from '../app/store'
import { useMissedData } from './useMissedData'

export type MissingResourceTab = 'font' | 'xref'

/**
 * Picks the best Missing Resources sub-tab for the current missed-data set.
 * Prefer `xref` when images or unresolved xrefs are present (they share one UI).
 */
export function resolveMissingResourceTab(
  preferred?: MissingResourceTab | 'image'
): MissingResourceTab {
  const { fonts, images, xrefs } = useMissedData()
  const hasExternalRefs = images.size > 0 || xrefs.length > 0

  if (preferred === 'font' && fonts.size > 0) return 'font'
  if (
    (preferred === 'xref' || preferred === 'image') &&
    hasExternalRefs
  ) {
    return 'xref'
  }

  if (fonts.size > 0) return 'font'
  if (hasExternalRefs) return 'xref'
  return preferred === 'image' ? 'xref' : (preferred ?? 'font')
}

/**
 * Opens the tool palette on the Missing / External Resources tab.
 */
export function openMissingResourcesPalette(
  preferred?: MissingResourceTab | 'image'
) {
  store.dialogs.activePaletteTab = 'missingResources'
  store.dialogs.activeMissingResourceTab = resolveMissingResourceTab(preferred)
  store.dialogs.layerManager = true
}
