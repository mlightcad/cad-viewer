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

  /** Internal stack of active snap markers */
  private stack: AcEdMarker[] = []

  /** AutoCAD-style acquired center ticks (plus marks), not part of the snap stack. */
  private hintMarkers: AcEdMarker[] = []
  private hintPositions: AcGePoint2dLike[] = []

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
    const marker = this.createMarker(pos, type, size, color)
    this.stack.push(marker)
    return marker
  }

  /**
   * Replaces acquired-center plus marks. These stay visible independently of
   * the snap-marker stack so hovering a circle can show its center tick while
   * the cursor still snaps to nearest/quadrant on the circumference.
   *
   * Existing DOM nodes are reused when the set is unchanged or only grows or
   * shrinks, so a pointer-move over many acquired centers does not thrash
   * layout by destroying and recreating every tick.
   */
  public setHintMarkers(
    positions: readonly AcGePoint2dLike[],
    type: AcEdMarkerType = 'plus',
    size?: number,
    color?: string
  ) {
    if (this.hintPositionsMatch(positions)) return

    const next = positions.map(pos => ({ x: pos.x, y: pos.y }))
    const reuse = Math.min(this.hintMarkers.length, next.length)
    for (let i = 0; i < reuse; i++) {
      this.hintMarkers[i]!.setPosition(this.toContainerPos(next[i]!))
    }
    if (next.length < this.hintMarkers.length) {
      for (let i = next.length; i < this.hintMarkers.length; i++) {
        this.hintMarkers[i]!.destroy()
      }
      this.hintMarkers.length = next.length
    } else {
      for (let i = reuse; i < next.length; i++) {
        this.hintMarkers.push(this.createMarker(next[i]!, type, size, color))
      }
    }
    this.hintPositions = next
  }

  /**
   * Shows a snap marker, or moves/retargets the existing top marker.
   *
   * Pointer-move osnap updates call this instead of hide+show so the DOM
   * node is not rebuilt 60 times a second.
   */
  public showOrRepositionMarker(
    pos: AcGePoint2dLike,
    type?: AcEdMarkerType,
    size?: number,
    color?: string
  ) {
    const marker = this.top()
    if (marker) {
      if (type != null && marker.type !== type) {
        marker.type = type
      }
      this.repositionTop(pos)
      return marker
    }
    return this.showMarker(pos, type, size, color)
  }

  /**
   * Repositions acquired-center hint markers after pan/zoom.
   */
  public repositionHints() {
    for (let i = 0; i < this.hintMarkers.length; i++) {
      const pos = this.hintPositions[i]
      if (!pos) continue
      this.hintMarkers[i]!.setPosition(this.toContainerPos(pos))
    }
  }

  /**
   * Repositions the top marker to a new world coordinate without recreating it.
   */
  public repositionTop(pos: AcGePoint2dLike) {
    const marker = this.top()
    if (!marker) return

    const canvasPos = this.view.worldToScreen(pos)
    const containerPos = this.view.canvasToContainer(canvasPos)
    marker.setPosition(containerPos)
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
    this.clearHintMarkers()
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

  private createMarker(
    pos: AcGePoint2dLike,
    type?: AcEdMarkerType,
    size?: number,
    color?: string
  ) {
    const marker = new AcEdMarker(type, size, color, this.view.container)
    marker.setPosition(this.toContainerPos(pos))
    return marker
  }

  private toContainerPos(pos: AcGePoint2dLike) {
    const canvasPos = this.view.worldToScreen(pos)
    return this.view.canvasToContainer(canvasPos)
  }

  private hintPositionsMatch(positions: readonly AcGePoint2dLike[]): boolean {
    if (positions.length !== this.hintPositions.length) return false
    for (let i = 0; i < positions.length; i++) {
      const next = positions[i]!
      const prev = this.hintPositions[i]!
      if (next.x !== prev.x || next.y !== prev.y) return false
    }
    return true
  }

  private clearHintMarkers() {
    for (const marker of this.hintMarkers) marker.destroy()
    this.hintMarkers = []
    this.hintPositions = []
  }
}
