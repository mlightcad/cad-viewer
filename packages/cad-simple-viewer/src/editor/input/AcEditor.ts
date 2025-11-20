import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdCorsorType, AcEdCursorManager } from './AcEdCursorManager'
import { AcEdInputManager } from './AcEdInputManager'
import { AcEdInputPoint } from './AcEdInputPoint'

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
   * Prompts the user to input a point by clicking on the view.
   *
   * This method returns a promise that resolves when the user clicks
   * on the view, providing the world coordinates of the click point.
   *
   * @returns Promise that resolves to the input point coordinates
   *
   * @example
   * ```typescript
   * const startPoint = await editor.getPoint();
   * const endPoint = await editor.getPoint();
   * // Now you can create a line from startPoint to endPoint
   * ```
   */
  async getPoint() {
    const inputter = new AcEdInputPoint(this._view)
    return await inputter.start()
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
    const selector = new AcEdInputManager(this._view)
    return await selector.getBox()
  }
}
