/** @jest-environment jsdom */

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      sendStringToExecute: jest.fn(),
      lookupGlobalCmd: jest.fn(() => ({}))
    }
  }
}))

jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: {
    getActiveInputBox: jest.fn(() => null)
  }
}))

import { acedIsConfirmKey } from '../src/editor/input/ui/AcEdKeyboardUtil'
import { AcEdViewKeyHandler } from '../src/view/AcEdViewKeyHandler'
import type { AcTrView2d } from '../src/view/AcTrView2d'

function keydown(
  key: string,
  target: EventTarget,
  init: KeyboardEventInit = {}
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    ...init
  })
  Object.defineProperty(event, 'target', { value: target })
  return event
}

function createView(isActive = false) {
  const inputManager = {
    typeIntoCommandLine: jest.fn(() => true),
    repeatLastCommand: jest.fn()
  }
  const view = {
    editor: { isActive, inputManager },
    selectionSet: { clear: jest.fn() },
    htmlTransientManager: {
      hasSelection: jest.fn(() => false),
      deselectAll: jest.fn()
    }
  } as unknown as AcTrView2d
  return { view, inputManager }
}

describe('AcEdViewKeyHandler typed keys', () => {
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('types printable keys into the command line', () => {
    const { view, inputManager } = createView()
    const handler = new AcEdViewKeyHandler(view)
    const event = keydown('l', canvas)

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(inputManager.typeIntoCommandLine).toHaveBeenCalledWith('l')
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves the key alone when the command line declines it', () => {
    const { view, inputManager } = createView(true)
    inputManager.typeIntoCommandLine.mockReturnValue(false)
    const handler = new AcEdViewKeyHandler(view)
    const event = keydown('l', canvas)

    expect(handler.handleKeyDown(event)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores modifier chords, text fields and named keys', () => {
    const { view, inputManager } = createView()
    const handler = new AcEdViewKeyHandler(view)
    const field = document.createElement('input')
    document.body.appendChild(field)

    handler.handleKeyDown(keydown('a', canvas, { altKey: true }))
    handler.handleKeyDown(keydown('a', field))
    handler.handleKeyDown(
      keydown('F2', canvas, { code: 'F2' } as KeyboardEventInit)
    )

    expect(inputManager.typeIntoCommandLine).not.toHaveBeenCalled()
  })

  it('repeats the last command with Space on an idle view', () => {
    const { view, inputManager } = createView()
    const handler = new AcEdViewKeyHandler(view)
    const event = keydown(' ', canvas)

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(inputManager.repeatLastCommand).toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves Space to prompts, focused buttons and key auto-repeat', () => {
    const active = createView(true)
    new AcEdViewKeyHandler(active.view).handleKeyDown(keydown(' ', canvas))
    expect(active.inputManager.repeatLastCommand).not.toHaveBeenCalled()

    const idle = createView()
    const handler = new AcEdViewKeyHandler(idle.view)
    const button = document.createElement('button')
    document.body.appendChild(button)
    handler.handleKeyDown(keydown(' ', button))
    handler.handleKeyDown(keydown(' ', canvas, { repeat: true }))
    expect(idle.inputManager.repeatLastCommand).not.toHaveBeenCalled()
  })
})

describe('acedIsConfirmKey', () => {
  it('treats Enter and plain Space on non-controls as confirm keys', () => {
    const canvas = document.createElement('canvas')
    const button = document.createElement('button')
    const field = document.createElement('input')

    expect(acedIsConfirmKey(keydown('Enter', field))).toBe(true)
    expect(acedIsConfirmKey(keydown(' ', canvas))).toBe(true)
    expect(acedIsConfirmKey(keydown(' ', document.body))).toBe(true)
    expect(acedIsConfirmKey(keydown(' ', button))).toBe(false)
    expect(acedIsConfirmKey(keydown(' ', field))).toBe(false)
    expect(
      acedIsConfirmKey(keydown(' ', canvas, { shiftKey: false, ctrlKey: true }))
    ).toBe(false)
    expect(acedIsConfirmKey(keydown('a', canvas))).toBe(false)
  })
})
