import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/**
 * Options for a capsule / label badge.
 */
export interface AcTrHtmlBadgeOptions extends AcTrHtmlElementOptions {
  /** Label text color */
  color: AcCmColor
  /** Badge text content */
  text?: string
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
        options.transform
      ),
      options
    )
  }

  /** Update the badge label text. */
  setText(text: string): void {
    this.element.textContent = text
  }

  private static createElement(
    color: AcCmColor,
    text: string,
    transform?: string
  ): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-badge'
    el.textContent = text
    el.style.cssText =
      `background:var(--ml-ui-bg, rgba(255,255,255,0.95));color:${acTrHtmlCssColor(color)};` +
      'font-size:13px;font-family:sans-serif;font-weight:500;' +
      'padding:3px 14px;border-radius:20px;pointer-events:none;' +
      `transform:${transform ?? 'translate(-50%,-50%)'};white-space:nowrap;` +
      'box-shadow:var(--ml-ui-shadow, 0 1px 4px rgba(0,0,0,0.2));'
    return el
  }
}
