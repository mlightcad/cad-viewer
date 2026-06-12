import { AcEdPromptAngleOptions } from '../prompt/AcEdPromptAngleOptions'
import { AcEdInputHandler, AcEdPointInputContext } from './AcEdInputHandler'

/**
 * Validates angular numeric input.
 * Uses degrees. Fully compatible with PromptAngleOptions behavior in AutoCAD.
 */
export class AcEdAngleHandler implements AcEdInputHandler<number> {
  private options: AcEdPromptAngleOptions // same structure as double options

  constructor(options: AcEdPromptAngleOptions) {
    this.options = options
  }

  parse(value: string) {
    const n = Number(value)

    if (isNaN(n)) {
      return null
    }

    if (!this.options.allowNegative && n < 0) {
      return null
    }

    if (!this.options.allowZero && n === 0) {
      return null
    }

    return n
  }

  parseCommandLine(token: string, _context?: AcEdPointInputContext) {
    const trimmed = token.trim()
    if (!trimmed) return null
    return this.parse(trimmed)
  }
}
