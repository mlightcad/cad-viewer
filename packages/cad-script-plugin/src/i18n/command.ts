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
  },
  ja: {
    cadscript:
      '現在の図面でスクリプトを実行するための CAD スクリプトコンソールを開きます'
  },
  ko: {
    cadscript:
      '현재 도면에서 스크립트를 실행하는 CAD 스크립트 콘솔을 엽니다'
  }
} as const satisfies Record<AcApLocale, { readonly cadscript: string }>
