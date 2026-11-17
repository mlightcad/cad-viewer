import { AcApI18n, type AcApLocale } from '@mlightcad/cad-simple-viewer'

import { paddleOcrAr } from './ar.js'
import { paddleOcrCs } from './cs.js'
import { paddleOcrEn } from './en.js'
import { paddleOcrJa } from './ja.js'
import { paddleOcrKo } from './ko.js'
import { paddleOcrTr } from './tr.js'
import { paddleOcrZh } from './zh.js'

/** i18n key prefix of every PaddleOCR string. */
export const PADDLE_OCR_I18N_PREFIX = 'main.paddleocr'

/** Union of keys in {@link paddleOcrEn}. */
export type AcApPaddleOcrLabelKey = keyof typeof paddleOcrEn

/** Map of every label key to its translated string. */
export type AcApPaddleOcrLabels = Record<AcApPaddleOcrLabelKey, string>

const messagesByLocale = {
  en: paddleOcrEn,
  zh: paddleOcrZh,
  ja: paddleOcrJa,
  ko: paddleOcrKo,
  tr: paddleOcrTr,
  cs: paddleOcrCs,
  ar: paddleOcrAr
} as const satisfies Record<AcApLocale, AcApPaddleOcrLabels>

const LOCALES = Object.keys(messagesByLocale) as AcApLocale[]

let isRegistered = false

/**
 * Registers PaddleOCR strings into {@link AcApI18n}.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function registerPaddleOcrI18n(): void {
  if (isRegistered) return
  isRegistered = true
  for (const locale of LOCALES) {
    AcApI18n.mergeLocaleMessage(locale, {
      main: { paddleocr: messagesByLocale[locale] }
    })
  }
}

/** Translates a PaddleOCR label in the current locale. */
export function paddleOcrT(
  key: AcApPaddleOcrLabelKey,
  params?: Record<string, string | number>
): string {
  return AcApI18n.t(`${PADDLE_OCR_I18N_PREFIX}.${key}`, params)
}
