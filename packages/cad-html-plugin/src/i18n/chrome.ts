import {
  type AcApLocale,
  type AcApLocaleMessage
} from '@mlightcad/cad-simple-viewer'

import { htmlExportDialogCopy } from './exportDialog.js'

/** File → Export label for HTML export. */
export const htmlExportLabel: Record<AcApLocale, string> = {
  en: 'Export to HTML',
  zh: '导出为 HTML',
  ja: 'HTML に書き出し',
  ko: 'HTML로 내보내기',
  tr: 'HTML\'e Dışa Aktar',
  cs: 'Exportovat do HTML',
  ar: 'تصدير إلى HTML'
}

/** Nested message trees for {@link AcApUiRegistry}. */
export function htmlUiMessages(): Partial<
  Record<AcApLocale, AcApLocaleMessage>
> {
  const messages: Partial<Record<AcApLocale, AcApLocaleMessage>> = {}
  for (const locale of Object.keys(htmlExportLabel) as AcApLocale[]) {
    messages[locale] = {
      main: { mainMenu: { exportHtml: htmlExportLabel[locale] } },
      dialog: { exportHtmlDlg: htmlExportDialogCopy[locale] }
    }
  }
  return messages
}
