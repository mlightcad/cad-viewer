import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

/** CSS custom property for grip square edge length (`GRIPSIZE`). */
export const ML_UI_GRIP_SIZE_VAR = '--ml-ui-grip-size'
/** CSS custom property for idle grip fill (`GRIPCOLOR`). */
export const ML_UI_GRIP_NORMAL_VAR = '--ml-ui-grip-normal'
/** CSS custom property for hover / hot grip fill (`GRIPHOT`). */
export const ML_UI_GRIP_HOT_VAR = '--ml-ui-grip-hot'

/** Fallback grip size in CSS pixels when `GRIPSIZE` is unavailable. */
export const DEFAULT_GRIP_SIZE_PX = 8
/** Fallback idle grip color when `GRIPCOLOR` is unavailable. */
export const DEFAULT_GRIP_COLOR_CSS = '#0080ff'
/** Fallback hover / hot grip color when `GRIPHOT` is unavailable. */
export const DEFAULT_GRIP_HOT_COLOR_CSS = '#ff0000'

/** Visual appearance of grip handles derived from grip system variables. */
export interface AcEdGripAppearance {
  /** Grip square edge length in CSS pixels (`GRIPSIZE`). */
  size: number
  /** CSS color for unheated grips (`GRIPCOLOR`). */
  colorCss: string
  /** CSS color for hot / hovered grips (`GRIPHOT`). */
  hotColorCss: string
}

/**
 * Writes CAD entity square-grip appearance onto a host so `.ml-grip-handle`
 * inherits `GRIPSIZE` / `GRIPCOLOR` / `GRIPHOT`. Overlay measure/markup
 * endpoint circles keep their own colored-dot styling and ignore these vars.
 */
export function applyGripAppearanceToHost(
  host: HTMLElement,
  appearance: AcEdGripAppearance
): void {
  host.style.setProperty(ML_UI_GRIP_SIZE_VAR, `${appearance.size}px`)
  host.style.setProperty(ML_UI_GRIP_NORMAL_VAR, appearance.colorCss)
  host.style.setProperty(ML_UI_GRIP_HOT_VAR, appearance.hotColorCss)
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
  const size = manager.getVar(AcDbSystemVariables.GRIPSIZE, database) as number
  const gripColor = manager.getVar(
    AcDbSystemVariables.GRIPCOLOR,
    database
  ) as number
  const gripHot = manager.getVar(
    AcDbSystemVariables.GRIPHOT,
    database
  ) as number

  return {
    size: size > 0 && Number.isFinite(size) ? size : DEFAULT_GRIP_SIZE_PX,
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
