/**
 * Touch precise-pick strategies: finger loupe vs simulated mouse crosshair.
 *
 * Layout ({@link acedInteractionStrategy}) and pointer type remain separate
 * axes. This strategy chooses how a long-press touch sample is mapped and
 * which HUD chrome is shown during precise capture. The magnifier loupe is
 * shown in both modes after a long press; simulated mouse only changes the
 * sample offset and whether a crosshair is drawn.
 */

import { AcApSettingManager } from '../../../app/AcApSettingManager'

/**
 * Vertical offset (CSS px) from the finger contact to the simulated-mouse
 * crosshair center. Keeps the sample above the fingertip so geometry stays
 * visible while dragging.
 */
export const ACED_SIMULATED_MOUSE_OFFSET_Y_PX = 52

/**
 * HUD operations a touch-pick strategy may drive during precise capture.
 * Implemented by the active point prompt (for example {@link AcEdFloatingInput}).
 */
export interface AcEdTouchPickHudHost {
  /** Magnifier loupe centered on the pick sample. */
  refreshSnapLoupe(
    clientX: number,
    clientY: number,
    snap?: { x: number; y: number; type: number } | null
  ): void
  /** Hides the magnifier loupe. */
  hideSnapLoupe(): void
  /** Crosshair cursor at the pick sample (above the finger). */
  refreshSimulatedCursor(clientX: number, clientY: number): void
  /** Hides the simulated-mouse crosshair. */
  hideSimulatedCursor(): void
}

/**
 * Maps a finger sample to a pick sample and owns precise-capture chrome.
 *
 * Callers resolve the active strategy via {@link acedTouchPickStrategy}
 * instead of branching on {@link AcApSettings.useSimulatedMouseOnTouch}.
 */
export interface AcEdTouchPickStrategy {
  /**
   * Maps finger client coordinates to the WCS / OSNAP sample used for the
   * pick. Loupe mode is identity; simulated mouse offsets upward.
   */
  mapFingerToSample(
    clientX: number,
    clientY: number
  ): { x: number; y: number }
  /** Shows or repositions this strategy's precise-capture HUD. */
  showPreciseHud(
    host: AcEdTouchPickHudHost,
    sampleX: number,
    sampleY: number,
    snap?: { x: number; y: number; type: number } | null
  ): void
  /** Hides this strategy's precise-capture HUD. */
  hidePreciseHud(host: AcEdTouchPickHudHost): void
}

/**
 * Classic mobile pick: sample at the finger; magnifier loupe tracks the tip.
 */
export class AcEdLoupeTouchPickStrategy implements AcEdTouchPickStrategy {
  mapFingerToSample(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    return { x: clientX, y: clientY }
  }

  showPreciseHud(
    host: AcEdTouchPickHudHost,
    sampleX: number,
    sampleY: number,
    snap?: { x: number; y: number; type: number } | null
  ): void {
    host.hideSimulatedCursor()
    host.refreshSnapLoupe(sampleX, sampleY, snap)
  }

  hidePreciseHud(host: AcEdTouchPickHudHost): void {
    host.hideSnapLoupe()
  }
}

/**
 * Simulated mouse: sample and crosshair sit above the finger so the tip
 * does not block the geometry being snapped to. The magnifier loupe still
 * tracks the (offset) sample — it does not conflict with the crosshair.
 */
export class AcEdSimulatedMouseTouchPickStrategy
  implements AcEdTouchPickStrategy
{
  mapFingerToSample(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    return {
      x: clientX,
      y: Math.max(0, clientY - ACED_SIMULATED_MOUSE_OFFSET_Y_PX)
    }
  }

  showPreciseHud(
    host: AcEdTouchPickHudHost,
    sampleX: number,
    sampleY: number,
    snap?: { x: number; y: number; type: number } | null
  ): void {
    host.refreshSimulatedCursor(sampleX, sampleY)
    host.refreshSnapLoupe(sampleX, sampleY, snap)
  }

  hidePreciseHud(host: AcEdTouchPickHudHost): void {
    host.hideSimulatedCursor()
    host.hideSnapLoupe()
  }
}

const loupeStrategy = new AcEdLoupeTouchPickStrategy()
const simulatedMouseStrategy = new AcEdSimulatedMouseTouchPickStrategy()

/**
 * Active touch precise-pick strategy from {@link AcApSettings}.
 *
 * Re-evaluated each call so toggling the setting mid-command applies on the
 * next gesture (and the next move while a finger is still down).
 */
export function acedTouchPickStrategy(): AcEdTouchPickStrategy {
  return AcApSettingManager.instance.get('useSimulatedMouseOnTouch')
    ? simulatedMouseStrategy
    : loupeStrategy
}
