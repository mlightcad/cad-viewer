import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/**
 * Command-line description for `cadscript`.
 *
 * Merged under `command.ACAD.cadscript.description`, which is what the command
 * line autocomplete reads.
 */
export const scriptCommandDescriptions = {
  en: {
    cadscript:
      'Opens the CAD script console to run a script on the current drawing'
  },
  zh: {
    cadscript: '打开 CAD 脚本控制台，在当前图纸上运行脚本'
  },
  tr: {
    cadscript:
      'Geçerli çizimde betik çalıştırmak için CAD betik konsolunu açar'
  },
  cs: {
    cadscript: 'Otevře konzoli CAD skriptu a spustí skript v aktuálním výkresu'
  },
  ar: {
    cadscript: 'يفتح وحدة تحكم سكريبت CAD لتشغيل سكريبت على الرسم الحالي'
  }
} as const satisfies Record<AcApLocale, { readonly cadscript: string }>
