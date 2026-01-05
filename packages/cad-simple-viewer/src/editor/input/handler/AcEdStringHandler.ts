import { AcEdPromptStringOptions } from '../prompt/AcEdPromptStringOptions'
import { AcEdInputHandler } from './AcEdInputHandler'

/**
 * Validates string input according to {@link AcEdPromptStringOptions}.
 * Supports empty string rules and maximum length.
 */
export class AcEdStringHandler implements AcEdInputHandler<string> {
  private options: AcEdPromptStringOptions

  constructor(options: AcEdPromptStringOptions) {
    this.options = options
  }

  parse(value: string) {
    if (!this.options.allowSpaces && value.includes(' ')) {
      return null
    }

    if (!this.options.allowEmpty && value.length === 0) {
      return null
    }

    if (this.options.maxLength && value.length > this.options.maxLength) {
      return null
    }

    return value
  }
}
