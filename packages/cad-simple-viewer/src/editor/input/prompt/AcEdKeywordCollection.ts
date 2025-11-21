import { AcEdKeyword } from './AcEdKeyword'

/**
 * A collection of `AcEdKeyword` objects, mirroring `Autodesk.AutoCAD.EditorInput.KeywordCollection`.
 * Represents the set of valid keywords for a prompt.
 */
export class AcEdKeywordCollection {
  private _keywords: AcEdKeyword[] = []
  private _defaultKeyword?: AcEdKeyword

  /** Constructs a new, empty `AcEdKeywordCollection`. */
  constructor() {}

  /**
   * Adds a new keyword (displayName only).
   * @param displayName - The text shown to the user for this keyword.
   * @returns The newly created `AcEdKeyword`.
   */
  add(displayName: string): AcEdKeyword
  /**
   * Adds a new keyword with globalName and localName.
   * @param globalName - The internal, non-display name.
   * @param localName - The name that the user types to select the keyword.
   * @returns The newly created `AcEdKeyword`.
   */
  add(globalName: string, localName: string): AcEdKeyword
  /**
   * Adds a new keyword with displayName, globalName, localName, enabled, visible.
   * @param displayName - The text shown to the user.
   * @param globalName - Internal identifier for the keyword.
   * @param localName - The name used by the user to type the keyword.
   * @param enabled - If false, the keyword cannot be selected.
   * @param visible - If false, the keyword is hidden from display.
   * @returns The newly created `AcEdKeyword`.
   */
  add(
    displayName: string,
    globalName: string,
    localName: string,
    enabled?: boolean,
    visible?: boolean
  ): AcEdKeyword

  add(
    a: string,
    b?: string,
    c?: string,
    enabled: boolean = true,
    visible: boolean = true
  ): AcEdKeyword {
    let displayName: string, globalName: string, localName: string

    if (b === undefined) {
      displayName = a
      globalName = a
      localName = a
    } else if (c === undefined) {
      displayName = b
      globalName = a
      localName = b
    } else {
      displayName = a
      globalName = b
      localName = c
    }

    const kw = new AcEdKeyword(
      displayName,
      globalName,
      localName,
      enabled,
      false,
      visible
    )
    this._keywords.push(kw)
    return kw
  }

  /** Removes all keywords from the collection. */
  clear(): void {
    this._keywords = []
    this._defaultKeyword = undefined
  }

  /** Copies the keywords of this collection into a plain array. */
  toArray(): AcEdKeyword[] {
    return this._keywords.slice()
  }

  /** Gets or sets the default keyword for this collection. */
  get default(): AcEdKeyword | undefined {
    return this._defaultKeyword
  }
  set default(kw: AcEdKeyword | undefined) {
    if (kw && !this._keywords.includes(kw)) {
      throw new Error(
        'Default keyword must be one of the collection\'s keywords'
      )
    }
    this._defaultKeyword = kw
  }

  /** Returns a string representing the visible, enabled keywords for display. */
  getDisplayString(showNoDefault: boolean = false): string {
    const parts = this._keywords
      .filter(kw => kw.visible && kw.enabled)
      .map(kw => {
        if (!showNoDefault && this._defaultKeyword === kw) {
          return kw.displayName
        }
        return kw.displayName
      })

    return parts.join('/')
  }

  /** Returns an iterator over the `AcEdKeyword` objects in this collection. */
  [Symbol.iterator](): Iterator<AcEdKeyword> {
    let index = 0
    const arr = this._keywords
    return {
      next(): IteratorResult<AcEdKeyword> {
        if (index < arr.length) return { done: false, value: arr[index++] }
        else return { done: true, value: undefined }
      }
    }
  }

  /** Finds a keyword by its display name (case-insensitive). */
  findByDisplayName(displayName: string): AcEdKeyword | undefined {
    return this._keywords.find(
      kw => kw.displayName.toLowerCase() === displayName.toLowerCase()
    )
  }

  /** Finds a keyword by its global name (case-insensitive). */
  findByGlobalName(globalName: string): AcEdKeyword | undefined {
    return this._keywords.find(
      kw => kw.globalName.toLowerCase() === globalName.toLowerCase()
    )
  }

  /** Gets the number of keywords in this collection. */
  get count(): number {
    return this._keywords.length
  }
}
