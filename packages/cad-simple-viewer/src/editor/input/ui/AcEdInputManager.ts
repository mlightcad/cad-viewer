import {
  AcGeBox2d,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../../../app'
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

  private hasKeywords(options: AcEdPromptOptions<unknown>) {
    const keywords = options.keywords?.toArray() ?? []
    return keywords.length > 0
  }

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

  private isPromptKeyword(error: unknown): error is AcEdKeywordInputError {
    return error instanceof AcEdKeywordInputError
  }

  /**
   * Public point input API.
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
   * Prompt the user to type a numeric value. If integerOnly is true, integers
   * are enforced. The input is validated and the box will be marked invalid if
   * the typed value does not conform, allowing the user to retype.
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

  /** Request a distance (number) from the user. */
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

  /** Request an angle in degrees from the user. */
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

  /** Request a double/float from the user. */
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

  /** Request an integer from the user. */
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
   * Prompt the user to type an arbitrary string. Resolved when Enter is pressed.
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
   * Prompt the user to type a keyword. Resolved when Enter is pressed.
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
   * Similar to Editor.GetEntity() in AutoCAD.
   */
  async getEntity(
    options: AcEdPromptEntityOptions
  ): Promise<AcEdPromptEntityResult> {
    try {
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
          const picked = this.view.pick(pos)

          // Clicked empty space
          if (picked.length == 0) {
            // this.view.showMessage(options.rejectMessage)
            return
          }

          // Locked layer
          // if (picked.locked && !options.allowObjectOnLockedLayer) {
          //   this.view.showMessage(options.rejectMessage)
          //   return
          // }

          // Class filter
          // if (!options.isClassAllowed(picked.className)) {
          //   this.view.showMessage(options.rejectMessage)
          //   return
          // }

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
      return new AcEdPromptEntityResult(AcEdPromptStatus.OK, value || undefined)
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

  private tryGetScriptedNumber(
    handler: AcEdNumericalHandler | AcEdAngleHandler
  ): number | undefined {
    return this.tryGetScriptedValue(handler)
  }

  private dequeueScriptInput() {
    if (!this._scriptInputs.length) return undefined
    return this._scriptInputs.shift()
  }

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

  private isPromptCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === 'cancelled'
  }

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

  private handleCtrlToggleKey(e: KeyboardEvent) {
    if (e.key !== 'Control' || e.repeat) return false
    if (e.type !== 'keydown') return false
    this._ctrlArcFlip = !this._ctrlArcFlip
    return true
  }

  /**
   * Creates a promise for floating input that will be resolved or rejected by user input.
   *
   * This method centralizes the lifecycle of an interactive input operation,
   * including handling the Escape key to cancel, resolving with user-provided
   * values, and guaranteeing cleanup of UI elements and event handlers.
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
