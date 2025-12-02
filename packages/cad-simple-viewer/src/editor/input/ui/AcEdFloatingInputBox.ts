/**
 * Represents ONE floating input box (<input> element).
 * Tracks whether the user has typed anything manually.
 */
export class AcEdFloatingInputBox {
  /** The container element of this input */
  private parent: HTMLElement

  /** The actual text input element */
  private input: HTMLInputElement

  /** Whether the user typed something in this box */
  userTyped = false

  /** Bound input handler for unbinding */
  private boundOnInput: () => void

  /**
   * Constructs one instance of this UI component.
   * @param parent - The container element of this input
   */
  constructor(parent: HTMLElement) {
    this.parent = parent
    this.input = document.createElement('input')
    this.input.type = 'text'

    // Track user input
    this.boundOnInput = () => {
      this.userTyped = true
      this.resetValidation()
    }
    this.input.addEventListener('input', this.boundOnInput)
    this.parent.appendChild(this.input)
  }

  /** Mark input as invalid */
  markInvalid() {
    this.input.classList.add('invalid')
  }

  /** Mark input as valid */
  markValid() {
    this.input.classList.remove('invalid')
  }

  /** Clear validation state */
  resetValidation() {
    this.input.classList.remove('invalid')
  }

  /** Get placeholder */
  get placeholder() {
    return this.input.placeholder
  }

  /** Set placeholder */
  set placeholder(text: string) {
    if (text) this.input.placeholder = text
  }

  /** Set value */
  set value(v: string) {
    if (v !== undefined) this.input.value = v
  }

  /** Read current text */
  get value(): string {
    return this.input.value
  }

  /** Return one flag to indicate whether the input box is focused. */
  get focused() {
    return document.activeElement === this.input
  }

  /** Forwards focus() to the underlying element. */
  focus() {
    this.input.focus()
  }

  /** Forwards select() to the underlying element. */
  select() {
    this.input.select()
  }

  /** Forwards remove() to the underlying element. */
  remove() {
    this.input.remove()
  }

  /** Return true if the specified event is originated from this input box. */
  isEventTarget(e: KeyboardEvent) {
    return e.target === this.input
  }

  /** Dispose the input box by unbinding events */
  dispose() {
    this.input.removeEventListener('input', this.boundOnInput)
    this.remove()
  }

  /**
   * Add an event listener to the input element
   * @param type Event type (e.g., 'input', 'keydown')
   * @param listener Listener function
   * @param options Optional event listener options
   */
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLInputElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ) {
    this.input.addEventListener(type, listener as EventListener, options)
  }

  /**
   * Remove an event listener from the input element
   * @param type Event type (e.g., 'input', 'keydown')
   * @param listener Listener function
   * @param options Optional event listener options
   */
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLInputElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ) {
    this.input.removeEventListener(type, listener as EventListener, options)
  }
}
