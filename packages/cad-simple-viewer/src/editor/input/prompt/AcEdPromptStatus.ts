/**
 * Enumeration that represents the status of a prompt operation, modeled
 * after `Autodesk.AutoCAD.EditorInput.PromptStatus`.
 * These values correspond to return codes from AutoCAD prompt routines.
 */
export enum AcEdPromptStatus {
  /** User canceled the request (e.g., pressed Ctrl-C) */
  Cancel = -5002,
  /** Generic non-specific error */
  Error = -5001,
  /** The user entered a keyword (e.g. from a keyword list) */
  Keyword = -5005,
  /** Modeless prompt status */
  Modeless = 0x13a3,
  /** No result (e.g., no input) */
  None = 0x1388,
  /** OK / successful prompt (user accepted) */
  OK = 0x13ec,
  /** Other – a status outside of the default list */
  Other = 0x13a4
}
