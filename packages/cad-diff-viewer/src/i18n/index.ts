import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import { ar, cs, en, tr, zh } from './messages'

/** Message namespace merged into {@link AcApI18n}. */
export const DIFF_VIEWER_I18N_PREFIX = 'diffViewer'

/** Guards {@link acapRegisterDiffViewerI18n} so locale bags are merged once. */
let isRegistered = false

/**
 * Registers diff-viewer UI strings into {@link AcApI18n}.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function acapRegisterDiffViewerI18n(): void {
  if (isRegistered) return
  AcApI18n.mergeLocaleMessage('en', { [DIFF_VIEWER_I18N_PREFIX]: en })
  AcApI18n.mergeLocaleMessage('zh', { [DIFF_VIEWER_I18N_PREFIX]: zh })
  AcApI18n.mergeLocaleMessage('tr', { [DIFF_VIEWER_I18N_PREFIX]: tr })
  AcApI18n.mergeLocaleMessage('cs', { [DIFF_VIEWER_I18N_PREFIX]: cs })
  AcApI18n.mergeLocaleMessage('ar', { [DIFF_VIEWER_I18N_PREFIX]: ar })
  isRegistered = true
}

/**
 * Translates a key under the `diffViewer` namespace.
 *
 * @param key - Message key from the English catalog.
 */
export function acapDiffViewerT(key: keyof typeof en): string {
  return AcApI18n.t(`${DIFF_VIEWER_I18N_PREFIX}.${key}`, { fallback: en[key] })
}
