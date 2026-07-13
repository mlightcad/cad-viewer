import type { AcEdEvents } from '@mlightcad/cad-simple-viewer'
import type { AcDbOpenDatabaseErrorCode } from '@mlightcad/data-model'

export type OpenFileErrorParams = AcEdEvents['failed-to-open-file']

type TranslateFn = (key: string, params?: Record<string, string>) => string

/**
 * Resolves a user-facing open-file failure message from structured error metadata.
 */
export function resolveOpenFileErrorMessage(
  t: TranslateFn,
  params: OpenFileErrorParams
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
    default:
      return t('main.message.failedToOpenFile', { fileName: params.fileName })
  }
}

/**
 * Resolves a notification title for an open-file failure.
 */
export function resolveOpenFileErrorTitle(
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
    default:
      return t('main.notification.title.failedToOpenFile')
  }
}
