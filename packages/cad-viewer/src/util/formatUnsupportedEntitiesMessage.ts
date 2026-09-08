import {
  acapResolveUnsupportedEntitiesMessage,
  type AcApUnsupportedDrawingAnalysis
} from '@mlightcad/cad-simple-viewer'

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

/**
 * Builds the notification body for unsupported / custom entity warnings.
 *
 * Prefer importing {@link acapResolveUnsupportedEntitiesMessage} /
 * {@link acapFormatUnsupportedEntitiesMessage} from cad-simple-viewer in new code.
 */
export function formatUnsupportedEntitiesMessage(
  t: TranslateFn,
  analysis: AcApUnsupportedDrawingAnalysis
): string {
  return acapResolveUnsupportedEntitiesMessage(t, analysis)
}
