import { AcCmColor } from '@mlightcad/data-model'

/** Converts an AcCmColor to a CSS color string, with rgb() fallback. */
export function acTrHtmlCssColor(c: AcCmColor): string {
  return c.cssColor ?? `rgb(${c.red}, ${c.green}, ${c.blue})`
}

/** Converts an AcCmColor to a CSS rgba() string. */
export function acTrHtmlCssColorAlpha(c: AcCmColor, alpha: number): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${alpha})`
}
