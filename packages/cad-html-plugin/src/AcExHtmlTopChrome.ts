/**
 * Shared top-of-canvas chrome layout for the offline HTML viewer.
 *
 * Message bar + expiry badge share one row; shortcut toolbar and snap loupe
 * sit below that row (or at the canvas top inset when the row is empty).
 *
 * @module AcExHtmlTopChrome
 * @packageDocumentation
 */

/** Gap between the top chrome row and controls stacked beneath it. */
export const ACEX_HTML_TOP_CHROME_GAP_PX = 8

/** Default top inset when the message / expiry row is hidden. */
export const ACEX_HTML_TOP_CHROME_NEAR_TOP_PX = 12

/**
 * Whether a top-chrome child is currently contributing to the row height.
 */
export function acexHtmlTopChromeChildVisible(el: HTMLElement): boolean {
  if (el.hidden) {
    return false
  }
  if (el.id === 'mlcad-status-bar' && !el.textContent?.trim()) {
    return false
  }
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/**
 * True when the top chrome row has at least one visible child.
 */
export function acexHtmlTopChromeHasVisibleContent(
  chrome: HTMLElement | null | undefined
): boolean {
  if (!chrome) {
    return false
  }
  for (const child of Array.from(chrome.children)) {
    if (child instanceof HTMLElement && acexHtmlTopChromeChildVisible(child)) {
      return true
    }
  }
  return false
}

/**
 * Resolves `#mlcad-top-chrome` from the document or a canvas host.
 */
export function getAcExHtmlTopChrome(
  host?: HTMLElement | null
): HTMLElement | null {
  if (host) {
    const scoped = host.querySelector('#mlcad-top-chrome')
    if (scoped instanceof HTMLElement) {
      return scoped
    }
  }
  const global = document.getElementById('mlcad-top-chrome')
  return global instanceof HTMLElement ? global : null
}

/**
 * CSS `top` for a control positioned under the top chrome row, relative to
 * `positionedAncestor` (typically `#mlcad-root` or `#mlcad-canvas-host`).
 *
 * When the row is empty / hidden, returns `nearTopPx`.
 */
export function acexHtmlTopChromeBottomOffset(
  positionedAncestor: HTMLElement,
  options?: {
    gapPx?: number
    nearTopPx?: number
    chrome?: HTMLElement | null
  }
): number {
  const gapPx = options?.gapPx ?? ACEX_HTML_TOP_CHROME_GAP_PX
  const nearTopPx = options?.nearTopPx ?? ACEX_HTML_TOP_CHROME_NEAR_TOP_PX
  const chrome = options?.chrome ?? getAcExHtmlTopChrome(positionedAncestor)
  if (!acexHtmlTopChromeHasVisibleContent(chrome)) {
    return nearTopPx
  }
  const ancestorTop = positionedAncestor.getBoundingClientRect().top
  return Math.max(
    nearTopPx,
    chrome!.getBoundingClientRect().bottom - ancestorTop + gapPx
  )
}
