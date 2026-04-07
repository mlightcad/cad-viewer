import { AcEdSelectionSet } from '../AcEdSelectionSet'
import { AcEdPromptResult } from './AcEdPromptResult'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt that requests a selection set.
 */
export class AcEdPromptSelectionResult extends AcEdPromptResult {
  /** Gets the SelectionSet that the user selected. */
  readonly value?: AcEdSelectionSet

  constructor(
    status: AcEdPromptStatus,
    value?: AcEdSelectionSet,
    stringResult?: string
  ) {
    super(status, stringResult)
    this.value = value
  }
}
