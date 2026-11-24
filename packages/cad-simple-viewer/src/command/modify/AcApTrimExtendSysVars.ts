import {
  AcDbDatabase,
  AcDbSysVarDescriptor,
  AcDbSysVarManager
} from '@mlightcad/data-model'

/**
 * Names of the AutoCAD system variables that drive TRIM and EXTEND.
 *
 * - `TRIMEXTENDMODE`: `1` = Quick mode (default; every object is a cutting /
 *   boundary edge), `0` = Standard mode (select the edges first).
 * - `EDGEMODE`: `0` = use edges as they are (default), `1` = treat edges as
 *   extended to their natural geometry (infinite line, full circle). Applies
 *   to Standard mode, as in AutoCAD.
 * - `PROJMODE`: `0` = true 3D intersections, `1` = project onto the current
 *   UCS XY plane (default), `2` = project onto the current view plane.
 * - `TRIMEDGES`: `1` = in Quick mode a hatch is an edge only through its
 *   boundary (default), `0` = the hatch pattern lines are edges too.
 * - `COMMANDPREVIEW`: `1` = show the result of a pick while hovering
 *   (default), `0` = no preview. Shared with other commands; newer
 *   `@mlightcad/data-model` releases register it themselves.
 */
export const AcApTrimExtendSysVars = {
  TRIMEXTENDMODE: 'TRIMEXTENDMODE',
  EDGEMODE: 'EDGEMODE',
  PROJMODE: 'PROJMODE',
  TRIMEDGES: 'TRIMEDGES',
  COMMANDPREVIEW: 'COMMANDPREVIEW'
} as const

/** Integer range and default of each TRIM / EXTEND system variable. */
const RANGES: Record<
  keyof typeof AcApTrimExtendSysVars,
  { min: number; max: number; defaultValue: number }
> = {
  TRIMEXTENDMODE: { min: 0, max: 1, defaultValue: 1 },
  EDGEMODE: { min: 0, max: 1, defaultValue: 0 },
  PROJMODE: { min: 0, max: 2, defaultValue: 1 },
  TRIMEDGES: { min: 0, max: 1, defaultValue: 1 },
  COMMANDPREVIEW: { min: 0, max: 1, defaultValue: 1 }
}

const DESCRIPTIONS: Record<keyof typeof AcApTrimExtendSysVars, string> = {
  TRIMEXTENDMODE:
    'TRIM / EXTEND input mode: 1 = Quick (all objects are edges), 0 = Standard.',
  EDGEMODE:
    'TRIM / EXTEND edges: 0 = use edges as they are, 1 = extend edges to their natural geometry.',
  PROJMODE:
    'TRIM / EXTEND projection: 0 = none (true 3D), 1 = current UCS, 2 = current view.',
  TRIMEDGES:
    'TRIM / EXTEND Quick mode hatches: 1 = hatch boundaries only, 0 = hatch pattern lines too.',
  COMMANDPREVIEW: 'Command result preview: 1 = on, 0 = off.'
}

/**
 * Registers the TRIM / EXTEND system variables with the system variable
 * manager. Idempotent: variables the data model already defines are kept.
 *
 * Like AutoCAD, they are not stored in the drawing, so they keep their value
 * across documents for the session. `AcApDocManager` calls this before it
 * turns every registered variable into a command, so typing the name (or
 * SETVAR) changes it.
 */
export function acapRegisterTrimExtendSysVars() {
  const manager = AcDbSysVarManager.instance()
  const names = Object.keys(
    AcApTrimExtendSysVars
  ) as (keyof typeof AcApTrimExtendSysVars)[]
  names.forEach(name => {
    if (manager.getDescriptor(name)) return
    const descriptor: AcDbSysVarDescriptor = {
      name,
      type: 'number',
      isDbVar: false,
      description: DESCRIPTIONS[name],
      defaultValue: RANGES[name].defaultValue
    }
    manager.registerVar(descriptor)
  })
}

/**
 * Reads one TRIM / EXTEND system variable as a valid integer. Values outside
 * the variable's range (the generic SETVAR command does not validate custom
 * variables) read as the default.
 */
export function acapGetTrimExtendSysVar(
  name: keyof typeof AcApTrimExtendSysVars,
  db: AcDbDatabase
): number {
  acapRegisterTrimExtendSysVars()
  const { min, max, defaultValue } = RANGES[name]
  const raw = Number(AcDbSysVarManager.instance().getVar(name, db))
  if (!Number.isFinite(raw)) return defaultValue
  const value = Math.trunc(raw)
  return value < min || value > max ? defaultValue : value
}

/** Writes one TRIM / EXTEND system variable (no-op when unchanged). */
export function acapSetTrimExtendSysVar(
  name: keyof typeof AcApTrimExtendSysVars,
  value: number,
  db: AcDbDatabase
) {
  acapRegisterTrimExtendSysVars()
  const manager = AcDbSysVarManager.instance()
  if (manager.getVar(name, db) === value) return
  manager.setVar(name, value, db)
}
