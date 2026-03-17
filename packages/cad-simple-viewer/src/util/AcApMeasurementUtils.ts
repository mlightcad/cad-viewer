import {
  AcCmColor,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager} from '@mlightcad/data-model'

/** Returns the current measurement overlay color from the MEASUREMENTCOLOR system variable. */
export function measurementColor(db: AcDbDatabase): AcCmColor {
  return AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.MEASUREMENTCOLOR,
    db
  ) as AcCmColor
}

/** Converts an AcCmColor to a CSS rgb() string. */
export function colorToCss(c: AcCmColor): string {
  return `rgb(${c.red}, ${c.green}, ${c.blue})`
}

/** Converts an AcCmColor to a CSS rgba() string. */
export function colorToCssAlpha(c: AcCmColor, alpha: number): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${alpha})`
}

/** Creates a small dot element for marking world points. */
export function makeDot(c: AcCmColor): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText =
    'width:12px;height:12px;border-radius:50%;' +
    `background:${colorToCss(c)};border:2px solid white;box-sizing:border-box;` +
    'pointer-events:none;transform:translate(-50%,-50%);'
  return el
}

/** Creates a badge element for displaying measurement values. */
export function makeBadge(c: AcCmColor, text = ''): HTMLDivElement {
  const el = document.createElement('div')
  el.textContent = text
  el.style.cssText =
    `background:rgba(255,255,255,0.95);color:${colorToCss(c)};` +
    'font-size:13px;font-family:sans-serif;font-weight:500;' +
    'padding:3px 14px;border-radius:20px;pointer-events:none;' +
    'transform:translate(-50%,-50%);white-space:nowrap;' +
    'box-shadow:0 1px 4px rgba(0,0,0,0.2);'
  return el
}
