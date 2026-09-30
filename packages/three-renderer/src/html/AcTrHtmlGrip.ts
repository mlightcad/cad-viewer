import { AcCmColor } from '@mlightcad/data-model'

import { AC_TR_HTML_BADGE_REF_FONT_PX } from './AcTrHtmlBadge'
import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import {
  AC_TR_HTML_DOT_BORDER_EM,
  AC_TR_HTML_DOT_SIZE_EM
} from './AcTrHtmlDot'
import {
  AC_TR_HTML_SELECTED_CLASS,
  AcTrHtmlElement,
  type AcTrHtmlElementOptions
} from './AcTrHtmlElement'

/** Class on overlay endpoint grips (hidden until the parent group is selected). */
export const AC_TR_HTML_GRIP_CLASS = 'ml-html-grip'

/** Class toggled on overlay grips while a grip drag is in progress. */
export const AC_TR_HTML_GRIP_DRAGGING_CLASS = 'ml-html-grip-dragging'

/** Shared visual class used by CAD entity grips. */
export const ML_GRIP_HANDLE_CLASS = 'ml-grip-handle'

const GRIP_HANDLE_STYLE_ID = 'ml-grip-handle-style'
const HTML_GRIP_STYLE_ID = 'ml-html-grip-style'

/**
 * Injects the shared square-grip stylesheet used by CAD entity grips.
 *
 * Safe to call more than once. No-op when `document` is unavailable.
 */
export function injectMlGripHandleCss(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(GRIP_HANDLE_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = GRIP_HANDLE_STYLE_ID
  style.textContent = `
      .${ML_GRIP_HANDLE_CLASS} {
        position: absolute;
        width: var(--ml-ui-grip-size, 8px);
        height: var(--ml-ui-grip-size, 8px);
        pointer-events: auto;
        transform: translate(-50%, -50%);
        z-index: 5;
        box-sizing: border-box;
        cursor: pointer;
      }

      .${ML_GRIP_HANDLE_CLASS}-normal {
        background: var(--ml-ui-grip-normal, #0080ff);
      }

      .${ML_GRIP_HANDLE_CLASS}:hover,
      .${ML_GRIP_HANDLE_CLASS}-hover,
      .${ML_GRIP_HANDLE_CLASS}-hot {
        background: var(--ml-ui-grip-hot, #ff0000);
      }
    `
  document.head.appendChild(style)
}

function injectHtmlGripCss(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(HTML_GRIP_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = HTML_GRIP_STYLE_ID
  style.textContent = `
      .${AC_TR_HTML_GRIP_CLASS} {
        visibility: hidden;
        pointer-events: none;
      }
      .${AC_TR_HTML_GRIP_CLASS}.${AC_TR_HTML_SELECTED_CLASS} {
        visibility: visible;
        pointer-events: auto;
      }
      .${AC_TR_HTML_GRIP_CLASS}.${AC_TR_HTML_GRIP_DRAGGING_CLASS} {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `
  document.head.appendChild(style)
}

/** True when `el` is an overlay HTML endpoint grip. */
export function acTrIsHtmlGrip(el: Element | null | undefined): boolean {
  return !!el?.classList.contains(AC_TR_HTML_GRIP_CLASS)
}

/**
 * Hide or restore every overlay endpoint grip (matches entity grip drag:
 * all handles disappear until the drag finishes).
 */
export function acTrSetHtmlGripsDragging(
  dragging: boolean,
  root: ParentNode = document
): void {
  root.querySelectorAll(`.${AC_TR_HTML_GRIP_CLASS}`).forEach(node => {
    node.classList.toggle(AC_TR_HTML_GRIP_DRAGGING_CLASS, dragging)
  })
}

/**
 * Options for an overlay endpoint grip.
 */
export interface AcTrHtmlGripOptions extends AcTrHtmlElementOptions {
  /** Marker fill color */
  color: AcCmColor
  /**
   * CSS font size used as the em root for diameter / border.
   * Defaults to {@link AC_TR_HTML_BADGE_REF_FONT_PX}.
   */
  fontSize?: number
}

/**
 * Circular overlay endpoint, shown only when the parent HTML group is selected.
 * Visual matches {@link AcTrHtmlDot} and scales with view using WCS size.
 * Diameter tracks the paired badge font via `em`.
 */
export class AcTrHtmlGrip extends AcTrHtmlElement {
  constructor(options: AcTrHtmlGripOptions) {
    super(AcTrHtmlGrip.createElement(options.color, options.fontSize), {
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
    injectHtmlGripCss()
    const el = document.createElement('div')
    el.className = `ml-html-dot ${AC_TR_HTML_GRIP_CLASS}`
    const size =
      fontSize != null && fontSize > 0 ? fontSize : AC_TR_HTML_BADGE_REF_FONT_PX
    el.style.cssText =
      `font-size:${size}px;` +
      `width:${AC_TR_HTML_DOT_SIZE_EM}em;height:${AC_TR_HTML_DOT_SIZE_EM}em;` +
      'min-width:5px;min-height:5px;border-radius:50%;' +
      `background:${acTrHtmlCssColor(color)};` +
      `border:${AC_TR_HTML_DOT_BORDER_EM}em solid var(--ml-ui-border, #fff);` +
      'box-sizing:border-box;transform:translate(-50%,-50%);cursor:grab;'
    return el
  }
}
