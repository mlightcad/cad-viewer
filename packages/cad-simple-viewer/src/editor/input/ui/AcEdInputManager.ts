import {
  AcDbEntity,
  AcGeBox2d,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApDocManager, AcApSettingManager } from '../../../app'
import { AcApI18n } from '../../../i18n'
import { AcEdBaseView } from '../../view'
import { AcEdInputModifiers } from '../AcEdInputModifiers'
import { AcEdInputToggles } from '../AcEdInputToggles'
import { AcEdSelectionSet } from '../AcEdSelectionSet'
import {
  AcEdAngleHandler,
  AcEdDistanceHandler,
  AcEdDoubleHandler,
  AcEdInputHandler,
  AcEdIntegerHandler,
  AcEdNumericalHandler,
  AcEdPointHandler,
  AcEdStringHandler
} from '../handler'
import { AcEdKeywordHandler } from '../handler/AcEdKeywordHandler'
import {
  AcEdPromptAngleOptions,
  AcEdPromptBoxOptions,
  AcEdPromptBoxResult,
  AcEdPromptDistanceOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptDoubleResult,
  AcEdPromptEntityOptions,
  AcEdPromptEntityResult,
  AcEdPromptIntegerOptions,
  AcEdPromptIntegerResult,
  AcEdPromptKeywordOptions,
  AcEdPromptNumericalOptions,
  AcEdPromptOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptResult,
  AcEdPromptSelectionOptions,
  AcEdPromptSelectionResult,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../prompt'
import { AcEdCommandLine } from './AcEdCommandLine'
import { AcEdFloatingInput } from './AcEdFloatingInput'
import {
  AcEdFloatingInputBoxCount,
  AcEdFloatingInputCommitCallback,
  AcEdFloatingInputDrawPreviewCallback,
  AcEdFloatingInputDynamicValueCallback,
  AcEdFloatingInputRawData
} from './AcEdFloatingInputTypes'
import { AcEdFloatingMessage } from './AcEdFloatingMessage'

/**
 * Internal control-flow error used to propagate keyword picks out of
 * floating-input loops.
 *
 * This error is intentionally caught by prompt wrappers and converted into
 * `AcEdPromptStatus.Keyword` results.
 */
class AcEdKeywordInputError extends Error {
  /**
   * Canonical keyword token resolved by the prompt parser.
   */
  readonly keyword: string

  /**
   * Creates a keyword control-flow error.
   *
   * @param keyword - Canonical keyword token to bubble to prompt callers.
   */
  constructor(keyword: string) {
    super('keyword')
    this.keyword = keyword
  }
}

/**
 * A fully type-safe TypeScript class providing CAD-style interactive user input
 * using floating HTML input boxes and mouse events. Supports collecting points,
 * distances, angles, numbers, strings, and selecting a 2-point rectangular box
 * using an HTML overlay rectangle (suitable when the main canvas is a THREE.js
 * WebGL canvas).
 */
export class AcEdInputManager {
  /** Inject styles only once */
  private static stylesInjected = false

  /** The view associated with this input operation */
  protected view: AcEdBaseView

  /** Stores last confirmed point from getPoint() or getBox() */
  private lastPoint: AcGePoint2dLike | null = null

  /** Command line UI component */
  private _commandLine: AcEdCommandLine
  /** Buffered command-line style inputs (each item is one Enter-confirmed value). */
  private _scriptInputs: string[] = []
  /** Current modifier key state during input sessions. */
  private _modifierState: AcEdInputModifiers = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false
  }
  /** Toggle-style Ctrl flip state (press Ctrl once to flip arc direction). */
  private _ctrlArcFlip: boolean = false

  /**
   * The flag to indicate whether it is currently in an “input acquisition” mode (e.g., point
   * selection, distance/angle prompt, string prompt, etc.),
   */
  private active: boolean = false
  /**
   * True only when the current input session explicitly expects entity selection
   * (getEntity/getSelection). Used to gate view-level selection behavior.
   */
  private entitySelectionActive: boolean = false

  /**
   * Construct the manager and attach mousemove listener used for floating input
   * positioning and live preview updates.
   *
   * @param view - The view associated with the input manager
   */
  constructor(view: AcEdBaseView) {
    this.view = view
    this.injectCSS()
    // Newly added UI overlays (command line, previews) are container-local.
    // Ensure absolute-positioned children are anchored to this view only.
    const containerPosition = getComputedStyle(this.view.container).position
    if (containerPosition === 'static') {
      this.view.container.style.position = 'relative'
    }
    const commandLine = new AcEdCommandLine(this.view.container)
    this._commandLine = commandLine
    commandLine.visible = AcApSettingManager.instance.isShowCommandLine
    AcApSettingManager.instance.events.modified.addEventListener(() => {
      commandLine.visible = AcApSettingManager.instance.isShowCommandLine
    })
  }

  /**
   * The flag to indicate whether it is currently in an “input acquisition” mode (e.g., point
   * selection, distance/angle prompt, string prompt, etc.),
   */
  get isActive() {
    return this.active
  }
  /**
   * Whether current input session allows entity selection in the view.
   */
  get isEntitySelectionActive() {
    return this.entitySelectionActive
  }

  /**
   * Current modifier key state (Ctrl/Shift/Alt/Meta) during input sessions.
   */
  get modifiers() {
    return this._modifierState
  }

  /**
   * Toggle-style input states (press once to flip, persists after keyup).
   */
  get toggles(): AcEdInputToggles {
    return { ctrlArcFlip: this._ctrlArcFlip }
  }

  /** Reset toggle-style inputs to their default state. */
  resetToggles() {
    this._ctrlArcFlip = false
  }

  /**
   * Queue scripted inputs for subsequent getXXX calls.
   * One array item equals one Enter-confirmed value.
   */
  enqueueScriptInputs(inputs: string[]) {
    if (!inputs.length) return
    this._scriptInputs.push(...inputs)
  }

  /** Clears any pending scripted inputs. */
  clearScriptInputs() {
    this._scriptInputs.length = 0
  }

  /**
   * Injects minimal CSS required for the floating input and preview rectangle.
   * Useful when you do not have a separate CSS file.
   */
  private injectCSS() {
    if (AcEdInputManager.stylesInjected) return
    AcEdInputManager.stylesInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .ml-jig-preview-rect {
        position: absolute;
        border: 1px dashed var(--line-color, var(--ml-ui-canvas-line, #0f0));
        background: var(--ml-ui-canvas-fill-mix, var(--ml-ui-canvas-fill, rgba(64, 158, 255, 0.12)));
        pointer-events: none;
        z-index: 9999;
      }
      .ml-jig-preview-line {
        position: absolute;
        height: 1px;
        background: var(--line-color, var(--ml-ui-canvas-line, #0f0));
        transform-origin: 0 0;
        pointer-events: none;
        z-index: 9999;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Format a number for display in input box.
   * Default: 3 decimal places for points/distance, 2 decimal places for angles.
   * @param value The numeric value
   * @param type Optional type: 'point' | 'distance' | 'angle'
   */
  private formatNumber(
    value: number,
    type: 'point' | 'distance' | 'angle'
  ): string {
    switch (type) {
      case 'angle':
        return value.toFixed(2)
      case 'distance':
      case 'point':
      default:
        return value.toFixed(3)
    }
  }

  /**
   * Returns whether the supplied prompt defines any keywords.
   *
   * Keyword-aware prompts need extra command-line wiring so textual input can
   * be interpreted as keyword picks instead of free-form values. This helper
   * centralizes the check and gracefully handles prompts that expose no keyword
   * collection.
   *
   * @param options - Prompt options to inspect
   * @returns `true` when at least one keyword is registered on the prompt
   */
  private hasKeywords(options: AcEdPromptOptions<unknown>) {
    const keywords = options.keywords?.toArray() ?? []
    return keywords.length > 0
  }

  /**
   * Builds a keyword-only prompt options object from a general prompt.
   *
   * Several input flows support optional keywords in parallel with their main
   * acquisition mode. Rather than duplicating keyword definitions manually, the
   * original prompt's keyword metadata is cloned into a dedicated
   * `AcEdPromptKeywordOptions` instance that can be passed to the command-line
   * keyword session.
   *
   * @typeParam T - Value type produced by the source prompt
   * @param options - Source prompt whose keyword definitions should be copied
   * @returns A keyword prompt configured with the same message and keyword set
   */
  private buildKeywordOptions<T>(
    options: AcEdPromptOptions<T>
  ): AcEdPromptKeywordOptions {
    const keywordOptions = new AcEdPromptKeywordOptions(options.message)
    keywordOptions.appendKeywordsToMessage = options.appendKeywordsToMessage

    const keywords = options.keywords?.toArray() ?? []
    keywords.forEach(kw => {
      const added = keywordOptions.keywords.add(
        kw.displayName,
        kw.globalName,
        kw.localName,
        kw.enabled,
        kw.visible
      )
      if (options.keywords.default === kw) {
        keywordOptions.keywords.default = added
      }
    })

    return keywordOptions
  }

  /**
   * Copies keyword definitions from one prompt options object to another.
   *
   * This is primarily used by composite prompts such as `getBox()`, which break
   * a higher-level workflow into multiple sub-prompts while preserving the same
   * keyword vocabulary and default keyword behavior across each stage.
   *
   * @param source - Prompt options providing the keyword definitions
   * @param target - Prompt options receiving the cloned keyword definitions
   */
  private copyKeywords(
    source: AcEdPromptOptions<unknown>,
    target: AcEdPromptOptions<unknown>
  ) {
    target.appendKeywordsToMessage = source.appendKeywordsToMessage
    const keywords = source.keywords?.toArray() ?? []
    keywords.forEach(kw => {
      const added = target.keywords.add(
        kw.displayName,
        kw.globalName,
        kw.localName,
        kw.enabled,
        kw.visible
      )
      if (source.keywords.default === kw) {
        target.keywords.default = added
      }
    })
  }

  /**
   * Resolves a picked object id back to its database entity instance.
   *
   * View-level picking only returns lightweight hit-test data such as object
   * ids and bounding information. Prompt validation, however, needs access to
   * the backing `AcDbEntity` so it can inspect runtime metadata like the entity
   * type and layer.
   *
   * @param objectId - Object id returned by the spatial pick query
   * @returns The matching database entity, or `undefined` if it can no longer be found
   */
  private getEntityById(objectId: string): AcDbEntity | undefined {
    return AcApDocManager.instance.curDocument.database.tables.blockTable.getEntityById(
      objectId
    )
  }

  /**
   * Returns whether the specified entity belongs to a locked layer.
   *
   * The entity itself only stores its layer name, so this helper resolves the
   * layer record from the current drawing database and inspects its lock state.
   * Missing layer records are treated as unlocked to avoid rejecting input due
   * to incomplete metadata.
   *
   * @param entity - Entity being evaluated for prompt selection
   * @returns `true` if the entity's layer exists and is locked; otherwise `false`
   */
  private isEntityOnLockedLayer(entity: AcDbEntity): boolean {
    const layerName = entity.layer
    if (!layerName) {
      return false
    }

    return !!AcApDocManager.instance.curDocument.database.tables.layerTable.getAt(
      layerName
    )?.isLocked
  }

  /**
   * Checks whether a picked entity satisfies the prompt's allowed-class filter.
   *
   * Different parts of the stack expose the entity type in slightly different
   * forms. The data-model layer provides a short CAD type name through
   * `entity.type` (for example `Line`), while runtime inspection exposes the
   * TypeScript constructor name (for example `AcDbLine`). To maximize
   * compatibility with existing caller expectations, both forms are tested
   * against the prompt's allow-list.
   *
   * @param entity - Picked entity being validated
   * @param options - Prompt options containing the configured allowed classes
   * @returns `true` when the entity matches at least one allowed class, or when
   * no class restriction has been configured
   */
  private isEntityClassAllowed(
    entity: AcDbEntity,
    options: AcEdPromptEntityOptions
  ): boolean {
    const candidates = new Set<string>()

    if (entity.type) {
      candidates.add(entity.type)
    }

    const constructorName = entity.constructor?.name
    if (constructorName) {
      candidates.add(constructorName)
    }

    for (const candidate of candidates) {
      if (options.isClassAllowed(candidate)) {
        return true
      }
    }

    return false
  }

  /**
   * Starts a command-line keyword session for the given prompt when needed.
   *
   * Many interactive prompts accept both mouse-driven input and typed keywords
   * at the same time. This helper lazily creates the command-line keyword
   * session only when keywords are actually configured, and returns a small
   * control object that lets callers await or cancel that session.
   *
   * @param options - Prompt options that may define keywords
   * @param allowTyping - Whether arbitrary typing is allowed alongside keyword completion
   * @returns An object containing the keyword promise and cancel callback, or
   * `undefined` when the prompt has no keywords
   */
  private startKeywordSession(
    options: AcEdPromptOptions<unknown>,
    allowTyping: boolean
  ) {
    if (!this.hasKeywords(options)) return undefined
    const keywordOptions = this.buildKeywordOptions(options)
    return {
      promise: this._commandLine.getKeywords(keywordOptions, allowTyping),
      cancel: () => this._commandLine.cancelActiveSession()
    }
  }

  /**
   * Narrows an unknown error value to the internal keyword control-flow error.
   *
   * Prompt implementations use {@link AcEdKeywordInputError} as a private
   * mechanism for bubbling a keyword pick out of deeply nested async UI flows.
   * This type guard keeps the outer prompt wrappers readable while preserving
   * strong typing for the extracted keyword token.
   *
   * @param error - Unknown error value thrown from an input workflow
   * @returns `true` if the error represents a keyword selection
   */
  private isPromptKeyword(error: unknown): error is AcEdKeywordInputError {
    return error instanceof AcEdKeywordInputError
  }

  /**
   * Prompts the user to specify a point.
   *
   * The point may be supplied by clicking in the view, typing coordinates into
   * the floating input, or consuming a queued scripted input token. Keywords are
   * also supported when configured on the prompt options.
   *
   * @param options - Point prompt options controlling messaging, base-point
   * behavior, jig integration, and keywords
   * @returns A prompt result containing the picked point, cancel status, or keyword
   */
  async getPoint(
    options: AcEdPromptPointOptions
  ): Promise<AcEdPromptPointResult> {
    try {
      const value = await this.getPointInternal(options)
      return new AcEdPromptPointResult(AcEdPromptStatus.OK, value)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptPointResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        const result = new AcEdPromptPointResult(AcEdPromptStatus.Keyword)
        result.stringResult = error.keyword
        return result
      }
      throw error
    }
  }

  /**
   * Prompts the user for a purely typed numeric value through floating input.
   *
   * This helper is shared by distance, angle, double, and integer prompts when
   * no mouse-driven geometric reference is needed. Validation is delegated to
   * the supplied handler so the floating UI can mark invalid values and keep
   * the prompt alive until the user enters an acceptable number.
   *
   * @param options - Numeric prompt options describing the message and keyword set
   * @param handler - Parser/validator responsible for converting raw text into a number
   * @returns A promise that resolves to the parsed numeric value
   */
  private getNumberTyped(
    options: AcEdPromptNumericalOptions | AcEdPromptAngleOptions,
    handler: AcEdNumericalHandler | AcEdAngleHandler
  ): Promise<number> {
    const getDynamicValue = () => {
      return {
        value: 0,
        raw: { x: '' }
      }
    }

    return this.makeFloatingInputPromise<number>({
      inputCount: 1,
      promptOptions: options,
      handler,
      getDynamicValue
    })
  }

  /**
   * Prompts the user to specify a distance value.
   *
   * When a base point is available, the floating input previews the live
   * distance from that reference point to the current cursor. Otherwise, the
   * method falls back to typed numeric entry only. Scripted inputs and keywords
   * are supported as well.
   *
   * @param options - Distance prompt options controlling base-point behavior and messaging
   * @returns A prompt result containing the resolved distance, cancel status, or keyword
   */
  async getDistance(
    options: AcEdPromptDistanceOptions
  ): Promise<AcEdPromptDoubleResult> {
    const handler = new AcEdDistanceHandler(options)
    const scriptedValue = this.tryGetScriptedNumber(handler)
    if (scriptedValue != null) {
      return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, scriptedValue)
    }

    try {
      // If no base point defined → fall back to typed numeric input
      if (!this.lastPoint) {
        const value = await this.getNumberTyped(options, handler)
        return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, value)
      }

      const getDynamicValue = (pos: AcGePoint2dLike) => {
        const dx = pos.x - this.lastPoint!.x
        const dy = pos.y - this.lastPoint!.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        return {
          value: dist,
          raw: { x: this.formatNumber(dist, 'distance') }
        }
      }

      const value = await this.makeFloatingInputPromise<number>({
        inputCount: 1,
        promptOptions: options,
        handler,
        getDynamicValue
      })
      return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, value)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptDoubleResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        const result = new AcEdPromptDoubleResult(AcEdPromptStatus.Keyword)
        result.stringResult = error.keyword
        return result
      }
      throw error
    }
  }

  /**
   * Prompts the user to specify an angle in degrees.
   *
   * If a base point is available, the cursor position is converted into a live
   * angular preview relative to that point and the optional prompt base angle.
   * Without a geometric reference, the method accepts typed numeric input only.
   *
   * @param options - Angle prompt options controlling base point, base angle, and messaging
   * @returns A prompt result containing the resolved angle, cancel status, or keyword
   */
  async getAngle(
    options: AcEdPromptAngleOptions
  ): Promise<AcEdPromptDoubleResult> {
    const handler = new AcEdAngleHandler(options)
    const scriptedValue = this.tryGetScriptedNumber(handler)
    if (scriptedValue != null) {
      return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, scriptedValue)
    }

    const basePoint =
      options.useBasePoint && options.basePoint
        ? options.basePoint
        : this.lastPoint

    // No reference point available: fallback to typed angle input only.
    if (!basePoint) {
      try {
        const value = await this.getNumberTyped(options, handler)
        return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, value)
      } catch (error) {
        if (this.isPromptCancelled(error)) {
          return new AcEdPromptDoubleResult(AcEdPromptStatus.Cancel)
        }
        if (this.isPromptKeyword(error)) {
          const result = new AcEdPromptDoubleResult(AcEdPromptStatus.Keyword)
          result.stringResult = error.keyword
          return result
        }
        throw error
      }
    }

    const getDynamicValue = (pos: AcGePoint2dLike) => {
      const dx = pos.x - basePoint.x
      const dy = pos.y - basePoint.y
      const rawAngleRad = Math.atan2(dy, dx)
      const baseAngleRad = (options.baseAngle * Math.PI) / 180
      let angleRad = rawAngleRad - baseAngleRad
      while (angleRad <= -Math.PI) angleRad += Math.PI * 2
      while (angleRad > Math.PI) angleRad -= Math.PI * 2
      const angleDeg = (angleRad * 180) / Math.PI
      return {
        value: angleDeg,
        raw: { x: this.formatNumber(angleDeg, 'angle') }
      }
    }

    try {
      const value = await this.makeFloatingInputPromise<number>({
        inputCount: 1,
        promptOptions: options,
        handler,
        getDynamicValue
      })
      return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, value)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptDoubleResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        const result = new AcEdPromptDoubleResult(AcEdPromptStatus.Keyword)
        result.stringResult = error.keyword
        return result
      }
      throw error
    }
  }

  /**
   * Prompts the user for a floating-point number.
   *
   * This is the generic free-form numeric entry path used when no geometric
   * interpretation such as distance or angle is required.
   *
   * @param options - Double prompt options controlling validation and messaging
   * @returns A prompt result containing the parsed number, cancel status, or keyword
   */
  async getDouble(
    options: AcEdPromptDoubleOptions
  ): Promise<AcEdPromptDoubleResult> {
    const handler = new AcEdDoubleHandler(options)
    const scriptedValue = this.tryGetScriptedNumber(handler)
    if (scriptedValue != null) {
      return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, scriptedValue)
    }

    try {
      const value = await this.getNumberTyped(options, handler)
      return new AcEdPromptDoubleResult(AcEdPromptStatus.OK, value)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptDoubleResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        const result = new AcEdPromptDoubleResult(AcEdPromptStatus.Keyword)
        result.stringResult = error.keyword
        return result
      }
      throw error
    }
  }

  /**
   * Prompts the user for an integer value.
   *
   * The supplied integer handler enforces integer-only parsing for both typed
   * input and scripted command input.
   *
   * @param options - Integer prompt options controlling validation and messaging
   * @returns A prompt result containing the parsed integer, cancel status, or keyword
   */
  async getInteger(
    options: AcEdPromptIntegerOptions
  ): Promise<AcEdPromptIntegerResult> {
    const scriptedValue = this.tryGetScriptedNumber(
      new AcEdIntegerHandler(options)
    )
    if (scriptedValue != null) {
      return new AcEdPromptIntegerResult(AcEdPromptStatus.OK, scriptedValue)
    }

    try {
      const value = await this.getNumberTyped(
        options,
        new AcEdIntegerHandler(options)
      )
      return new AcEdPromptIntegerResult(AcEdPromptStatus.OK, value)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptIntegerResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        const result = new AcEdPromptIntegerResult(AcEdPromptStatus.Keyword)
        result.stringResult = error.keyword
        return result
      }
      throw error
    }
  }

  /**
   * Prompts the user to type an arbitrary string.
   *
   * The value is collected through the shared floating-input pipeline so it can
   * participate in the same cancellation, keyword, and scripted-input behavior
   * as the other prompt types.
   *
   * @param options - String prompt options controlling the prompt message and keywords
   * @returns A prompt result containing the entered string, cancel status, or keyword
   */
  async getString(options: AcEdPromptStringOptions): Promise<AcEdPromptResult> {
    const scriptedValue = this.tryGetScriptedValue(
      new AcEdStringHandler(options)
    )
    if (scriptedValue != null) {
      return new AcEdPromptResult(AcEdPromptStatus.OK, scriptedValue)
    }

    try {
      const getDynamicValue = () => {
        return {
          value: '',
          raw: { x: '' }
        }
      }

      const handler = new AcEdStringHandler(options)
      const value = await this.makeFloatingInputPromise<string>({
        inputCount: 1,
        promptOptions: options,
        handler,
        getDynamicValue
      })
      return new AcEdPromptResult(AcEdPromptStatus.OK, value)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        return new AcEdPromptResult(AcEdPromptStatus.Keyword, error.keyword)
      }
      throw error
    }
  }

  /**
   * Prompts the user to enter one of the configured keywords.
   *
   * Unlike the mixed-mode keyword sessions used by other prompt types, this
   * method runs a dedicated keyword prompt and returns the chosen keyword as the
   * result value.
   *
   * @param options - Keyword prompt options describing the allowed keywords
   * @returns A prompt result containing the chosen keyword or cancel status
   */
  async getKeywords(
    options: AcEdPromptKeywordOptions
  ): Promise<AcEdPromptResult> {
    const scriptedValue = this.tryGetScriptedValue(
      new AcEdKeywordHandler(options)
    )
    if (scriptedValue != null) {
      return new AcEdPromptResult(AcEdPromptStatus.OK, scriptedValue)
    }

    try {
      const result = await this._commandLine.getKeywords(options, true)
      if (!result) {
        return new AcEdPromptResult(AcEdPromptStatus.Cancel)
      }
      return new AcEdPromptResult(AcEdPromptStatus.OK, result)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptResult(AcEdPromptStatus.Cancel)
      }
      throw error
    }
  }

  /**
   * Prompts the user to select one or more entities by mouse interaction.
   *
   * This method supports two selection modes:
   *
   * - **Click selection**: Clicking on an entity selects the entity under the cursor.
   * - **Box selection**:
   *   - left-to-right drag: window selection (entities fully inside the box)
   *   - right-to-left drag: crossing selection (entities intersecting the box)
   *
   * The selection operation behaves similarly to AutoCAD's
   * `Editor.GetSelection()` API:
   *
   * - Press **Enter** to accept the current selection set.
   * - Press **Escape** to cancel the operation.
   * - If {@link AcEdPromptSelectionOptions.singleOnly} is `true`, the selection
   *   completes immediately after the first entity is selected.
   *
   * This method does not use floating input boxes. Instead, it relies entirely on
   * mouse gestures and keyboard input. A floating prompt message and command line
   * prompt are displayed during the operation.
   *
   * @param options - Selection prompt options that control user messaging and
   *                  whether only a single entity may be selected.
   * @returns A promise that resolves to an array of selected entity IDs.
   *          The array is empty if no entities are selected and the user presses Enter.
   *          The promise is rejected if the operation is cancelled.
   */
  async getSelection(
    options: AcEdPromptSelectionOptions
  ): Promise<AcEdPromptSelectionResult> {
    try {
      const value = await new Promise<string[]>((resolve, reject) => {
        this.active = true
        this.entitySelectionActive = true
        const keywordSession = this.startKeywordSession(options, true)
        if (!keywordSession) {
          this._commandLine.setPrompt(options.message)
        }

        const floatingMessage = new AcEdFloatingMessage(this.view, {
          parent: this.view.canvas,
          message: options.message
        })

        const selected = new Set<string>()
        let startWcs: AcGePoint2dLike | null = null
        let startCanvas: AcGePoint2dLike | null = null
        let previewEl: HTMLDivElement | null = null

        let settled = false
        const cleanup = () => {
          if (settled) return
          settled = true
          this.active = false
          this.entitySelectionActive = false
          floatingMessage?.dispose()
          previewEl?.remove()
          keywordSession?.cancel()
          this._commandLine.clear()

          document.removeEventListener('keydown', keyHandler)
          this.view.canvas.removeEventListener('mousedown', mouseDown)
          this.view.canvas.removeEventListener('mousemove', mouseMove)
          this.view.canvas.removeEventListener('mouseup', mouseUp)
        }

        keywordSession?.promise.then(keyword => {
          if (settled) return
          if (!keyword) {
            cleanup()
            reject(new Error('cancelled'))
            return
          }
          cleanup()
          reject(new AcEdKeywordInputError(keyword))
        })

        /** ---------- Keyboard ---------- */

        const keyHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            cleanup()
            reject(new Error('cancelled'))
            return
          }

          if (e.key === 'Enter') {
            cleanup()
            resolve([...selected])
          }
        }

        /** ---------- Mouse ---------- */

        const mouseDown = (e: MouseEvent) => {
          startCanvas = this.view.viewportToCanvas({
            x: e.clientX,
            y: e.clientY
          })
          startWcs = this.view.screenToWorld(startCanvas)

          previewEl = document.createElement('div')
          previewEl.className = 'ml-jig-preview-rect'
          this.view.container.appendChild(previewEl)
        }

        const mouseMove = (e: MouseEvent) => {
          if (!startWcs || !previewEl || !startCanvas) return

          const curWcs = this.view.screenToWorld(
            this.view.viewportToCanvas({ x: e.clientX, y: e.clientY })
          )
          const curCanvas = this.view.viewportToCanvas({
            x: e.clientX,
            y: e.clientY
          })
          const p1 = this.view.worldToScreen(startWcs)
          const p2 = this.view.worldToScreen(curWcs)

          const left = Math.min(p1.x, p2.x)
          const top = Math.min(p1.y, p2.y)
          const width = Math.abs(p1.x - p2.x)
          const height = Math.abs(p1.y - p2.y)
          const mode = this.view.getSelectionMode(startCanvas, curCanvas)
          const action = this.view.getSelectionActionFromEvent(e, 'add')
          const style = this.view.getSelectionPreviewStyle(mode, action)

          Object.assign(previewEl.style, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            borderStyle: style.borderStyle,
            background: style.background
          })
          previewEl.style.setProperty('--line-color', style.lineColor)
        }

        const mouseUp = (e: MouseEvent) => {
          if (!startWcs || !startCanvas) return

          const endWcs = this.view.screenToWorld(
            this.view.viewportToCanvas({ x: e.clientX, y: e.clientY })
          )
          const endCanvas = this.view.viewportToCanvas({
            x: e.clientX,
            y: e.clientY
          })
          previewEl?.remove()
          previewEl = null

          // Click selection
          const action = this.view.getSelectionActionFromEvent(e, 'add')

          if (this.view.isSelectionClick(startCanvas, endCanvas)) {
            const picked = this.view.pick(endWcs)
            if (picked.length > 0) {
              this.view.applySelection([picked[0].id], action)
            } else if (action === 'replace') {
              this.view.selectionSet.clear()
            }
          } else {
            // Box selection
            const box = new AcGeBox2d()
              .expandByPoint(startWcs)
              .expandByPoint(endWcs)
            const mode = this.view.getSelectionMode(startCanvas, endCanvas)
            this.view.selectByBoxWithMode(box, mode, action)
          }

          selected.clear()
          for (const id of this.view.selectionSet.ids) {
            selected.add(id)
          }

          if (options.singleOnly && action !== 'remove') {
            if (selected.size > 0) {
              cleanup()
              resolve([...selected])
            }
          }

          startWcs = null
          startCanvas = null
        }

        document.addEventListener('keydown', keyHandler)
        this.view.canvas.addEventListener('mousedown', mouseDown)
        this.view.canvas.addEventListener('mousemove', mouseMove)
        this.view.canvas.addEventListener('mouseup', mouseUp)
      })
      return new AcEdPromptSelectionResult(
        AcEdPromptStatus.OK,
        new AcEdSelectionSet(value)
      )
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptSelectionResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        return new AcEdPromptSelectionResult(
          AcEdPromptStatus.Keyword,
          undefined,
          error.keyword
        )
      }
      throw error
    }
  }

  /**
   * Prompts the user to select a single entity.
   *
   * Selection is performed by clicking in the view and validating the first
   * hit-tested entity under the cursor. The picked entity may be rejected when
   * it belongs to a locked layer or does not satisfy the prompt's allowed-class
   * filter, in which case the rejection message is shown and the prompt remains
   * active. Keywords and `AllowNone` behavior are also supported.
   *
   * @param options - Entity prompt options controlling filtering, messaging, and keywords
   * @returns A prompt result containing the selected entity id, picked point,
   * cancel status, or keyword
   */
  async getEntity(
    options: AcEdPromptEntityOptions
  ): Promise<AcEdPromptEntityResult> {
    try {
      let pickedPoint: AcGePoint3dLike | undefined
      const value = await new Promise<string | null>((resolve, reject) => {
        this.active = true
        this.entitySelectionActive = true
        const keywordSession = this.startKeywordSession(options, true)
        const floatingMessage = new AcEdFloatingMessage(this.view, {
          parent: this.view.canvas,
          message: options.message
        })
        if (!keywordSession) {
          this._commandLine.setPrompt(options.message)
        }
        let settled = false
        const cleanup = () => {
          if (settled) return
          settled = true
          this.active = false
          this.entitySelectionActive = false
          options.jig?.end()
          document.removeEventListener('keydown', keyHandler)
          this.view.canvas.removeEventListener('mousedown', clickHandler)
          floatingMessage?.dispose()
          keywordSession?.cancel()
          this._commandLine.clear()
        }

        keywordSession?.promise.then(keyword => {
          if (settled) return
          if (!keyword) {
            cleanup()
            reject(new Error('cancelled'))
            return
          }
          cleanup()
          reject(new AcEdKeywordInputError(keyword))
        })

        /** Mouse click → try select entity */
        const clickHandler = (e: MouseEvent) => {
          const pos = this.view.screenToWorld(
            this.view.viewportToCanvas({ x: e.clientX, y: e.clientY })
          )
          const picked = this.view.pick(pos, undefined, true)

          // Clicked empty space
          if (picked.length == 0) {
            this._commandLine.showError(options.rejectMessage)
            return
          }

          const entity = this.getEntityById(picked[0].id)
          if (!entity) {
            this._commandLine.showError(options.rejectMessage)
            return
          }

          if (
            !options.allowObjectOnLockedLayer &&
            this.isEntityOnLockedLayer(entity)
          ) {
            this._commandLine.showError(options.rejectMessage)
            return
          }

          if (!this.isEntityClassAllowed(entity, options)) {
            this._commandLine.showError(options.rejectMessage)
            return
          }

          pickedPoint = { x: pos.x, y: pos.y, z: 0 }
          cleanup()
          resolve(picked[0].id)
        }

        /** Keyboard handling */
        const keyHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            cleanup()
            reject(new Error('cancelled'))
            return
          }

          if (e.key === 'Enter' && options.allowNone) {
            cleanup()
            resolve(null)
          }
        }

        document.addEventListener('keydown', keyHandler)
        this.view.canvas.addEventListener('mousedown', clickHandler)
      })
      return new AcEdPromptEntityResult(
        AcEdPromptStatus.OK,
        value || undefined,
        pickedPoint
      )
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptEntityResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        const result = new AcEdPromptEntityResult(AcEdPromptStatus.Keyword)
        result.stringResult = error.keyword
        return result
      }
      throw error
    }
  }

  /**
   * Prompt the user to specify a rectangular box by selecting two corners.
   * Each corner may be specified by clicking on the canvas or typing "x,y".
   * A live HTML overlay rectangle previews the box as the user moves the mouse.
   *
   * The box prompt is implemented as two chained point prompts. Keywords from
   * the original box prompt are copied into each corner prompt so the caller
   * sees a consistent interaction model across both stages.
   *
   * @param options - Box prompt options controlling corner messages, preview behavior, and keywords
   * @returns A prompt result containing the final 2D box, cancel status, or keyword
   */
  async getBox(options: AcEdPromptBoxOptions): Promise<AcEdPromptBoxResult> {
    try {
      // Get first point
      const message1 =
        options.firstCornerMessage ||
        AcApI18n.t('main.inputManager.firstCorner')
      const options1 = new AcEdPromptPointOptions(message1)
      this.copyKeywords(options, options1)
      options1.useDashedLine = options.useDashedLine
      options1.useBasePoint = options.useBasePoint
      const p1Result = await this.getPoint(options1)
      if (p1Result.status !== AcEdPromptStatus.OK) {
        return new AcEdPromptBoxResult(
          p1Result.status,
          undefined,
          p1Result.stringResult
        )
      }
      const p1 = p1Result.value!
      const cwcsP1 = this.view.worldToScreen(p1)

      // Create preview rectangle
      const previewEl = document.createElement('div')
      previewEl.className = 'ml-jig-preview-rect'
      this.view.container.appendChild(previewEl)

      const cleanup = () => {
        previewEl.remove()
      }

      const drawPreview = (pos: AcGePoint2dLike) => {
        const cwcsP2 = this.view.worldToScreen(pos)
        const left = Math.min(cwcsP2.x, cwcsP1.x)
        const top = Math.min(cwcsP2.y, cwcsP1.y)
        const width = Math.abs(cwcsP2.x - cwcsP1.x)
        const height = Math.abs(cwcsP2.y - cwcsP1.y)

        Object.assign(previewEl.style, {
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`
        })
      }

      // Second point
      const message2 =
        options.secondCornerMessage ||
        AcApI18n.t('main.inputManager.secondCorner')
      const options2 = new AcEdPromptPointOptions(message2)
      this.copyKeywords(options, options2)
      options2.useDashedLine = options.useDashedLine
      options2.useBasePoint = options.useBasePoint
      const p2 = await this.getPointInternal(options2, cleanup, drawPreview)

      const box = new AcGeBox2d().expandByPoint(p1).expandByPoint(p2)
      return new AcEdPromptBoxResult(AcEdPromptStatus.OK, box)
    } catch (error) {
      if (this.isPromptCancelled(error)) {
        return new AcEdPromptBoxResult(AcEdPromptStatus.Cancel)
      }
      if (this.isPromptKeyword(error)) {
        return new AcEdPromptBoxResult(
          AcEdPromptStatus.Keyword,
          undefined,
          error.keyword
        )
      }
      throw error
    }
  }

  /**
   * Shared point input logic used by getPoint() and getBox(). Accepts "x,y"
   * typed input OR mouse click.
   *
   * This helper optionally wires extra cleanup and preview callbacks so
   * higher-level workflows can overlay additional temporary graphics while
   * reusing the same point acquisition behavior.
   *
   * @param options - Point prompt options controlling the interaction
   * @param cleanup - Optional callback invoked when the point prompt ends
   * @param drawPreview - Optional callback invoked as the cursor moves for live preview rendering
   * @returns A promise that resolves to the chosen point
   */
  private async getPointInternal(
    options: AcEdPromptPointOptions,
    cleanup?: () => void,
    drawPreview?: AcEdFloatingInputDrawPreviewCallback
  ) {
    const scriptedValue = this.tryGetScriptedPoint(options)
    if (scriptedValue != null) {
      cleanup?.()
      return Promise.resolve(scriptedValue)
    }

    const getDynamicValue = (pos: AcGePoint2dLike) => {
      return {
        value: { x: pos.x, y: pos.y, z: 0 },
        raw: {
          x: this.formatNumber(pos.x, 'point'),
          y: this.formatNumber(pos.y, 'point')
        }
      }
    }

    const handler = new AcEdPointHandler(options)
    return this.makeFloatingInputPromise<AcGePoint3dLike>({
      inputCount: 2,
      promptOptions: options,
      cleanup,
      handler,
      getDynamicValue,
      drawPreview
    })
  }

  /**
   * Attempts to consume one scripted input and parse it as a point.
   * Supported forms: "x,y", "x,y,z", or "x y".
   *
   * Successful scripted points also update `lastPoint` so subsequent prompts
   * that rely on prior geometric context behave the same way as with manual
   * point picking.
   *
   * @param options - Point prompt options used to validate the scripted coordinates
   * @returns Parsed point value, or `undefined` when no scripted token is queued
   * @throws Error if a queued scripted token cannot be parsed as a valid point
   */
  private tryGetScriptedPoint(
    options: AcEdPromptPointOptions
  ): AcGePoint3dLike | undefined {
    const token = this.dequeueScriptInput()
    if (token === undefined) return undefined

    const parsed = this.splitScriptedPoint(token)
    if (!parsed) {
      throw new Error(`Invalid point input '${token}'`)
    }

    const value = new AcEdPointHandler(options).parse(parsed.x, parsed.y)
    if (value == null) {
      throw new Error(`Invalid point input '${token}'`)
    }

    this.lastPoint = { x: value.x, y: value.y }
    return value
  }

  /**
   * Attempts to consume one scripted input and parse it with the supplied handler.
   *
   * Scripted input is used to emulate command-line entry in automated or
   * replayed workflows. This helper keeps the parsing path consistent with
   * interactive input by delegating to the same handler implementation used by
   * the floating-input UI.
   *
   * @typeParam T - Parsed value type
   * @param handler - Input handler used to parse the queued token
   * @returns Parsed value, or `undefined` when no scripted token is available
   * @throws Error if a queued token exists but fails validation
   */
  private tryGetScriptedValue<T>(handler: AcEdInputHandler<T>): T | undefined {
    const token = this.dequeueScriptInput()
    if (token === undefined) return undefined

    const value = handler.parse(token)
    if (value == null) {
      throw new Error(`Invalid scripted input '${token}'`)
    }
    return value
  }

  /**
   * Attempts to consume one scripted numeric token.
   *
   * This is a thin specialization of {@link tryGetScriptedValue} that narrows
   * the accepted handler types to those used by numeric-style prompts.
   *
   * @param handler - Numeric handler used to parse the queued token
   * @returns Parsed numeric value, or `undefined` when no scripted token is queued
   */
  private tryGetScriptedNumber(
    handler: AcEdNumericalHandler | AcEdAngleHandler
  ): number | undefined {
    return this.tryGetScriptedValue(handler)
  }

  /**
   * Removes and returns the next queued scripted input token.
   *
   * @returns The next scripted token, or `undefined` when the queue is empty
   */
  private dequeueScriptInput() {
    if (!this._scriptInputs.length) return undefined
    return this._scriptInputs.shift()
  }

  /**
   * Splits a scripted point token into x/y coordinate components.
   *
   * The accepted formats intentionally mirror common CAD command-line point
   * entry conventions, including comma-separated coordinates and whitespace-
   * separated coordinates. An optional third `z` component is tolerated for
   * compatibility, but only the `x` and `y` values are used by 2D prompts.
   *
   * @param token - Raw scripted point token
   * @returns Extracted x/y string pair, or `undefined` if the token is malformed
   */
  private splitScriptedPoint(
    token: string
  ): { x: string; y: string } | undefined {
    const trimmed = token.trim()
    if (!trimmed) return undefined

    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(v => v.trim())
      if (parts.length !== 2 && parts.length !== 3) return undefined
      if (parts.length === 3 && Number.isNaN(Number(parts[2]))) return undefined
      return { x: parts[0], y: parts[1] }
    }

    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) return undefined
    return { x: parts[0], y: parts[1] }
  }

  /**
   * Returns whether an unknown error value represents prompt cancellation.
   *
   * Prompt flows normalize cancellation to a regular `Error` with the message
   * `'cancelled'`. This helper keeps the outer result-conversion code concise
   * and consistent across prompt types.
   *
   * @param error - Unknown error value thrown from an input workflow
   * @returns `true` if the error represents prompt cancellation
   */
  private isPromptCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === 'cancelled'
  }

  /**
   * Synchronizes the stored modifier-key snapshot with a DOM keyboard event.
   *
   * Floating preview rendering depends on modifier state for behaviors such as
   * temporary mode switches. This helper updates the cached modifier snapshot
   * and reports whether anything actually changed so callers can avoid
   * unnecessary preview refreshes.
   *
   * @param e - Keyboard-like event carrying modifier-key flags
   * @returns `true` if any modifier flag changed; otherwise `false`
   */
  private updateModifierStateFromEvent(e: {
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    metaKey?: boolean
  }) {
    const next: AcEdInputModifiers = {
      ctrlKey: !!e.ctrlKey,
      shiftKey: !!e.shiftKey,
      altKey: !!e.altKey,
      metaKey: !!e.metaKey
    }

    const prev = this._modifierState
    const changed =
      prev.ctrlKey !== next.ctrlKey ||
      prev.shiftKey !== next.shiftKey ||
      prev.altKey !== next.altKey ||
      prev.metaKey !== next.metaKey

    if (changed) {
      this._modifierState = next
    }
    return changed
  }

  /**
   * Handles the sticky Ctrl toggle used by certain jig interactions.
   *
   * Instead of tracking Ctrl as a purely held modifier, some commands treat a
   * Ctrl key press as a persistent toggle. This helper flips that toggle on the
   * first non-repeating keydown event for the Control key.
   *
   * @param e - Keyboard event to inspect
   * @returns `true` if the toggle state changed and previews should refresh
   */
  private handleCtrlToggleKey(e: KeyboardEvent) {
    if (e.key !== 'Control' || e.repeat) return false
    if (e.type !== 'keydown') return false
    this._ctrlArcFlip = !this._ctrlArcFlip
    return true
  }

  /**
   * Extracts cross-prompt defaults from a prompt options object.
   *
   * Not every prompt type exposes the same optional properties, but the
   * floating-input pipeline needs a normalized shape for values such as base
   * point, dashed-baseline behavior, jig, and base angle. This helper performs
   * those property-existence checks in one place.
   *
   * @typeParam T - Value type produced by the prompt
   * @param options - Prompt options to normalize
   * @returns A normalized object containing only the floating-input defaults it understands
   */
  private resolvePromptDefaults<T>(options: AcEdPromptOptions<T>) {
    const hasBasePoint = 'basePoint' in options
    const hasUseBasePoint = 'useBasePoint' in options
    const hasUseDashedLine = 'useDashedLine' in options
    const hasBaseAngle = 'baseAngle' in options

    const basePoint =
      hasBasePoint && options.basePoint
        ? (options.basePoint as unknown as AcGePoint2dLike)
        : undefined
    const useBasePoint = hasUseBasePoint ? options.useBasePoint : false
    const showBaseLineOnly = hasUseDashedLine ? !options.useDashedLine : false
    const baseAngle = hasBaseAngle ? (options.baseAngle as number) : undefined

    return {
      message: options.message,
      jig: options.jig,
      basePoint,
      useBasePoint,
      showBaseLineOnly,
      baseAngle
    }
  }

  /**
   * Runs a floating-input prompt and resolves it to a parsed value.
   *
   * This is the core interaction primitive used by most non-selection prompts.
   * It wires together command-line keyword handling, floating input creation,
   * validation, preview refreshes, jig updates, cancellation handling, and
   * cleanup. The method guarantees that temporary UI and event listeners are
   * torn down no matter how the prompt completes.
   *
   * @typeParam T - Value type produced by the prompt
   * @param options - Configuration describing how the floating prompt should parse,
   * validate, preview, and commit its value
   * @returns A promise that resolves with the committed value or rejects on cancel/keyword
   */
  private async makeFloatingInputPromise<T>(options: {
    promptOptions: AcEdPromptOptions<T>
    inputCount?: AcEdFloatingInputBoxCount
    disableOSnap?: boolean
    handler: AcEdInputHandler<T>
    cleanup?: () => void
    allowPrompt?: boolean
    getDynamicValue: AcEdFloatingInputDynamicValueCallback<T>
    drawPreview?: AcEdFloatingInputDrawPreviewCallback
    onCommit?: AcEdFloatingInputCommitCallback<T>
  }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.active = true
      this.entitySelectionActive = false
      let settled = false
      const validate = (raw: AcEdFloatingInputRawData) => {
        const value = options.handler.parse(raw.x, raw.y)
        return {
          isValid: value != null,
          value: value ?? undefined
        }
      }

      const promptDefaults = this.resolvePromptDefaults(options.promptOptions)
      const keywordSession = this.startKeywordSession(
        options.promptOptions,
        true
      )

      let basePoint: AcGePoint2dLike | undefined = undefined
      if (promptDefaults.useBasePoint) {
        if (promptDefaults.basePoint) {
          basePoint = promptDefaults.basePoint
        } else if (this.lastPoint) {
          basePoint = { x: this.lastPoint.x, y: this.lastPoint.y }
        }
      }

      const commandLineMessage = promptDefaults.message
      if (!keywordSession) {
        this._commandLine.setPrompt(commandLineMessage)
      }
      const allowNone =
        'allowNone' in options.promptOptions
          ? (options.promptOptions as { allowNone: boolean }).allowNone
          : false
      const floatingInput = new AcEdFloatingInput(this.view, {
        parent: this.view.canvas,
        inputCount: options.inputCount,
        message: promptDefaults.message,
        disableOSnap: options.disableOSnap,
        showBaseLineOnly: promptDefaults.showBaseLineOnly,
        basePoint,
        baseAngle: promptDefaults.baseAngle,
        allowPrompt: options.allowPrompt !== false,
        allowNone,
        validate: validate,
        getDynamicValue: options.getDynamicValue,
        drawPreview: (pos: AcGePoint2dLike) => {
          if (promptDefaults.jig) {
            const defaults = options.getDynamicValue(pos)
            promptDefaults.jig.update(defaults.value)
            promptDefaults.jig.render()
          }
          options.drawPreview?.(pos)
        },
        onCommit: (val: T) => {
          let result = false
          if (!options.onCommit || options.onCommit(val)) {
            resolver(val)
            result = true
          }
          if (floatingInput.lastPoint) {
            this.lastPoint = {
              x: floatingInput.lastPoint.x,
              y: floatingInput.lastPoint.y
            }
          }
          return result
        },
        onCancel: () => rejector()
      })
      const cleanup = () => {
        if (settled) return
        settled = true
        this.active = false
        this.entitySelectionActive = false
        options.cleanup?.()
        promptDefaults.jig?.end()
        document.removeEventListener('keydown', escHandler)
        document.removeEventListener('keydown', modifierHandler)
        document.removeEventListener('keyup', modifierHandler)
        floatingInput.dispose()
        keywordSession?.cancel()
        this._commandLine.clear()
      }

      const resolver = (value: T) => {
        cleanup()
        resolve(value)
      }

      const rejector = (err?: Error) => {
        cleanup()
        reject(err ?? new Error('cancelled'))
      }

      const keywordRejector = (keyword: string) => {
        rejector(new AcEdKeywordInputError(keyword))
      }

      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          rejector()
        }
      }
      const modifierHandler = (e: KeyboardEvent) => {
        const toggled = this.handleCtrlToggleKey(e)
        const changed = this.updateModifierStateFromEvent(e)
        if (toggled || changed) {
          floatingInput.requestPreviewRefresh()
        }
      }
      document.addEventListener('keydown', escHandler)
      document.addEventListener('keydown', modifierHandler)
      document.addEventListener('keyup', modifierHandler)
      // showAt() expects viewport coordinates; curMousePos is canvas-local.
      floatingInput.showAt(this.view.canvasToViewport(this.view.curMousePos))

      keywordSession?.promise.then(keyword => {
        if (settled) return
        if (!keyword) {
          rejector()
          return
        }
        keywordRejector(keyword)
      })
    })
  }
}
