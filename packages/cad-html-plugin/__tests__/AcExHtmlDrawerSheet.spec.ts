/** @jest-environment jsdom */

import {
  acexHtmlIsCompactLayout,
  acexHtmlIsMobileNavUi,
  acexHtmlIsPhoneLayout,
  setupAcExHtmlDrawerSheets
} from '../src/AcExHtmlDrawerSheet'
import {
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_MOBILE_MAX_WIDTH
} from '../src/AcExHtmlShell'

describe('setupAcExHtmlDrawerSheets', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    document.body.replaceChildren()
    window.matchMedia = originalMatchMedia
  })

  function mockPhone(matches: boolean) {
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes(`${ML_UI_MOBILE_MAX_WIDTH}`) ? matches : false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }) as unknown as MediaQueryList
  }

  it('detects the phone breakpoint', () => {
    mockPhone(true)
    expect(acexHtmlIsPhoneLayout()).toBe(true)
    mockPhone(false)
    expect(acexHtmlIsPhoneLayout()).toBe(false)
  })

  it('detects the compact (phone or pad) breakpoint', () => {
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes(`${ML_UI_COMPACT_MAX_WIDTH}`),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }) as unknown as MediaQueryList
    expect(acexHtmlIsCompactLayout()).toBe(true)
    expect(acexHtmlIsMobileNavUi()).toBe(true)
  })

  it('treats a coarse pointer as mobile nav UI', () => {
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('pointer: coarse'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }) as unknown as MediaQueryList
    expect(acexHtmlIsCompactLayout()).toBe(false)
    expect(acexHtmlIsMobileNavUi()).toBe(true)
  })

  it('parks the drawer on the sidebar and closes strips on phone', () => {
    mockPhone(true)
    document.body.innerHTML = `
      <aside id="mlcad-sidebar">
        <nav id="mlcad-toolbar"></nav>
        <div id="mlcad-measure-strip-wrap">
          <div id="mlcad-measure-drawer">
            <div class="mlcad-drawer-grabber"></div>
          </div>
        </div>
      </aside>
    `
    const closeStrips = jest.fn()
    const sheets = setupAcExHtmlDrawerSheets({ closeStrips })
    const drawer = document.getElementById('mlcad-measure-drawer') as HTMLElement

    sheets.preparePhoneOpen(drawer)

    expect(drawer.parentElement?.id).toBe('mlcad-sidebar')
    expect(closeStrips).toHaveBeenCalled()
  })

  it('parks the drawer on the sidebar on desktop without closing strips', () => {
    mockPhone(false)
    document.body.innerHTML = `
      <aside id="mlcad-sidebar">
        <div id="mlcad-measure-strip-wrap">
          <div id="mlcad-measure-drawer"></div>
        </div>
      </aside>
    `
    const closeStrips = jest.fn()
    const sheets = setupAcExHtmlDrawerSheets({ closeStrips })
    const drawer = document.getElementById('mlcad-measure-drawer') as HTMLElement

    sheets.preparePhoneOpen(drawer)

    // Pad/desktop also reparent so dismissing the strip wrap cannot hide an
    // open results panel; only phone dismisses sibling strips here.
    expect(drawer.parentElement?.id).toBe('mlcad-sidebar')
    expect(closeStrips).not.toHaveBeenCalled()
  })

  it('keeps an open drawer on the sidebar and clears phone size on desktop restore', () => {
    mockPhone(true)
    document.body.innerHTML = `
      <aside id="mlcad-sidebar">
        <nav id="mlcad-toolbar"></nav>
        <div id="mlcad-measure-strip-wrap">
          <div id="mlcad-measure-drawer">
            <div class="mlcad-drawer-grabber"></div>
          </div>
        </div>
      </aside>
    `
    const wrap = document.getElementById(
      'mlcad-measure-strip-wrap'
    ) as HTMLElement
    const sheets = setupAcExHtmlDrawerSheets({
      closeStrips: () => {
        wrap.hidden = true
      }
    })
    const drawer = document.getElementById('mlcad-measure-drawer') as HTMLElement
    drawer.hidden = false
    sheets.preparePhoneOpen(drawer)
    drawer.style.height = '280px'
    drawer.style.maxHeight = 'none'

    mockPhone(false)
    window.dispatchEvent(new Event('resize'))

    expect(drawer.parentElement?.id).toBe('mlcad-sidebar')
    expect(drawer.hidden).toBe(false)
    expect(drawer.style.height).toBe('')
    expect(drawer.style.maxHeight).toBe('')
  })

  it('returns a closed drawer to its strip wrap on desktop restore', () => {
    mockPhone(true)
    document.body.innerHTML = `
      <aside id="mlcad-sidebar">
        <div id="mlcad-measure-strip-wrap">
          <div id="mlcad-measure-drawer" hidden></div>
        </div>
      </aside>
    `
    const wrap = document.getElementById(
      'mlcad-measure-strip-wrap'
    ) as HTMLElement
    setupAcExHtmlDrawerSheets({
      closeStrips: () => {
        wrap.hidden = true
      }
    })
    const drawer = document.getElementById('mlcad-measure-drawer') as HTMLElement
    wrap.hidden = true
    document.getElementById('mlcad-sidebar')?.appendChild(drawer)

    mockPhone(false)
    window.dispatchEvent(new Event('resize'))

    expect(drawer.parentElement?.id).toBe('mlcad-measure-strip-wrap')
  })

  it('uses the visible session panel height as the phone drawer inset', () => {
    mockPhone(true)
    document.body.innerHTML = `
      <nav id="mlcad-toolbar"></nav>
      <div id="mlcad-measure-strip-wrap"></div>
      <div class="ml-mobile-cmd"><div class="ml-mobile-cmd-panel"></div></div>
    `
    const toolbar = document.getElementById('mlcad-toolbar') as HTMLElement
    const strip = document.getElementById(
      'mlcad-measure-strip-wrap'
    ) as HTMLElement
    const session = document.querySelector(
      '.ml-mobile-cmd-panel'
    ) as HTMLElement
    Object.defineProperty(toolbar, 'offsetHeight', { value: 56 })
    Object.defineProperty(strip, 'offsetHeight', { value: 80 })
    Object.defineProperty(session, 'offsetHeight', { value: 40 })

    const sheets = setupAcExHtmlDrawerSheets()
    sheets.syncInset()
    expect(
      document.documentElement.style.getPropertyValue(
        '--mlcad-phone-drawer-bottom'
      )
    ).toBe('40px')

    session.closest('.ml-mobile-cmd')!.setAttribute('hidden', '')
    sheets.syncInset()
    expect(
      document.documentElement.style.getPropertyValue(
        '--mlcad-phone-drawer-bottom'
      )
    ).toBe('136px')
  })
})
