import {
  ACDB_COMPAREHATCH_DEFAULT,
  ACDB_COMPAREPROPS_COLOR,
  ACDB_COMPAREPROPS_DEFAULT,
  ACDB_COMPAREPROPS_LAYER,
  ACDB_COMPAREPROPS_LINETYPE,
  ACDB_COMPAREPROPS_LINETYPESCALE,
  ACDB_COMPAREPROPS_LINEWEIGHT,
  ACDB_COMPAREPROPS_THICKNESS,
  ACDB_COMPAREPROPS_TRANSPARENCY,
  ACDB_COMPARERCMARGIN_DEFAULT,
  ACDB_COMPARERCMARGIN_MAX,
  ACDB_COMPARERCMARGIN_MIN,
  ACDB_COMPARETEXT_DEFAULT,
  ACDB_COMPARETOLERANCE_DEFAULT,
  ACDB_COMPARETOLERANCE_MAX,
  ACDB_COMPARETOLERANCE_MIN,
  type AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

/**
 * Coerces a COMPARE constant to a finite integer.
 *
 * Jest loads `@mlightcad/data-model` through its CJS build. When that bundle
 * is older than `lib/`, named COMPARE exports are `undefined` and would
 * otherwise collapse fingerprints to `NaN`.
 */
function compareConst(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

/** COMPAREPROPS Color bit (`1`). */
export const ACAP_COMPAREPROPS_COLOR = compareConst(ACDB_COMPAREPROPS_COLOR, 1)
/** COMPAREPROPS Layer bit (`2`). */
export const ACAP_COMPAREPROPS_LAYER = compareConst(ACDB_COMPAREPROPS_LAYER, 2)
/** COMPAREPROPS Linetype bit (`4`). */
export const ACAP_COMPAREPROPS_LINETYPE = compareConst(
  ACDB_COMPAREPROPS_LINETYPE,
  4
)
/** COMPAREPROPS Linetype scale bit (`8`). */
export const ACAP_COMPAREPROPS_LINETYPESCALE = compareConst(
  ACDB_COMPAREPROPS_LINETYPESCALE,
  8
)
/** COMPAREPROPS Lineweight bit (`16`). */
export const ACAP_COMPAREPROPS_LINEWEIGHT = compareConst(
  ACDB_COMPAREPROPS_LINEWEIGHT,
  16
)
/** COMPAREPROPS Transparency bit (`32`). */
export const ACAP_COMPAREPROPS_TRANSPARENCY = compareConst(
  ACDB_COMPAREPROPS_TRANSPARENCY,
  32
)
/** COMPAREPROPS Thickness bit (`64`). */
export const ACAP_COMPAREPROPS_THICKNESS = compareConst(
  ACDB_COMPAREPROPS_THICKNESS,
  64
)

/** AutoCAD COMPAREPROPS default (`0`). */
export const ACAP_COMPAREPROPS_DEFAULT = compareConst(
  ACDB_COMPAREPROPS_DEFAULT,
  0
)
/** AutoCAD COMPAREHATCH default (`0`). */
export const ACAP_COMPAREHATCH_DEFAULT = compareConst(
  ACDB_COMPAREHATCH_DEFAULT,
  0
)
/** AutoCAD COMPARERCMARGIN default (`5`). */
export const ACAP_COMPARERCMARGIN_DEFAULT = compareConst(
  ACDB_COMPARERCMARGIN_DEFAULT,
  5
)
/** AutoCAD COMPARERCMARGIN minimum (`1`). */
export const ACAP_COMPARERCMARGIN_MIN = compareConst(ACDB_COMPARERCMARGIN_MIN, 1)
/** AutoCAD COMPARERCMARGIN maximum (`25`). */
export const ACAP_COMPARERCMARGIN_MAX = compareConst(
  ACDB_COMPARERCMARGIN_MAX,
  25
)
/** AutoCAD COMPARETEXT default (`1`). */
export const ACAP_COMPARETEXT_DEFAULT = compareConst(ACDB_COMPARETEXT_DEFAULT, 1)
/** AutoCAD COMPARETOLERANCE default (`6`). */
export const ACAP_COMPARETOLERANCE_DEFAULT = compareConst(
  ACDB_COMPARETOLERANCE_DEFAULT,
  6
)
/** AutoCAD COMPARETOLERANCE minimum (`0`). */
export const ACAP_COMPARETOLERANCE_MIN = compareConst(
  ACDB_COMPARETOLERANCE_MIN,
  0
)
/** AutoCAD COMPARETOLERANCE maximum (`14`). */
export const ACAP_COMPARETOLERANCE_MAX = compareConst(
  ACDB_COMPARETOLERANCE_MAX,
  14
)

/**
 * AutoCAD COMPARE system variables that control drawing comparison.
 *
 * @see https://help.autodesk.com/view/ACD/2025/ENU/?guid=GUID-2D69E78D-5C82-464F-B864-CD29D5720EB9
 */
export interface AcApDiffCompareSysVars {
  /**
   * COMPAREPROPS bitcode. `0` ignores object property changes (AutoCAD default).
   * Saved in the registry.
   */
  compareprops: number
  /** COMPAREHATCH. `0` excludes hatches (AutoCAD default). Saved in the drawing. */
  comparehatch: number
  /**
   * COMPARERCMARGIN. Offset between a change-set boundary and its revision
   * cloud. Range 1–25; AutoCAD default is 5. Saved in the drawing.
   */
  comparercmargin: number
  /** COMPARETEXT. `1` includes text objects (AutoCAD default). Saved in the drawing. */
  comparetext: number
  /**
   * COMPARETOLERANCE. Decimal places used as geometric precision. Range 0–14;
   * AutoCAD default is 6. Saved in the drawing.
   */
  comparetolerance: number
}

/** Coerces a sysvar read into an integer, falling back to `fallback`. */
function asInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

/**
 * AutoCAD default COMPARE sysvar values.
 *
 * COMPAREPROPS uses the registry default when the cache is empty.
 */
export function acapDefaultCompareSysVars(): AcApDiffCompareSysVars {
  const mgr = AcDbSysVarManager.instance()
  return {
    compareprops: asInt(
      mgr.getDefaultValue(AcDbSystemVariables.COMPAREPROPS),
      ACAP_COMPAREPROPS_DEFAULT
    ),
    comparehatch: asInt(
      mgr.getDefaultValue(AcDbSystemVariables.COMPAREHATCH),
      ACAP_COMPAREHATCH_DEFAULT
    ),
    comparercmargin: asInt(
      mgr.getDefaultValue(AcDbSystemVariables.COMPARERCMARGIN),
      ACAP_COMPARERCMARGIN_DEFAULT
    ),
    comparetext: asInt(
      mgr.getDefaultValue(AcDbSystemVariables.COMPARETEXT),
      ACAP_COMPARETEXT_DEFAULT
    ),
    comparetolerance: asInt(
      mgr.getDefaultValue(AcDbSystemVariables.COMPARETOLERANCE),
      ACAP_COMPARETOLERANCE_DEFAULT
    )
  }
}

/**
 * Reads COMPARE sysvars the way AutoCAD COMPARE does.
 *
 * COMPAREPROPS is registry-saved and is read from {@link AcDbSysVarManager}
 * (any open database is enough to satisfy the API). Drawing-saved variables
 * come from `currentDb` (the left / current drawing), falling back to
 * `otherDb`, then AutoCAD defaults.
 *
 * @param currentDb - Current (left / old) drawing.
 * @param otherDb - Comparison (right / new) drawing.
 */
export function acapReadCompareSysVars(
  currentDb?: AcDbDatabase,
  otherDb?: AcDbDatabase
): AcApDiffCompareSysVars {
  const mgr = AcDbSysVarManager.instance()
  const defaults = acapDefaultCompareSysVars()
  const registryDb = currentDb ?? otherDb
  const drawingDb = currentDb ?? otherDb
  return {
    compareprops: registryDb
      ? asInt(
          mgr.getVar(AcDbSystemVariables.COMPAREPROPS, registryDb),
          defaults.compareprops
        )
      : defaults.compareprops,
    comparehatch: drawingDb
      ? asInt(
          mgr.getVar(AcDbSystemVariables.COMPAREHATCH, drawingDb),
          defaults.comparehatch
        )
      : defaults.comparehatch,
    comparercmargin: drawingDb
      ? asInt(
          mgr.getVar(AcDbSystemVariables.COMPARERCMARGIN, drawingDb),
          defaults.comparercmargin
        )
      : defaults.comparercmargin,
    comparetext: drawingDb
      ? asInt(
          mgr.getVar(AcDbSystemVariables.COMPARETEXT, drawingDb),
          defaults.comparetext
        )
      : defaults.comparetext,
    comparetolerance: drawingDb
      ? asInt(
          mgr.getVar(AcDbSystemVariables.COMPARETOLERANCE, drawingDb),
          defaults.comparetolerance
        )
      : defaults.comparetolerance
  }
}

/**
 * Writes COMPARE sysvars onto open drawings.
 *
 * COMPAREPROPS is registry-saved (one write via the first database). Drawing
 * variables are written to every provided database so both panes stay in sync.
 *
 * @param vars - Values to persist.
 * @param databases - Open drawing databases (left and/or right).
 */
export function acapWriteCompareSysVars(
  vars: AcApDiffCompareSysVars,
  databases: readonly AcDbDatabase[]
): void {
  if (databases.length === 0) return
  const mgr = AcDbSysVarManager.instance()
  const first = databases[0]!
  mgr.setVar(AcDbSystemVariables.COMPAREPROPS, vars.compareprops, first)
  for (const db of databases) {
    mgr.setVar(AcDbSystemVariables.COMPAREHATCH, vars.comparehatch, db)
    mgr.setVar(AcDbSystemVariables.COMPARERCMARGIN, vars.comparercmargin, db)
    mgr.setVar(AcDbSystemVariables.COMPARETEXT, vars.comparetext, db)
    mgr.setVar(AcDbSystemVariables.COMPARETOLERANCE, vars.comparetolerance, db)
  }
}

/**
 * Converts COMPARETOLERANCE (decimal places 0–14) to an absolute distance.
 *
 * AutoCAD treats objects as identical when they differ by at most this
 * precision: `6` → `1e-6`.
 *
 * @param places - COMPARETOLERANCE value.
 */
export function acapToleranceFromCompareTolerance(places: number): number {
  const n = compareConst(places, ACAP_COMPARETOLERANCE_DEFAULT)
  const clamped = Math.max(
    ACAP_COMPARETOLERANCE_MIN,
    Math.min(ACAP_COMPARETOLERANCE_MAX, n)
  )
  return 10 ** -clamped
}
