/** @jest-environment jsdom */

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      sendStringToExecute: jest.fn(),
      lookupLocalCmd: jest.fn((name: string) => ({
        globalName: name,
        localName: name
      })),
      searchCommandsByPrefix: jest.fn(() => []),
      editor: {
        events: {
          commandWillStart: { addEventListener: jest.fn() },
          commandEnded: { addEventListener: jest.fn() }
        }
      }
    }
  },
  AcApSettingManager: {
    instance: {
      isShowCommandLine: true,
      events: { modified: { addEventListener: jest.fn() } }
    }
  }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string, options?: { fallback?: string }) =>
      options?.fallback ?? key,
    cmdDescription: () => '',
    events: { localeChanged: { addEventListener: jest.fn() } }
  }
}))

jest.mock('../src/editor/global/AcEdUiLayout', () => ({
  acedIsMobileOrPadUi: jest.fn(() => false)
}))

import { AcApDocManager, AcApSettingManager } from '../src/app'
import { acedIsMobileOrPadUi } from '../src/editor/global/AcEdUiLayout'
import { AcEdPromptKeywordOptions } from '../src/editor/input/prompt/AcEdPromptKeywordOptions'
import { AcEdCommandLine } from '../src/editor/input/ui/AcEdCommandLine'

const sendStringToExecute = AcApDocManager.instance
  .sendStringToExecute as jest.Mock
const isHandheld = acedIsMobileOrPadUi as jest.Mock

function press(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true
  })
  target.dispatchEvent(event)
  return event
}

describe('AcEdCommandLine keyboard', () => {
  let cli: AcEdCommandLine
  let input: HTMLInputElement
  let junk: HTMLDivElement

  beforeAll(() => {
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // One command line per file: its document-level capture listener cannot be
    // unbound, so extra instances would steal keys from the one under test.
    const container = document.createElement('div')
    document.body.appendChild(container)
    cli = new AcEdCommandLine(container)
    input = container.querySelector('.ml-cli-text') as HTMLInputElement
    junk = document.createElement('div')
    document.body.appendChild(junk)
  })

  beforeEach(() => {
    sendStringToExecute.mockClear()
    isHandheld.mockReturnValue(false)
    AcApSettingManager.instance.isShowCommandLine = true
    ;(document.activeElement as HTMLElement | null)?.blur()
    junk.textContent = ''
    input.value = ''
    cli.setInputReadOnly(false)
    cli.visible = true
    Object.assign(cli as unknown as Record<string, unknown>, {
      activeSession: undefined,
      spaceInsertsText: false
    })
  })

  it('repeats the last command when Space is pressed with empty input', () => {
    input.focus()
    cli.executeCommand('LINE')
    expect(sendStringToExecute).toHaveBeenLastCalledWith('LINE')

    press(input, ' ')
    expect(sendStringToExecute).toHaveBeenCalledTimes(2)
    expect(sendStringToExecute).toHaveBeenLastCalledWith('LINE')
  })

  it('commits typed input when Space confirms', () => {
    input.focus()
    input.value = 'CIRCLE'

    press(input, ' ')
    expect(sendStringToExecute).toHaveBeenCalledWith('CIRCLE')
  })

  it('keeps Space as text for string prompts that allow spaces', async () => {
    const options = new AcEdPromptKeywordOptions('Specify description')
    const pending = cli.getPromptInput<string>(
      options,
      text => (text ? text : null),
      {
        mode: 'string',
        allowNone: false,
        allowTyping: true,
        spaceInsertsText: true
      }
    )
    await Promise.resolve()

    input.value = 'Fire'
    const spaceEvent = press(input, ' ')
    expect(sendStringToExecute).not.toHaveBeenCalled()
    expect(spaceEvent.defaultPrevented).toBe(false)

    press(input, 'Enter')
    await expect(pending).resolves.toEqual({
      kind: 'value',
      value: 'Fire'
    })
  })

  it('repeats the last command from the canvas with Space', () => {
    input.focus()
    cli.executeCommand('LINE')
    sendStringToExecute.mockClear()
    input.blur()

    press(document.body, ' ')
    expect(sendStringToExecute).toHaveBeenCalledWith('LINE')
  })

  it('takes typed keys without clicking the command line first', () => {
    expect(document.activeElement).not.toBe(input)

    press(document.body, 'l')

    expect(input.value).toBe('l')
    expect(document.activeElement).toBe(input)
    expect(sendStringToExecute).not.toHaveBeenCalled()
  })

  it('does not capture a key again once the input owns focus', () => {
    input.focus()

    press(document.body, 'l')
    expect(input.value).toBe('')
  })

  it('re-shows the command line when typing starts while it is hidden', () => {
    cli.visible = false
    AcApSettingManager.instance.isShowCommandLine = false

    press(document.body, 'c')
    expect(AcApSettingManager.instance.isShowCommandLine).toBe(true)
  })

  it('does not capture typed keys on handheld layouts', () => {
    isHandheld.mockReturnValue(true)

    press(document.body, 'c')
    expect(input.value).toBe('')
  })

  it('does not capture typed keys while a modal dialog is open', () => {
    const backdrop = document.createElement('div')
    backdrop.className = 'ml-ui-dialog-backdrop'
    junk.appendChild(backdrop)

    press(document.body, 'c')
    expect(input.value).toBe('')
    expect(document.activeElement).not.toBe(input)
  })

  it('leaves Space to the focused control instead of confirming', () => {
    const button = document.createElement('button')
    junk.appendChild(button)
    button.focus()

    press(button, ' ')
    expect(sendStringToExecute).not.toHaveBeenCalled()
    expect(input.value).toBe('')
  })

  it('returns focus to the canvas when Escape leaves the input', () => {
    input.focus()
    expect(document.activeElement).toBe(input)

    press(input, 'Escape')
    expect(document.activeElement).toBe(document.body)
  })
})
