import {
  acapResolveUnsupportedEntitiesMessage,
  type AcApUnsupportedDrawingAnalysis
} from '@mlightcad/cad-simple-viewer'

/**
 * Translation function used by {@link formatUnsupportedEntitiesMessage}.
 *
 * @param key - Locale message key.
 * @param params - Optional `{name}` placeholders.
 * @returns Localized string.
 */
type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

/**
 * Builds the notification body for unsupported / custom entity warnings.
 *
 * Prefer importing {@link acapResolveUnsupportedEntitiesMessage} /
 * {@link acapFormatUnsupportedEntitiesMessage} from cad-simple-viewer in new code.
 *
 * @param t - Host translation function (e.g. vue-i18n `t`).
 * @param analysis - Result from unsupported-drawing analysis.
 * @returns Localized warning body.
 */
export function formatUnsupportedEntitiesMessage(
  t: TranslateFn,
  analysis: AcApUnsupportedDrawingAnalysis
): string {
  return acapResolveUnsupportedEntitiesMessage(t, analysis)
}
