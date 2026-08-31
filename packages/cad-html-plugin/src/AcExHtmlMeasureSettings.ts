import {
  ACEX_HTML_LOCALE_BADGES,
  ACEX_HTML_LOCALES,
  type AcExHtmlI18n,
  type AcExHtmlLocale
} from './AcExHtmlI18n'
import { acExHtmlIcons, acExToolbarButton } from './AcExHtmlIcons'
import type { AcExMeasureController } from './AcExMeasurement'
import type { AcExTrackingOptions } from './AcExMeasureTracking'

/** Default measurement accent color (`--mlcad-accent`). */
export const ACEX_DEFAULT_MEASURE_COLOR = 0x08e8de

/** `localStorage` key for persisted measure settings. */
export const ACEX_MEASURE_SETTINGS_STORAGE_KEY = 'mlcad-html-measure-settings'

/** Common polar angle increments for the offline HTML viewer. */
export const ACEX_POLAR_ANGLE_INCREMENTS = [90, 45, 30, 23, 18, 10, 5] as const

/** Polar increment equivalent to orthogonal mode. */
export const ACEX_ORTHO_POLAR_ANGLE = 90

/** Default polar increment when polar tracking is enabled. */
export const ACEX_DEFAULT_POLAR_ANGLE = ACEX_ORTHO_POLAR_ANGLE

/** Persisted measure settings for the offline HTML viewer. */
export interface AcExMeasureSettingsState {
  measureColor: number
  ortho: boolean
  polar: boolean
  polarAng: number
}

interface AcExMeasureSettingsPersisted {
  measureColor?: number
  ortho?: boolean
  polar?: boolean
  polarAng?: number
}

/** Dependencies for {@link setupAcExHtmlMeasureSettings}. */
export interface AcExHtmlMeasureSettingsContext {
  i18n: AcExHtmlI18n
  measure: AcExMeasureController
  angbase: number
  angdir: number
}

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

function hexToRgba(hex: number, alpha: number): string {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function applyMeasureColorCss(hex: number): void {
  const css = hexToCss(hex)
  const root = document.documentElement
  root.style.setProperty('--mlcad-measure-accent', css)
  root.style.setProperty('--mlcad-measure-accent-border', hexToRgba(hex, 0.45))
  root.style.setProperty('--mlcad-measure-accent-fill', hexToRgba(hex, 0.2))
}

function isOrthoPolarAngle(angle: number): boolean {
  return Math.abs(angle - ACEX_ORTHO_POLAR_ANGLE) < 0.001
}

function normalizeTrackingState(state: AcExMeasureSettingsState): void {
  if (state.ortho) {
    state.polar = false
    state.polarAng = ACEX_ORTHO_POLAR_ANGLE
    return
  }
  if (state.polar && isOrthoPolarAngle(state.polarAng)) {
    state.ortho = true
    state.polar = false
  }
}

function loadPersistedSettings(): Partial<AcExMeasureSettingsState> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ACEX_MEASURE_SETTINGS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as AcExMeasureSettingsPersisted
    const result: Partial<AcExMeasureSettingsState> = {}
    if (
      typeof parsed.measureColor === 'number' &&
      Number.isFinite(parsed.measureColor)
    ) {
      result.measureColor = parsed.measureColor
    }
    if (typeof parsed.ortho === 'boolean') result.ortho = parsed.ortho
    if (typeof parsed.polar === 'boolean') result.polar = parsed.polar
    if (
      typeof parsed.polarAng === 'number' &&
      Number.isFinite(parsed.polarAng)
    ) {
      const match = ACEX_POLAR_ANGLE_INCREMENTS.find(
        value => Math.abs(value - parsed.polarAng!) < 0.001
      )
      if (match != null) result.polarAng = match
    }
    if (
      result.ortho != null ||
      result.polar != null ||
      result.polarAng != null
    ) {
      const normalized: AcExMeasureSettingsState = {
        measureColor: ACEX_DEFAULT_MEASURE_COLOR,
        ortho: result.ortho ?? false,
        polar: result.polar ?? false,
        polarAng: result.polarAng ?? ACEX_DEFAULT_POLAR_ANGLE
      }
      normalizeTrackingState(normalized)
      result.ortho = normalized.ortho
      result.polar = normalized.polar
      result.polarAng = normalized.polarAng
    }
    return result
  } catch {
    return {}
  }
}

