/**
 * @jest-environment jsdom
 */
import type { AcExHtmlNavMode } from '../src/AcExHtmlNavTools'
import {
  AcExDesktopIdlePointerStrategy,
  type AcExIdlePointerHost,
  AcExMobileIdlePointerStrategy
} from '../src/AcExIdlePointerStrategy'

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, { bubbles: true, cancelable: true, ...init })
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'mouse'
  }
}

function pointerEvent(
  pointerType: string,
  extra: PointerEventInit = {}
): PointerEvent {
  return new TestPointerEvent('pointerdown', {
    pointerType,
    button: 0,
    clientX: 10,
    clientY: 20,
    ...extra
  }) as unknown as PointerEvent
}

function mockHost(
  navMode: AcExHtmlNavMode | null,
  overrides: Partial<AcExIdlePointerHost> = {}
): AcExIdlePointerHost {
  return {
    navMode: () => navMode,
    shouldIgnoreCompatMouse: () => false,
    startTouchBox: jest.fn(),
    startMouseBox: jest.fn(),
    finishMouseBox: jest.fn().mockReturnValue(false),
    handleNavPointerDown: jest.fn().mockReturnValue(false),
    applyClickSelect: jest.fn().mockReturnValue(false),
    ...overrides
  }
}

describe('AcExDesktopIdlePointerStrategy', () => {
  const strategy = new AcExDesktopIdlePointerStrategy()

  it('starts a touch box in select and zoom-window, not pan', () => {
    expect(strategy.allowsTouchBox('select')).toBe(true)
    expect(strategy.allowsTouchBox('zoom-window')).toBe(true)
    expect(strategy.allowsTouchBox('pan')).toBe(false)
  })

  it('starts a long-press box on touch in select mode', () => {
    const host = mockHost('select')
    expect(strategy.onPointerDown(pointerEvent('touch'), host)).toBe(true)
    expect(host.startTouchBox).toHaveBeenCalledWith(
      'select',
      expect.any(TestPointerEvent)
    )
    expect(host.startMouseBox).not.toHaveBeenCalled()
  })

  it('does not start a touch box in pan mode', () => {
    const host = mockHost('pan')
    strategy.onPointerDown(pointerEvent('touch'), host)
    expect(host.startTouchBox).not.toHaveBeenCalled()
  })

  it('starts an immediate mouse box in select mode', () => {
    const host = mockHost('select')
    expect(strategy.onPointerDown(pointerEvent('mouse'), host)).toBe(true)
    expect(host.startMouseBox).toHaveBeenCalled()
    expect(host.startTouchBox).not.toHaveBeenCalled()
  })

  it('ignores leftover mouse after a touch gesture', () => {
    const host = mockHost('select', { shouldIgnoreCompatMouse: () => true })
    expect(strategy.onPointerDown(pointerEvent('mouse'), host)).toBe(true)
    expect(host.startMouseBox).not.toHaveBeenCalled()
  })
})

describe('AcExMobileIdlePointerStrategy', () => {
  const strategy = new AcExMobileIdlePointerStrategy()

  it('starts a touch box in pan so hidden Select still box-selects', () => {
    expect(strategy.allowsTouchBox('pan')).toBe(true)
    const host = mockHost('pan')
    expect(strategy.onPointerDown(pointerEvent('touch'), host)).toBe(true)
    expect(host.startTouchBox).toHaveBeenCalledWith(
      'select',
      expect.any(TestPointerEvent)
    )
  })

  it('maps zoom-window touch to a zoom box, not select', () => {
    const host = mockHost('zoom-window')
    strategy.onPointerDown(pointerEvent('touch'), host)
    expect(host.startTouchBox).toHaveBeenCalledWith(
      'zoom-window',
      expect.any(TestPointerEvent)
    )
  })

  it('still starts a mouse box when Select is the active tool', () => {
    const host = mockHost('select')
    strategy.onPointerDown(pointerEvent('mouse'), host)
    expect(host.startMouseBox).toHaveBeenCalled()
  })

  it('does not treat a mouse drag in pan as a box (OrbitControls pans)', () => {
    const host = mockHost('pan')
    strategy.onPointerDown(pointerEvent('mouse'), host)
    expect(host.startMouseBox).not.toHaveBeenCalled()
    expect(host.startTouchBox).not.toHaveBeenCalled()
  })
})
