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
          commandWillStart: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          },
          commandEnded: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          }
        }
      }
    }
  },
  AcApSettingManager: {
    instance: { isShowCommandLine: true }
  }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string, options?: { fallback?: string }) =>
      options?.fallback ?? key,
    cmdDescription: () => '',
    events: {
      localeChanged: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    }
  }
}))

import { AcApDocManager } from '../src/app'
import { AcEdPromptKeywordOptions } from '../src/editor/input/prompt/AcEdPromptKeywordOptions'
import { AcEdCommandLine } from '../src/editor/input/ui/AcEdCommandLine'

const sendStringToExecute = AcApDocManager.instance
  .sendStringToExecute as jest.Mock

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
  let container: HTMLDivElement
  let cli: AcEdCommandLine
  let input: HTMLInputElement

  beforeAll(() => {
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    sendStringToExecute.mockClear()
    container = document.createElement('div')
    container.tabIndex = -1
    document.body.appendChild(container)
    cli = new AcEdCommandLine(container)
    input = container.querySelector('.ml-cli-text') as HTMLInputElement
  })

  afterEach(() => {
    cli.dispose()
    container.remove()
  })

  it('repeats the last command when Space is pressed with empty input', () => {
    cli.executeCommand('LINE')
    sendStringToExecute.mockClear()
    input.focus()

    const event = press(input, ' ')

    expect(event.defaultPrevented).toBe(true)
    expect(sendStringToExecute).toHaveBeenCalledWith('LINE')
  })

  it('runs the typed command when Space confirms', () => {
    input.focus()
    input.value = 'CIRCLE'

    press(input, ' ')

    expect(sendStringToExecute).toHaveBeenCalledWith('CIRCLE')
  })

  it('confirms a geometric prompt with Space', async () => {
    const pending = cli.getPromptInput<number>(
      new AcEdPromptKeywordOptions('Specify radius'),
      text => (Number.isFinite(Number(text)) ? Number(text) : null),
      { mode: 'geometric', allowNone: false }
    )
    input.value = '5'

    press(input, ' ')

    await expect(pending).resolves.toEqual({ kind: 'value', value: 5 })
  })

  it('keeps Space as text for string prompts that allow spaces', async () => {
    const pending = cli.getPromptInput<string>(
      new AcEdPromptKeywordOptions('Enter text'),
      text => text || null,
      { mode: 'string', allowNone: false, spaceInsertsText: true }
    )
    input.value = 'Fire'

    const space = press(input, ' ')
    expect(space.defaultPrevented).toBe(false)

    input.value = 'Fire exit'
    press(input, 'Enter')
    await expect(pending).resolves.toEqual({
      kind: 'value',
      value: 'Fire exit'
    })
  })

  it('types a character pressed elsewhere into the focused input', () => {
    expect(cli.typeText('l')).toBe(true)
    expect(cli.typeText('i')).toBe(true)

    expect(input.value).toBe('li')
    expect(document.activeElement).toBe(input)
    expect(sendStringToExecute).not.toHaveBeenCalled()
  })

  it('refuses typed characters while hidden or read only', () => {
    cli.visible = false
    expect(cli.typeText('l')).toBe(false)

    cli.visible = true
    cli.setInputReadOnly(true)
    expect(cli.typeText('l')).toBe(false)
    expect(input.value).toBe('')
  })

  it('reports whether a prompt session owns the input', async () => {
    expect(cli.hasActiveSession).toBe(false)
    const pending = cli.getKeywords(new AcEdPromptKeywordOptions('Option'))
    expect(cli.hasActiveSession).toBe(true)

    cli.cancelActiveSession()
    await pending
    expect(cli.hasActiveSession).toBe(false)
  })

  it('returns focus to the view container on Escape', () => {
    input.focus()

    press(input, 'Escape')

    expect(document.activeElement).toBe(container)
  })
})
