import { AcEdFloatingInputBox } from './AcEdFloatingInputBox'
import {
  AcEdFloatingInputCancelCallback,
  AcEdFloatingInputChangeCallback,
  AcEdFloatingInputCommitCallback,
  AcEdFloatingInputNoneCallback,
  AcEdFloatingInputRawData,
  AcEdFloatingInputValidationCallback,
  AcEdFloatingInputValidationResult
} from './AcEdFloatingInputTypes'

/**
 * Construction options for {@link AcEdFloatingInputBoxes}.
 */
export interface AcEdFloatingInputBoxesOptions<T> {
  /**
   * The parent element to constrain the floating input within.
   */
  parent: HTMLElement

  /**
   * If true, display both X and Y inputs.
   * If false, display only X input (useful for distance, angle, etc.).
   *
   * Default: `true`
   */
  twoInputs?: boolean

  /**
   * Custom validation function.
   */
  validate: AcEdFloatingInputValidationCallback<T>

  /**
   * Callback invoked when user confirms valid input by pressing Enter.
   */
  onCommit?: AcEdFloatingInputCommitCallback<T>

  /**
   * Callback invoked on each input event after validation completes.
   */
  onChange?: AcEdFloatingInputChangeCallback<T>

  /**
   * Callback invoked on cancellation (Escape or hide()).
   */
  onCancel?: AcEdFloatingInputCancelCallback

  /**
   * Callback invoked when Enter submits "none" (AllowNone + empty typed input).
   */
  onNone?: AcEdFloatingInputNoneCallback

  /**
   * Whether to autofocus/select inputs after mount.
   * Default: true
   */
  autoFocus?: boolean

  /**
   * When true, pressing Enter without having manually typed coordinates
   * cancels the prompt (equivalent to Escape) instead of committing the
   * current dynamic-preview value.  Mirrors AutoCAD's AllowNone behaviour.
   */
  allowNone?: boolean

  /**
   * Whether Enter with no manual input should submit defaultValue.
   */
  useDefaultValue?: boolean

  /**
   * Default value submitted when useDefaultValue is true.
   */
  defaultValue?: T
}

/**
 * Container holding one or two floating input boxes.
 *
 * Always contains:
 *      - X input box
 *
 * Contains Y input box only if `twoInputs` is true.
 */
export class AcEdFloatingInputBoxes<T> {
  /** Root DOM node that contains X and optional Y input boxes */
  readonly parent: HTMLElement

  /** Whether this input uses X+Y fields or X-only. @private */
  readonly twoInputs: boolean

  /** Always present */
  readonly xInput: AcEdFloatingInputBox

  /** Only present when twoInputs = true */
  readonly yInput?: AcEdFloatingInputBox

  /**
   * Cached bound handler for keyboard events—ensures removal works.
   */
  private boundOnKeyDown: (e: KeyboardEvent) => void

  /**
   * Cached bound handler for input events—ensures removal works.
   */
  private boundOnInput: () => void

  // ---------------------------------------------------------------------------
  // CALLBACKS
  // ---------------------------------------------------------------------------
  private onCommit?: AcEdFloatingInputCommitCallback<T>
  private onChange?: AcEdFloatingInputChangeCallback<T>
  private onCancel?: AcEdFloatingInputCancelCallback
  private onNone?: AcEdFloatingInputNoneCallback
  private validateFn: AcEdFloatingInputValidationCallback<T>
  private allowNone: boolean
  private useDefaultValue: boolean
  private defaultValue?: T

