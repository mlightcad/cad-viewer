import {
  type AcApOpenFileErrorParams,
  acapResolveOpenFileErrorMessage,
  acapResolveOpenFileErrorTitle,
  acapResolveOpenFileErrorToastMessage
} from '@mlightcad/cad-simple-viewer'
import type { AcDbOpenDatabaseErrorCode } from '@mlightcad/data-model'

export type OpenFileErrorParams = AcApOpenFileErrorParams

type TranslateFn = (key: string, params?: Record<string, string>) => string

/**
 * Resolves a detailed open-file failure message for the notification center.
 */
export function resolveOpenFileErrorMessage(
  t: TranslateFn,
  params: OpenFileErrorParams
): string {
  return acapResolveOpenFileErrorMessage(t, params)
}

/**
 * Resolves a short open-file failure toast (details live in the notification center).
 */
export function resolveOpenFileErrorToastMessage(
  t: TranslateFn,
  params: OpenFileErrorParams
): string {
  return acapResolveOpenFileErrorToastMessage(t, params)
}

/**
 * Resolves a notification title for an open-file failure.
 */
export function resolveOpenFileErrorTitle(
  t: TranslateFn,
  errorCode?: AcDbOpenDatabaseErrorCode
): string {
  return acapResolveOpenFileErrorTitle(t, errorCode)
}
