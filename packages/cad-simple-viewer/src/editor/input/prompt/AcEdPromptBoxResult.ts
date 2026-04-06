import { AcGeBox2d } from '@mlightcad/data-model'

import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt that requests a rectangular box.
 */
export class AcEdPromptBoxResult {
  /** Gets the status result of the prompt operation. */
  readonly status: AcEdPromptStatus
  /** Gets the rectangular bounding box that the user specified. */
  readonly value?: AcGeBox2d

  constructor(status: AcEdPromptStatus, value?: AcGeBox2d) {
    this.status = status
    this.value = value
  }
}
