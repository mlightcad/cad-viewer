jest.mock('../src/AcExHtmlSimpleViewerUi', () => ({
  ACED_TOUCH_POINT_LONG_PRESS_MS: 1000,
  ACED_TOUCH_POINT_MOVE_CANCEL_PX: 10
}))

import {
  acexCssRectToWcsBox,
  acexCssTopLeftRectToGl,
  acexIntersectCssRects,
  acexWcsBoxToCssRect
} from '../src/AcExCssRect'
import {
  ACEX_SNAP_LOUPE_GAP_BELOW_STATUS_PX,
  ACEX_SNAP_LOUPE_INSET_PX,
  ACEX_SNAP_LOUPE_SIZE_PX,
  ACEX_SNAP_LOUPE_TOP_INSET_PX,
  acexLoupeLocalFromCanvasDelta,
  acexResolveLoupePlacement
} from '../src/AcExSnapLoupeMath'
import { AcExTouchPointSession } from '../src/AcExTouchPointSession'

describe('AcExCssRect', () => {
  it('converts CSS top-left rectangles to WebGL bottom-left', () => {
    expect(
      acexCssTopLeftRectToGl({ x: 8, y: 8, width: 128, height: 128 }, 600)
    ).toEqual({ x: 8, y: 464, width: 128, height: 128 })
  })

  it('maps a world box onto a screen rect and back', () => {
    const viewBox = { minX: 0, minY: 0, maxX: 100, maxY: 50 }
    const screen = { x: 10, y: 20, width: 200, height: 100 }
    const css = acexWcsBoxToCssRect(
      { minX: 25, minY: 10, maxX: 75, maxY: 40 },
      viewBox,
      screen
    )
    expect(css.x).toBeCloseTo(60)
    expect(css.width).toBeCloseTo(100)
    expect(css.height).toBeCloseTo(60)
    const roundTrip = acexCssRectToWcsBox(css, viewBox, screen)
    expect(roundTrip.minX).toBeCloseTo(25)
    expect(roundTrip.maxY).toBeCloseTo(40)
    expect(acexIntersectCssRects(screen, { x: 0, y: 0, width: 5, height: 5 })).toBeNull()
  })
})

describe('AcExTouchPointSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('defers the loupe until the long-press timer and commits on end', () => {
    const onLongPress = jest.fn()
    const session = new AcExTouchPointSession()
    session.start(7, 1, 2, onLongPress, 350)
    expect(session.end()).toBe('commit')
    session.start(7, 1, 2, onLongPress, 350)
    jest.advanceTimersByTime(350)
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(session.end()).toBe('commit')
  })

  it('uses one second as the default long-press delay', () => {
    const onLongPress = jest.fn()
    const session = new AcExTouchPointSession()
    session.start(7, 1, 2, onLongPress)
    jest.advanceTimersByTime(999)
    expect(onLongPress).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels to pan when moved before the timer', () => {
    const onLongPress = jest.fn()
    const session = new AcExTouchPointSession()
    session.start(7, 0, 0, onLongPress, 350)
    expect(session.move(20, 0, true)).toBe('panning')
    expect(session.phase).toBe('panning')
    jest.advanceTimersByTime(350)
    expect(onLongPress).not.toHaveBeenCalled()
    expect(session.end()).toBe('ignore')
  })
})

describe('AcExLoupeLocalFromCanvasDelta', () => {
  it('scales canvas deltas by the loupe zoom about the center', () => {
    expect(acexLoupeLocalFromCanvasDelta(2, 4, 128, 3)).toEqual({
      x: 70,
      y: 76
    })
  })
})

describe('acexResolveLoupePlacement', () => {
  it('places the loupe at the top inset', () => {
    const host = {
      getBoundingClientRect: () => ({ top: 0, left: 0 })
    } as HTMLElement
    expect(acexResolveLoupePlacement(host, null)).toEqual({
      x: ACEX_SNAP_LOUPE_INSET_PX,
      y: ACEX_SNAP_LOUPE_INSET_PX,
      size: ACEX_SNAP_LOUPE_SIZE_PX
    })
    expect(
      acexResolveLoupePlacement(host, {
        hidden: false,
        offsetParent: {},
        getBoundingClientRect: () => ({
          top: 108,
          left: 8,
          bottom: 144,
          right: 392,
          width: 384,
          height: 36
        })
      } as HTMLElement)
    ).toEqual({
      x: ACEX_SNAP_LOUPE_INSET_PX,
      y: ACEX_SNAP_LOUPE_INSET_PX,
      size: ACEX_SNAP_LOUPE_SIZE_PX
    })
  })
})
