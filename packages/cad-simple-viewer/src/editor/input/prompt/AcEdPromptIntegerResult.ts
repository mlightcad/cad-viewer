import { AcEdPromptNumericalResult } from './AcEdPromptNumericalResult.js'
import { AcEdPromptStatus } from './AcEdPromptStatus.js'

/**
 * Result of a prompt requesting an integer value.
 */
export class AcEdPromptIntegerResult extends AcEdPromptNumericalResult {
  constructor(status: AcEdPromptStatus, value?: number) {
    super(status, value)
  }
}
