/** @jest-environment jsdom */

import { AcExCommandSessionPanel } from '../src/AcExCommandSessionPanel'
import { ML_UI_MOBILE_MAX_WIDTH } from '../src/AcExHtmlShell'
import { AcExHtmlI18n } from '../src/AcExHtmlI18n'

function mountSessionHost(): HTMLElement {
  document.body.innerHTML = `
    <div id="mlcad-root">
      <div id="mlcad-command-session" hidden aria-hidden="true">
        <div class="mlcad-session-group mlcad-session-group-abs">
          <div class="mlcad-session-metric-stack" data-session-stack="abs">
            <button type="button" class="mlcad-session-metric" data-session-metric="x" disabled>
              <span class="mlcad-session-metric-label">X</span>
              <span class="mlcad-session-metric-value">0</span>
            </button>
            <button type="button" class="mlcad-session-metric" data-session-metric="y" disabled>
              <span class="mlcad-session-metric-label">Y</span>
              <span class="mlcad-session-metric-value">0</span>
            </button>
          </div>
          <div class="mlcad-session-actions" data-session-actions="abs">
            <button type="button" class="mlcad-session-cancel" aria-label="Cancel"></button>
            <button type="button" class="mlcad-session-confirm" aria-label="Confirm" disabled></button>
          </div>
        </div>
        <div class="mlcad-session-group mlcad-session-group-polar" hidden>
          <div class="mlcad-session-metric-stack" data-session-stack="polar">
            <button type="button" class="mlcad-session-metric" data-session-metric="length" disabled>
              <span class="mlcad-session-metric-label">Length</span>
              <span class="mlcad-session-metric-value">0</span>
            </button>
            <button type="button" class="mlcad-session-metric" data-session-metric="angle" disabled>
              <span class="mlcad-session-metric-label">Angle</span>
              <span class="mlcad-session-metric-value">0</span>
            </button>
          </div>
          <div class="mlcad-session-actions" data-session-actions="polar"></div>
        </div>
        <div class="mlcad-session-group mlcad-session-group-delta" hidden>
          <div class="mlcad-session-metric-stack" data-session-stack="delta">
            <button type="button" class="mlcad-session-metric" data-session-metric="dx" disabled>
              <span class="mlcad-session-metric-label">ΔX</span>
              <span class="mlcad-session-metric-value">0</span>
            </button>
            <button type="button" class="mlcad-session-metric" data-session-metric="dy" disabled>
              <span class="mlcad-session-metric-label">ΔY</span>
              <span class="mlcad-session-metric-value">0</span>
            </button>
          </div>
          <div class="mlcad-session-actions" data-session-actions="delta"></div>
        </div>
        <div class="mlcad-session-actions mlcad-session-actions-shared" data-session-actions="shared"></div>
        <div class="mlcad-session-chips" hidden></div>
      </div>
    </div>
  `
  return document.getElementById('mlcad-command-session') as HTMLElement
}

function mockPhone(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes(`${ML_UI_MOBILE_MAX_WIDTH}`) ? matches : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }) as unknown as MediaQueryList
}

