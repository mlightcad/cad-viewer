import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Represents prompt options for selecting a single entity.
 * Mirrors `Autodesk.AutoCAD.EditorInput.PromptEntityOptions`.
 */
export class AcEdPromptEntityOptions extends AcEdPromptOptions<string> {
  /** Whether ENTER (no selection) is allowed */
  private _allowNone = false

  /** Whether entities on locked layers are selectable */
  private _allowObjectOnLockedLayer = false

  /** Message displayed when selection is rejected */
  private _rejectMessage = 'Invalid object selected.'

  /**
   * Allowed entity class names.
   * Empty set means "allow all".
   */
  private _allowedClasses = new Set<string>()

  /**
   * Normalizes entity class names so both "Line" and "AcDbLine" are accepted.
   *
   * `PromptEntityOptions.AddAllowedClass()` in host CAD APIs is typically used
   * with runtime class identifiers, while this web implementation works with
   * string names resolved from the underlying entity instances. In practice,
   * callers may provide either the short CAD-style type name (`Line`) or the
   * concrete TypeScript constructor name (`AcDbLine`).
   *
   * This helper canonicalizes both representations to the same short form so
   * the allow-list can be matched consistently regardless of which naming style
   * was used by the caller or discovered at pick time.
   *
   * @param className - Raw entity class name supplied by callers or runtime inspection
   * @returns Normalized class name without the `AcDb` prefix
   */
  private normalizeClassName(className: string): string {
    const normalized = className.trim()
    return normalized.startsWith('AcDb') ? normalized.slice(4) : normalized
  }

  constructor(message: string, globalKeywords?: string) {
    super(message, globalKeywords)
  }

  /**
   * Gets or sets whether the user may press ENTER without selecting an entity.
   * Corresponds to `PromptEntityOptions.AllowNone`.
   */
  get allowNone(): boolean {
    return this._allowNone
  }

  set allowNone(value: boolean) {
    if (!this.isReadOnly) {
      this._allowNone = value
    }
  }

  /**
   * Gets or sets whether entities on locked layers can be selected.
   * Corresponds to `PromptEntityOptions.AllowObjectOnLockedLayer`.
   */
  get allowObjectOnLockedLayer(): boolean {
    return this._allowObjectOnLockedLayer
  }

  set allowObjectOnLockedLayer(value: boolean) {
    if (!this.isReadOnly) {
      this._allowObjectOnLockedLayer = value
    }
  }

  /**
   * Gets the rejection message shown when the selected entity is invalid.
   * Corresponds to `PromptEntityOptions.RejectMessage`.
   */
  get rejectMessage(): string {
    return this._rejectMessage
  }

  /**
   * Sets the rejection message.
   * Corresponds to `PromptEntityOptions.SetRejectMessage()`.
   */
  setRejectMessage(message: string): this {
    if (!this.isReadOnly) {
      this._rejectMessage = message
    }
    return this
  }

  /**
   * Adds an allowed entity class name.
   * Corresponds to `PromptEntityOptions.AddAllowedClass()`.
   *
   * @param className - Entity class name (e.g. "Line", "Circle")
   */
  addAllowedClass(className: string): this {
    if (!this.isReadOnly) {
      const normalized = this.normalizeClassName(className)
      if (normalized) {
        this._allowedClasses.add(normalized)
      }
    }
    return this
  }

  /**
   * Removes an allowed entity class name.
   * Corresponds to `PromptEntityOptions.RemoveAllowedClass()`.
   */
  removeAllowedClass(className: string): this {
    if (!this.isReadOnly) {
      const normalized = this.normalizeClassName(className)
      if (normalized) {
        this._allowedClasses.delete(normalized)
      }
    }
    return this
  }

  /**
   * Clears all allowed class restrictions (allow all entities).
   */
  clearAllowedClasses(): this {
    if (!this.isReadOnly) {
      this._allowedClasses.clear()
    }
    return this
  }

  /**
   * Checks whether a given entity class is allowed.
   * Used internally by selection logic.
   */
  isClassAllowed(className: string): boolean {
    const normalized = this.normalizeClassName(className)
    return (
      this._allowedClasses.size === 0 || this._allowedClasses.has(normalized)
    )
  }
}
