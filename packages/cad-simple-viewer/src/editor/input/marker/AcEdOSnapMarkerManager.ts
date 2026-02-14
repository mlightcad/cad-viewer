import { AcGePoint2dLike } from '@mlightcad/data-model'

import { AcEdBaseView } from '../../view'
import { AcEdMarker, AcEdMarkerType } from './AcEdMarker'

/**
 * Manages a stack of markers using a singleton pattern.
 *
 * - `getInstance()` returns the global instance.
 * - `showMarker()` pushes a new marker onto the stack.
 * - `hideMarker()` pops the last marker.
 * - `clear()` removes all markers.
 *
 * Typical usage is to show temporary marker that appear and disappear
 * based on user cursor movement or snapping events.
 */
export class AcEdMarkerManager {
  /** The view associated with this input operation */
  private view: AcEdBaseView

  /** Internal stack of active markers */
  private stack: AcEdMarker[] = []

  constructor(view: AcEdBaseView) {
    this.view = view
  }

  /**
   * Creates and shows a new OSNAP marker at the specified position in world coordinate
   * system. The marker is added to the top of the internal stack.
   *
   * @param pos - Position in world coordinate system
   * @param type - Marker shape type
   * @param size - Marker size in pixels
   * @param color - Marker color (CSS string)
   */
  public showMarker(
    pos: AcGePoint2dLike,
    type?: AcEdMarkerType,
    size?: number,
    color?: string
  ) {
    // worldToScreen() returns canvas-local coordinates.
    const canvasPos = this.view.worldToScreen(pos)
    // Marker DOM is mounted in view.container, so convert to container-local.
    const containerPos = this.view.canvasToContainer(canvasPos)
    const marker = new AcEdMarker(type, size, color, this.view.container)
    marker.setPosition(containerPos)
    this.stack.push(marker)
    return marker
  }

  /**
   * Hides the most recently shown marker (LIFO).
   * If no marker exists, nothing happens.
   */
  public hideMarker() {
    const marker = this.stack.pop()
    if (marker) marker.destroy()
  }

  /**
   * Removes all active markers and clears the stack.
   * Should be called when OSNAP indicators need to be fully reset.
   */
  public clear() {
    for (const marker of this.stack) marker.destroy()
    this.stack = []
  }

  /**
   * Returns the marker at the top of the marker stack without removing it.
   *
   * This method is safe to call even when the stack is empty. In that case,
   * it returns `undefined`.
   *
   * @returns The top marker of the internal stack, or `undefined` if the
   * stack contains no marker.
   */
  public top(): AcEdMarker | undefined {
    return this.stack[this.stack.length - 1]
  }
}
