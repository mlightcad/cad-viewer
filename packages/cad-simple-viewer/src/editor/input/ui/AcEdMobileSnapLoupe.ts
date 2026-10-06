/**
 * Shared mobile snap loupe: one HUD per view for point pick and osnap grip drag.
 *
 * On phone/pad, whenever a touch gesture needs precise object snap, callers
 * refresh this loupe instead of owning their own {@link AcEdSnapLoupe}.
 */

import type { AcDbOsnapMode } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../view'
import { AcEdOsnapResolver } from '../AcEdOsnapResolver'
import type { AcEdMarkerType } from '../marker/AcEdMarker'
import { acedInteractionStrategy } from './AcEdInteractionStrategy'
import { AcEdSnapLoupe } from './AcEdSnapLoupe'

/** Lazily created loupe HUD keyed by view. */
const loupes = new WeakMap<AcEdBaseView, AcEdSnapLoupe>()

/**
 * World-space snap sample used to place the OSNAP glyph inside the loupe.
 * `type` may be an object-snap mode or an already-resolved marker shape.
 */
export interface AcEdMobileSnapLoupeSnap {
  /** Snapped world X. */
  x: number
  /** Snapped world Y. */
  y: number
  /** Object-snap mode or marker shape for the glyph. */
  type: AcDbOsnapMode | AcEdMarkerType
}

/**
 * Shows or repositions the shared snap loupe around a client sample.
 *
 * No-op on desktop UI. Creates the HUD on first use for this view.
 *
 * @param view - View that owns the overlay viewport and coordinate helpers.
 * @param clientX - Sample X in viewport/client CSS pixels.
 * @param clientY - Sample Y in viewport/client CSS pixels.
 * @param snap - Active object snap in world space, if any.
 */
export function acedRefreshMobileSnapLoupe(
  view: AcEdBaseView,
  clientX: number,
  clientY: number,
  snap?: AcEdMobileSnapLoupeSnap | null
): void {
  if (!acedInteractionStrategy().point.showsSnapLoupeOnTouchPick) return
  let loupe = loupes.get(view)
  if (!loupe) {
    loupe = new AcEdSnapLoupe(view)
    loupes.set(view, loupe)
  }
  const canvas = view.viewportToCanvas({ x: clientX, y: clientY })
  if (snap) {
    const snapScreen = view.worldToScreen(snap)
    const markerType =
      typeof snap.type === 'string'
        ? snap.type
        : AcEdOsnapResolver.osnapModeToMarkerType(snap.type)
    loupe.show(
      canvas.x,
      canvas.y,
      { x: snapScreen.x, y: snapScreen.y },
      markerType
    )
  } else {
    loupe.show(canvas.x, canvas.y)
  }
}

/**
 * Hides the shared snap loupe for `view` if it is visible.
 *
 * @param view - View whose loupe should be hidden.
 */
export function acedHideMobileSnapLoupe(view: AcEdBaseView): void {
  loupes.get(view)?.hide()
}

/**
 * Disposes the shared loupe HUD for `view` (tests / view teardown).
 *
 * @param view - View whose loupe should be destroyed.
 */
export function acedDisposeMobileSnapLoupe(view: AcEdBaseView): void {
  const loupe = loupes.get(view)
  if (!loupe) return
  loupe.dispose()
  loupes.delete(view)
}
