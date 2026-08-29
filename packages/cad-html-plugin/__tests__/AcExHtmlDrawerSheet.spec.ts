/** @jest-environment jsdom */

import {
  acExHtmlIsPhoneLayout,
  setupAcExHtmlDrawerSheets
} from '../src/AcExHtmlDrawerSheet'
import { ML_UI_MOBILE_MAX_WIDTH } from '../src/AcExHtmlShell'

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
    expect(acExHtmlIsPhoneLayout()).toBe(true)
    mockPhone(false)
    expect(acExHtmlIsPhoneLayout()).toBe(false)
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

  it('does not park or close strips on desktop', () => {
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

    expect(drawer.parentElement?.id).toBe('mlcad-measure-strip-wrap')
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
})
