/**
 * @jest-environment jsdom
 */
jest.mock('../src/AcExHtmlSimpleViewerUi', () => ({
  ACED_TOUCH_POINT_LONG_PRESS_MS: 1000,
  ACED_TOUCH_POINT_MOVE_CANCEL_PX: 10
}))

import {
  ACEX_TOUCH_MOUSE_GUARD_MS,
  acexArmTouchMouseGuard,
  acexClearFollowingClickSink,
  acexResetTouchMouseGuard,
  acexShouldIgnoreCompatMouse,
  acexSinkFollowingClick,
  AcExTouchPointSession
} from '../src/AcExTouchPointSession'

describe('AcExTouchPointSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
    acexResetTouchMouseGuard()
  })

  it('commits a short tap without opening the loupe', () => {
    const onLongPress = jest.fn()
    const session = new AcExTouchPointSession()
    session.start(1, 10, 20, onLongPress, 350)
    expect(session.phase).toBe('pending')
    expect(session.end()).toBe('commit')
    expect(onLongPress).not.toHaveBeenCalled()
    expect(session.phase).toBe('idle')
  })

  it('opens the loupe after the long-press delay and commits on end', () => {
    const onLongPress = jest.fn()
    const session = new AcExTouchPointSession()
    session.start(1, 10, 20, onLongPress, 350)
    jest.advanceTimersByTime(350)
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(session.phase).toBe('loupe')
    expect(session.end()).toBe('commit')
  })
})

describe('AcExShouldIgnoreCompatMouse', () => {
  afterEach(() => {
    acexResetTouchMouseGuard()
  })

  it('ignores mouse after a touch pick so a second nearby point is not committed', () => {
    acexArmTouchMouseGuard(1000)
    expect(acexShouldIgnoreCompatMouse(1000)).toBe(true)
    expect(
      acexShouldIgnoreCompatMouse(1000 + ACEX_TOUCH_MOUSE_GUARD_MS - 1)
    ).toBe(true)
    expect(acexShouldIgnoreCompatMouse(1000 + ACEX_TOUCH_MOUSE_GUARD_MS)).toBe(
      false
    )
  })

  it('stays armed while the following-click sink is still listening', () => {
    acexSinkFollowingClick()
    expect(acexShouldIgnoreCompatMouse(1e12)).toBe(true)
    acexClearFollowingClickSink()
    expect(acexShouldIgnoreCompatMouse(1e12)).toBe(false)
  })
})

describe('AcExSinkFollowingClick', () => {
  afterEach(() => {
    acexResetTouchMouseGuard()
  })

  it('eats the leftover click after a touch pick', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    acexSinkFollowingClick()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).not.toHaveBeenCalled()
    target.remove()
  })

  it('expires so a later mouse click is not eaten if no leftover click arrives', () => {
    jest.useFakeTimers()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    acexSinkFollowingClick()
    jest.advanceTimersByTime(ACEX_TOUCH_MOUSE_GUARD_MS)
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
    jest.useRealTimers()
  })
})
