import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/** Ribbon strings for the script console button. */
export interface ScriptChromeStrings {
  command: string
  tooltip: string
}

/** Ribbon copy for every locale. */
export const scriptChrome: Record<AcApLocale, ScriptChromeStrings> = {
  en: {
    command: 'Script',
    tooltip: 'Open the CAD script console to run a script on the current drawing.'
  },
  zh: {
    command: '脚本',
    tooltip: '打开 CAD 脚本控制台，在当前图纸上运行脚本。'
  },
  ja: {
    command: 'スクリプト',
    tooltip:
      '現在の図面でスクリプトを実行するための CAD スクリプトコンソールを開きます。'
  },
  ko: {
    command: '스크립트',
    tooltip: '현재 도면에서 스크립트를 실행하는 CAD 스크립트 콘솔을 엽니다.'
  },
  tr: {
    command: 'Betik',
    tooltip: 'Geçerli çizimde betik çalıştırmak için CAD betik konsolunu açar.'
  },
  cs: {
    command: 'Skript',
    tooltip: 'Otevře konzoli CAD skriptu a spustí skript v aktuálním výkresu.'
  },
  ar: {
    command: 'سكريبت',
    tooltip: 'يفتح وحدة تحكم سكريبت CAD لتشغيل سكريبت على الرسم الحالي.'
  }
}
