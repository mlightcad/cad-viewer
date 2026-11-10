import { AcApI18n, type AcApLocale } from '@mlightcad/cad-simple-viewer'

import { llmAr } from './ar'
import { llmCommandDescriptions } from './command'
import { llmCs } from './cs'
import { llmEn } from './en'
import { llmJa } from './ja'
import { llmKo } from './ko'
import { llmTr } from './tr'
import { llmZh } from './zh'

/** i18n key prefix of every AI model settings string. */
export const LLM_I18N_PREFIX = 'main.llm'

/** Union of keys in {@link llmEn}. */
export type AcApLlmLabelKey = keyof typeof llmEn

/** Map of every label key to its translated string. */
export type AcApLlmLabels = Record<AcApLlmLabelKey, string>

const llmMessagesByLocale = {
  en: llmEn,
  zh: llmZh,
  ja: llmJa,
  ko: llmKo,
  tr: llmTr,
  cs: llmCs,
  ar: llmAr
} as const satisfies Record<AcApLocale, AcApLlmLabels>

const LOCALES = Object.keys(llmMessagesByLocale) as AcApLocale[]

/** Guards {@link registerLlmI18n} against duplicate merges. */
let isRegistered = false

/**
 * Builds the nested message object for one locale.
 *
 * @param locale - Target locale.
 * @returns Messages shaped for `mergeLocaleMessage`.
 */
function buildMessages(locale: AcApLocale) {
  return {
    command: {
      ACAD: {
        llmsettings: {
          description: llmCommandDescriptions[locale].llmsettings
        }
      }
    },
    main: { llm: llmMessagesByLocale[locale] }
  }
}

/**
 * Registers the AI model settings strings into {@link AcApI18n}.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function registerLlmI18n(): void {
  if (isRegistered) return
  for (const locale of LOCALES) {
    AcApI18n.mergeLocaleMessage(locale, buildMessages(locale))
  }
  isRegistered = true
}

/**
 * Merges the AI model settings strings into a vue-i18n instance, so Vue UIs
 * (for example the agent panel's model picker) can use them too.
 *
 * @param mergeLocaleMessage - Host app's `mergeLocaleMessage` callback.
 */
export function mergeLlmI18nIntoVueI18n(
  mergeLocaleMessage: (locale: AcApLocale, message: object) => void
): void {
  registerLlmI18n()
  for (const locale of LOCALES) {
    mergeLocaleMessage(locale, buildMessages(locale))
  }
}

/**
 * Translates one AI model settings label in the current locale.
 *
 * @param key - Label key from {@link llmEn}.
 * @param vars - Values for `{name}` placeholders.
 * @returns Localized string, or the key when it is not registered.
 */
export function llmT(
  key: AcApLlmLabelKey,
  vars: Record<string, string | number> = {}
): string {
  registerLlmI18n()
  let text = AcApI18n.t(`${LLM_I18N_PREFIX}.${key}`, { fallback: key })
  for (const [name, value] of Object.entries(vars)) {
    text = text.split(`{${name}}`).join(String(value))
  }
  return text
}
