/**
 * Enumeration of angle units used in AutoCAD drawings.
 *
 * This enum defines the various units that can be used to represent
 * angles in AutoCAD drawings, including degrees, radians, gradians,
 * and surveyor's units.
 */
export enum AcDbAngleUnits {
  /** Decimal degrees (e.g., 45.5°) */
  DecimalDegrees = 0,
  /** Degrees, minutes, and seconds (e.g., 45°30'15") */
  DegreesMinutesSeconds = 1,
  /** Gradians (e.g., 50 grad) */
  Gradians = 2,
  /** Radians (e.g., 0.785 rad) */
  Radians = 3,
  /** Surveyor's units (e.g., N45d30'15"E) */
  SurveyorsUnits = 4
}
