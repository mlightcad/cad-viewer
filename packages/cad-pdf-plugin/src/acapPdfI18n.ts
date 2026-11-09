import { AcApI18n } from '@mlightcad/cad-simple-viewer'

/**
 * Translates `key` and substitutes `{name}` placeholders.
 *
 * `AcApI18n.t` has no interpolation, so PDF plugin prompts that embed values
 * (page count, scale, counts) go through this helper.
 *
 * @param key - Dotted message key.
 * @param vars - Placeholder values.
 */
export function acapPdfT(
  key: string,
  vars: Record<string, string | number> = {}
): string {
  let text = AcApI18n.t(key)
  for (const [name, value] of Object.entries(vars)) {
    text = text.split(`{${name}}`).join(String(value))
  }
  return text
}
