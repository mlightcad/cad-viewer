import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import { ar } from './ar'
import { commandAr } from './command-ar'
import { commandCs } from './command-cs'
import { commandEn } from './command-en'
import { commandTr } from './command-tr'
import { commandZh } from './command-zh'
import { cs } from './cs'
import { en } from './en'
import { tr } from './tr'
import { zh } from './zh'

/** Message namespace prefix merged into {@link AcApI18n}. */
const MESSAGE_PREFIX = 'simpleUi'

/** Nested locale message tree built from dot-separated keys. */
interface LocaleMessageTree {
  [key: string]: string | LocaleMessageTree
}

/** Whether {@link registerSimpleUiI18n} has already run. */
let isRegistered = false

/**
 * Converts flat dot-key messages into a nested object for {@link AcApI18n.mergeLocaleMessage}.
 *
 * @param flat - Map of keys like `toolbar.select` to translated strings.
 */
function flatToNested(flat: Record<string, string>): LocaleMessageTree {
  const result: LocaleMessageTree = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const existing = current[part]
      if (!existing || typeof existing === 'string') {
        current[part] = {}
      }
      current = current[part] as LocaleMessageTree
    }
    current[parts[parts.length - 1]] = value
  }
  return result
}

/**
 * Registers plugin UI strings into {@link AcApI18n}.
 *
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function registerSimpleUiI18n(): void {
  if (isRegistered) return
  AcApI18n.mergeLocaleMessage('en', {
    command: commandEn,
    [MESSAGE_PREFIX]: flatToNested(en)
  })
  AcApI18n.mergeLocaleMessage('zh', {
    command: commandZh,
    [MESSAGE_PREFIX]: flatToNested(zh)
  })
  AcApI18n.mergeLocaleMessage('cs', {
    command: commandCs,
    [MESSAGE_PREFIX]: flatToNested(cs)
  })
  AcApI18n.mergeLocaleMessage('tr', {
    command: commandTr,
    [MESSAGE_PREFIX]: flatToNested(tr)
  })
  AcApI18n.mergeLocaleMessage('ar', {
    command: commandAr,
    [MESSAGE_PREFIX]: flatToNested(ar)
  })
  isRegistered = true
}

/**
 * Scoped translation helper for plugin UI strings under the `simpleUi` namespace.
 */
export class AcExI18n {
  /**
   * Translates a key relative to the `simpleUi` namespace.
   *
   * @param key - Message key without the `simpleUi.` prefix (for example `toolbar.select`).
   * @param params - Optional `{name}` placeholder replacements.
   * @returns Translated string, or the key when no translation exists.
   */
  t(key: string, params?: Record<string, string>): string {
    const fullKey = `${MESSAGE_PREFIX}.${key}`
    const template = AcApI18n.t(fullKey, { fallback: key })
    if (!params) return template
    return Object.keys(params).reduce(
      (result, name) => result.replace(`{${name}}`, params[name]),
      template
    )
  }
}
