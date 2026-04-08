import { AcGeBox2d } from '@mlightcad/data-model'

import { AcEdPromptResult } from './AcEdPromptResult'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt that requests a rectangular box.
 */
export class AcEdPromptBoxResult extends AcEdPromptResult {
  /** Gets the rectangular bounding box that the user specified. */
  readonly value?: AcGeBox2d

  constructor(
    status: AcEdPromptStatus,
    value?: AcGeBox2d,
    stringResult?: string
  ) {
    super(status, stringResult)
    this.value = value
  }
}
