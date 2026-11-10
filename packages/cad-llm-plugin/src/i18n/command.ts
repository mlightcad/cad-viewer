import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/**
 * Command-line descriptions for the plugin commands.
 *
 * Merged under `command.ACAD.<name>.description`, which is what the command
 * line autocomplete reads.
 */
export const llmCommandDescriptions = {
  en: {
    llmsettings: 'Opens the AI model settings'
  },
  zh: {
    llmsettings: '打开 AI 模型设置'
  },
  ja: {
    llmsettings: 'AI モデル設定を開きます'
  },
  ko: {
    llmsettings: 'AI 모델 설정을 엽니다'
  },
  tr: {
    llmsettings: 'Yapay zekâ modeli ayarlarını açar'
  },
  cs: {
    llmsettings: 'Otevře nastavení modelu AI'
  },
  ar: {
    llmsettings: 'يفتح إعدادات نموذج الذكاء الاصطناعي'
  }
} as const satisfies Record<AcApLocale, { readonly llmsettings: string }>
