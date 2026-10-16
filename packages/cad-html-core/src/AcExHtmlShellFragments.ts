import {
  ACEX_HTML_LOCALE_BADGES,
  ACEX_HTML_LOCALES,
  type AcExHtmlLocale
} from './AcExHtmlI18n'
import { AcExHtmlIcons, acexToolbarButton } from './AcExHtmlIcons'

/** Common polar angle increments for the offline HTML viewer. */
export const ACEX_POLAR_ANGLE_INCREMENTS = [90, 45, 30, 23, 18, 10, 5] as const

/** Polar increment equivalent to orthogonal mode. */
export const ACEX_ORTHO_POLAR_ANGLE = 90

/** Default polar increment when polar tracking is enabled. */
export const ACEX_DEFAULT_POLAR_ANGLE = ACEX_ORTHO_POLAR_ANGLE

const LOCALE_LABEL_KEYS: Record<
  AcExHtmlLocale,
  | 'toolbar.localeEn'
  | 'toolbar.localeZh'
  | 'toolbar.localeCs'
  | 'toolbar.localeTr'
  | 'toolbar.localeAr'
> = {
  en: 'toolbar.localeEn',
  zh: 'toolbar.localeZh',
  cs: 'toolbar.localeCs',
  tr: 'toolbar.localeTr',
  ar: 'toolbar.localeAr'
}

const LOCALE_FALLBACK_LABELS: Record<AcExHtmlLocale, string> = {
  en: 'English',
  zh: '中文',
  cs: 'Čeština',
  tr: 'Türkçe',
  ar: 'العربية'
}

/**
 * Dismissible language strip shown beside the language parent button.
 */
export function buildAcExHtmlLocaleStrip(): string {
  const buttons = ACEX_HTML_LOCALES.map(locale => {
    const label = LOCALE_FALLBACK_LABELS[locale]
    const key = LOCALE_LABEL_KEYS[locale]
    const badge = ACEX_HTML_LOCALE_BADGES[locale]
    return `<button type="button" class="mlcad-tool-btn mlcad-locale-option" data-locale="${locale}" data-i18n-key="${key}" data-i18n-attr="title aria-label" title="${label}" aria-label="${label}"><span class="mlcad-tool-btn-icon" aria-hidden="true"><span class="mlcad-locale-option-badge">${badge}</span></span><span class="mlcad-tool-btn-label" data-i18n-key="${key}" data-i18n-text>${label}</span></button>`
  }).join('')

  return `<div id="mlcad-locale-strip-wrap" hidden>
        <div id="mlcad-locale-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.language" aria-label="Language">
          ${buttons}
        </div>
      </div>`
}

/**
 * Builds the polar-angle panel used by measure settings (opened from the snap
 * sticky sub-toolbar).
 */
export function buildAcExHtmlPolarAnglesPanel(): string {
  const polarAngleButtons = ACEX_POLAR_ANGLE_INCREMENTS.map(
    angle =>
      `<button type="button" class="mlcad-tool-btn mlcad-settings-option-btn mlcad-polar-angle-btn" data-polar-ang="${angle}" title="${angle}°" aria-label="${angle}°"><span class="mlcad-settings-option-indicator" aria-hidden="true"></span><span class="mlcad-settings-option-text">${angle}°</span></button>`
  ).join('')

  return `<div id="mlcad-polar-angles" role="group" data-i18n-attr="aria-label" data-i18n-key="settings.polarAngles" aria-label="Polar tracking angles" hidden>
          ${polarAngleButtons}
        </div>`
}

/**
 * @deprecated Snap tools now live under AcUiToolbar settings. Prefer
 * {@link buildAcExHtmlPolarAnglesPanel}.
 */
export function buildAcExHtmlSnapStrip(): string {
  return `<div id="mlcad-snap-strip-wrap" hidden>
        <div id="mlcad-snap-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.snap" aria-label="Object snap">
          ${acexToolbarButton(AcExHtmlIcons.orthoMode, 'Orthogonal mode', {
            id: 'mlcad-ortho-btn',
            'data-toggle': 'ortho',
            'data-i18n-key': 'settings.ortho',
            'data-i18n-attr': 'title aria-label'
          })}
          ${acexToolbarButton(AcExHtmlIcons.polarTracking, 'Polar tracking', {
            id: 'mlcad-polar-btn',
            'data-toggle': 'polar',
            'data-i18n-key': 'settings.polar',
            'data-i18n-attr': 'title aria-label'
          })}
        </div>
        ${buildAcExHtmlPolarAnglesPanel()}
      </div>`
}
