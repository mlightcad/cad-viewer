import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Represents prompt options for one selection set
 * Mirrors `Autodesk.AutoCAD.EditorInput.PromptSelectionOptions`.
 */
export class AcEdPromptSelectionOptions extends AcEdPromptOptions<string> {
  /** Whether to force single object selection only */
  private _singleOnly = false

  /** Whether entities on locked layers are selectable */
  private _allowObjectOnLockedLayer = false

  /**
   * Whether picking a selectable group member expands to the whole group
   * (`PICKSTYLE` group bit). Commands such as GROUPEDIT Remove turn this off
   * so individual members can be picked.
   */
  private _allowGroupSelection = true

  constructor(message: string, globalKeywords?: string) {
    super(message, globalKeywords)
  }

  /**
   * Gets or sets whether to force single object selection only
   */
  get singleOnly(): boolean {
    return this._singleOnly
  }

  set singleOnly(value: boolean) {
    this._singleOnly = value
  }

  /**
   * Gets or sets whether entities on locked layers can be selected.
   * Modify commands leave this false.
   */
  get allowObjectOnLockedLayer(): boolean {
    return this._allowObjectOnLockedLayer
  }

  set allowObjectOnLockedLayer(value: boolean) {
    this._allowObjectOnLockedLayer = value
  }

  /**
   * Gets or sets whether group selection expansion is applied during this
   * prompt. Defaults to `true`.
   */
  get allowGroupSelection(): boolean {
    return this._allowGroupSelection
  }

  set allowGroupSelection(value: boolean) {
    this._allowGroupSelection = value
  }
}
