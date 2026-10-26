import type { PluralizationRule } from 'vue-i18n'

/**
 * vue-i18n plural rule for Arabic (CLDR), used by messages written as
 * `zero | one | two | few | many | other`.
 *
 * Other locales use vue-i18n's default rule and keep single-form messages
 * (the plural argument is ignored for messages without `|`).
 */
export const arPluralRule: PluralizationRule = (choice, choicesLength) => {
  if (choicesLength !== 6) {
    // Not an Arabic six-form message: behave like vue-i18n's default rule.
    choice = Math.abs(choice)
    if (choicesLength === 2) return choice ? (choice > 1 ? 1 : 0) : 1
    return choice ? Math.min(choice, 2) : 0
  }
  const n = Math.abs(choice)
  if (n === 0) return 0
  if (n === 1) return 1
  if (n === 2) return 2
  const mod100 = n % 100
  if (mod100 >= 3 && mod100 <= 10) return 3
  if (mod100 >= 11 && mod100 <= 99) return 4
  return 5
}

/** Per-locale plural rules passed to `createI18n({ pluralRules })`. */
export const pluralRules = { ar: arPluralRule }
