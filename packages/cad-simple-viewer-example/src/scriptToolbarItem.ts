import type { AcUiToolbarItemConfig } from '@mlightcad/cad-simple-ui-plugin'

import { ICON_SCRIPT } from './icons'

/** Toolbar button that runs the lazy-loaded `cadscript` command. */
export const SCRIPT_TOOLBAR_ITEM: AcUiToolbarItemConfig = {
  id: 'cad-script',
  label: 'Script',
  icon: ICON_SCRIPT,
  command: 'cadscript',
  requiresDocument: true
}
