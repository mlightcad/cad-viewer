import type { AcExHtmlI18n } from './AcExHtmlI18n'
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
  /** Called after ortho/polar UI state changes so the shared toolbar can refresh. */
  onUiChange?: () => void
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
  /** Whether the polar-angle panel is visible. */
  isPolarPanelOpen(): boolean
  /** Toggles orthogonal mode (closes the polar panel). */
  toggleOrtho(): void
  /** Opens or closes the polar-angle panel. */
  togglePolarPanel(): void
  /** Reapplies i18n labels after locale change. */
  refreshLabels: () => void
  /** Closes the polar-angle panel. */
  close: () => void
}

/**
 * Wires ortho / polar tracking for the offline HTML viewer.
 * Ortho and polar toggles live on the shared {@link AcExToolbar}; this module
 * owns persisted state and the polar-angle panel beside the toolbar.
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

  const persist = () => savePersistedSettings(state)

  const notifyUi = () => ctx.onUiChange?.()

  const syncMeasureColor = () => {
    applyMeasureColorCss(state.measureColor)
    ctx.measure.setDrawStyle({ colorHex: state.measureColor })
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
    if (open) syncPolarAngleButtons()
    notifyUi()
  }

  const disableTracking = () => {
    state.ortho = false
    state.polar = false
    syncPolarAngleButtons()
    persist()
    notifyUi()
  }

  const enableOrtho = () => {
    state.ortho = true
    state.polar = false
    state.polarAng = ACEX_ORTHO_POLAR_ANGLE
    syncPolarAngleButtons()
    persist()
    notifyUi()
  }

  const disableOrtho = () => {
    state.ortho = false
    syncPolarAngleButtons()
    persist()
    notifyUi()
  }

  const enablePolar = (angle: number) => {
    if (isOrthoPolarAngle(angle)) {
      enableOrtho()
      return
    }
    state.ortho = false
    state.polar = true
    state.polarAng = angle
    syncPolarAngleButtons()
    persist()
    notifyUi()
  }

  const toggleOrtho = () => {
    setPolarPanelOpen(false)
    if (state.ortho) {
      disableOrtho()
    } else {
      enableOrtho()
    }
  }

  const togglePolarPanel = () => {
    setPolarPanelOpen(polarPanel?.hidden !== false)
  }

  const isPolarPanelOpen = () => (polarPanel ? !polarPanel.hidden : false)

  syncMeasureColor()
  syncPolarAngleButtons()

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

  const handleOutsideClick = (event: MouseEvent) => {
    if (!polarPanel || polarPanel.hidden) return
    const target = event.target
    if (!(target instanceof Node)) return
    if (polarPanel.contains(target)) return
    if (
      target instanceof Element &&
      (target.closest('[data-toolbar-item-id="snap"]') ||
        target.closest('[data-toolbar-item-id="snap-ortho"]') ||
        target.closest('[data-toolbar-item-id="snap-polar"]') ||
        target.closest('.ml-ex-ui-subtoolbar'))
    ) {
      return
    }
    setPolarPanelOpen(false)
  }
  document.addEventListener('mousedown', handleOutsideClick, true)

  const refreshLabels = () => {
    ctx.i18n.applyToDocument(polarPanel ?? undefined)
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
    isPolarPanelOpen,
    toggleOrtho,
    togglePolarPanel,
    refreshLabels,
    close: () => setPolarPanelOpen(false)
  }
}
