/**
 * @jest-environment jsdom
 */
import { TextDecoder, TextEncoder } from 'util'

Object.assign(globalThis, { TextDecoder, TextEncoder })

import { AcApSettingManager } from '../src/app/AcApSettingManager'
import {
  ACED_SIMULATED_MOUSE_OFFSET_Y_PX,
  AcEdLoupeTouchPickStrategy,
  AcEdSimulatedMouseTouchPickStrategy,
  acedTouchPickStrategy
} from '../src/editor/input/ui/AcEdTouchPickStrategy'

function installLocalStorageMock() {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      }
    },
    configurable: true
  })
}

describe('AcEdLoupeTouchPickStrategy', () => {
  const strategy = new AcEdLoupeTouchPickStrategy()

  it('maps the sample to the finger', () => {
    expect(strategy.mapFingerToSample(100, 200)).toEqual({ x: 100, y: 200 })
  })

  it('shows the snap loupe HUD', () => {
    const host = {
      refreshSnapLoupe: jest.fn(),
      hideSnapLoupe: jest.fn(),
      refreshSimulatedCursor: jest.fn(),
      hideSimulatedCursor: jest.fn()
    }
    strategy.showPreciseHud(host, 10, 20, null)
    expect(host.hideSimulatedCursor).toHaveBeenCalled()
    expect(host.refreshSnapLoupe).toHaveBeenCalledWith(10, 20, null)
  })
})

describe('AcEdSimulatedMouseTouchPickStrategy', () => {
  const strategy = new AcEdSimulatedMouseTouchPickStrategy()

  it('offsets the sample above the finger', () => {
    expect(strategy.mapFingerToSample(100, 200)).toEqual({
      x: 100,
      y: 200 - ACED_SIMULATED_MOUSE_OFFSET_Y_PX
    })
  })

  it('clamps the sample to the top of the viewport', () => {
    expect(strategy.mapFingerToSample(40, 10).y).toBe(0)
  })

  it('shows the simulated-mouse crosshair HUD', () => {
    const host = {
      refreshSnapLoupe: jest.fn(),
      hideSnapLoupe: jest.fn(),
      refreshSimulatedCursor: jest.fn(),
      hideSimulatedCursor: jest.fn()
    }
    strategy.showPreciseHud(host, 10, 20)
    expect(host.hideSnapLoupe).toHaveBeenCalled()
    expect(host.refreshSimulatedCursor).toHaveBeenCalledWith(10, 20)
  })
})

describe('acedTouchPickStrategy', () => {
  beforeEach(() => {
    installLocalStorageMock()
    AcApSettingManager.resetInstanceForTesting()
  })

  afterEach(() => {
    AcApSettingManager.resetInstanceForTesting()
  })

  it('defaults to simulated mouse', () => {
    expect(acedTouchPickStrategy()).toBeInstanceOf(
      AcEdSimulatedMouseTouchPickStrategy
    )
  })

  it('returns loupe strategy when the setting is off', () => {
    AcApSettingManager.instance.set('useSimulatedMouseOnTouch', false)
    expect(acedTouchPickStrategy()).toBeInstanceOf(AcEdLoupeTouchPickStrategy)
  })
})
