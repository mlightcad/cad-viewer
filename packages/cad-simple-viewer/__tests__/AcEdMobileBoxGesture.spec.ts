/**
 * @jest-environment jsdom
 */
import { acedAttachMobileBoxGesture } from '../src/editor/input/ui/AcEdMobileBoxGesture'
import { acedResetTouchMouseGuard } from '../src/editor/input/ui/AcEdTouchPointSession'

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'mouse'
  }
}

Object.assign(globalThis, { PointerEvent: TestPointerEvent })

function dispatchPointer(
  target: EventTarget,
  type: string,
  init: PointerEventInit
) {
  target.dispatchEvent(
    new TestPointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      button: 0,
      buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
      ...init
    })
  )
}

describe('acedAttachMobileBoxGesture', () => {
  let element: HTMLElement
  let dispose: () => void

  beforeEach(() => {
    jest.useFakeTimers()
    element = document.createElement('div')
    Object.assign(element, {
      setPointerCapture: jest.fn(),
      releasePointerCapture: jest.fn(),
      hasPointerCapture: jest.fn(() => false)
    })
    document.body.appendChild(element)
  })

  afterEach(() => {
    dispose?.()
    element.remove()
    acedResetTouchMouseGuard()
    jest.useRealTimers()
  })

  it('does not start a box on a short tap', () => {
    const onActivate = jest.fn()
    const onBoxEnd = jest.fn()
    const onTap = jest.fn()
    dispose = acedAttachMobileBoxGesture({
      element,
      onActivate,
      onMove: jest.fn(),
      onBoxEnd,
      onTap
    })

    dispatchPointer(element, 'pointerdown', {
      pointerId: 1,
      clientX: 10,
      clientY: 20
    })
    dispatchPointer(window, 'pointerup', {
      pointerId: 1,
      clientX: 10,
      clientY: 20
    })

    expect(onActivate).not.toHaveBeenCalled()
    expect(onBoxEnd).not.toHaveBeenCalled()
    expect(onTap).toHaveBeenCalledWith(10, 20)
  })

  it('locks the first corner after 1s and commits on release', () => {
    const onActivate = jest.fn()
    const onMove = jest.fn()
    const onBoxEnd = jest.fn()
    const setNavigationEnabled = jest.fn()
    dispose = acedAttachMobileBoxGesture({
      element,
      onActivate,
      onMove,
      onBoxEnd,
      setNavigationEnabled
    })

    dispatchPointer(element, 'pointerdown', {
      pointerId: 7,
      clientX: 40,
      clientY: 50
    })
    jest.advanceTimersByTime(1000)
    expect(onActivate).toHaveBeenCalledWith(40, 50)
    expect(setNavigationEnabled).toHaveBeenCalledWith(false)

    dispatchPointer(element, 'pointermove', {
      pointerId: 7,
      clientX: 120,
      clientY: 80
    })
    expect(onMove).toHaveBeenCalledWith(120, 80)

    dispatchPointer(window, 'pointerup', {
      pointerId: 7,
      clientX: 120,
      clientY: 80
    })
    expect(onBoxEnd).toHaveBeenCalledWith(120, 80, true)
    expect(setNavigationEnabled).toHaveBeenCalledWith(true)
  })

  it('aborts to pan when the finger moves before the long-press', () => {
    const onActivate = jest.fn()
    dispose = acedAttachMobileBoxGesture({
      element,
      onActivate,
      onMove: jest.fn(),
      onBoxEnd: jest.fn()
    })

    dispatchPointer(element, 'pointerdown', {
      pointerId: 2,
      clientX: 0,
      clientY: 0
    })
    dispatchPointer(element, 'pointermove', {
      pointerId: 2,
      clientX: 30,
      clientY: 0
    })
    jest.advanceTimersByTime(1000)
    expect(onActivate).not.toHaveBeenCalled()
  })
})
