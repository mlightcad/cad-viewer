import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/**
 * Options for a callout / leader text bubble.
 */
export interface AcTrHtmlCalloutOptions extends AcTrHtmlElementOptions {
  /** Bubble text color / border accent */
  color: AcCmColor
  /** Callout text */
  text?: string
  /** CSS font size in pixels (default 12). */
  fontSize?: number
}

/**
 * Text bubble used for Design Review callouts (leader drawn separately).
 */
export class AcTrHtmlCallout extends AcTrHtmlElement {
  constructor(options: AcTrHtmlCalloutOptions) {
    super(
      AcTrHtmlCallout.createElement(
        options.color,
        options.text ?? '',
        options.fontSize
      ),
      options
    )
  }

  /** Update the callout bubble text. */
  setText(text: string): void {
    const body = this.element.querySelector('.ml-html-callout-text')
    if (body) body.textContent = text
  }

  /** Update the callout bubble font size (CSS px). */
  setFontSize(fontSize: number): void {
    const body = this.element.querySelector(
      '.ml-html-callout-text'
    ) as HTMLElement | null
    if (!body || !(fontSize > 0)) return
    body.style.fontSize = `${fontSize}px`
  }

  private static createElement(
    color: AcCmColor,
    text: string,
    fontSize?: number
  ): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-callout'
    const accent = acTrHtmlCssColor(color)
    const size = fontSize != null && fontSize > 0 ? fontSize : 12
    el.style.cssText =
      'display:flex;flex-direction:column;gap:2px;min-width:72px;max-width:220px;' +
      'background:var(--ml-ui-bg, rgba(255,255,255,0.96));' +
      `border:1px solid ${accent};border-left:4px solid ${accent};` +
      'border-radius:6px;padding:6px 10px;pointer-events:none;' +
      'transform:translate(-50%,-50%);box-shadow:var(--ml-ui-shadow, 0 1px 4px rgba(0,0,0,0.2));' +
      'font-family:sans-serif;'

    const textEl = document.createElement('div')
    textEl.className = 'ml-html-callout-text'
    textEl.style.cssText =
      `color:${accent};font-size:${size}px;font-weight:600;white-space:pre-wrap;word-break:break-word;`
    textEl.textContent = text
    el.appendChild(textEl)
    return el
  }
}
