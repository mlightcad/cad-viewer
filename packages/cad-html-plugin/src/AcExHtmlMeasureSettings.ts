import type { AcExHtmlI18n } from './AcExHtmlI18n'
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
 * Builds the settings strip markup inserted beside the toolbar in {@link buildAcExHtmlShellBody}.
 */
export function buildAcExHtmlSettingsStrip(): string {
  const polarAngleButtons = ACEX_POLAR_ANGLE_INCREMENTS.map(
    angle =>
      `<button type="button" class="mlcad-tool-btn mlcad-settings-option-btn mlcad-polar-angle-btn" data-polar-ang="${angle}" title="${angle}°" aria-label="${angle}°"><span class="mlcad-settings-option-indicator" aria-hidden="true"></span><span class="mlcad-settings-option-text">${angle}°</span></button>`
  ).join('')

  return `
      <div id="mlcad-settings-wrap" hidden>
        <div id="mlcad-settings-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="settings.toolbar" aria-label="Measure settings">
          <button type="button" class="mlcad-tool-btn mlcad-color-btn" id="mlcad-measure-color-btn" data-i18n-key="settings.measureColor" data-i18n-attr="title aria-label" title="Measure color" aria-label="Measure color">
            ${acExHtmlIcons.color}
          </button>
          <input type="color" id="mlcad-measure-color-input" class="mlcad-color-input" value="${hexToCss(ACEX_DEFAULT_MEASURE_COLOR)}" tabindex="-1" aria-hidden="true" />
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
          <button type="button" class="mlcad-tool-btn mlcad-lang-btn" id="mlcad-lang-btn" data-i18n-key="toolbar.languageSwitch" data-i18n-attr="title aria-label" title="Switch language" aria-label="Switch language">
            ${acExHtmlIcons.language}
            <span class="mlcad-lang-badge" id="mlcad-lang-badge">EN</span>
          </button>
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
}

/**
 * Wires the measure settings strip: color picker, ortho, and polar tracking.
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

  const settingsBtn = document.getElementById('mlcad-settings-btn')
  const settingsWrap = document.getElementById('mlcad-settings-wrap')
  const polarPanel = document.getElementById('mlcad-polar-angles')
  const orthoBtn = document.getElementById('mlcad-ortho-btn')
  const polarBtn = document.getElementById('mlcad-polar-btn')
  const colorBtn = document.getElementById('mlcad-measure-color-btn')
  const colorInput = document.getElementById(
    'mlcad-measure-color-input'
  ) as HTMLInputElement | null

  const persist = () => savePersistedSettings(state)

  const syncMeasureColor = () => {
    applyMeasureColorCss(state.measureColor)
    ctx.measure.setMeasureColor(state.measureColor)
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

  const setSettingsOpen = (open: boolean) => {
    if (settingsWrap) settingsWrap.hidden = !open
    settingsBtn?.classList.toggle('active', open)
    settingsBtn?.setAttribute('aria-expanded', String(open))
    if (!open) setPolarPanelOpen(false)
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
  if (colorInput) colorInput.value = hexToCss(state.measureColor)

  settingsBtn?.addEventListener('click', event => {
    event.stopPropagation()
    const open = settingsWrap?.hidden !== false
    setSettingsOpen(open)
  })

  colorBtn?.addEventListener('click', event => {
    event.stopPropagation()
    colorInput?.click()
  })

  colorInput?.addEventListener('input', () => {
    const hex = Number.parseInt(colorInput.value.slice(1), 16)
    if (!Number.isFinite(hex)) return
    state.measureColor = hex
    syncMeasureColor()
    persist()
  })

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

  document.addEventListener('click', event => {
    if (settingsWrap?.hidden) return
    const target = event.target
    if (!(target instanceof Node)) return
    const sidebar = document.getElementById('mlcad-sidebar')
    if (sidebar?.contains(target)) return
    setSettingsOpen(false)
  })

  const refreshLabels = () => {
    ctx.i18n.applyToDocument(
      document.getElementById('mlcad-settings-wrap') ?? undefined
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
    refreshLabels
  }
}
