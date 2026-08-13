jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      sendStringToExecute: jest.fn()
    }
  }
}))

jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: {
    getActiveInputBox: jest.fn(() => null)
  }
}))

import { AcApDocManager } from '../src/app'
import { AcEdViewKeyHandler } from '../src/view/AcEdViewKeyHandler'
import type { AcTrView2d } from '../src/view/AcTrView2d'

function keyboardEvent(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    code: 'KeyZ',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    isComposing: false,
    keyCode: 0,
    preventDefault: jest.fn(),
    ...partial
  } as KeyboardEvent
}

function createMockView(
  isEditorActive = false,
  htmlSelection: {
    hasSelection?: boolean
    deleted?: boolean
    groups?: { id: string; layer: string }[]
  } = {}
): AcTrView2d {
  return {
    editor: { isActive: isEditorActive },
    selectionSet: { clear: jest.fn() },
    htmlTransientManager: {
      hasSelection: jest.fn(() => htmlSelection.hasSelection ?? false),
      deleteSelected: jest.fn(() => htmlSelection.deleted ?? false),
      deselectAll: jest.fn(),
      getSelectedGroups: jest.fn(() => htmlSelection.groups ?? []),
      detach: jest.fn((id: string) => ({ id })),
      groupsOnLayer: jest.fn(() => []),
      has: jest.fn(() => false)
    },
    isDirty: false
  } as unknown as AcTrView2d
}

describe('AcEdViewKeyHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('handleKeyDown maps platform undo/redo keys to commands', () => {
    const handler = new AcEdViewKeyHandler(createMockView())
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock

    handler.handleKeyDown(
      keyboardEvent({ code: 'KeyZ', ctrlKey: true, shiftKey: false })
    )
    expect(sendCommand).toHaveBeenLastCalledWith('undo')

    handler.handleKeyDown(
      keyboardEvent({ code: 'KeyZ', metaKey: true, shiftKey: false })
    )
    expect(sendCommand).toHaveBeenLastCalledWith('undo')

    handler.handleKeyDown(
      keyboardEvent({ code: 'KeyY', ctrlKey: true, shiftKey: false })
    )
    expect(sendCommand).toHaveBeenLastCalledWith('redo')

    handler.handleKeyDown(
      keyboardEvent({ code: 'KeyZ', metaKey: true, shiftKey: true })
    )
    expect(sendCommand).toHaveBeenLastCalledWith('redo')

    handler.handleKeyDown(
      keyboardEvent({ code: 'KeyZ', ctrlKey: true, shiftKey: true })
    )
    expect(sendCommand).toHaveBeenLastCalledWith('redo')

    sendCommand.mockClear()
    handler.handleKeyDown(keyboardEvent({ code: 'KeyA', ctrlKey: true }))
    expect(sendCommand).not.toHaveBeenCalled()
  })

  test('handleKeyDown skips undo/redo while editor input is active', () => {
    const handler = new AcEdViewKeyHandler(createMockView(true))
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock

    const handled = handler.handleKeyDown(
      keyboardEvent({ code: 'KeyZ', ctrlKey: true })
    )

    expect(handled).toBe(false)
    expect(sendCommand).not.toHaveBeenCalled()
  })

  test('Delete detaches a selected measurement overlay without dispatching erase', () => {
    const view = createMockView(false, {
      hasSelection: true,
      groups: [{ id: 'm1', layer: 'measurement' }]
    })
    const handler = new AcEdViewKeyHandler(view)
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Delete' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.detach).toHaveBeenCalledWith('m1')
    expect(view.htmlTransientManager.deleteSelected).not.toHaveBeenCalled()
    expect(sendCommand).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  test('Backspace detaches a selected measurement overlay (macOS delete key)', () => {
    const view = createMockView(false, {
      hasSelection: true,
      groups: [{ id: 'm1', layer: 'measurement' }]
    })
    const handler = new AcEdViewKeyHandler(view)
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Backspace' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.detach).toHaveBeenCalledWith('m1')
    expect(view.htmlTransientManager.deleteSelected).not.toHaveBeenCalled()
    expect(sendCommand).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  test('Delete removes a selected HTML overlay without dispatching erase', () => {
    const view = createMockView(false, { hasSelection: true, deleted: true })
    const handler = new AcEdViewKeyHandler(view)
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Delete' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.deleteSelected).toHaveBeenCalled()
    expect(sendCommand).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  test('Delete falls through to erase when HTML overlay deletion fails', () => {
    const view = createMockView(false, { hasSelection: true, deleted: false })
    const handler = new AcEdViewKeyHandler(view)
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock

    expect(handler.handleKeyDown(keyboardEvent({ code: 'Delete' }))).toBe(false)
    expect(view.htmlTransientManager.deleteSelected).toHaveBeenCalled()
    expect(sendCommand).toHaveBeenCalledWith('erase')
  })

  test('Delete dispatches erase when no HTML overlay is selected', () => {
    const handler = new AcEdViewKeyHandler(createMockView())
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock

    expect(handler.handleKeyDown(keyboardEvent({ code: 'Backspace' }))).toBe(
      false
    )
    expect(sendCommand).toHaveBeenCalledWith('erase')
  })
})
