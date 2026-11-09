/** @jest-environment jsdom */

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      sendStringToExecute: jest.fn(),
      // Only LINE is a registered command; IPDF belongs to a lazy plugin.
      lookupLocalCmd: jest.fn((name: string) =>
        name === 'LINE' ? { globalName: 'LINE', localName: 'LINE' } : undefined
      ),
      isLazyPluginCommand: jest.fn(
        (name: string) => name.toUpperCase() === 'IPDF'
      ),
      searchCommandsByPrefix: jest.fn(() => []),
      searchLazyCommandsByPrefix: jest.fn((prefix: string) =>
        'IPDF'.startsWith(prefix.toUpperCase()) ? ['IPDF'] : []
      ),
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
      key === 'command.ACAD.ipdf.description'
        ? 'Imports vector geometry from a PDF file'
        : (options?.fallback ?? key),
    sysCmdKey: (cmdName: string, key: string) =>
      `command.ACAD.${cmdName.toLowerCase()}.${key}`,
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
import { AcEdCommandLine } from '../src/editor/input/ui/AcEdCommandLine'

const sendStringToExecute = AcApDocManager.instance
  .sendStringToExecute as jest.Mock

describe('AcEdCommandLine lazy plugin commands', () => {
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

  const messages = () => container.innerText || container.textContent || ''

  it('runs a lazy plugin trigger instead of reporting an unknown command', () => {
    cli.executeCommand('ipdf')

    expect(sendStringToExecute).toHaveBeenCalledWith('ipdf')
    expect(messages()).not.toContain('main.commandLine.unknownCommand')
  })

  it('still reports unknown commands', () => {
    cli.executeCommand('ipdx')

    expect(sendStringToExecute).not.toHaveBeenCalled()
    expect(messages()).toContain('ipdx')
  })

  it('remembers a lazy trigger as the last command', () => {
    cli.executeCommand('ipdf')
    sendStringToExecute.mockClear()

    cli.executeCommand('')

    expect(sendStringToExecute).toHaveBeenCalledWith('IPDF')
  })

  it('suggests lazy plugin commands with their description', () => {
    input.value = 'ip'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const items = [...container.querySelectorAll('.item')] as HTMLElement[]
    expect(items.map(item => item.dataset.value)).toEqual(['IPDF'])
    expect(items[0].textContent).toBe(
      'IPDF - Imports vector geometry from a PDF file'
    )
  })
})
