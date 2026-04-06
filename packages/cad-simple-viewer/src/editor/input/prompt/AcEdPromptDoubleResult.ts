import { AcEdPromptNumericalResult } from './AcEdPromptNumericalResult'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt requesting a double precision floating-point value.
 */
export class AcEdPromptDoubleResult extends AcEdPromptNumericalResult {
  constructor(status: AcEdPromptStatus, value?: number) {
    super(status, value)
  }
}
