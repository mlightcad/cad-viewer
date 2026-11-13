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

import { AcApDocManager } from '../src/app'
import {
  AcApMarkupHistory,
  AcApSessionUndo
} from '../src/command/markup/AcApMarkupHistory'
import { acapSetMarkupBagFactory } from '../src/command/markup/AcApMarkupSession'
import { AcApMarkupStore } from '../src/command/markup/AcApMarkupStore'
import { AcEdViewKeyHandler } from '../src/view/AcEdViewKeyHandler'
import type { AcTrView2d } from '../src/view/AcTrView2d'

acapSetMarkupBagFactory(() => ({
  store: new AcApMarkupStore(),
  presenter: {} as never,
  history: new AcApMarkupHistory(),
  sessionUndo: new AcApSessionUndo()
}))

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
    isDirty: false,
    isHtmlDirty: false
  } as unknown as AcTrView2d
}

describe('AcEdViewKeyHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Some tests switch lookupGlobalCmd to "not found"; restore the default.
    ;(AcApDocManager.instance.lookupGlobalCmd as jest.Mock).mockImplementation(
      () => ({})
    )
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

  test('Delete skips erase in read/review mode when no HTML overlay is selected', () => {
    const lookup = AcApDocManager.instance.lookupGlobalCmd as jest.Mock
    lookup.mockReturnValueOnce(undefined)
    const handler = new AcEdViewKeyHandler(createMockView())
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock

    expect(handler.handleKeyDown(keyboardEvent({ code: 'Delete' }))).toBe(false)
    expect(lookup).toHaveBeenCalledWith('erase')
    expect(sendCommand).not.toHaveBeenCalled()
  })

  test('Delete still removes measurement overlay in read/review mode', () => {
    const lookup = AcApDocManager.instance.lookupGlobalCmd as jest.Mock
    lookup.mockReturnValue(undefined)
    const view = createMockView(false, {
      hasSelection: true,
      groups: [{ id: 'm1', layer: 'measurement' }]
    })
    const handler = new AcEdViewKeyHandler(view)
    const sendCommand = AcApDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Delete' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.detach).toHaveBeenCalledWith('m1')
    expect(sendCommand).not.toHaveBeenCalled()
    expect(lookup).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  describe('clipboard shortcuts', () => {
    const cases: [Partial<KeyboardEvent>, string][] = [
      [{ code: 'KeyC', ctrlKey: true }, 'copyclip'],
      [{ code: 'KeyC', metaKey: true }, 'copyclip'],
      [{ code: 'KeyX', ctrlKey: true }, 'cutclip'],
      [{ code: 'KeyX', metaKey: true }, 'cutclip'],
      [{ code: 'KeyV', ctrlKey: true }, 'pasteclip'],
      [{ code: 'KeyV', metaKey: true }, 'pasteclip'],
      [{ code: 'KeyC', ctrlKey: true, shiftKey: true }, 'copybase'],
      [{ code: 'KeyC', metaKey: true, shiftKey: true }, 'copybase'],
      [{ code: 'KeyV', ctrlKey: true, shiftKey: true }, 'pasteblock'],
      [{ code: 'KeyV', metaKey: true, shiftKey: true }, 'pasteblock']
    ]

    test.each(cases)('%p dispatches %s', (partial, command) => {
      const handler = new AcEdViewKeyHandler(createMockView())
      const sendCommand = AcApDocManager.instance
        .sendStringToExecute as jest.Mock
      const lookup = AcApDocManager.instance.lookupGlobalCmd as jest.Mock
      const event = keyboardEvent(partial)

      expect(handler.handleKeyDown(event)).toBe(true)
      expect(lookup).toHaveBeenCalledWith(command)
      expect(sendCommand).toHaveBeenCalledTimes(1)
      expect(sendCommand).toHaveBeenCalledWith(command)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    test('ignores clipboard keys without Ctrl/Cmd', () => {
      const handler = new AcEdViewKeyHandler(createMockView())
      const sendCommand = AcApDocManager.instance
        .sendStringToExecute as jest.Mock

      handler.handleKeyDown(keyboardEvent({ code: 'KeyC' }))
      handler.handleKeyDown(
        keyboardEvent({ code: 'KeyX', ctrlKey: true, shiftKey: true })
      )

      expect(sendCommand).not.toHaveBeenCalled()
    })

    test.each(['INPUT', 'TEXTAREA'])(
      'keeps native copy/paste in a focused %s',
      tagName => {
        const handler = new AcEdViewKeyHandler(createMockView())
        const sendCommand = AcApDocManager.instance
          .sendStringToExecute as jest.Mock
        const target = {
          tagName,
          isContentEditable: false,
          classList: { contains: () => false },
          value: '',
          readOnly: false
        } as unknown as EventTarget
        const event = keyboardEvent({ code: 'KeyV', ctrlKey: true, target })

        expect(handler.handleKeyDown(event)).toBe(false)
        expect(sendCommand).not.toHaveBeenCalled()
        expect(event.preventDefault).not.toHaveBeenCalled()
      }
    )

    test('keeps native copy/paste in a contenteditable element', () => {
      const handler = new AcEdViewKeyHandler(createMockView())
      const sendCommand = AcApDocManager.instance
        .sendStringToExecute as jest.Mock
      const target = {
        tagName: 'DIV',
        isContentEditable: true
      } as unknown as EventTarget
      const event = keyboardEvent({ code: 'KeyC', metaKey: true, target })

      expect(handler.handleKeyDown(event)).toBe(false)
      expect(sendCommand).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    test('skips clipboard shortcuts while a command is active', () => {
      const handler = new AcEdViewKeyHandler(createMockView(true))
      const sendCommand = AcApDocManager.instance
        .sendStringToExecute as jest.Mock
      const event = keyboardEvent({ code: 'KeyC', ctrlKey: true })

      expect(handler.handleKeyDown(event)).toBe(false)
      expect(sendCommand).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    test('leaves the event alone when the command is not registered', () => {
      const lookup = AcApDocManager.instance.lookupGlobalCmd as jest.Mock
      lookup.mockReturnValue(undefined)
      const handler = new AcEdViewKeyHandler(createMockView())
      const sendCommand = AcApDocManager.instance
        .sendStringToExecute as jest.Mock
      const event = keyboardEvent({ code: 'KeyV', ctrlKey: true })

      expect(handler.handleKeyDown(event)).toBe(false)
      expect(lookup).toHaveBeenCalledWith('pasteclip')
      expect(sendCommand).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    describe('in the empty command line', () => {
      const commandLine = () =>
        ({
          tagName: 'INPUT',
          isContentEditable: false,
          classList: {
            contains: (name: string) => name === 'ml-cli-text'
          },
          value: '',
          readOnly: false
        }) as unknown as EventTarget
      const docManager = AcApDocManager.instance as unknown as {
        clipboard?: { hasContent: boolean }
      }

      beforeEach(() => {
        ;(AcApDocManager.instance.lookupGlobalCmd as jest.Mock).mockReturnValue(
          {}
        )
      })

      afterEach(() => {
        delete docManager.clipboard
      })

      test('keeps native text paste while the app clipboard is empty', () => {
        docManager.clipboard = { hasContent: false }
        const handler = new AcEdViewKeyHandler(createMockView())
        const sendCommand = AcApDocManager.instance
          .sendStringToExecute as jest.Mock
        const event = keyboardEvent({
          code: 'KeyV',
          ctrlKey: true,
          target: commandLine()
        })

        expect(handler.handleKeyDown(event)).toBe(false)
        expect(sendCommand).not.toHaveBeenCalled()
        expect(event.preventDefault).not.toHaveBeenCalled()
      })

      test('pastes drawing objects when the app clipboard has them', () => {
        docManager.clipboard = { hasContent: true }
        const handler = new AcEdViewKeyHandler(createMockView())
        const sendCommand = AcApDocManager.instance
          .sendStringToExecute as jest.Mock
        const event = keyboardEvent({
          code: 'KeyV',
          ctrlKey: true,
          target: commandLine()
        })

        expect(handler.handleKeyDown(event)).toBe(true)
        expect(sendCommand).toHaveBeenCalledWith('pasteclip')
      })

      test('copies the selection even from the command line', () => {
        const handler = new AcEdViewKeyHandler(createMockView())
        const sendCommand = AcApDocManager.instance
          .sendStringToExecute as jest.Mock
        const event = keyboardEvent({
          code: 'KeyC',
          ctrlKey: true,
          target: commandLine()
        })

        expect(handler.handleKeyDown(event)).toBe(true)
        expect(sendCommand).toHaveBeenCalledWith('copyclip')
      })
    })
  })
})
