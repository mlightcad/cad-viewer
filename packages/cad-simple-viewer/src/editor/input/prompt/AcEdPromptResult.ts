import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Base class for a prompt result, similar to `Autodesk.AutoCAD.EditorInput.PromptResult`.
 * This class encapsulates common information returned by prompt methods.
 */
export class AcEdPromptResult {
  /**
   * The status of the prompt (e.g. OK, Cancel, Error).
   * Modeled on `PromptStatus` in the AutoCAD .NET API.
   */
  status: AcEdPromptStatus

  /**
   * An optional string result.
   * This is typically set when `status` is `Keyword` or when the prompt
   * returns a string as its primary result.
   * Corresponds to `PromptResult.StringResult` in the .NET API.
   */
  stringResult?: string

  /**
   * Constructs a new `AcEdPromptResult`.
   * @param status The prompt status.
   * @param stringResult Optional string result.
   * @param message Optional message.
   */
  constructor(status: AcEdPromptStatus, stringResult?: string) {
    this.status = status
    this.stringResult = stringResult
  }
}
