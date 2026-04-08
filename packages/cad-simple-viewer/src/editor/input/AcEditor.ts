import { AcCmEventManager } from '@mlightcad/data-model'

import { AcEdCommand } from '../command'
import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdCorsorType, AcEdCursorManager } from './AcEdCursorManager'
import { AcEdInputModifiers } from './AcEdInputModifiers'
import { AcEdInputToggles } from './AcEdInputToggles'
import {
  AcEdPromptAngleOptions,
  AcEdPromptBoxOptions,
  AcEdPromptBoxResult,
  AcEdPromptDistanceOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptDoubleResult,
  AcEdPromptEntityOptions,
  AcEdPromptEntityResult,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptResult,
  AcEdPromptSelectionOptions,
  AcEdPromptSelectionResult,
  AcEdPromptStringOptions
} from './prompt'
import { AcEdInputManager } from './ui'

/**
 * Event arguments for system variable related events.
 */
export interface AcDbSysVarEventArgs {
  /** The system variable name */
  name: string
}

/**
 * Event arguments for command lifecycle events.
 *
 * Contains the command instance that triggered the event.
 */
export interface AcEdCommandEventArgs {
  /** The command instance involved in the event */
  command: AcEdCommand
}

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
   * Editor events
   */
  public readonly events = {
    /**
     * Fired after a system variable is changed directly through the SETVAR command or
     * by entering the variable name at the command line.
     */
    sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
    /** Fired just before the command starts executing */
    commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
    /** Fired after the command finishes executing */
    commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
  }

  /**
   * Creates a new editor instance for the specified view.
   *
   * @param view - The view that this editor will handle input for
   */
  constructor(view: AcEdBaseView) {
    this._view = view
    this._cursorManager = new AcEdCursorManager(view)
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
   * Whether the current input session explicitly allows entity selection.
   */
  get isEntitySelectionActive() {
    return this._inputManager.isEntitySelectionActive
  }

  /**
   * Current modifier key state (Ctrl/Shift/Alt/Meta) during input sessions.
   */
  getInputModifiers(): AcEdInputModifiers {
    return this._inputManager.modifiers
  }

  /**
   * Toggle-style input states (e.g. Ctrl-press flip) during input sessions.
   */
  getInputToggles(): AcEdInputToggles {
    return this._inputManager.toggles
  }

  /** Reset toggle-style inputs to their default state. */
  resetInputToggles() {
    this._inputManager.resetToggles()
  }

  /**
   * Queues scripted command-line inputs for subsequent getXXX prompts.
   * One entry equals one Enter-confirmed input.
   */
  enqueueScriptInputs(inputs: string[]) {
    this._inputManager.enqueueScriptInputs(inputs)
  }

  /** Clears any queued scripted inputs. */
  clearScriptInputs() {
    this._inputManager.clearScriptInputs()
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
    this._cursorManager.setCursor(cursorType)
    this._previousCursor = this._currentCursor
    this._currentCursor = cursorType
  }

  /**
   * Temporarily sets a new cursor for the duration of a function execution.
   *
   * This method saves the current cursor, sets the new cursor, executes the provided function,
   * and then restores the original cursor regardless of whether the function succeeds or fails.
   *
   * @param cursorType - The cursor type to use temporarily
   * @param action - The function to execute with the temporary cursor
   * @returns The result of the executed function
   *
   * @example
   * ```typescript
   * // Temporarily set grab cursor for a pan operation
   * await editor.withCursor(AcEdCorsorType.Grab, async () => {
   *   // Perform pan operation
   *   await this.performPan();
   * });
   * // Cursor is automatically restored to previous state
   * ```
   */
  async withCursor<T>(
    cursorType: AcEdCorsorType,
    action: () => Promise<T> | T
  ): Promise<T> {
    const originalCursor = this._currentCursor
    this.setCursor(cursorType)

    try {
      return await Promise.resolve(action())
    } finally {
      if (originalCursor !== undefined) {
        this.setCursor(originalCursor)
      } else {
        this.restoreCursor()
      }
    }
  }

  /**
   * Sets the cursor color for the crosshair cursor
   *
   * @param color - The color for the cursor
   */
  setCursorColor(color: string) {
    this._cursorManager.setCursorColor(color)
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
  async getPoint(
    options: AcEdPromptPointOptions
  ): Promise<AcEdPromptPointResult> {
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
  async getAngle(
    options: AcEdPromptAngleOptions
  ): Promise<AcEdPromptDoubleResult> {
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
  async getDistance(
    options: AcEdPromptDistanceOptions
  ): Promise<AcEdPromptDoubleResult> {
    return await this._inputManager.getDistance(options)
  }

  /**
   * Prompts the user to input a double value.
   *
   * @returns Promise that resolves to the input double value.
   */
  async getDouble(
    options: AcEdPromptDoubleOptions
  ): Promise<AcEdPromptDoubleResult> {
    return await this._inputManager.getDouble(options)
  }

  /**
   * Prompts the user to input a string.
   *
   * @returns Promise that resolves to the input one string.
   */
  async getString(options: AcEdPromptStringOptions): Promise<AcEdPromptResult> {
    return await this._inputManager.getString(options)
  }

  /**
   * Prompts the user to input a keyword.
   *
   * @returns Promise that resolves to the input one keyword.
   */
  async getKeywords(options: AcEdPromptKeywordOptions): Promise<string> {
    return await this._inputManager.getKeywords(options)
  }

  /**
   * Prompts the user to input a keyword.
   *
   * @returns Promise that resolves to the input one keyword.
   */
  async getEntity(
    options: AcEdPromptEntityOptions
  ): Promise<AcEdPromptEntityResult> {
    return await this._inputManager.getEntity(options)
  }

  /**
   * Prompts the user to select entities using box selection.
   *
   * This method allows the user to drag a selection box to select
   * multiple entities at once. The selection behavior follows CAD
   * conventions (left-to-right for window, right-to-left for crossing).
   *
   * @returns Promise that resolves to the selection set containing selected entity IDs
   */
  async getSelection(
    options: AcEdPromptSelectionOptions
  ): Promise<AcEdPromptSelectionResult> {
    return await this._inputManager.getSelection(options)
  }

  /**
   * Prompts the user to specify a rectangular bounding box (two corners).
   *
   * @returns Promise that resolves to rectangular bounding box.
   */
  async getBox(options: AcEdPromptBoxOptions): Promise<AcEdPromptBoxResult> {
    return await this._inputManager.getBox(options)
  }
}
