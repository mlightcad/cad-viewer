import { AcEdSelectionSet } from '../AcEdSelectionSet'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt that requests a selection set.
 */
export class AcEdPromptSelectionResult {
  /** Gets the status result of the prompt operation. */
  readonly status: AcEdPromptStatus
  /** Gets the SelectionSet that the user selected. */
  readonly value?: AcEdSelectionSet

  constructor(status: AcEdPromptStatus, value?: AcEdSelectionSet) {
    this.status = status
    this.value = value
  }
}
