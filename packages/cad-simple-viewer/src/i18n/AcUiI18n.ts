import { AcApI18n, type AcApLocale } from './AcApI18n.js'
import arSimpleUi from './ar/simpleUi.js'
import csSimpleUi from './cs/simpleUi.js'
import enSimpleUi from './en/simpleUi.js'
import jaSimpleUi from './ja/simpleUi.js'
import koSimpleUi from './ko/simpleUi.js'
import trSimpleUi from './tr/simpleUi.js'
import zhSimpleUi from './zh/simpleUi.js'

/** Message namespace prefix for built-in simple UI chrome strings. */
const MESSAGE_PREFIX = 'simpleUi'

/** Nested locale message tree. */
type LocaleMessageTree = {
  [key: string]: string | LocaleMessageTree
}

/** Flattens nested simpleUi catalogs for English fallback lookups. */
function flatten(
  tree: LocaleMessageTree,
  prefix = ''
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

const enFlat = flatten(enSimpleUi as LocaleMessageTree)

const SIMPLE_UI_LOCALES: ReadonlyArray<{
  locale: AcApLocale
  messages: LocaleMessageTree
}> = [
  { locale: 'en', messages: enSimpleUi as LocaleMessageTree },
  { locale: 'zh', messages: zhSimpleUi as LocaleMessageTree },
  { locale: 'ja', messages: jaSimpleUi as LocaleMessageTree },
  { locale: 'ko', messages: koSimpleUi as LocaleMessageTree },
  { locale: 'tr', messages: trSimpleUi as LocaleMessageTree },
  { locale: 'cs', messages: csSimpleUi as LocaleMessageTree },
  { locale: 'ar', messages: arSimpleUi as LocaleMessageTree }
]

let simpleUiCatalogsRegistered = false

/**
 * Scoped translation helper for simple UI chrome under the `simpleUi` namespace.
 *
 * Strings are registered with core {@link AcApI18n} via `i18n/{lang}/simpleUi.ts`.
 */
export class AcUiI18n {
  /**
   * Translates a key relative to the `simpleUi` namespace.
   *
   * @param key - Message key without the `simpleUi.` prefix (for example `toolbar.select`).
   * @param params - Optional `{name}` placeholder replacements.
   */
  t(key: string, params?: Record<string, string>): string {
    const fullKey = `${MESSAGE_PREFIX}.${key}`
    let template = AcApI18n.t(fullKey, { fallback: key })
    if (template === key) template = enFlat[key] ?? key
    if (!params) return template
    return Object.keys(params).reduce(
      (result, name) => result.replace(`{${name}}`, params[name]),
      template
    )
  }
}

/**
 * Merges built-in simple UI catalogs into {@link AcApI18n}.
 *
 * Safe to call more than once. Package `i18n/index.ts` also merges these
 * catalogs at load; this entry point lets unit tests (and hosts that import
 * palette views without the i18n barrel) register the same messages.
 */
export function acuiRegisterSimpleUiI18n(): void {
  if (simpleUiCatalogsRegistered) return
  simpleUiCatalogsRegistered = true
  for (const { locale, messages } of SIMPLE_UI_LOCALES) {
    AcApI18n.mergeLocaleMessage(locale, { simpleUi: messages })
  }
}
