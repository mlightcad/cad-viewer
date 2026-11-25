import { AcGeBox2d } from '@mlightcad/data-model'

import type { AcEdSelectionMode } from '../../view/AcEdBaseView.js'
import { AcEdPromptResult } from './AcEdPromptResult.js'
import { AcEdPromptStatus } from './AcEdPromptStatus.js'

/**
 * Result of a prompt that requests a rectangular box.
 */
export class AcEdPromptBoxResult extends AcEdPromptResult {
  /** Gets the rectangular bounding box that the user specified. */
  readonly value?: AcGeBox2d
  /**
   * Window vs crossing from drag direction (left-to-right = window,
   * right-to-left = crossing). Undefined when the prompt did not complete
   * with a box.
   */
  readonly mode?: AcEdSelectionMode

  constructor(
    status: AcEdPromptStatus,
    value?: AcGeBox2d,
    stringResult?: string,
    mode?: AcEdSelectionMode
  ) {
    super(status, stringResult)
    this.value = value
    this.mode = mode
  }
}
