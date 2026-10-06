/** @jest-environment jsdom */

import type {
  AcEdSessionAccessory,
  AcEdSessionAccessoryEventArgs
} from '../src/editor/command/AcEdSessionAccessory'
import {
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MEDIA_QUERY
} from '../src/editor/global/AcEdUiLayout'
import { AcEdSessionAccessoryController } from '../src/editor/input/ui/AcEdSessionAccessoryController'

type Listener = (args: AcEdSessionAccessoryEventArgs) => void
type MediaListener = (event: MediaQueryListEvent) => void

function installMatchMedia(matches: (query: string) => boolean) {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: (_type: string, _listener: MediaListener) => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null
    })
  })
  return {
    restore: () => {
      if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor)
      else
        Reflect.deleteProperty(
          window as Window & { matchMedia?: unknown },
          'matchMedia'
        )
    }
  }
}

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
    const media = installMatchMedia(() => false)
    expect(controller.sessionAccessoryHost.type).toBe('desktop')
    expect(
      controller.sessionAccessoryHost.host.classList.contains(
        'ml-desktop-session-accessory__slot'
      )
    ).toBe(true)
    media.restore()
  })

  it('resolves mobile host when the mobile prompt is open', () => {
    const media = installMatchMedia(() => false)
    isMobilePromptOpen = true
    expect(controller.sessionAccessoryHost.type).toBe('mobile')
    expect(controller.sessionAccessoryHost.host).toBe(mobileAccessoryHost)
    media.restore()
  })

  it('resolves mobile host on phone/pad even when the prompt is closed', () => {
    const media = installMatchMedia(
      query =>
        query === ML_UI_MOBILE_MEDIA_QUERY || query === ML_UI_COMPACT_MEDIA_QUERY
    )
    expect(isMobilePromptOpen).toBe(false)
    expect(controller.sessionAccessoryHost.type).toBe('mobile')
    expect(controller.sessionAccessoryHost.host).toBe(mobileAccessoryHost)
    media.restore()
  })

  it('resolves mobile host on pad-width layout even when the prompt is closed', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COMPACT_MEDIA_QUERY
    )
    expect(isMobilePromptOpen).toBe(false)
    expect(controller.sessionAccessoryHost.type).toBe('mobile')
    expect(controller.sessionAccessoryHost.host).toBe(mobileAccessoryHost)
    media.restore()
  })

  it('mounts selection accessories on desktop and yields to command mounts', () => {
    const media = installMatchMedia(() => false)
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
    media.restore()
  })

  it('does not mount selection accessories on the mobile slot', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    isMobilePromptOpen = true
    const selection = createAccessory('selection')
    controller.selectionSessionAccessory = selection
    expect(selection.mount).not.toHaveBeenCalled()
    media.restore()
  })

  it('remounts into an emptied mobile host without changing slot', () => {
    const media = installMatchMedia(() => false)
    isMobilePromptOpen = true
    const command = createAccessory('command')
    const options = {
      host: mobileAccessoryHost,
      type: 'mobile' as const,
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
    expect(mobileAccessoryHost.childElementCount).toBe(1)

    // Simulate a prompt transition that wiped the slot without unmounting.
    mobileAccessoryHost.replaceChildren()
    controller.remountActiveSessionAccessory()

    expect(command.unmount).toHaveBeenCalled()
    expect(command.mount).toHaveBeenCalledTimes(2)
    expect(mobileAccessoryHost.childElementCount).toBe(1)
    media.restore()
  })
})
