/**
 * @jest-environment jsdom
 */

// Avoid pulling `@mlightcad/cad-simple-viewer` (needs TextDecoder in jsdom)
// just for shared timing constants re-exported via AcExHtmlSimpleViewerUi.
jest.mock('../src/AcExHtmlSimpleViewerUi', () =>
  jest.requireActual(
    '../../cad-simple-viewer/src/editor/input/ui/AcEdTouchPointTiming.ts'
  )
)

import {
  ACEX_TOUCH_MOUSE_GUARD_MS,
  acExArmTouchMouseGuard,
  acExClearFollowingClickSink,
  acExResetTouchMouseGuard,
  acExShouldIgnoreCompatMouse,
  acExSinkFollowingClick,
  AcExTouchPointSession
} from '../src/AcExTouchPointSession'

describe('AcExTouchPointSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
    acExResetTouchMouseGuard()
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

describe('acExShouldIgnoreCompatMouse', () => {
  afterEach(() => {
    acExResetTouchMouseGuard()
  })

  it('ignores mouse after a touch pick so a second nearby point is not committed', () => {
    acExArmTouchMouseGuard(1000)
    expect(acExShouldIgnoreCompatMouse(1000)).toBe(true)
    expect(
      acExShouldIgnoreCompatMouse(1000 + ACEX_TOUCH_MOUSE_GUARD_MS - 1)
    ).toBe(true)
    expect(acExShouldIgnoreCompatMouse(1000 + ACEX_TOUCH_MOUSE_GUARD_MS)).toBe(
      false
    )
  })

  it('stays armed while the following-click sink is still listening', () => {
    acExSinkFollowingClick()
    expect(acExShouldIgnoreCompatMouse(1e12)).toBe(true)
    acExClearFollowingClickSink()
    expect(acExShouldIgnoreCompatMouse(1e12)).toBe(false)
  })
})

describe('acExSinkFollowingClick', () => {
  afterEach(() => {
    acExResetTouchMouseGuard()
  })

  it('eats the leftover click after a touch pick', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    acExSinkFollowingClick()
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
    acExSinkFollowingClick()
    jest.advanceTimersByTime(ACEX_TOUCH_MOUSE_GUARD_MS)
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
    jest.useRealTimers()
  })
})
