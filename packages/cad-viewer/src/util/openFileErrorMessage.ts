import {
  type AcApOpenFileErrorParams,
  acapResolveOpenFileErrorMessage,
  acapResolveOpenFileErrorTitle} from '@mlightcad/cad-simple-viewer'
import type { AcDbOpenDatabaseErrorCode } from '@mlightcad/data-model'

export type OpenFileErrorParams = AcApOpenFileErrorParams

type TranslateFn = (key: string, params?: Record<string, string>) => string

/**
 * Resolves a user-facing open-file failure message from structured error metadata.
 */
export function resolveOpenFileErrorMessage(
  t: TranslateFn,
  params: OpenFileErrorParams
): string {
  return acapResolveOpenFileErrorMessage(t, params)
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
