/** @jest-environment jsdom */

import {
  acexHtmlTopChromeBottomOffset,
  acexHtmlTopChromeHasVisibleContent,
  ACEX_HTML_TOP_CHROME_GAP_PX,
  ACEX_HTML_TOP_CHROME_NEAR_TOP_PX
} from '../src/AcExHtmlTopChrome'

describe('AcExHtmlTopChrome', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="mlcad-root" style="position:relative">
        <div id="mlcad-canvas-host" style="position:absolute;inset:0">
          <div id="mlcad-top-chrome">
            <footer id="mlcad-status-bar" hidden></footer>
          </div>
        </div>
      </div>
    `
  })

  it('treats a hidden empty status bar as no visible chrome', () => {
    const chrome = document.getElementById('mlcad-top-chrome')!
    expect(acexHtmlTopChromeHasVisibleContent(chrome)).toBe(false)
    expect(
      acexHtmlTopChromeBottomOffset(document.getElementById('mlcad-root')!)
    ).toBe(ACEX_HTML_TOP_CHROME_NEAR_TOP_PX)
  })

  it('offsets below a visible message + expiry row', () => {
    const root = document.getElementById('mlcad-root')!
    const chrome = document.getElementById('mlcad-top-chrome')!
    const status = document.getElementById('mlcad-status-bar')!
    status.hidden = false
    status.textContent = 'Ready'
    const badge = document.createElement('div')
    badge.id = 'mlcad-expiry-badge'
    badge.className = 'mlcad-expiry-badge'
    badge.textContent = 'Expires tomorrow'
    chrome.appendChild(badge)

    root.getBoundingClientRect = () =>
      ({ top: 0, left: 0, bottom: 600, right: 800, width: 800, height: 600 }) as DOMRect
    chrome.getBoundingClientRect = () =>
      ({ top: 10, left: 12, bottom: 46, right: 788, width: 776, height: 36 }) as DOMRect

    expect(acexHtmlTopChromeHasVisibleContent(chrome)).toBe(true)
    expect(acexHtmlTopChromeBottomOffset(root)).toBe(
      46 + ACEX_HTML_TOP_CHROME_GAP_PX
    )
  })

  it('keeps expiry alone right-aligned as visible chrome', () => {
    const chrome = document.getElementById('mlcad-top-chrome')!
    const badge = document.createElement('div')
    badge.id = 'mlcad-expiry-badge'
    badge.className = 'mlcad-expiry-badge'
    badge.textContent = 'Expires tomorrow'
    chrome.appendChild(badge)
    expect(acexHtmlTopChromeHasVisibleContent(chrome)).toBe(true)
  })
})
