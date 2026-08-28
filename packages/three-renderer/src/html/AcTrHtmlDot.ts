import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/**
 * Options for an endpoint / marker dot.
 */
export interface AcTrHtmlDotOptions extends AcTrHtmlElementOptions {
  /** Marker fill color */
  color: AcCmColor
}

/**
 * Small circular HTML marker used as an overlay endpoint.
 */
export class AcTrHtmlDot extends AcTrHtmlElement {
  constructor(options: AcTrHtmlDotOptions) {
    super(AcTrHtmlDot.createElement(options.color), {
      ...options,
      scaleWithView: options.scaleWithView ?? true
    })
  }

  /** Update the marker fill color. */
  setColor(color: AcCmColor): void {
    this.element.style.background = acTrHtmlCssColor(color)
  }

  private static createElement(color: AcCmColor): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-dot'
    el.style.cssText =
      'width:12px;height:12px;border-radius:50%;' +
      `background:${acTrHtmlCssColor(color)};border:2px solid var(--ml-ui-border, #fff);box-sizing:border-box;` +
      'pointer-events:none;transform:translate(-50%,-50%);'
    return el
  }
}