describe('AcExCommandSessionPanel', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    document.body.replaceChildren()
    window.matchMedia = originalMatchMedia
  })

  it('hides when state is null and shows relative metrics when active', () => {
    mockPhone(true)
    const host = mountSessionHost()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    const onChip = jest.fn()
    panel.setHandlers({ onConfirm, onCancel, onChip })

    expect(host.hidden).toBe(true)

    panel.setState({
      prompt: 'Tap points',
      confirmEnabled: false,
      metrics: {
        hasBasePoint: true,
        lengthText: '10.00',
        angleText: '0',
        dxText: '10.00',
        dyText: '0',
        xText: '10',
        yText: '0'
      },
      chips: [{ id: 'undo', label: 'Undo' }]
    })

    expect(host.hidden).toBe(false)
    expect(
      document.getElementById('mlcad-root')?.classList.contains(
        'mlcad-session-active'
      )
    ).toBe(true)
    expect(host.classList.contains('is-relative')).toBe(true)
    expect(
      host.querySelector('[data-session-metric="length"] .mlcad-session-metric-value')
        ?.textContent
    ).toBe('10.00')
    expect(
      (host.querySelector('.mlcad-session-confirm') as HTMLButtonElement).disabled
    ).toBe(true)
    host.querySelector('.mlcad-session-confirm')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    expect(onConfirm).not.toHaveBeenCalled()
    expect(
      (host.querySelector('.mlcad-session-chips') as HTMLElement).hidden
    ).toBe(true)
    expect(host.querySelector('.mlcad-session-chip')).toBeNull()

    const polar = host.querySelector(
      '.mlcad-session-group-polar'
    ) as HTMLElement
    expect(polar.hidden).toBe(false)
    expect(polar.querySelector('.mlcad-session-cancel')).toBeTruthy()
    expect(
      host
        .querySelector('.mlcad-session-group-delta')
        ?.querySelector('.mlcad-session-confirm')
    ).toBeTruthy()
    expect(
      (host.querySelector('.mlcad-session-group-abs') as HTMLElement).hidden
    ).toBe(true)

    host.querySelector('.mlcad-session-cancel')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    expect(onCancel).toHaveBeenCalledTimes(1)

    panel.setState(null)
    expect(host.hidden).toBe(true)
    expect(
      document.getElementById('mlcad-root')?.classList.contains(
        'mlcad-session-active'
      )
    ).toBe(false)
  })

  it('shows X/Y with both buttons when there is no last point', () => {
    mockPhone(true)
    const host = mountSessionHost()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    panel.setHandlers({
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      onChip: jest.fn()
    })
    panel.setState({
      prompt: 'Specify first point',
      confirmEnabled: false,
      metrics: {
        hasBasePoint: false,
        lengthText: '0',
        angleText: '0',
        dxText: '0',
        dyText: '0',
        xText: '12.5',
        yText: '8.0'
      },
      chips: []
    })

    expect(host.classList.contains('is-absolute')).toBe(true)
    const abs = host.querySelector('.mlcad-session-group-abs') as HTMLElement
    expect(abs.hidden).toBe(false)
    expect(
      abs.querySelector('[data-session-metric="x"] .mlcad-session-metric-value')
        ?.textContent
    ).toBe('12.5')
    expect(abs.querySelector('.mlcad-session-cancel')).toBeTruthy()
    expect(abs.querySelector('.mlcad-session-confirm')).toBeTruthy()
    expect(
      (host.querySelector('.mlcad-session-group-polar') as HTMLElement).hidden
    ).toBe(true)
    expect(
      (host.querySelector('.mlcad-session-group-delta') as HTMLElement).hidden
    ).toBe(true)
  })

  it('keeps cancel and confirm together on pad relative metrics', () => {
    mockPhone(false)
    const host = mountSessionHost()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    panel.setHandlers({
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      onChip: jest.fn()
    })
    panel.setState({
      prompt: 'Tap next point',
      confirmEnabled: false,
      metrics: {
        hasBasePoint: true,
        lengthText: '10.00',
        angleText: '0',
        dxText: '10.00',
        dyText: '0',
        xText: '10',
        yText: '0'
      },
      chips: []
    })

    const shared = host.querySelector(
      '[data-session-actions="shared"]'
    ) as HTMLElement
    expect(shared.querySelector('.mlcad-session-cancel')).toBeTruthy()
    expect(shared.querySelector('.mlcad-session-confirm')).toBeTruthy()
    expect(
      host
        .querySelector('.mlcad-session-group-polar')
        ?.querySelector('.mlcad-session-cancel')
    ).toBeNull()
    expect(
      (host.querySelector('.mlcad-session-group-polar') as HTMLElement).hidden
    ).toBe(false)
    expect(
      (host.querySelector('.mlcad-session-group-delta') as HTMLElement).hidden
    ).toBe(false)
  })

  it('shows X/Y labels when metrics are omitted before the first pointer', () => {
    mockPhone(true)
    const host = mountSessionHost()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    panel.setHandlers({
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      onChip: jest.fn()
    })
    panel.setState({
      prompt: 'Specify first point',
      confirmEnabled: false,
      metrics: null,
      chips: []
    })

    expect(host.classList.contains('is-absolute')).toBe(true)
    expect(host.classList.contains('is-actions-only')).toBe(false)
    const abs = host.querySelector('.mlcad-session-group-abs') as HTMLElement
    expect(abs.hidden).toBe(false)
    expect(
      abs.querySelector('[data-session-metric="x"] .mlcad-session-metric-label')
        ?.textContent
    ).toBe('X')
    expect(
      abs.querySelector('[data-session-metric="y"] .mlcad-session-metric-label')
        ?.textContent
    ).toBe('Y')
    expect(
      (abs.querySelector('[data-session-metric="x"]') as HTMLElement).hidden
    ).toBe(false)
    expect(
      (abs.querySelector('[data-session-metric="y"]') as HTMLElement).hidden
    ).toBe(false)
    expect(abs.querySelector('.mlcad-session-cancel')).toBeTruthy()
    expect(abs.querySelector('.mlcad-session-confirm')).toBeTruthy()
  })

  it('enables confirm when confirmEnabled is true', () => {
    mockPhone(true)
    const host = mountSessionHost()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    const onConfirm = jest.fn()
    panel.setHandlers({
      onConfirm,
      onCancel: jest.fn(),
      onChip: jest.fn()
    })
    panel.setState({
      prompt: 'Finish',
      confirmEnabled: true,
      metrics: null,
      chips: []
    })
    const confirm = host.querySelector(
      '.mlcad-session-confirm'
    ) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
    expect(host.classList.contains('is-absolute')).toBe(true)
    expect(
      (host.querySelector('.mlcad-session-group-abs') as HTMLElement).hidden
    ).toBe(false)
    expect(
      (host.querySelector('.mlcad-session-group-polar') as HTMLElement).hidden
    ).toBe(true)
    expect(
      (host.querySelector('.mlcad-session-group-delta') as HTMLElement).hidden
    ).toBe(true)
    confirm.click()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
