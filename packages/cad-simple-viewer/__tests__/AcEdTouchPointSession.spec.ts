import { AcEdTouchPointSession } from '../src/editor/input/ui/AcEdTouchPointSession'
import { acedLoupeLocalFromCanvasDelta } from '../src/editor/input/ui/AcEdSnapLoupeMath'

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

describe('acedLoupeLocalFromCanvasDelta', () => {
  it('places the snap glyph at the magnified offset from center', () => {
    expect(acedLoupeLocalFromCanvasDelta(10, -4, 128, 3)).toEqual({
      x: 64 + 30,
      y: 64 - 12
    })
  })
})
