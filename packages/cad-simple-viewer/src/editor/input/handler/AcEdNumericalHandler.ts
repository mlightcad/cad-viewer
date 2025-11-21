import { AcEdPromptNumericalOptions } from '../prompt/AcEdPromptNumericalOptions'
import { AcEdInputHandler } from './AcEdInputHandler'

/**
 * Handles validation and parsing of numerical user input.
 */
export class AcEdNumericalHandler implements AcEdInputHandler<number> {
  protected options: AcEdPromptNumericalOptions

  constructor(options: AcEdPromptNumericalOptions) {
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
}
