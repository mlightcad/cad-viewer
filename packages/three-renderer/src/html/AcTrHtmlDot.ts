import { AcCmColor } from '@mlightcad/data-model'

import { AC_TR_HTML_BADGE_REF_FONT_PX } from './AcTrHtmlBadge'
import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/** Dot diameter as a fraction of the paired badge font size. */
export const AC_TR_HTML_DOT_SIZE_EM = 0.55
/** Dot border width as a fraction of the paired badge font size. */
export const AC_TR_HTML_DOT_BORDER_EM = 0.12

/**
 * Options for an endpoint / marker dot.
 */
export interface AcTrHtmlDotOptions extends AcTrHtmlElementOptions {
  /** Marker fill color */
  color: AcCmColor
  /**
   * CSS font size used as the em root for diameter / border.
   * Defaults to {@link AC_TR_HTML_BADGE_REF_FONT_PX}.
   */
  fontSize?: number
}

/**
 * Small circular HTML marker used as an overlay endpoint.
 *
 * Diameter and border use `em` so the marker tracks the measurement / markup
 * badge font size (including Fit-to-screen clamps).
 */
export class AcTrHtmlDot extends AcTrHtmlElement {
  constructor(options: AcTrHtmlDotOptions) {
    super(AcTrHtmlDot.createElement(options.color, options.fontSize), {
      ...options,
      scaleWithView: options.scaleWithView ?? true
    })
  }

  /** Update the marker fill color. */
  setColor(color: AcCmColor): void {
    this.element.style.background = acTrHtmlCssColor(color)
  }

  /**
   * Update the em root so diameter / border stay proportional to the badge font.
   */
  setFontSize(fontSize: number): void {
    if (!(fontSize > 0)) return
    this.element.style.fontSize = `${fontSize}px`
  }

  private static createElement(
    color: AcCmColor,
    fontSize?: number
  ): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-dot'
    const size =
      fontSize != null && fontSize > 0 ? fontSize : AC_TR_HTML_BADGE_REF_FONT_PX
    el.style.cssText =
      `font-size:${size}px;` +
      `width:${AC_TR_HTML_DOT_SIZE_EM}em;height:${AC_TR_HTML_DOT_SIZE_EM}em;` +
      'min-width:5px;min-height:5px;border-radius:50%;' +
      `background:${acTrHtmlCssColor(color)};` +
      `border:${AC_TR_HTML_DOT_BORDER_EM}em solid var(--ml-ui-border, #fff);` +
      'box-sizing:border-box;pointer-events:none;transform:translate(-50%,-50%);'
    return el
  }
}
