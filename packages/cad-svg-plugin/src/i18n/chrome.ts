import {
  type AcApLocale,
  type AcApLocaleMessage
} from '@mlightcad/cad-simple-viewer'

/** File → Export label for SVG export. */
export const svgExportLabel: Record<AcApLocale, string> = {
  en: 'Export to SVG',
  zh: '导出为 SVG',
  ja: 'SVG に書き出し',
  ko: 'SVG로 내보내기',
  tr: 'SVG\'e Dışa Aktar',
  cs: 'Exportovat do SVG',
  ar: 'تصدير إلى SVG'
}

/** Nested message trees for {@link AcApUiRegistry}. */
export function svgUiMessages(): Partial<
  Record<AcApLocale, AcApLocaleMessage>
> {
  const messages: Partial<Record<AcApLocale, AcApLocaleMessage>> = {}
  for (const locale of Object.keys(svgExportLabel) as AcApLocale[]) {
    messages[locale] = {
      main: { mainMenu: { exportSvg: svgExportLabel[locale] } }
    }
  }
  return messages
}
