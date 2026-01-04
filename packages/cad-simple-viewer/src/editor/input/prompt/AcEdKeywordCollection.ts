import { AcEdKeyword } from './AcEdKeyword'

/**
 * A collection of `AcEdKeyword` objects, mirroring `Autodesk.AutoCAD.EditorInput.KeywordCollection`.
 * Represents the set of valid keywords for a prompt.
 */
export class AcEdKeywordCollection {
  private _keywords: AcEdKeyword[] = []
  private _defaultKeyword?: AcEdKeyword

  /**
   * Constructs a keyword collection by parsing an ObjectARX-style keyword list
   * string, equivalent to the `kwl` argument of `acedInitGet`.
   *
   * The keyword list is a single space-delimited string. Each token defines one
   * keyword specification and is interpreted using AutoCAD command-line rules:
   *
   * ### Basic keywords
   * - Keywords are separated by one or more spaces.
   * - Each keyword may contain only letters, digits, and hyphens (`-`).
   *
   * ```ts
   * new AcEdKeywordCollection("Width Height Depth")
   * ```
   *
   * ### Abbreviation rules
   * AutoCAD recognizes keyword abbreviations using one of two methods:
   *
   * 1. **Capital-letter method**
   *    Uppercase letters inside the keyword define the required abbreviation.
   *
   *    ```text
   *    LType   → LT
   *    eXit    → X
   *    ```
   *
   * 2. **Comma method**
   *    The full keyword is written in uppercase, followed by a comma and an
   *    explicit abbreviation.
   *
   *    ```text
   *    LTYPE,LT
   *    ```
   *
   *    The abbreviation part after the comma is *not* part of the returned
   *    keyword value.
   *
   * ### Local and global keywords
   * The keyword list may define local-to-global mappings using an underscore (`_`):
   *
   * ```text
   * Ja Nein _ Yes No
   * ```
   *
   * - Keywords before `_` are **local**
   * - Keywords after `_` are **global**
   * - When a local keyword is entered, the corresponding global keyword is returned
   * - Global keywords may be entered explicitly using a leading underscore
   *
   * A one-to-one match is not required:
   * - Extra local keywords return an empty string
   * - Extra global keywords are valid but require a leading underscore
   *
   * ### Returned values
   * Regardless of how the user types a keyword (full form or abbreviation),
   * the resolved keyword value is always the **global keyword as specified in
   * the keyword list**, preserving its original capitalization.
   *
   * @param kwl Optional ObjectARX-style keyword list string. If omitted, an
   *            empty keyword collection is created.
   */
  constructor(kwl?: string) {
    if (!kwl) return

    const tokens = kwl.trim().split(/\s+/)

    const locals: string[] = []
    const globals: string[] = []
    let parsingGlobals = false

    for (const token of tokens) {
      if (token === '_') {
        parsingGlobals = true
        continue
      }
      ;(parsingGlobals ? globals : locals).push(token)
    }

    const max = Math.max(locals.length, globals.length)

    for (let i = 0; i < max; i++) {
      const localSpec = locals[i]
      const globalSpec = globals[i]

      // Parse "LTYPE,LT" or "WireFrame"
      const parseSpec = (spec?: string) => {
        if (!spec) return undefined
        const comma = spec.indexOf(',')
        return comma >= 0 ? spec.substring(0, comma) : spec
      }

      const globalName = parseSpec(globalSpec)
      const localName = parseSpec(localSpec)

      // ARX rules:
      // - local without global → accepted, returns ""
      // - global without local → accepted only with underscore (already implied)
      // - matched → local maps to global
      const kw = new AcEdKeyword(
        globalName ?? localName ?? '',
        globalName ?? '',
        localName ?? '',
        true,
        false,
        true
      )

      this._keywords.push(kw)
    }
  }

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

  /** Finds a keyword by its global name (case-insensitive), alias, or display name */
  findByName(name: string): AcEdKeyword | undefined {
    if (!name) return undefined

    let input = name.trim()
    if (!input) return undefined

    const forceGlobal = input.startsWith('_')
    if (forceGlobal) {
      input = input.substring(1)
    }

    const needle = input.toLowerCase()

    return this._keywords.find(kw => {
      if (!kw.enabled) return false

      // Global match (always allowed, or forced by "_")
      if (kw.globalName.toLowerCase() === needle) {
        return true
      }

      // If "_" is used, do not allow local/display matches
      if (forceGlobal) return false

      // Local name match (what user types)
      if (kw.localName && kw.localName.toLowerCase() === needle) {
        return true
      }

      // Display name match (fallback)
      if (kw.displayName.toLowerCase() === needle) {
        return true
      }

      return false
    })
  }

  /** Gets the number of keywords in this collection. */
  get count(): number {
    return this._keywords.length
  }
}
