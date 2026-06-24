import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

/** Visual appearance of grip handles derived from grip system variables. */
export interface AcEdGripAppearance {
  /** Grip square edge length in CSS pixels (`GRIPSIZE`). */
  size: number
  /** CSS color for unheated grips (`GRIPCOLOR`). */
  colorCss: string
  /** CSS color for hot / hovered grips (`GRIPHOT`). */
  hotColorCss: string
}

function aciIndexToCss(index: number): string {
  const color = new AcCmColor(AcCmColorMethod.ByACI, index)
  return color.cssColor ?? `rgb(${color.red}, ${color.green}, ${color.blue})`
}

/**
 * Reads grip appearance from `GRIPSIZE`, `GRIPCOLOR`, and `GRIPHOT`.
 */
export function readGripAppearance(database: AcDbDatabase): AcEdGripAppearance {
  const manager = AcDbSysVarManager.instance()
  const size = manager.getVar(
    AcDbSystemVariables.GRIPSIZE,
    database
  ) as number
  const gripColor = manager.getVar(
    AcDbSystemVariables.GRIPCOLOR,
    database
  ) as number
  const gripHot = manager.getVar(
    AcDbSystemVariables.GRIPHOT,
    database
  ) as number

  return {
    size,
    colorCss: aciIndexToCss(gripColor),
    hotColorCss: aciIndexToCss(gripHot)
  }
}

/** Sysvar names that affect grip handle appearance or visibility. */
export const GRIP_APPEARANCE_SYSVARS = new Set([
  AcDbSystemVariables.GRIPSIZE.toLowerCase(),
  AcDbSystemVariables.GRIPCOLOR.toLowerCase(),
  AcDbSystemVariables.GRIPHOT.toLowerCase()
])

export function isGripAppearanceSysVar(name: string): boolean {
  return GRIP_APPEARANCE_SYSVARS.has(name.toLowerCase())
}