function savePersistedSettings(state: AcExMeasureSettingsState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      ACEX_MEASURE_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        measureColor: state.measureColor,
        ortho: state.ortho,
        polar: state.polar,
        polarAng: state.polarAng
      })
    )
  } catch {
    /* private mode */
  }
}

/**
 * First-level language picker. The parent icon is the selected locale badge,
 * matching cad-simple-ui-plugin `childIcon: 'selected'`.
 */
export function buildAcExLanguageToolbarButton(): string {
  return '<button type="button" class="mlcad-tool-btn has-children" id="mlcad-lang-btn" aria-haspopup="true" aria-expanded="false" data-children-ui="toolbar" data-i18n-key="toolbar.language" data-i18n-attr="title aria-label" title="Language" aria-label="Language"><span class="mlcad-tool-btn-icon" aria-hidden="true"><span class="mlcad-locale-option-badge" id="mlcad-lang-badge">EN</span></span><span class="mlcad-tool-btn-label" data-i18n-key="toolbar.language" data-i18n-text>Language</span></button>'
}

const LOCALE_LABEL_KEYS: Record<
  AcExHtmlLocale,
  'toolbar.localeEn' | 'toolbar.localeZh' | 'toolbar.localeCs' | 'toolbar.localeTr' | 'toolbar.localeAr'
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
 * Builds the object-snap strip (ortho + polar) inserted beside the toolbar.
 */
export function buildAcExHtmlSnapStrip(): string {
  const polarAngleButtons = ACEX_POLAR_ANGLE_INCREMENTS.map(
    angle =>
      `<button type="button" class="mlcad-tool-btn mlcad-settings-option-btn mlcad-polar-angle-btn" data-polar-ang="${angle}" title="${angle}°" aria-label="${angle}°"><span class="mlcad-settings-option-indicator" aria-hidden="true"></span><span class="mlcad-settings-option-text">${angle}°</span></button>`
  ).join('')

  return `
      <div id="mlcad-snap-strip-wrap" hidden>
        <div id="mlcad-snap-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.snap" aria-label="Object snap">
          ${acExToolbarButton(acExHtmlIcons.orthoMode, 'Orthogonal mode', {
            id: 'mlcad-ortho-btn',
            'data-toggle': 'ortho',
            'data-i18n-key': 'settings.ortho',
            'data-i18n-attr': 'title aria-label'
          })}
          ${acExToolbarButton(acExHtmlIcons.polarTracking, 'Polar tracking', {
            id: 'mlcad-polar-btn',
            'data-toggle': 'polar',
            'data-i18n-key': 'settings.polar',
            'data-i18n-attr': 'title aria-label'
          })}
        </div>
        <div id="mlcad-polar-angles" role="group" data-i18n-attr="aria-label" data-i18n-key="settings.polarAngles" aria-label="Polar tracking angles" hidden>
          ${polarAngleButtons}
        </div>
      </div>`
}

/** Live measure settings exposed to the measurement controller. */
export interface AcExHtmlMeasureSettingsController {
  /** Current settings snapshot. */
  readonly state: AcExMeasureSettingsState
  /** Tracking options derived from state and snapshot angle metadata. */
  getTrackingOptions(): AcExTrackingOptions
  /** Reapplies i18n labels after locale change. */
  refreshLabels: () => void
  /** Closes the polar-angle panel (the snap strip is owned by the flyout). */
  close: () => void
}

/**
 * Wires ortho and polar tracking controls in the object-snap strip.
 * Strip open/close is owned by {@link setupAcExHtmlToolbarFlyouts}.
 * Drawing color / font size live on the session panel accessory.
 */
