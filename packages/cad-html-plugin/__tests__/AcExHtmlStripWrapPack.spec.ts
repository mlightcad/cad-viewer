/** @jest-environment jsdom */

import {
  acexHtmlComputeWrapPackSlot,
  acexHtmlSyncStripWrapPack
} from '../src/AcExHtmlStripWrapPack'
import { ML_UI_MOBILE_MAX_WIDTH } from '../src/AcExHtmlShell'

describe('AcExHtmlComputeWrapPackSlot', () => {
  it('stretches a single incomplete row across the full strip', () => {
    // preferredMax = 40 → floor(360/40) = 9; 3 buttons share 360
    const result = acexHtmlComputeWrapPackSlot(360, 56, 3)
    expect(result.preferredMaxWidth).toBe(40)
    expect(result.perRow).toBe(9)
    expect(result.slotWidth).toBeCloseTo(120)
  })

  it('keeps a wrapped last row at the full-row slot width', () => {
    const { perRow, slotWidth } = acexHtmlComputeWrapPackSlot(360, 56, 12)
    expect(perRow).toBe(9)
    expect(slotWidth).toBeCloseTo(40)
    expect(3 * slotWidth).toBeLessThan(360)
  })
})

describe('AcExHtmlSyncStripWrapPack', () => {
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

  function mountStrip(buttonCount: number) {
    document.body.innerHTML = `
      <div id="mlcad-zoom-strip-wrap">
        <div id="mlcad-zoom-strip">
          ${Array.from(
            { length: buttonCount },
            () => '<button type="button" class="mlcad-tool-btn"></button>'
          ).join('')}
        </div>
      </div>
    `
    const strip = document.getElementById('mlcad-zoom-strip') as HTMLElement
    Object.defineProperty(strip, 'clientWidth', { value: 360, configurable: true })
    strip.querySelectorAll<HTMLElement>('.mlcad-tool-btn').forEach(button => {
      Object.defineProperty(button, 'offsetHeight', {
        value: 56,
        configurable: true
      })
    })
    return strip
  }

  it('spreads a short strip across equal columns', () => {
    mockPhone(true)
    const strip = mountStrip(3)
    acexHtmlSyncStripWrapPack()
    expect(strip.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
  })

  it('uses a full-row column count when buttons wrap', () => {
    mockPhone(true)
    const strip = mountStrip(12)
    acexHtmlSyncStripWrapPack()
    expect(strip.style.gridTemplateColumns).toBe('repeat(9, minmax(0, 1fr))')
  })

  it('clears inline columns on desktop', () => {
    mockPhone(true)
    const strip = mountStrip(3)
    acexHtmlSyncStripWrapPack()
    mockPhone(false)
    acexHtmlSyncStripWrapPack()
    expect(strip.style.gridTemplateColumns).toBe('')
  })

  it('does not force a one-column grid when the strip is still unmeasured', () => {
    mockPhone(true)
    const strip = mountStrip(5)
    Object.defineProperty(strip, 'clientWidth', {
      value: 0,
      configurable: true
    })
    acexHtmlSyncStripWrapPack()
    expect(strip.style.gridTemplateColumns).toBe('')
  })
})
