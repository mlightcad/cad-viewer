import {
  ACEX_DEFAULT_POLAR_ANGLE,
  ACEX_ORTHO_POLAR_ANGLE,
  ACEX_POLAR_ANGLE_INCREMENTS,
  type AcExHtmlI18n
} from '@mlightcad/cad-html-core'

import type { AcExMeasureController } from './AcExMeasurement'
import type { AcExTrackingOptions } from './AcExMeasureTracking'

export {
  ACEX_DEFAULT_POLAR_ANGLE,
  ACEX_ORTHO_POLAR_ANGLE,
  ACEX_POLAR_ANGLE_INCREMENTS,
  buildAcExHtmlLocaleStrip,
  buildAcExHtmlPolarAnglesPanel,
  buildAcExHtmlSnapStrip
} from '@mlightcad/cad-html-core'

/** Default measurement accent color (`--mlcad-accent`). */
export const ACEX_DEFAULT_MEASURE_COLOR = 0x08e8de

/** `localStorage` key for persisted measure settings. */
export const ACEX_MEASURE_SETTINGS_STORAGE_KEY = 'mlcad-html-measure-settings'

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

/** Live measure settings exposed to the measurement controller. */
export interface AcExHtmlMeasureSettingsController {
  /** Current settings snapshot. */
  readonly state: AcExMeasureSettingsState
  /** Tracking options derived from state and snapshot angle metadata. */
  getTrackingOptions(): AcExTrackingOptions
  /** Reapplies i18n labels after locale change. */
  refreshLabels: () => void
  /** Closes the polar-angle panel. */
  close: () => void
  /** Toggles orthogonal mode (closes the polar panel). */
  toggleOrtho: () => void
  /** Whether orthogonal mode is enabled. */
  isOrtho: () => boolean
  /**
   * Toggles the polar-angle panel. Returns whether the panel is open afterwards.
   */
  togglePolarPanel: () => boolean
  /** Whether the polar-angle panel is currently open. */
  isPolarPanelOpen: () => boolean
}

/**
 * Wires ortho / polar tracking state and the polar-angle panel.
 *
 * Ortho / polar toggles are driven by {@link AcUiToolbar} (or legacy strip
 * buttons when present). Drawing color / font size live on the session panel.
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
    document
      .querySelectorAll<HTMLElement>('[data-toolbar-item-id="ortho"]')
      .forEach(btn => btn.classList.toggle('is-toggled', state.ortho))
    document
      .querySelectorAll<HTMLElement>('[data-toolbar-item-id="polar"]')
      .forEach(btn =>
        btn.classList.toggle(
          'is-toggled',
          polarPanelOpen || (state.polar && !state.ortho)
        )
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

  const toggleOrtho = () => {
    setPolarPanelOpen(false)
    if (state.ortho) {
      disableOrtho()
    } else {
      enableOrtho()
    }
  }

  const togglePolarPanel = (): boolean => {
    const nextOpen = polarPanel?.hidden !== false
    setPolarPanelOpen(nextOpen)
    return nextOpen
  }

  syncMeasureColor()
  syncTrackingButtons()
  syncPolarAngleButtons()

  orthoBtn?.addEventListener('click', event => {
    event.stopPropagation()
    toggleOrtho()
  })

  polarBtn?.addEventListener('click', event => {
    event.stopPropagation()
    togglePolarPanel()
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
    close: () => setPolarPanelOpen(false),
    toggleOrtho,
    isOrtho: () => state.ortho,
    togglePolarPanel,
    isPolarPanelOpen: () => (polarPanel ? !polarPanel.hidden : false)
  }
}
