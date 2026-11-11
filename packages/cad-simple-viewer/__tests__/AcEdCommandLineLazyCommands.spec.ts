/** @jest-environment jsdom */

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      sendStringToExecute: jest.fn(),
      // Only LINE is a registered command; PDFIMPORT belongs to a lazy plugin.
      lookupLocalCmd: jest.fn((name: string) =>
        name === 'LINE' ? { globalName: 'LINE', localName: 'LINE' } : undefined
      ),
      isLazyPluginCommand: jest.fn(
        (name: string) => name.toUpperCase() === 'PDFIMPORT'
      ),
      searchCommandsByPrefix: jest.fn(() => []),
      searchLazyCommandsByPrefix: jest.fn((prefix: string) =>
        'PDFIMPORT'.startsWith(prefix.toUpperCase()) ? ['PDFIMPORT'] : []
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
      key === 'command.ACAD.pdfimport.description'
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
    cli.executeCommand('pdfimport')

    expect(sendStringToExecute).toHaveBeenCalledWith('pdfimport')
    expect(messages()).not.toContain('main.commandLine.unknownCommand')
  })

  it('still reports unknown commands', () => {
    cli.executeCommand('ipdx')

    expect(sendStringToExecute).not.toHaveBeenCalled()
    expect(messages()).toContain('ipdx')
  })

  it('remembers a lazy trigger as the last command', () => {
    cli.executeCommand('pdfimport')
    sendStringToExecute.mockClear()

    cli.executeCommand('')

    expect(sendStringToExecute).toHaveBeenCalledWith('PDFIMPORT')
  })

  it('suggests lazy plugin commands with their description', () => {
    input.value = 'pdfi'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const items = [...container.querySelectorAll('.item')] as HTMLElement[]
    expect(items.map(item => item.dataset.value)).toEqual(['PDFIMPORT'])
    expect(items[0].textContent).toBe(
      'PDFIMPORT - Imports vector geometry from a PDF file'
    )
  })
})
