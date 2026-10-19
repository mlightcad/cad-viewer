import { AcApI18n, type AcApLocale } from '@mlightcad/cad-simple-viewer'

import type { ScriptExampleId } from '../examples/scriptExamples'
import { scriptAr } from './ar'
import { scriptCommandDescriptions } from './command'
import { scriptCs } from './cs'
import { scriptEn } from './en'
import { scriptExampleCopyByLocale } from './exampleCopy'
import { scriptTr } from './tr'
import { scriptZh } from './zh'

/** Vue i18n key prefix for script-console strings (`main.toolPalette.script`). */
export const SCRIPT_I18N_PREFIX = 'main.toolPalette.script'

/** Union of keys in {@link scriptEn}. */
export type ScriptLabelKey = keyof typeof scriptEn

/** Map of every script-console label key to its translated string. */
export type ScriptLabels = Record<ScriptLabelKey, string>

/** Locale-specific flat message tables before nesting under `main.toolPalette.script`. */
const scriptMessagesByLocale = {
  en: scriptEn,
  zh: scriptZh,
  tr: scriptTr,
  cs: scriptCs,
  ar: scriptAr
} as const satisfies Record<AcApLocale, ScriptLabels>

/** Guards {@link registerScriptI18n} against duplicate merges. */
let isRegistered = false

/**
 * Builds the nested message object for one locale.
 *
 * @param locale - Target locale.
 * @returns Messages shaped for `mergeLocaleMessage`.
 */
function buildVueMessages(locale: AcApLocale) {
  const descriptions = scriptCommandDescriptions[locale]
  return {
    command: {
      ACAD: {
        cadscript: { description: descriptions.cadscript }
      }
    },
    main: {
      toolPalette: {
        script: {
          ...scriptMessagesByLocale[locale],
          examples: scriptExampleCopyByLocale[locale]
        }
      }
    }
  }
}

/**
 * Registers script-console strings into {@link AcApI18n}.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function registerScriptI18n(): void {
  if (isRegistered) return

  AcApI18n.mergeLocaleMessage('en', buildVueMessages('en'))
  AcApI18n.mergeLocaleMessage('zh', buildVueMessages('zh'))
  AcApI18n.mergeLocaleMessage('tr', buildVueMessages('tr'))
  AcApI18n.mergeLocaleMessage('cs', buildVueMessages('cs'))
  AcApI18n.mergeLocaleMessage('ar', buildVueMessages('ar'))
  isRegistered = true
}

/**
 * Merges script-console strings into a vue-i18n instance (e.g. cad-viewer).
 *
 * @param mergeLocaleMessage - Host app's `mergeLocaleMessage` callback.
 */
export function mergeScriptI18nIntoVueI18n(
  mergeLocaleMessage: (locale: AcApLocale, message: object) => void
): void {
  registerScriptI18n()
  mergeLocaleMessage('en', buildVueMessages('en'))
  mergeLocaleMessage('zh', buildVueMessages('zh'))
  mergeLocaleMessage('tr', buildVueMessages('tr'))
  mergeLocaleMessage('cs', buildVueMessages('cs'))
  mergeLocaleMessage('ar', buildVueMessages('ar'))
}

/**
 * Translates a single script-console label via {@link AcApI18n}.
 *
 * @param key - Label key from {@link scriptEn}.
 * @returns Localized string, or the key as fallback.
 */
export function scriptT(key: ScriptLabelKey): string {
  return AcApI18n.t(`${SCRIPT_I18N_PREFIX}.${key}`, { fallback: key })
}

/**
 * Reads the localized title and description of one built-in script.
 *
 * @param id - Example id from the catalog.
 * @returns Strings for the current locale.
 */
export function scriptExampleText(id: ScriptExampleId): {
  title: string
  description: string
} {
  const prefix = `${SCRIPT_I18N_PREFIX}.examples.${id}`
  return {
    title: AcApI18n.t(`${prefix}.title`, { fallback: id }),
    description: AcApI18n.t(`${prefix}.description`, { fallback: id })
  }
}

/**
 * Builds a map of all script-console labels for the current locale.
 *
 * @returns Every {@link ScriptLabelKey} mapped to its translation.
 */
export function buildScriptLabels(): ScriptLabels {
  return Object.fromEntries(
    (Object.keys(scriptEn) as ScriptLabelKey[]).map(key => [key, scriptT(key)])
  ) as ScriptLabels
}