export function setupAcExHtmlMeasureSettings(
  ctx: AcExHtmlMeasureSettingsContext
): AcExHtmlMeasureSettingsController {
  const persisted = loadPersistedSettings()
  const state: AcExMeasureSettingsState = {
    measureColor: persisted.measureColor ?? ACEX_DEFAULT_MEASURE_COLOR,
    ortho: persisted.ortho ?? false,
    polar: persisted.polar ?? false,
    polarAng: persisted.polarAng ?? ACEX_DEFAULT_POLAR_ANGLE
  }
  normalizeTrackingState(state)

  const polarPanel = document.getElementById('mlcad-polar-angles')
  const orthoBtn = document.getElementById('mlcad-ortho-btn')
  const polarBtn = document.getElementById('mlcad-polar-btn')

  const persist = () => savePersistedSettings(state)

  const syncMeasureColor = () => {
    applyMeasureColorCss(state.measureColor)
    ctx.measure.setDrawStyle({ colorHex: state.measureColor })
  }

  const syncTrackingButtons = () => {
    orthoBtn?.classList.toggle('active', state.ortho)
    const polarPanelOpen = polarPanel ? !polarPanel.hidden : false
    polarBtn?.classList.toggle(
      'active',
      polarPanelOpen || (state.polar && !state.ortho)
    )
  }

  const isPolarAngleSelected = (angle: number): boolean => {
    if (isOrthoPolarAngle(angle)) return state.ortho
    return (
      state.polar && !state.ortho && Math.abs(state.polarAng - angle) < 0.001
    )
  }

  const syncPolarAngleButtons = () => {
    document
      .querySelectorAll<HTMLButtonElement>(
        '#mlcad-polar-angles [data-polar-ang]'
      )
      .forEach(btn => {
        const ang = Number(btn.getAttribute('data-polar-ang'))
        btn.classList.toggle('active', isPolarAngleSelected(ang))
      })
  }

  const setPolarPanelOpen = (open: boolean) => {
    if (!polarPanel) return
    polarPanel.hidden = !open
    polarBtn?.setAttribute('aria-expanded', String(open))
    if (open) syncPolarAngleButtons()
    syncTrackingButtons()
  }

  const disableTracking = () => {
    state.ortho = false
    state.polar = false
    syncTrackingButtons()
    syncPolarAngleButtons()
    persist()
  }

  const enableOrtho = () => {
    state.ortho = true
    state.polar = false
    state.polarAng = ACEX_ORTHO_POLAR_ANGLE
    syncTrackingButtons()
    syncPolarAngleButtons()
    persist()
  }

  const disableOrtho = () => {
    state.ortho = false
    syncTrackingButtons()
    syncPolarAngleButtons()
    persist()
  }

  const enablePolar = (angle: number) => {
    if (isOrthoPolarAngle(angle)) {
      enableOrtho()
      return
    }
    state.ortho = false
    state.polar = true
    state.polarAng = angle
    syncTrackingButtons()
    syncPolarAngleButtons()
    persist()
  }

  syncMeasureColor()
  syncTrackingButtons()
  syncPolarAngleButtons()

  orthoBtn?.addEventListener('click', event => {
    event.stopPropagation()
    setPolarPanelOpen(false)
    if (state.ortho) {
      disableOrtho()
    } else {
      enableOrtho()
    }
  })

  polarBtn?.addEventListener('click', event => {
    event.stopPropagation()
    setPolarPanelOpen(polarPanel?.hidden !== false)
  })

  document
    .querySelectorAll<HTMLButtonElement>('#mlcad-polar-angles [data-polar-ang]')
    .forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation()
        const ang = Number(btn.getAttribute('data-polar-ang'))
        if (!Number.isFinite(ang)) return
        if (isPolarAngleSelected(ang)) {
          disableTracking()
          return
        }
        enablePolar(ang)
      })
    })

  // Polar panel stays until polar is toggled or the snap strip closes.

  const refreshLabels = () => {
    ctx.i18n.applyToDocument(
      document.getElementById('mlcad-snap-strip-wrap') ?? undefined
    )
    syncPolarAngleButtons()
  }

  return {
    get state() {
      return state
    },
    getTrackingOptions(): AcExTrackingOptions {
      return {
        ortho: state.ortho,
        polar: state.polar,
        polarAng: state.ortho ? ACEX_ORTHO_POLAR_ANGLE : state.polarAng,
        angbase: ctx.angbase,
        angdir: ctx.angdir
      }
    },
    refreshLabels,
    close: () => setPolarPanelOpen(false)
  }
}
