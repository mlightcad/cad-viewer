import { AcApI18n } from '../i18n/AcApI18n'
import type { AcApUnsupportedDrawingAnalysis } from './AcApAnalyzeUnsupportedDrawing'

export type AcApTranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

/**
 * Applies `{name}` placeholders in a locale template string.
 */
export function acapApplyTemplateParams(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template
  let text = template
  for (const [key, value] of Object.entries(params)) {
    text = text.split(`{${key}}`).join(String(value))
  }
  return text
}

/**
 * TranslateFn backed by {@link AcApI18n} with `{param}` interpolation.
 */
export function acapI18nTranslate(
  key: string,
  params?: Record<string, string | number>
): string {
  return acapApplyTemplateParams(AcApI18n.t(key), params)
}

/**
 * Builds the notification body for unsupported / custom entity warnings.
 *
 * Prefers an explicit 天正 message when that family of classes is detected so
 * users understand why large parts of the drawing may be blank.
 */
export function acapResolveUnsupportedEntitiesMessage(
  t: AcApTranslateFn,
  analysis: AcApUnsupportedDrawingAnalysis
): string {
  const parts: string[] = []

  if (analysis.isTianzhengDrawing && analysis.tianzhengEntityCount > 0) {
    parts.push(
      t('main.message.tianzhengEntities', {
        count: analysis.tianzhengEntityCount
      })
    )
  }

  if (analysis.unknownEntityCount > 0) {
    parts.push(
      t('main.message.unknownEntities', {
        count: analysis.unknownEntityCount
      })
    )
  } else if (
    !analysis.isTianzhengDrawing &&
    analysis.emptyProxyEntityCount > 0
  ) {
    parts.push(
      t('main.message.emptyProxyEntities', {
        count: analysis.emptyProxyEntityCount
      })
    )
  }

  return parts.join(' ')
}

/**
 * Formats unsupported-entity warning text using {@link AcApI18n}.
 */
export function acapFormatUnsupportedEntitiesMessage(
  analysis: AcApUnsupportedDrawingAnalysis
): string {
  return acapResolveUnsupportedEntitiesMessage(acapI18nTranslate, analysis)
}
