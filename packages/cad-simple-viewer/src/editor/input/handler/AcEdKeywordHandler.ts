import { AcEdPromptKeywordOptions } from '../prompt/AcEdPromptKeywordOptions'
import { AcEdInputHandler } from './AcEdInputHandler'

/**
 * Validates keyword input according to {@link AcEdPromptKeywordOptions}.
 */
export class AcEdKeywordHandler implements AcEdInputHandler<string> {
  private options: AcEdPromptKeywordOptions

  constructor(options: AcEdPromptKeywordOptions) {
    this.options = options
  }

  parse(value: string): string | null {
    const input = value.trim()

    // 1. ENTER / empty input
    if (input.length === 0) {
      return this.options.allowNone ? null : null
      // returning null signals invalid or none;
      // caller can differentiate based on allowNone
    }

    // 2. Try keyword match (case-insensitive)
    const keyword = this.options.keywords.findByName(input)
    if (keyword) {
      // Return canonical keyword name (AutoCAD-style)
      return keyword.globalName
    }

    // 3. Arbitrary input
    if (this.options.allowArbitraryInput) {
      return input
    }

    // 4. Invalid input
    return null
  }
}
