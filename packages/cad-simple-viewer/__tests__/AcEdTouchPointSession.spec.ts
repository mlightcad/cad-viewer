/**
 * @jest-environment jsdom
 */
import { acedLoupeLocalFromCanvasDelta } from '../src/editor/input/ui/AcEdSnapLoupeMath'
import {
  ACED_TOUCH_MOUSE_GUARD_MS,
  acedArmTouchMouseGuard,
  acedClearFollowingClickSink,
  acedIsGhostClientOrigin,
  acedIsTouchDerivedMouseEvent,
  acedResetTouchMouseGuard,
  acedShouldIgnoreCompatMouse,
  acedSinkFollowingClick,
  AcEdTouchPointSession
} from '../src/editor/input/ui/AcEdTouchPointSession'

describe('AcEdTouchPointSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('commits a short tap without opening the loupe', () => {
    const onLongPress = jest.fn()
    const session = new AcEdTouchPointSession()
    session.start(1, 10, 20, onLongPress, 350)
    expect(session.phase).toBe('pending')
    expect(session.end()).toBe('commit')
    expect(onLongPress).not.toHaveBeenCalled()
    expect(session.phase).toBe('idle')
  })

  it('opens the loupe after the long-press delay and commits on end', () => {
    const onLongPress = jest.fn()
    const session = new AcEdTouchPointSession()
    session.start(1, 10, 20, onLongPress, 350)
    jest.advanceTimersByTime(350)
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(session.phase).toBe('loupe')
    expect(session.end()).toBe('commit')
  })

  it('cancels to pan when moved before the timer', () => {
    const onLongPress = jest.fn()
    const session = new AcEdTouchPointSession()
    session.start(1, 0, 0, onLongPress, 350)
    expect(session.move(20, 0, true)).toBe('panning')
    expect(session.phase).toBe('panning')
    jest.advanceTimersByTime(350)
    expect(onLongPress).not.toHaveBeenCalled()
    expect(session.end()).toBe('ignore')
  })

  it('does not cancel to pan when cancelOnMove is false', () => {
    const session = new AcEdTouchPointSession()
    session.start(1, 0, 0, () => undefined, 350)
    expect(session.move(40, 0, false)).toBe('continue')
    expect(session.phase).toBe('pending')
  })
})

describe('acedSinkFollowingClick', () => {
  afterEach(() => {
    acedResetTouchMouseGuard()
    jest.useRealTimers()
  })

  it('stops the next click so a new point prompt is not auto-committed', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    acedSinkFollowingClick()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).not.toHaveBeenCalled()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
  })

  it('can be cleared so a later mouse click is not eaten', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    acedSinkFollowingClick()
    acedClearFollowingClickSink()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
  })

  it('expires so a later mouse click is not eaten if no leftover click arrives', () => {
    jest.useFakeTimers()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    acedSinkFollowingClick()
    jest.advanceTimersByTime(ACED_TOUCH_MOUSE_GUARD_MS)
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
    jest.useRealTimers()
  })
})

describe('acedShouldIgnoreCompatMouse', () => {
  afterEach(() => {
    acedResetTouchMouseGuard()
  })

  it('ignores mouse after a touch pick so a second nearby point is not committed', () => {
    acedArmTouchMouseGuard(1000)
    expect(acedShouldIgnoreCompatMouse(1000)).toBe(true)
    expect(
      acedShouldIgnoreCompatMouse(1000 + ACED_TOUCH_MOUSE_GUARD_MS - 1)
    ).toBe(true)
    expect(acedShouldIgnoreCompatMouse(1000 + ACED_TOUCH_MOUSE_GUARD_MS)).toBe(
      false
    )
  })

  it('stays armed while the following-click sink is still listening', () => {
    acedSinkFollowingClick()
    expect(acedShouldIgnoreCompatMouse(1e12)).toBe(true)
    acedClearFollowingClickSink()
    expect(acedShouldIgnoreCompatMouse(1e12)).toBe(false)
  })
})

describe('acedIsGhostClientOrigin', () => {
  it('detects the (0, 0) leftover used as a canvas top-left pick', () => {
    expect(acedIsGhostClientOrigin({ clientX: 0, clientY: 0 })).toBe(true)
    expect(acedIsGhostClientOrigin({ clientX: 1, clientY: 0 })).toBe(false)
  })
})

describe('acedIsTouchDerivedMouseEvent', () => {
  it('treats pointerType touch as touch-derived', () => {
    expect(
      acedIsTouchDerivedMouseEvent({ pointerType: 'touch' } as PointerEvent)
    ).toBe(true)
    expect(
      acedIsTouchDerivedMouseEvent({ pointerType: 'mouse' } as PointerEvent)
    ).toBe(false)
  })

  it('treats sourceCapabilities.firesTouchEvents as touch-derived', () => {
    expect(
      acedIsTouchDerivedMouseEvent({
        sourceCapabilities: { firesTouchEvents: true }
      } as unknown as MouseEvent)
    ).toBe(true)
  })
})

describe('acedLoupeLocalFromCanvasDelta', () => {
  it('places the snap glyph at the magnified offset from center', () => {
    expect(acedLoupeLocalFromCanvasDelta(10, -4, 128, 3)).toEqual({
      x: 64 + 30,
      y: 64 - 12
    })
  })
})
