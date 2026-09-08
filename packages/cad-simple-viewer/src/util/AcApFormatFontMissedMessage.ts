import { AcApFontUtil } from './AcApFontUtil'
import {
  acapI18nTranslate,
  type AcApTranslateFn
} from './AcApFormatUnsupportedEntitiesMessage'

/**
 * Formats one missing font with its replacement name for notification text.
 *
 * @param t - Translation function (key + `{param}` interpolation).
 * @param fontName - Missing font face name.
 * @returns Localized string naming the font and its replacement.
 */
export function acapResolveFontMissedReplacement(
  t: AcApTranslateFn,
  fontName: string
): string {
  return t('main.message.fontMissedReplacement', {
    font: fontName,
    replacement: AcApFontUtil.getReplacementFontName(fontName)
  })
}

/**
 * Formats several missing fonts with replacement names.
 *
 * @param t - Translation function (key + `{param}` interpolation).
 * @param fontNames - Missing font face names.
 * @returns Comma-separated localized replacement strings.
 */
export function acapResolveFontsMissedReplacement(
  t: AcApTranslateFn,
  fontNames: string[]
): string {
  return fontNames
    .map(fontName => acapResolveFontMissedReplacement(t, fontName))
    .join(', ')
}

/**
 * Formats one missing font with replacement using {@link AcApI18n}.
 *
 * @param fontName - Missing font face name.
 * @returns Localized string naming the font and its replacement.
 */
export function acapFormatFontMissedReplacement(fontName: string): string {
  return acapResolveFontMissedReplacement(acapI18nTranslate, fontName)
}

/**
 * Formats several missing fonts with replacement using {@link AcApI18n}.
 *
 * @param fontNames - Missing font face names.
 * @returns Comma-separated localized replacement strings.
 */
export function acapFormatFontsMissedReplacement(fontNames: string[]): string {
  return acapResolveFontsMissedReplacement(acapI18nTranslate, fontNames)
}
