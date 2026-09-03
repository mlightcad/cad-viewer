/**
 * @jest-environment jsdom
 */
import {
  ACEX_SIMULATED_MOUSE_OFFSET_Y_PX,
  ACEX_SIMULATED_MOUSE_STORAGE_KEY,
  AcExLoupeTouchPickStrategy,
  AcExSimulatedMouseTouchPickStrategy,
  acExIsSimulatedMouseEnabled,
  acExSetSimulatedMouseEnabled,
  acExTouchPickStrategy
} from '../src/AcExTouchPickStrategy'

describe('AcExTouchPickStrategy', () => {
  afterEach(() => {
    localStorage.removeItem(ACEX_SIMULATED_MOUSE_STORAGE_KEY)
  })

  it('defaults to simulated mouse when unset', () => {
    expect(acExIsSimulatedMouseEnabled()).toBe(true)
    expect(acExTouchPickStrategy()).toBeInstanceOf(
      AcExSimulatedMouseTouchPickStrategy
    )
  })

  it('returns loupe strategy when disabled', () => {
    acExSetSimulatedMouseEnabled(false)
    expect(acExTouchPickStrategy()).toBeInstanceOf(AcExLoupeTouchPickStrategy)
  })

  it('offsets the simulated-mouse sample above the finger', () => {
    const strategy = new AcExSimulatedMouseTouchPickStrategy()
    expect(strategy.mapFingerToSample(80, 120)).toEqual({
      x: 80,
      y: 120 - ACEX_SIMULATED_MOUSE_OFFSET_Y_PX
    })
  })

  it('keeps loupe samples at the finger', () => {
    const strategy = new AcExLoupeTouchPickStrategy()
    expect(strategy.mapFingerToSample(80, 120)).toEqual({ x: 80, y: 120 })
  })
})
