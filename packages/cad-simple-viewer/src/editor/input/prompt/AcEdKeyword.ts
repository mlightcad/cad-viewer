/**
 * Represents a single keyword option in a prompt, similar to Autodesk.AutoCAD.EditorInput.Keyword.
 * Keywords can be shown to the user, used internally as global identifiers, and can be enabled/disabled or visible/hidden.
 */
export class AcEdKeyword {
  // Private fields
  private _displayName: string
  private _enabled: boolean
  private _globalName: string
  private _isReadOnly: boolean
  private _localName: string
  private _visible: boolean

  /**
   * Creates a new Keyword.
   * @param displayName - The text displayed to the user for this keyword.
   * @param globalName - The internal global name (never shown to user). Defaults to `displayName`.
   * @param localName - Internal local name (usually same as global name). Defaults to `globalName`.
   * @param enabled - Whether the keyword is currently enabled. Default is `true`.
   * @param isReadOnly - If `true`, the keyword properties cannot be modified. Default is `false`.
   * @param visible - Whether the keyword is visible to the user. Default is `true`.
   */
  constructor(
    displayName: string,
    globalName?: string,
    localName?: string,
    enabled: boolean = true,
    isReadOnly: boolean = false,
    visible: boolean = true
  ) {
    this._displayName = displayName
    this._globalName = globalName ?? displayName
    this._localName = localName ?? this._globalName
    this._enabled = enabled
    this._isReadOnly = isReadOnly
    this._visible = visible
  }

  /**
   * Gets or sets the display name of the keyword.
   * This is the name shown to the user in prompts.
   * Setting has no effect if `isReadOnly` is true.
   */
  get displayName(): string {
    return this._displayName
  }
  set displayName(name: string) {
    if (!this._isReadOnly) this._displayName = name
  }

  /**
   * Gets or sets whether the keyword is currently enabled.
   * Disabled keywords cannot be selected by the user.
   * Setting has no effect if `isReadOnly` is true.
   */
  get enabled(): boolean {
    return this._enabled
  }
  set enabled(flag: boolean) {
    if (!this._isReadOnly) this._enabled = flag
  }

  /**
   * Gets or sets the global name of the keyword.
   * The global name is used internally by programs and is never displayed to the user.
   * Setting has no effect if `isReadOnly` is true.
   */
  get globalName(): string {
    return this._globalName
  }
  set globalName(name: string) {
    if (!this._isReadOnly) this._globalName = name
  }

  /**
   * Gets a value indicating whether the keyword is read-only.
   * True if the keyword is read-only; otherwise, false.
   */
  get isReadOnly(): boolean {
    return this._isReadOnly
  }

  /**
   * Gets or sets the local name of the keyword.
   * Usually the same as the global name; not displayed to the user.
   * Setting has no effect if `isReadOnly` is true.
   */
  get localName(): string {
    return this._localName
  }
  set localName(name: string) {
    if (!this._isReadOnly) this._localName = name
  }

  /**
   * Gets or sets whether the keyword is visible to the user.
   * Hidden keywords cannot be selected by typing, but can be used programmatically.
   * Setting has no effect if `isReadOnly` is true.
   */
  get visible(): boolean {
    return this._visible
  }
  set visible(flag: boolean) {
    if (!this._isReadOnly) this._visible = flag
  }
}
