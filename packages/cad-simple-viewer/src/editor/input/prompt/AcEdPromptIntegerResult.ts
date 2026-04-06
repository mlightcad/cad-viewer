import { AcEdPromptNumericalResult } from './AcEdPromptNumericalResult'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt requesting an integer value.
 */
export class AcEdPromptIntegerResult extends AcEdPromptNumericalResult {
  constructor(status: AcEdPromptStatus, value?: number) {
    super(status, value)
  }
}
