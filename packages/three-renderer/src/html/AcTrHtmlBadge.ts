import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/** Reference font size used to author px padding / radius on measure badges. */
export const AC_TR_HTML_BADGE_REF_FONT_PX = 13
/** Vertical padding at {@link AC_TR_HTML_BADGE_REF_FONT_PX}. */
export const AC_TR_HTML_BADGE_PAD_Y_PX = 3
/** Horizontal padding at {@link AC_TR_HTML_BADGE_REF_FONT_PX}. */
export const AC_TR_HTML_BADGE_PAD_X_PX = 14
/** Border-radius at {@link AC_TR_HTML_BADGE_REF_FONT_PX}. */
export const AC_TR_HTML_BADGE_RADIUS_PX = 20
/** Border width at {@link AC_TR_HTML_BADGE_REF_FONT_PX}. */
export const AC_TR_HTML_BADGE_BORDER_PX = 1

/**
 * Options for a capsule / label badge.
 */
export interface AcTrHtmlBadgeOptions extends AcTrHtmlElementOptions {
  /** Label text and capsule border color */
  color: AcCmColor
  /** Badge text content */
  text?: string
  /** CSS font size in pixels (default 13). */
  fontSize?: number
  /**
   * CSS `transform` for the badge element.
   * Defaults to centering via `translate(-50%, -50%)`.
   */
  transform?: string
}

/**
 * Capsule-shaped HTML label used for overlay text (e.g. measurement results).
 *
 * Padding and radius use `em` so the capsule scales with {@link setFontSize}.
 */
export class AcTrHtmlBadge extends AcTrHtmlElement {
  constructor(options: AcTrHtmlBadgeOptions) {
    super(
      AcTrHtmlBadge.createElement(
        options.color,
        options.text ?? '',
        options.fontSize,
        options.transform
      ),
      { ...options, scaleWithView: options.scaleWithView ?? true }
    )
  }

  /** Update the badge label text. */
  setText(text: string): void {
    this.element.textContent = text
  }

  /** Update the badge font size (CSS px); capsule padding tracks via `em`. */
  setFontSize(fontSize: number): void {
    if (!(fontSize > 0)) return
    this.element.style.fontSize = `${fontSize}px`
  }

  /** Update the badge text color and matching capsule border. */
  setColor(color: AcCmColor): void {
    const css = acTrHtmlCssColor(color)
    this.element.style.color = css
    this.element.style.borderColor = css
  }

  private static createElement(
    color: AcCmColor,
    text: string,
    fontSize?: number,
    transform?: string
  ): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-badge'
    el.textContent = text
    const css = acTrHtmlCssColor(color)
    const size =
      fontSize != null && fontSize > 0 ? fontSize : AC_TR_HTML_BADGE_REF_FONT_PX
    const padY = AC_TR_HTML_BADGE_PAD_Y_PX / AC_TR_HTML_BADGE_REF_FONT_PX
    const padX = AC_TR_HTML_BADGE_PAD_X_PX / AC_TR_HTML_BADGE_REF_FONT_PX
    const radius = AC_TR_HTML_BADGE_RADIUS_PX / AC_TR_HTML_BADGE_REF_FONT_PX
    const border = AC_TR_HTML_BADGE_BORDER_PX / AC_TR_HTML_BADGE_REF_FONT_PX
    el.style.cssText =
      `background:var(--ml-ui-bg, rgba(255,255,255,0.95));color:${css};` +
      `border:${border}em solid ${css};box-sizing:border-box;` +
      `font-size:${size}px;font-family:sans-serif;font-weight:500;` +
      `padding:${padY}em ${padX}em;border-radius:${radius}em;pointer-events:none;` +
      `transform:${transform ?? 'translate(-50%,-50%)'};white-space:nowrap;` +
      'box-shadow:var(--ml-ui-shadow, 0 1px 4px rgba(0,0,0,0.2));'
    return el
  }
}
