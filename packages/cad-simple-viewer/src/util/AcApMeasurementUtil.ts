import {
  AcCmColor,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

/** Returns the current measurement overlay color from the MEASUREMENTCOLOR system variable. */
export function measurementColor(db: AcDbDatabase): AcCmColor {
  return AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.MEASUREMENTCOLOR,
    db
  ) as AcCmColor
}

/** Converts an AcCmColor to a CSS rgba() string. */
export function colorToCssAlpha(c: AcCmColor, alpha: number): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${alpha})`
}

/** Returns the CSS color string for a measurement color, with fallback. */
export function cssColor(c: AcCmColor): string {
  return c.cssColor ?? `rgb(${c.red}, ${c.green}, ${c.blue})`
}
