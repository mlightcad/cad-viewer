import type { AcDbOpenDatabaseErrorCode } from '@mlightcad/data-model'

import type { AcEdEvents } from '../editor/global/eventBus'
import { AcApI18n } from '../i18n/AcApI18n'

export type AcApOpenFileErrorParams = AcEdEvents['failed-to-open-file']

type TranslateFn = (key: string, params?: Record<string, string>) => string

/**
 * Applies `{name}` placeholders in a locale template string.
 */
function applyTemplateParams(
  template: string,
  params?: Record<string, string>
): string {
  if (!params) return template
  let text = template
  for (const [key, value] of Object.entries(params)) {
    text = text.split(`{${key}}`).join(value)
  }
  return text
}

/**
 * TranslateFn backed by {@link AcApI18n} with `{param}` interpolation.
 */
function acapI18nTranslate(
  key: string,
  params?: Record<string, string>
): string {
  return applyTemplateParams(AcApI18n.t(key), params)
}

/**
 * Resolves a user-facing open-file failure message from structured error metadata.
 *
 * Maps {@link AcDbOpenDatabaseErrorCode} values (including license failures) to
 * localized `main.message.*` strings.
 */
export function acapResolveOpenFileErrorMessage(
  t: TranslateFn,
  params: AcApOpenFileErrorParams
): string {
  switch (params.errorCode) {
    case 'worker_oom':
      return t('main.message.failedToOpenFileWorkerOom', {
        fileName: params.fileName
      })
    case 'worker_timeout':
      return t('main.message.failedToOpenFileWorkerTimeout', {
        fileName: params.fileName
      })
    case 'font_load_failed':
      return t('main.message.failedToOpenFileFontLoadFailed', {
        fileName: params.fileName
      })
    case 'license_expired':
      return t('main.message.failedToOpenFileLicenseExpired', {
        fileName: params.fileName
      })
    case 'license_invalid':
      return t('main.message.failedToOpenFileLicenseInvalid', {
        fileName: params.fileName
      })
    default:
      return t('main.message.failedToOpenFile', { fileName: params.fileName })
  }
}

/**
 * Resolves a short notification title for an open-file failure.
 */
export function acapResolveOpenFileErrorTitle(
  t: TranslateFn,
  errorCode?: AcDbOpenDatabaseErrorCode
): string {
  switch (errorCode) {
    case 'worker_oom':
      return t('main.notification.title.failedToOpenFileWorkerOom')
    case 'worker_timeout':
      return t('main.notification.title.failedToOpenFileWorkerTimeout')
    case 'font_load_failed':
      return t('main.notification.title.failedToOpenFileFontLoadFailed')
    case 'license_expired':
      return t('main.notification.title.failedToOpenFileLicenseExpired')
    case 'license_invalid':
      return t('main.notification.title.failedToOpenFileLicenseInvalid')
    default:
      return t('main.notification.title.failedToOpenFile')
  }
}

/**
 * Resolves a localized open-file failure message using {@link AcApI18n}.
 */
export function acapFormatOpenFileErrorMessage(
  params: AcApOpenFileErrorParams
): string {
  return acapResolveOpenFileErrorMessage(acapI18nTranslate, params)
}

/**
 * Resolves a localized open-file failure title using {@link AcApI18n}.
 */
export function acapFormatOpenFileErrorTitle(
  errorCode?: AcDbOpenDatabaseErrorCode
): string {
  return acapResolveOpenFileErrorTitle(acapI18nTranslate, errorCode)
}
