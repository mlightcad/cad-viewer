import { AcEdPromptIntegerOptions } from '../prompt/AcEdPromptIntegerOptions.js'
import { AcEdNumericalHandler } from './AcEdNumericalHandler.js'

/**
 * Handles validation and parsing of integer user input.
 */
export class AcEdIntegerHandler extends AcEdNumericalHandler {
  declare protected options: AcEdPromptIntegerOptions

  constructor(options: AcEdPromptIntegerOptions) {
    super(options)
  }

  parse(value: string) {
    const n = super.parse(value)
    if (n == null) {
      return n
    }

    if (!Number.isInteger(n)) {
      return null
    }

    if (this.options.lowerLimit !== undefined && n < this.options.lowerLimit) {
      return null
    }

    if (this.options.upperLimit !== undefined && n > this.options.upperLimit) {
      return null
    }

    return n
  }
}
