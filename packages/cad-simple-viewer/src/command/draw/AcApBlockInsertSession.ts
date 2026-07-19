/**
 * Options applied to the next `-INSERT` run when started from the Blocks
 * palette / ribbon gallery (AutoCAD Blocks palette Options panel).
 *
 * Consumed once by {@link AcApInsertCmd} at the start of `execute`.
 */
export interface AcApBlockInsertSessionOptions {
  /** When true, prompt for scale; otherwise use scaleX/Y/Z. Default true. */
  specifyScale?: boolean
  scaleX?: number
  scaleY?: number
  scaleZ?: number
  /** When true, prompt for rotation; otherwise use rotationDeg. Default true. */
  specifyRotation?: boolean
  /** Rotation in degrees when not specifying on-screen. */
  rotationDeg?: number
  /** After a successful insert, prompt for another insertion of the same block. */
  repeatPlacement?: boolean
}

/**
 * One-shot session bridge from the Blocks palette UI into `-INSERT`.
 */
export class AcApBlockInsertSession {
  private static _options: AcApBlockInsertSessionOptions | null = null

  /**
   * Sets options for the next `-INSERT` invocation.
   */
  static set(options: AcApBlockInsertSessionOptions) {
    this._options = { ...options }
  }

  /**
   * Takes and clears the pending options (or returns `null`).
   */
  static consume(): AcApBlockInsertSessionOptions | null {
    const options = this._options
    this._options = null
    return options
  }

  /**
   * Clears any pending options without reading them.
   */
  static clear() {
    this._options = null
  }
}
