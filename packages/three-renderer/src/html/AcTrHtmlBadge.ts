import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

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

  /** Update the badge font size (CSS px). */
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
    const size = fontSize != null && fontSize > 0 ? fontSize : 13
    el.style.cssText =
      `background:var(--ml-ui-bg, rgba(255,255,255,0.95));color:${css};` +
      `border:1px solid ${css};box-sizing:border-box;` +
      `font-size:${size}px;font-family:sans-serif;font-weight:500;` +
      'padding:3px 14px;border-radius:20px;pointer-events:none;' +
      `transform:${transform ?? 'translate(-50%,-50%)'};white-space:nowrap;` +
      'box-shadow:var(--ml-ui-shadow, 0 1px 4px rgba(0,0,0,0.2));'
    return el
  }
}
