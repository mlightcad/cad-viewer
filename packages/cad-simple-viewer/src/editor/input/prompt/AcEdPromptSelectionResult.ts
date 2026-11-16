import { AcEdSelectionSet } from '../AcEdSelectionSet.js'
import { AcEdPromptResult } from './AcEdPromptResult.js'
import { AcEdPromptStatus } from './AcEdPromptStatus.js'

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
