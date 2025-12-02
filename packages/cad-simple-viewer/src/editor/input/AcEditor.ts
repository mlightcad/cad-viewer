import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdCorsorType, AcEdCursorManager } from './AcEdCursorManager'
import {
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions
} from './prompt'
import { AcEdInputManager } from './ui'

/**
 * Advanced input handler for CAD operations providing high-level user interaction methods.
 *
 * This class serves as a wrapper for all types of user input including:
 * - Point input (mouse clicks, coordinates)
 * - Entity selection (single or multiple entities)
 * - String, number, angle, and distance input
 * - Cursor management and visual feedback
 *
 * The editor abstracts away low-level mouse and keyboard events, providing a clean API
 * for command implementations. Instead of listening to raw DOM events, commands should
 * use the methods provided by this class.
 *
 * @example
 * ```typescript
 * // Get user input for a point
 * const point = await editor.getPoint();
 * console.log('User clicked at:', point);
 *
 * // Get entity selection
 * const selection = await editor.getSelection();
 * console.log('Selected entities:', selection.ids);
 *
 * // Change cursor appearance
 * editor.setCursor(AcEdCorsorType.Crosshair);
 * ```
 */
export class AcEditor {
  /** Previously set cursor type for restoration */
  private _previousCursor?: AcEdCorsorType
  /** Currently active cursor type */
  private _currentCursor?: AcEdCorsorType
  /** Manager for cursor appearance and behavior */
  private _cursorManager: AcEdCursorManager
  /** Manager for mouse and keyboard input */
  private _inputManager: AcEdInputManager
  /** The view this editor is associated with */
  protected _view: AcEdBaseView

  /**
   * Creates a new editor instance for the specified view.
   *
   * @param view - The view that this editor will handle input for
   */
  constructor(view: AcEdBaseView) {
    this._view = view
    this._cursorManager = new AcEdCursorManager()
    this._inputManager = new AcEdInputManager(view)
  }

  /**
   * The flag to indicate whether it is currently in an “input acquisition” mode (e.g., point
   * selection, distance/angle prompt, string prompt, etc.),
   */
  get isActive() {
    return this._inputManager.isActive
  }

  /**
   * Gets the currently active cursor type.
   *
   * @returns The current cursor type, or undefined if none is set
   */
  get currentCursor() {
    return this._currentCursor
  }

  /**
   * Restores the previously set cursor.
   *
   * This is useful for temporarily changing the cursor and then reverting
   * to the previous state.
   */
  restoreCursor() {
    if (this._previousCursor != null) {
      this.setCursor(this._previousCursor)
    }
  }

  /**
   * Sets the cursor appearance for the view.
   *
   * The previous cursor type is stored for potential restoration.
   *
   * @param cursorType - The cursor type to set
   *
   * @example
   * ```typescript
   * editor.setCursor(AcEdCorsorType.Crosshair);  // For precise point input
   * editor.setCursor(AcEdCorsorType.Grab);       // For pan operations
   * ```
   */
  setCursor(cursorType: AcEdCorsorType) {
    this._cursorManager.setCursor(cursorType, this._view.canvas)
    this._previousCursor = this._currentCursor
    this._currentCursor = cursorType
  }

  /**
   * Prompts the user to input a point by clicking on the view or inputting
   * one coordinate value.
   *
   * This method returns a promise that resolves after the user clicks
   * on the view or inputs one valid coordinate value, providing the
   * world coordinates of the click point.
   *
   * @returns Promise that resolves to the input point coordinates
   */
  async getPoint(options: AcEdPromptPointOptions) {
    return await this._inputManager.getPoint(options)
  }

  /**
   * Prompts the user to input an angle by clicking on the view or input
   * one number.
   *
   * This method returns a promise that resolves after the user clicks
   * on the view or inputs one valid angle value.
   *
   * @returns Promise that resolves to the input angle value.
   */
  async getAngle(options: AcEdPromptAngleOptions) {
    return await this._inputManager.getAngle(options)
  }

  /**
   * Prompts the user to input a distance by clicking on the view or input
   * one number.
   *
   * This method returns a promise that resolves after the user clicks
   * on the view or inputs one valid distance value.
   *
   * @returns Promise that resolves to the input distance value.
   */
  async getDistance(options: AcEdPromptDistanceOptions) {
    return await this._inputManager.getDistance(options)
  }

  /**
   * Prompts the user to select entities using box selection.
   *
   * This method allows the user to drag a selection box to select
   * multiple entities at once. The selection behavior follows CAD
   * conventions (left-to-right for crossing, right-to-left for window).
   *
   * @returns Promise that resolves to the selection set containing selected entity IDs
   *
   * @example
   * ```typescript
   * const selection = await editor.getSelection();
   * if (selection.count > 0) {
   *   console.log(`Selected ${selection.count} entities`);
   *   // Process the selected entities
   *   for (const id of selection.ids) {
   *     // Do something with each selected entity
   *   }
   * }
   * ```
   */
  async getSelection() {
    return await this._inputManager.getBox()
  }
}
