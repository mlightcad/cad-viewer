/** @jest-environment jsdom */

jest.mock('../src/editor/global/AcEdUiLayout', () => ({
  acedSubscribeUiLayout: jest.fn(() => () => undefined)
}))

jest.mock('../src/ui/AcUiDrawStyle', () => ({
  acuiFilterDesktopCommandSessionAccessory: jest.fn(
    (
      _slot: string,
      _commandName: string | undefined,
      accessory: { id: string }
    ) => accessory
  )
}))

import type { AcApContext } from '../src/app/AcApContext'
import type { AcEdCommand } from '../src/editor/command/AcEdCommand'
import type { AcEdSessionAccessory } from '../src/editor/command/AcEdSessionAccessory'
import type { AcEdCommandEventArgs } from '../src/editor/input/AcEditor'
import { AcEdDesktopSessionAccessoryChrome } from '../src/editor/input/ui/AcEdDesktopSessionAccessoryChrome'
import { AcEdSessionAccessoryCoordinator } from '../src/editor/input/ui/AcEdSessionAccessoryCoordinator'
import type { AcEdSessionAccessorySource } from '../src/editor/input/ui/AcEdSessionAccessorySource'

function createSource(
  id: string,
  resolve: AcEdSessionAccessorySource['resolve']
): AcEdSessionAccessorySource {
  return {
    id,
    subscribe: jest.fn(() => () => undefined),
    resolve
  }
}

function createCoordinator(options?: {
  isMobilePromptOpen?: () => boolean
  activeCommand?: AcEdCommand | null
}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const desktopChrome = new AcEdDesktopSessionAccessoryChrome(host)
  const mobileChrome = { setSessionAccessory: jest.fn() }

  let commandWillStart: ((args: AcEdCommandEventArgs) => void) | undefined
  let commandEnded: (() => void) | undefined

  const commandManager = {
    activeCommand: options?.activeCommand ?? null
  }

  const view = {
    editor: {
      events: {
        commandWillStart: {
          addEventListener: jest.fn(
            (listener: (args: AcEdCommandEventArgs) => void) => {
              commandWillStart = listener
            }
          ),
          removeEventListener: jest.fn()
        },
        commandEnded: {
          addEventListener: jest.fn((listener: () => void) => {
            commandEnded = listener
          }),
          removeEventListener: jest.fn()
        }
      }
    }
  }

  const coordinator = new AcEdSessionAccessoryCoordinator({
    view: view as never,
    getContext: () => ({ view }) as unknown as AcApContext,
    commandManager: commandManager as never,
    desktopChrome,
    mobileChrome: mobileChrome as never,
    isMobilePromptOpen: options?.isMobilePromptOpen ?? (() => false)
  })
  return {
    coordinator,
    desktopChrome,
    mobileChrome,
    host,
    commandManager,
    fireCommandWillStart: (command: AcEdCommand) => {
      commandManager.activeCommand = command
      commandWillStart?.({ command })
    },
    fireCommandEnded: () => {
      commandManager.activeCommand = null
      commandEnded?.()
    }
  }
}

describe('AcEdSessionAccessoryCoordinator', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts the first non-null fallback source on desktop', () => {
    const accessory: AcEdSessionAccessory = {
      id: 'test',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const { coordinator, desktopChrome } = createCoordinator()
    coordinator.addSource(createSource('a', () => null))
    coordinator.addSource(createSource('b', () => accessory))

    coordinator.refresh()

    expect(desktopChrome.hasAccessory).toBe(true)
    coordinator.dispose()
  })

  it('prefers the active command accessory over fallback sources', () => {
    const commandAccessory: AcEdSessionAccessory = {
      id: 'command',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const fallback: AcEdSessionAccessory = {
      id: 'fallback',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const activeCommand = {
      globalName: 'line',
      createSessionAccessory: jest.fn(() => commandAccessory)
    } as unknown as AcEdCommand
    const { coordinator, desktopChrome, fireCommandWillStart } =
      createCoordinator()
    coordinator.addSource(createSource('fallback', () => fallback))

    fireCommandWillStart(activeCommand)

    expect(desktopChrome.hasAccessory).toBe(true)
    expect(activeCommand.createSessionAccessory).toHaveBeenCalled()
    coordinator.dispose()
  })

  it('clears the command accessory after commandEnded', async () => {
    const commandAccessory: AcEdSessionAccessory = {
      id: 'command',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const activeCommand = {
      globalName: 'line',
      createSessionAccessory: jest.fn(() => commandAccessory)
    } as unknown as AcEdCommand
    const { coordinator, desktopChrome, fireCommandWillStart, fireCommandEnded } =
      createCoordinator()

    fireCommandWillStart(activeCommand)
    expect(desktopChrome.hasAccessory).toBe(true)

    fireCommandEnded()
    await Promise.resolve()

    expect(desktopChrome.hasAccessory).toBe(false)
    coordinator.dispose()
  })

  it('mounts on mobile and clears desktop when the prompt is open', () => {
    const accessory: AcEdSessionAccessory = {
      id: 'mobile',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const { coordinator, desktopChrome, mobileChrome } = createCoordinator({
      isMobilePromptOpen: () => true
    })
    coordinator.addSource(createSource('mobile', () => accessory))

    coordinator.refresh()

    expect(desktopChrome.hasAccessory).toBe(false)
    expect(mobileChrome.setSessionAccessory).toHaveBeenCalledWith(accessory)
    coordinator.dispose()
  })

  it('resolveForCurrentSlot returns the active slot accessory', () => {
    const accessory: AcEdSessionAccessory = {
      id: 'test',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const { coordinator } = createCoordinator()
    coordinator.addSource(createSource('test', () => accessory))

    expect(coordinator.resolveForCurrentSlot()).toBe(accessory)
    coordinator.dispose()
  })
})
