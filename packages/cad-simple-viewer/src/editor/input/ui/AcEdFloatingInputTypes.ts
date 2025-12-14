import { AcGePoint2dLike } from '@mlightcad/data-model'

/**
 * Describes the raw text values from the X and Y fields in {@link AcEdFloatingInput}.
 */
export interface AcEdFloatingInputRawData {
  /** Raw text value in the X input box */
  x: string
  /** Raw text value in the Y input box */
  y?: string
}

export interface AcEdFloatingInputDynamicValue<T> {
  /** Parsed data value */
  value: T
  /** Raw text values set to the X and Y fields in {@link AcEdFloatingInput}. */
  raw: AcEdFloatingInputRawData
}

/**
 * Describes the output of a validation operation performed on the user-typed
 * raw text values from the X and Y fields in {@link AcEdFloatingInput}.
 */
export interface AcEdFloatingInputValidationResult<T> {
  /** Parsed data value */
  value?: T
  /** Whether the validation succeeded. */
  isValid: boolean
}

/**
 * A callback capable of validating the raw textual contents of the X and Y
 * input fields.
 *
 * The caller receives two raw strings:
 * - `x`: raw string in the X textbox
 * - `y`: raw string in the Y textbox, or `null` if Y input is disabled
 *
 * The callback should parse these strings and determine whether the input set
 * is valid. It then returns an {@link AcEdFloatingInputValidationResult}.
 */
export type AcEdFloatingInputValidationCallback<T> = (
  raw: AcEdFloatingInputRawData
) => AcEdFloatingInputValidationResult<T>

/**
 * Callback invoked when the user confirms input via the Enter key.
 * Receives the parsed (and validated) X and Y values.
 *
 * When `twoInputs` is `false`, Y will always be `null`.
 */
export type AcEdFloatingInputCommitCallback<T> = (point: T) => void

/**
 * Callback invoked whenever the user edits either input field.
 *
 * Called only after validation (custom or built-in). Useful for dynamic
 * real-time preview, updating temporary graphics, or displaying error states.
 */
export type AcEdFloatingInputChangeCallback<T> = (
  state: AcEdFloatingInputValidationResult<T>
) => void

/**
 * Callback invoked when input box closes due to user cancelling,
 * typically by pressing Escape or programmatically via `hide()`.
 */
export type AcEdFloatingInputCancelCallback = () => void

/**
 * Callback invoked on mousemove to update the preview geometry.
 */
export type AcEdFloatingInputDrawPreviewCallback = (
  pos: AcGePoint2dLike
) => void

/**
 * Callback used to dynamically compute input values for the floating input fields.
 */
export type AcEdFloatingInputDynamicValueCallback<T> = (
  pos: AcGePoint2dLike
) => AcEdFloatingInputDynamicValue<T>

/**
 * Construction options for {@link AcEdFloatingInput}.
 */
export interface AcEdFloatingInputOptions<T> {
  /**
   * Optional parent element to constrain the floating input within.
   * If not provided, the container is added to document.body.
   */
  parent?: HTMLElement

  /**
   * If true, display both X and Y inputs.
   * If false, display only X input (useful for distance, angle, etc.).
   *
   * Default: `true`
   */
  twoInputs?: boolean

  /**
   * A message or hint displayed above the input fields.
   * Useful for describing expected input (e.g., "Specify next point").
   */
  message?: string

  /**
   * The flag to indicate whether to disable osnap.
   */
  disableOSnap?: boolean

  /**
   * Custom validation function.
   */
  validate: AcEdFloatingInputValidationCallback<T>

  /**
   * Optional callback to dynamically compute values for X/Y inputs.
   * Called whenever the input is empty and the mouse moves, providing
   * context-dependent defaults for the user.
   */
  getDynamicValue: AcEdFloatingInputDynamicValueCallback<T>

  /**
   * Callback invoked on mousemove to update the preview geometry.
   */
  drawPreview?: AcEdFloatingInputDrawPreviewCallback

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
}
