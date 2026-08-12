import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/**
 * Options for a square snap marker.
 */
export interface AcTrHtmlSnapIndicatorOptions extends AcTrHtmlElementOptions {
  /** Border color of the snap square */
  color: AcCmColor
}

/**
 * Small square HTML marker used to show a custom snap lock point during jigs.
 */
export class AcTrHtmlSnapIndicator extends AcTrHtmlElement {
  constructor(options: AcTrHtmlSnapIndicatorOptions) {
    super(AcTrHtmlSnapIndicator.createElement(options.color), options)
  }

  private static createElement(color: AcCmColor): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-snap-indicator'
    el.style.cssText =
      'width:10px;height:10px;border:2px solid ' +
      `${acTrHtmlCssColor(color)};background:transparent;` +
      'box-sizing:border-box;pointer-events:none;' +
      'transform:translate(-50%,-50%);'
    return el
  }
}
