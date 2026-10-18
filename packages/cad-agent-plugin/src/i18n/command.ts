import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/**
 * Command-line descriptions for the plugin commands.
 *
 * Merged under `command.ACAD.<name>.description`, which is what the command
 * line autocomplete reads.
 */
export const agentCommandDescriptions = {
  en: {
    agent: 'Opens the CAD Agent chat panel'
  },
  zh: {
    agent: '打开 CAD 智能助手面板'
  },
  tr: {
    agent: 'CAD ajanı sohbet panelini açar'
  },
  cs: {
    agent: 'Otevře panel CAD agenta'
  },
  ar: {
    agent: 'يفتح لوحة دردشة وكيل CAD'
  }
} as const satisfies Record<AcApLocale, { readonly agent: string }>
