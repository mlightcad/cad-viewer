import { AcGePoint2dLike } from '@mlightcad/data-model'

import { AcEdPromptResult } from './AcEdPromptResult'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt that requests a **point**.
 *
 * This mirrors `Autodesk.AutoCAD.EditorInput.PromptPointResult`.
 */
export class AcEdPromptPointResult extends AcEdPromptResult {
  /**
   * The 3D point returned by the prompt.
   * Corresponds to .NET's `PromptPointResult.Value`.
   *
   * Valid only when `status === AcEdPromptStatus.OK`.
   */
  readonly value?: AcGePoint2dLike

  /**
   * Constructs a new result for a point prompt.
   *
   * @param status The status of the prompt (OK, Cancel, Error, etc.)
   * @param value The point returned (valid only on OK)
   */
  constructor(status: AcEdPromptStatus, value?: AcGePoint2dLike) {
    super(status, undefined)
    this.value = value
  }
}
