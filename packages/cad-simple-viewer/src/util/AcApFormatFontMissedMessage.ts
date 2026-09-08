import { AcApFontUtil } from './AcApFontUtil'
import {
  acapI18nTranslate,
  type AcApTranslateFn
} from './AcApFormatUnsupportedEntitiesMessage'

/**
 * Formats one missing font with its replacement name for notification text.
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
 */
export function acapFormatFontMissedReplacement(fontName: string): string {
  return acapResolveFontMissedReplacement(acapI18nTranslate, fontName)
}

/**
 * Formats several missing fonts with replacement using {@link AcApI18n}.
 */
export function acapFormatFontsMissedReplacement(fontNames: string[]): string {
  return acapResolveFontsMissedReplacement(acapI18nTranslate, fontNames)
}
