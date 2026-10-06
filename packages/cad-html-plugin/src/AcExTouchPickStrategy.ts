/**
 * Touch precise-pick strategies for the offline HTML viewer.
 *
 * Mirrors {@link acedTouchPickStrategy} in cad-simple-viewer: loupe-at-finger
 * vs simulated-mouse crosshair above the finger.
 */

/** `localStorage` key for the simulated-mouse preference (default on). */
export const ACEX_SIMULATED_MOUSE_STORAGE_KEY = 'mlcad-html-simulated-mouse'

/**
 * Vertical offset (CSS px) from the finger contact to the simulated-mouse
 * crosshair center.
 */
export const ACEX_SIMULATED_MOUSE_OFFSET_Y_PX = 52

/**
 * Whether simulated-mouse touch picking is enabled.
 *
 * Defaults to `true` when unset so offline HTML matches the live viewer.
 */
export function acexIsSimulatedMouseEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const raw = localStorage.getItem(ACEX_SIMULATED_MOUSE_STORAGE_KEY)
    if (raw == null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

/**
 * Persists the simulated-mouse preference.
 *
 * @param enabled - True to use the crosshair-above-finger strategy.
 */
export function acexSetSimulatedMouseEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      ACEX_SIMULATED_MOUSE_STORAGE_KEY,
      enabled ? 'true' : 'false'
    )
  } catch {
    // Quota / private mode — keep in-memory behavior via next read default.
  }
}

/**
 * Toggles and persists the simulated-mouse preference.
 *
 * @returns The new enabled state.
 */
export function acexToggleSimulatedMouse(): boolean {
  const next = !acexIsSimulatedMouseEnabled()
  acexSetSimulatedMouseEnabled(next)
  return next
}

/** HUD operations a touch-pick strategy may drive during precise capture. */
export interface AcExTouchPickHudHost {
  refreshSnapLoupe(clientX: number, clientY: number): void
  hideSnapLoupe(): void
  refreshSimulatedCursor(clientX: number, clientY: number): void
  hideSimulatedCursor(): void
}

/**
 * Maps a finger sample to a pick sample and owns precise-capture chrome.
 */
export interface AcExTouchPickStrategy {
  mapFingerToSample(
    clientX: number,
    clientY: number
  ): { x: number; y: number }
  showPreciseHud(
    host: AcExTouchPickHudHost,
    sampleX: number,
    sampleY: number
  ): void
  hidePreciseHud(host: AcExTouchPickHudHost): void
}

/** Classic mobile pick: sample at the finger; magnifier loupe tracks the tip. */
export class AcExLoupeTouchPickStrategy implements AcExTouchPickStrategy {
  mapFingerToSample(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    return { x: clientX, y: clientY }
  }

  showPreciseHud(
    host: AcExTouchPickHudHost,
    sampleX: number,
    sampleY: number
  ): void {
    host.hideSimulatedCursor()
    host.refreshSnapLoupe(sampleX, sampleY)
  }

  hidePreciseHud(host: AcExTouchPickHudHost): void {
    host.hideSnapLoupe()
  }
}

/**
 * Simulated mouse: sample and crosshair sit above the finger so the tip
 * does not block the geometry being snapped to. The magnifier loupe still
 * tracks the (offset) sample — it does not conflict with the crosshair.
 */
export class AcExSimulatedMouseTouchPickStrategy
  implements AcExTouchPickStrategy
{
  mapFingerToSample(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    return {
      x: clientX,
      y: Math.max(0, clientY - ACEX_SIMULATED_MOUSE_OFFSET_Y_PX)
    }
  }

  showPreciseHud(
    host: AcExTouchPickHudHost,
    sampleX: number,
    sampleY: number
  ): void {
    host.refreshSimulatedCursor(sampleX, sampleY)
    host.refreshSnapLoupe(sampleX, sampleY)
  }

  hidePreciseHud(host: AcExTouchPickHudHost): void {
    host.hideSimulatedCursor()
    host.hideSnapLoupe()
  }
}

const loupeStrategy = new AcExLoupeTouchPickStrategy()
const simulatedMouseStrategy = new AcExSimulatedMouseTouchPickStrategy()

/**
 * Active touch precise-pick strategy from the persisted preference.
 *
 * Re-evaluated each call so toggling mid-command applies on the next sample.
 */
export function acexTouchPickStrategy(): AcExTouchPickStrategy {
  return acexIsSimulatedMouseEnabled()
    ? simulatedMouseStrategy
    : loupeStrategy
}