  /**
   * Constructs one instance of this class
   * @param parent - The container element of X and Y inputs
   * @param twoInputs - The flag whether to show Y input
   */
  constructor(options: AcEdFloatingInputBoxesOptions<T>) {
    this.parent = options.parent
    this.twoInputs = options.twoInputs ?? true

    // Bind events
    this.boundOnInput = () => this.handleInput()
    this.boundOnKeyDown = e => this.handleKeyDown(e)

    this.xInput = new AcEdFloatingInputBox(this.parent)
    this.xInput.addEventListener('input', this.boundOnInput)
    this.xInput.addEventListener('keydown', this.boundOnKeyDown)
    if (this.twoInputs) {
      this.yInput = new AcEdFloatingInputBox(this.parent)
      this.yInput.addEventListener('input', this.boundOnInput)
      this.yInput.addEventListener('keydown', this.boundOnKeyDown)
    }

    this.validateFn = options.validate
    this.onCommit = options.onCommit
    this.onChange = options.onChange
    this.onCancel = options.onCancel
    this.onNone = options.onNone
    this.allowNone = options.allowNone ?? false
    this.useDefaultValue = options.useDefaultValue ?? false
    this.defaultValue = options.defaultValue

    // Focus/select after mount
    if (options.autoFocus !== false) {
      setTimeout(() => {
        if (this.yInput) this.yInput.select()
        this.xInput.focus()
        this.xInput.select()
      }, 0)
    }
  }

  /** Returns true if user typed in ANY input box */
  get userTyped(): boolean {
    return this.xInput.userTyped || !!this.yInput?.userTyped
  }

  /** Return one flag to indicate whether one of inputs is focused. */
  get focused() {
    return this.xInput.focused || this.yInput?.focused
  }

  /** Focus on X input */
  focus() {
    this.xInput.focus()
  }

  /** Blur both inputs */
  blur() {
    this.xInput.blur()
    this.yInput?.blur()
  }

  /** Sets text value of X and Y inputs if user doesn't type value */
  setValue(value: AcEdFloatingInputRawData) {
    if (!this.xInput.userTyped) this.xInput.value = value.x
    if (this.twoInputs && this.yInput && !this.yInput.userTyped) {
      this.yInput.value = value.y ?? ''
    }
  }

  /**
   * Disposes the floating input widget permanently.
   *
   * - Removes all event listeners (keyboard, input, mouse move).
   * - Removes the widget's DOM container from the parent.
   * - Marks the widget as disposed; after this, it cannot be shown again.
   *
   * Safe to call multiple times; subsequent calls have no effect.
   */
  dispose() {
    this.xInput.removeEventListener('input', this.boundOnInput)
    this.xInput.removeEventListener('keydown', this.boundOnKeyDown)
    this.xInput.dispose()

    if (this.yInput) {
      this.yInput.removeEventListener('input', this.boundOnInput)
      this.yInput.removeEventListener('keydown', this.boundOnKeyDown)
      this.yInput?.dispose()
    }
  }

  /**
   * Handles input events from X or Y fields.
   * Triggers validation and notifies listeners through `onChange`.
   */
  private handleInput(): void {
    const state = this.validate()
    this.onChange?.(state)
  }

  /**
   * Handles keyboard events (Enter for commit, Escape for cancel).
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Find out which input element triggers this event
    let currentInput = this.xInput
    let nextInput = this.yInput
    if (this.yInput && this.yInput.isEventTarget(e)) {
      currentInput = this.yInput
      nextInput = this.xInput
    }

    if (e.key === 'Enter') {
      if (this.useDefaultValue && !this.userTyped) {
        const committed =
          !this.onCommit || this.onCommit(this.defaultValue as T)
        if (committed) {
          currentInput.markValid()
        } else {
          currentInput.markInvalid()
        }
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // When allowNone is set and the user has not manually typed coordinates,
      // treat Enter as PromptStatus.None so commands can finish naturally.
      if (this.allowNone && !this.userTyped) {
        this.onNone?.()
      } else {
        const state = this.validate()
        if (state.isValid && state.value != null) {
          this.onCommit?.(state.value)
          currentInput.markValid()
        } else {
          currentInput.markInvalid()
        }
      }
      e.preventDefault()
      e.stopPropagation()
    } else if (e.key === 'Escape') {
      this.onCancel?.()
      e.preventDefault()
      e.stopPropagation()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (nextInput) {
        nextInput?.focus()
        nextInput?.select()
      }
    }
  }

  /**
   * Validates the input values using either:
   * - the user-provided custom validation function, OR
   * - the built-in numeric parser.
   */
  private validate(): AcEdFloatingInputValidationResult<T> {
    const rawX = this.xInput.value.trim()
    const rawY =
      this.twoInputs && this.yInput ? this.yInput.value.trim() : undefined
    return this.validateFn({ x: rawX, y: rawY })
  }
}
