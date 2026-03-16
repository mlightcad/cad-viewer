import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'

/** Default blue color for measurement overlays. */
export function blueColor(): AcCmColor {
  return new AcCmColor(AcCmColorMethod.ByColor).setRGB(96, 165, 250)
}

/** Creates a small blue dot element for marking world points. */
export function makeDot(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText =
    'width:12px;height:12px;border-radius:50%;' +
    'background:#60a5fa;border:2px solid white;box-sizing:border-box;' +
    'pointer-events:none;transform:translate(-50%,-50%);'
  return el
}

/** Creates a badge element for displaying measurement values. */
export function makeBadge(text = ''): HTMLDivElement {
  const el = document.createElement('div')
  el.textContent = text
  el.style.cssText =
    'background:rgba(255,255,255,0.95);color:#1e40af;' +
    'font-size:13px;font-family:sans-serif;font-weight:500;' +
    'padding:3px 14px;border-radius:20px;pointer-events:none;' +
    'transform:translate(-50%,-50%);white-space:nowrap;' +
    'box-shadow:0 1px 4px rgba(0,0,0,0.2);'
  return el
}
