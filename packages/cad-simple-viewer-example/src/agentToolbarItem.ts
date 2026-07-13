import type { AcExToolbarItemConfig } from '@mlightcad/cad-simple-ui-plugin'

import { ICON_AGENT } from './icons'

/** Toolbar button that runs the lazy-loaded `agent` command. */
export const AGENT_TOOLBAR_ITEM: AcExToolbarItemConfig = {
  id: 'agent',
  label: 'Agent',
  icon: ICON_AGENT,
  command: 'agent',
  requiresDocument: true
}
