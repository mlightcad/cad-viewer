/**
 * @jest-environment jsdom
 */
import type { AcEdPromptBoxOptions } from '../src/editor/input/prompt/AcEdPromptBoxOptions'
import { AcEdPromptBoxResult } from '../src/editor/input/prompt/AcEdPromptBoxResult'
import { AcEdPromptStatus } from '../src/editor/input/prompt/AcEdPromptStatus'
import {
  type AcEdBoxPromptHost,
  AcEdDesktopInteractionStrategy,
  acedInteractionStrategy,
  AcEdMobileInteractionStrategy
} from '../src/editor/input/ui/AcEdInteractionStrategy'
import { AcEdViewMode } from '../src/editor/view/AcEdViewMode'

describe('AcEdDesktopInteractionStrategy', () => {
  const strategy = new AcEdDesktopInteractionStrategy()

  it('allows idle touch box only in selection mode', () => {
    expect(strategy.canIdleTouchBox(AcEdViewMode.SELECTION)).toBe(true)
    expect(strategy.canIdleTouchBox(AcEdViewMode.PAN)).toBe(false)
  })

  it('uses desktop point-prompt chrome defaults', () => {
    expect(strategy.point.showsConfirmedPointMarks).toBe(false)
    expect(strategy.point.usesSessionChrome).toBe(false)
    expect(strategy.point.swallowsPromptContextMenu).toBe(false)
    expect(strategy.point.showsCursorDynamicInput).toBe(true)
    expect(strategy.point.showsSnapLoupeOnTouchPick).toBe(false)
  })

  it('acquires a box via two point prompts', async () => {
    const twoPoint = new AcEdPromptBoxResult(AcEdPromptStatus.OK)
    const host: AcEdBoxPromptHost = {
      acquireTwoPointBox: jest.fn().mockResolvedValue(twoPoint),
      acquireHoldDragBox: jest.fn()
    }
    const options = {} as AcEdPromptBoxOptions
    await expect(strategy.acquireBox(host, options)).resolves.toBe(twoPoint)
    expect(host.acquireTwoPointBox).toHaveBeenCalledWith(options)
    expect(host.acquireHoldDragBox).not.toHaveBeenCalled()
  })
})

describe('AcEdMobileInteractionStrategy', () => {
  const strategy = new AcEdMobileInteractionStrategy()

  it('allows idle touch box in selection and pan', () => {
    expect(strategy.canIdleTouchBox(AcEdViewMode.SELECTION)).toBe(true)
    expect(strategy.canIdleTouchBox(AcEdViewMode.PAN)).toBe(true)
  })

  it('uses mobile point-prompt chrome defaults', () => {
    expect(strategy.point.showsConfirmedPointMarks).toBe(true)
    expect(strategy.point.usesSessionChrome).toBe(true)
    expect(strategy.point.swallowsPromptContextMenu).toBe(true)
    expect(strategy.point.showsCursorDynamicInput).toBe(false)
    expect(strategy.point.showsSnapLoupeOnTouchPick).toBe(true)
  })

  it('acquires a box via hold-drag', async () => {
    const holdDrag = new AcEdPromptBoxResult(AcEdPromptStatus.OK)
    const host: AcEdBoxPromptHost = {
      acquireTwoPointBox: jest.fn(),
      acquireHoldDragBox: jest.fn().mockResolvedValue(holdDrag)
    }
    const options = {} as AcEdPromptBoxOptions
    await expect(strategy.acquireBox(host, options)).resolves.toBe(holdDrag)
    expect(host.acquireHoldDragBox).toHaveBeenCalledWith(options)
    expect(host.acquireTwoPointBox).not.toHaveBeenCalled()
  })
})

describe('acedInteractionStrategy', () => {
  it('returns a strategy instance', () => {
    const strategy = acedInteractionStrategy()
    expect(strategy.canIdleTouchBox).toEqual(expect.any(Function))
    expect(strategy.acquireBox).toEqual(expect.any(Function))
  })
})
