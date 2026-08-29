import { AcCmColor } from '@mlightcad/data-model'

import { acTrHtmlCssColor } from './AcTrHtmlColorUtil'
import { AcTrHtmlElement, type AcTrHtmlElementOptions } from './AcTrHtmlElement'

/** Built-in stamp identifiers. */
export type AcTrHtmlStampId =
  | 'approved'
  | 'rejected'
  | 'revised'
  | 'for-review'
  | 'custom'

/**
 * Options for a Design Review stamp overlay.
 */
export interface AcTrHtmlStampOptions extends AcTrHtmlElementOptions {
  /** Accent / border color */
  color: AcCmColor
  /** Built-in stamp kind or custom */
  stampId: AcTrHtmlStampId | string
  /** Optional caption under the stamp */
  text?: string
  /** Optional image URL for custom stamps */
  imageUrl?: string
}

const STAMP_LABELS: Record<string, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  revised: 'REVISED',
  'for-review': 'FOR REVIEW',
  custom: 'STAMP'
}

/**
 * Rectangular review stamp anchored in world space.
 */
export class AcTrHtmlStamp extends AcTrHtmlElement {
  constructor(options: AcTrHtmlStampOptions) {
    super(AcTrHtmlStamp.createElement(options), {
      ...options,
      scaleWithView: options.scaleWithView ?? true
    })
  }

  /** Update the stamp caption text. */
  setText(text: string): void {
    const caption = this.element.querySelector('.ml-html-stamp-text')
    if (caption) caption.textContent = text
  }

  private static createElement(options: AcTrHtmlStampOptions): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-stamp'
    const accent = acTrHtmlCssColor(options.color)
    el.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:4px;' +
      'pointer-events:none;transform:translate(-50%,-50%);' +
      'font-family:sans-serif;'

    if (options.imageUrl) {
      const img = document.createElement('img')
      img.src = options.imageUrl
      img.alt = options.text ?? options.stampId
      img.style.cssText =
        'max-width:96px;max-height:96px;object-fit:contain;' +
        'border:2px solid ' +
        accent +
        ';border-radius:4px;background:var(--ml-ui-bg, #fff);'
      el.appendChild(img)
    } else {
      const badge = document.createElement('div')
      badge.className = 'ml-html-stamp-badge'
      badge.style.cssText =
        `border:3px solid ${accent};color:${accent};` +
        'background:rgba(255,255,255,0.92);padding:8px 14px;' +
        'font-size:14px;font-weight:800;letter-spacing:0.06em;' +
        'border-radius:4px;transform:rotate(-12deg);' +
        'box-shadow:var(--ml-ui-shadow, 0 1px 4px rgba(0,0,0,0.2));' +
        'white-space:nowrap;'
      badge.textContent =
        STAMP_LABELS[options.stampId] ?? options.stampId.toUpperCase()
      el.appendChild(badge)
    }

    if (options.text) {
      const caption = document.createElement('div')
      caption.className = 'ml-html-stamp-text'
      caption.style.cssText =
        `color:${accent};font-size:11px;font-weight:600;background:var(--ml-ui-bg, rgba(255,255,255,0.9));` +
        'padding:1px 6px;border-radius:10px;'
      caption.textContent = options.text
      el.appendChild(caption)
    }

    return el
  }
}
