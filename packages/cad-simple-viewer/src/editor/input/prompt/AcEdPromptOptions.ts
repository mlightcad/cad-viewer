import { AcGePoint3d } from '@mlightcad/data-model'

import { AcEdPreviewJig } from '../AcEdPreviewJig'
import {
  AcEdKeywordCollection,
  AcEdKeywordPromptFormat
} from './AcEdKeywordCollection'

/**
 * Represents the base class for prompt options in the Editor, similar to `Autodesk.AutoCAD.EditorInput.PromptOptions`.
 * Provides configuration for the prompt message, keyword collection, and how keywords are appended/displayed.
 */
export class AcEdPromptOptions<T = number | string | AcGePoint3d> {
  private _jig?: AcEdPreviewJig<T>
  private _message: string = ''
  private _appendKeywordsToMessage: boolean = true
  private _isReadOnly: boolean = false
  private _keywords: AcEdKeywordCollection = new AcEdKeywordCollection()

  /**
   * Constructs a new `AcEdPromptOptions` with a given prompt message.
   * @param message - The message to show to the user in the prompt, or a combined message and keywords string in the format "Message text [Keyword1/Keyword2/...]".
   * @param globalKeywords - Optional space-separated list of global keyword names. If provided, the message parameter is treated as a combined message and keywords string.
   */
  constructor(message: string, globalKeywords?: string) {
    // Always call super() first (but since this is the base class, we don't have a super)
    // Then handle the parameters
    if (globalKeywords !== undefined) {
      // Two-parameter constructor
      this.setMessageAndKeywords(message, globalKeywords)
    } else {
      // Single-parameter constructor
      this._message = message
    }
  }

  /**
   * Gets or sets the preview jig in the prompt.
   */
  get jig() {
    return this._jig
  }

  set jig(jig: AcEdPreviewJig<T> | undefined) {
    if (!this._isReadOnly) {
      this._jig = jig
    }
  }

  /**
   * Gets or sets the message displayed in the prompt.
   * Corresponds to `PromptOptions.Message` in AutoCAD .NET API.
   */
  get message(): string {
    return this._message
  }

  set message(msg: string) {
    if (!this._isReadOnly) {
      this._message = msg
    }
  }

  /**
   * Gets or sets whether keywords should be appended automatically to the message when rendering.
   * In AutoCAD .NET, this is `PromptOptions.AppendKeywordsToMessage`.
   */
  get appendKeywordsToMessage(): boolean {
    return this._appendKeywordsToMessage
  }

  set appendKeywordsToMessage(value: boolean) {
    if (!this._isReadOnly) {
      this._appendKeywordsToMessage = value
    }
  }

  /**
   * Gets whether this `AcEdPromptOptions` is read-only.
   * When read-only, properties such as `message` and `appendKeywordsToMessage` cannot be changed.
   * Corresponds to `PromptOptions.IsReadOnly`.
   */
  get isReadOnly(): boolean {
    return this._isReadOnly
  }

  /**
   * Gets the collection of keywords for this prompt.
   * Mirrors `PromptOptions.Keywords` in AutoCAD .NET API.
   */
  get keywords(): AcEdKeywordCollection {
    return this._keywords
  }

  /**
   * Returns AutoCAD-style keyword prompt format data:
   * [Keywords] <Default>:
   */
  getKeywordPromptFormat(): AcEdKeywordPromptFormat {
    return this._keywords.getPromptFormat()
  }

  /**
   * Sets both the prompt message and the display keywords from a single combined string.
   * This corresponds to `PromptOptions.SetMessageAndKeywords(string messageAndKeywords, string globalKeywords)` in the .NET API.
   *
   * The `messageAndKeywords` string is typically of the form `"Message text [Keyword1/Keyword2/...]"`.
   * The `globalKeywords` parameter is a space-separated list of global keyword names.
   *
   * After calling this, the `message` is updated to the part before the `[ ... ]`, and the `keywords` collection
   * is updated to contain the specified global keywords.
   *
   * @param messageAndKeywords - The combined message and keywords for the prompt.
   * @param globalKeywords - A space-separated string listing the global names of the keywords.
   */
  public setMessageAndKeywords(
    messageAndKeywords: string,
    globalKeywords: string
  ): this {
    if (this._isReadOnly) {
      return this
    }

    // Parse message portion and keyword portion
    // e.g. "Enter option [Yes/No/Default]" → message = "Enter option", display keywords = ["Yes","No","Default"]
    const msgMatch = messageAndKeywords.match(/^(.*?)\s*\[(.*?)\](.*)?$/)
    if (msgMatch) {
      const [, msgPart, kwPart] = msgMatch
      this._message = msgPart.trim()
      if (kwPart !== undefined) {
        // kwPart might be "Yes/No/Default"
        const names = kwPart
          .split('/')
          .map(s => s.trim())
          .filter(s => s.length > 0)
        // Clear existing keywords and add new ones
        this._keywords.clear()
        for (const name of names) {
          // Use globalKeywords to decide which global name to use
          // globalKeywords: e.g. "YES NO DEFAULT"
          // We'll split global keywords by whitespace
          const globalParts = globalKeywords.split(/\s+/)
          // Try to find a matching global name; if not, fallback to name
          let matchedGlobal = globalParts.find(
            g => g.toLowerCase() === name.toLowerCase()
          )
          if (!matchedGlobal) {
            matchedGlobal = name
          }
          this._keywords.add(name, matchedGlobal)
        }
      }
    }
    return this
  }
}
