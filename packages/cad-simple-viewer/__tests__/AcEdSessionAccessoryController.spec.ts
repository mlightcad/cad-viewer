/** @jest-environment jsdom */

import type {
  AcEdSessionAccessory,
  AcEdSessionAccessoryEventArgs
} from '../src/editor/command/AcEdSessionAccessory'
import { AcEdSessionAccessoryController } from '../src/editor/input/ui/AcEdSessionAccessoryController'

type Listener = (args: AcEdSessionAccessoryEventArgs) => void

function createEventManager() {
  const listeners = new Set<Listener>()
  return {
    addEventListener: jest.fn((listener: Listener) => {
      listeners.add(listener)
    }),
    removeEventListener: jest.fn((listener: Listener) => {
      listeners.delete(listener)
    }),
    dispatch: jest.fn((args: AcEdSessionAccessoryEventArgs) => {
      for (const listener of [...listeners]) listener(args)
    })
  }
}

function createEvents() {
  return {
    beforeMountSessionAccessory: createEventManager(),
    afterMountSessionAccessory: createEventManager(),
    beforeUnmountSessionAccessory: createEventManager(),
    afterUnmountSessionAccessory: createEventManager()
  }
}

function createAccessory(id = 'test'): AcEdSessionAccessory {
  return {
    id,
    mount: jest.fn(options => {
      options.host.appendChild(document.createElement('span'))
    }),
    unmount: jest.fn()
  }
}

describe('AcEdSessionAccessoryController', () => {
  let container: HTMLDivElement
  let mobileAccessoryHost: HTMLDivElement
  let mobileChrome: {
    accessoryHost: HTMLElement
    prepareAccessory: jest.Mock
    clearAccessory: jest.Mock
  }
  let events: ReturnType<typeof createEvents>
  let isMobilePromptOpen: boolean
  let controller: AcEdSessionAccessoryController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    mobileAccessoryHost = document.createElement('div')
    mobileAccessoryHost.className = 'ml-mobile-cmd-accessory'
    mobileChrome = {
      accessoryHost: mobileAccessoryHost,
      prepareAccessory: jest.fn(() => {
        mobileAccessoryHost.hidden = false
      }),
      clearAccessory: jest.fn(() => {
        mobileAccessoryHost.replaceChildren()
        mobileAccessoryHost.hidden = true
      })
    }
    events = createEvents()
    isMobilePromptOpen = false
    controller = new AcEdSessionAccessoryController({
      view: { container } as never,
      getMobileChrome: () => mobileChrome as never,
      isMobilePromptOpen: () => isMobilePromptOpen,
      getEditorEvents: () => events as never
    })
    controller.bindEditorEvents()
  })

  afterEach(() => {
    controller.dispose()
  })

  it('resolves desktop host when the mobile prompt is closed', () => {
    expect(controller.sessionAccessoryHost.type).toBe('desktop')
    expect(
      controller.sessionAccessoryHost.host.classList.contains(
        'ml-desktop-session-accessory__slot'
      )
    ).toBe(true)
  })

  it('resolves mobile host when the mobile prompt is open', () => {
    isMobilePromptOpen = true
    expect(controller.sessionAccessoryHost.type).toBe('mobile')
    expect(controller.sessionAccessoryHost.host).toBe(mobileAccessoryHost)
  })

  it('mounts selection accessories on desktop and yields to command mounts', () => {
    const selection = createAccessory('selection')
    controller.selectionSessionAccessory = selection

    expect(selection.mount).toHaveBeenCalledTimes(1)
    expect(
      container
        .querySelector('.ml-desktop-session-accessory')
        ?.classList.contains('is-visible')
    ).toBe(true)

    const command = createAccessory('command')
    const options = {
      host: controller.sessionAccessoryHost.host,
      type: 'desktop' as const,
      view: { container } as never
    }
    events.beforeMountSessionAccessory.dispatch({
      command: null,
      accessory: command,
      options,
      source: 'command'
    })
    command.mount(options)
    events.afterMountSessionAccessory.dispatch({
      command: null,
      accessory: command,
      options,
      source: 'command'
    })

    expect(selection.unmount).toHaveBeenCalled()
    expect(options.host.querySelectorAll('span')).toHaveLength(1)
    expect(
      container.querySelector('.ml-desktop-session-accessory.is-visible')
    ).toBeTruthy()

    command.unmount()
    events.afterUnmountSessionAccessory.dispatch({
      command: null,
      accessory: command,
      options,
      source: 'command'
    })
    expect(selection.mount).toHaveBeenCalledTimes(2)
  })

  it('does not mount selection accessories on the mobile slot', () => {
    isMobilePromptOpen = true
    const selection = createAccessory('selection')
    controller.selectionSessionAccessory = selection
    expect(selection.mount).not.toHaveBeenCalled()
  })
})
