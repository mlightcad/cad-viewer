import { AcDbObjectId, AcGePoint2d } from '@mlightcad/data-model'
import { AcCmEventManager } from '@mlightcad/data-model'

import { AcEdViewHoverEventArgs } from './AcEdBaseView'

/**
 * Interface implemented by a view that hosts hover behavior.
 *
 * `AcEdHoverController` is deliberately UI-framework-agnostic and relies
 * on this interface to delegate view-specific operations such as spatial
 * picking and visual feedback.
 *
 * This abstraction allows hover logic to be tested independently and
 * reused across different view implementations.
 */
export interface AcEdHoverHost {
  /**
   * Perform a spatial pick at the given world coordinate.
   *
   * The controller assumes the first returned result has the highest
   * hover priority.
   *
   * @param point - Pick location in world coordinates
   * @returns An array of pick results containing object ids
   */
  pick(point: { x: number; y: number }): { id: AcDbObjectId }[]

  /**
   * Called immediately when an entity becomes hovered.
   *
   * This is typically used to apply visual feedback such as highlighting.
   *
   * @param id - Object id of the hovered entity
   */
  onHover(id: AcDbObjectId): void

  /**
   * Called immediately when an entity stops being hovered.
   *
   * This is typically used to remove hover visual feedback.
   *
   * @param id - Object id of the entity that was previously hovered
   */
  onUnhover(id: AcDbObjectId): void

  /**
   * Current mouse position in screen (client) coordinates.
   *
   * Used when dispatching hover/unhover events so listeners can
   * know the cursor location at the time of the event.
   */
  get curMousePos(): AcGePoint2d
}

/**
 * Controller responsible for managing hover detection and timing logic.
 *
 * This class encapsulates:
 * - Hover delay handling (mouse must stay still for a short time)
 * - Pause delay handling (hover event is fired after a pause)
 * - Tracking of the currently hovered entity
 * - Dispatching hover/unhover events
 *
 * It intentionally does **not** know anything about rendering, input devices,
 * or UI frameworks. All such responsibilities are delegated to `AcEdHoverHost`.
 */
export class AcEdHoverController {
  /**
   * Timer used to delay hover detection.
   *
   * This prevents excessive spatial queries while the mouse is moving
   * continuously.
   */
  private hoverTimer: NodeJS.Timeout | null = null

  /**
   * Timer used to detect a pause over a hovered entity.
   *
   * Once triggered, a formal hover event is dispatched.
   */
  private pauseTimer: NodeJS.Timeout | null = null

  /**
   * Object id of the entity currently considered hovered.
   *
   * A value of `null` indicates no entity is hovered.
   */
  private hoveredId: AcDbObjectId | null = null

  /**
   * Creates a new hover controller.
   *
   * @param host - View host providing spatial picking and visual feedback hooks
   * @param hoverEvent - Event manager used to dispatch hover events
   * @param unhoverEvent - Event manager used to dispatch unhover events
   * @param hoverDelay - Delay (ms) before hover detection starts after mouse move
   * @param pauseDelay - Delay (ms) before firing hover event after hover is detected
   */
  constructor(
    private readonly host: AcEdHoverHost,
    private readonly hoverEvent: AcCmEventManager<AcEdViewHoverEventArgs>,
    private readonly unhoverEvent: AcCmEventManager<AcEdViewHoverEventArgs>,
    private readonly hoverDelay = 500,
    private readonly pauseDelay = 500
  ) {}

  /**
   * Handles mouse movement events.
   *
   * This method should be called whenever the mouse moves in the view.
   * It restarts the hover detection timer, ensuring hover logic is only
   * evaluated after the mouse stops moving for a short period.
   *
   * @param x - Mouse X coordinate in world space
   * @param y - Mouse Y coordinate in world space
   */
  handleMouseMove(x: number, y: number) {
    this.clearHoverTimer()
    this.hoverTimer = setTimeout(() => {
      this.hoverAt(x, y)
    }, this.hoverDelay)
  }

  /**
   * Clears any active hover state.
   *
   * This immediately unhovers the current entity (if any) and cancels
   * pending pause timers.
   *
   * Typically called when:
   * - View mode changes
   * - Mouse leaves the canvas
   * - Input acquisition starts
   */
  clear() {
    this.setHoveredId(null)
    this.clearPauseTimer()
  }

  /**
   * Disposes the controller and releases all timers.
   *
   * This should be called when the owning view is destroyed to avoid
   * dangling timers and memory leaks.
   */
  dispose() {
    this.clearHoverTimer()
    this.clearPauseTimer()
  }

  /**
   * Performs a hover test at the specified world coordinate.
   *
   * Executes a spatial pick and updates the hovered entity based on
   * the result.
   *
   * @param x - X coordinate in world space
   * @param y - Y coordinate in world space
   */
  private hoverAt(x: number, y: number) {
    const results = this.host.pick({ x, y })
    if (results.length > 0) {
      this.setHoveredId(results[0].id)
    } else {
      this.clear()
    }
  }

  /**
   * Updates the currently hovered entity.
   *
   * This method ensures:
   * - Proper unhover callbacks and events are fired
   * - New hover callbacks are invoked
   * - Pause timer is started for hover event dispatch
   *
   * @param newId - New hovered object id, or `null` to clear hover
   */
  private setHoveredId(newId: AcDbObjectId | null) {
    if (this.hoveredId) {
      this.unhoverEvent.dispatch({
        id: this.hoveredId,
        x: this.host.curMousePos.x,
        y: this.host.curMousePos.y
      })
      this.host.onUnhover(this.hoveredId)
    }

    this.hoveredId = newId

    if (newId) {
      this.startPauseTimer(newId)
      this.host.onHover(newId)
    }
  }

  /**
   * Starts the pause timer used to confirm a hover.
   *
   * Once the pause duration elapses, a hover event is dispatched,
   * indicating that the cursor has remained over the entity long
   * enough to be considered an intentional hover.
   *
   * @param id - Object id of the hovered entity
   */
  private startPauseTimer(id: AcDbObjectId) {
    this.clearPauseTimer()
    this.pauseTimer = setTimeout(() => {
      this.hoverEvent.dispatch({
        id,
        x: this.host.curMousePos.x,
        y: this.host.curMousePos.y
      })
    }, this.pauseDelay)
  }

  /**
   * Clears the hover detection timer, if active.
   */
  private clearHoverTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
  }

  /**
   * Clears the pause timer, if active.
   */
  private clearPauseTimer() {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer)
      this.pauseTimer = null
    }
  }
}
