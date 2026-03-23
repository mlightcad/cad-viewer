/**
 * @enum AcCmColorMethod
 * Represents the method used to determine an entity's color in AutoCAD.
 */
export enum AcCmColorMethod {
  /** Explicit RGB color */
  ByColor = 1,

  /** AutoCAD Color Index (ACI) */
  ByACI = 2,

  /** Color inherited from the entity's layer */
  ByLayer = 3,

  /** Color inherited from the entity's block */
  ByBlock = 4,

  /** Uninitialised or invalid color state */
  None = 0
}
