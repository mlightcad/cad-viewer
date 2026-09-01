/** @jest-environment jsdom */

jest.mock('../src/app/AcApSettingManager', () => ({
  AcApSettingManager: {
    instance: {
      isShowRibbon: true,
      events: {
        modified: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      }
    }
  }
}))

jest.mock('../src/editor/global/AcEdUiLayout', () => ({
  acedSubscribeUiLayout: jest.fn(() => () => undefined)
}))

jest.mock('../src/command/measure/AcApMeasurementStore', () => ({
  getSelectedMeasurementId: jest.fn(() => undefined),
  subscribeMeasurementSelection: jest.fn(() => () => undefined)
}))

import { AcApSettingManager } from '../src/app/AcApSettingManager'
import { AcApMarkupStore } from '../src/command/markup/AcApMarkupStore'
import { acapSetMarkupBagFactory } from '../src/command/markup/AcApMarkupSession'
import { getMarkupStore } from '../src/command/markup/AcApMarkupStore'
import type { AcApMarkupRecord } from '../src/command/markup/AcApMarkupTypes'
import { getSelectedMeasurementId } from '../src/command/measure/AcApMeasurementStore'
import type { AcEdCommand } from '../src/editor/command/AcEdCommand'
import type { AcEdCommandEventArgs } from '../src/editor/input/AcEditor'
import { AcEdDesktopSessionAccessoryChrome } from '../src/editor/input/ui/AcEdDesktopSessionAccessoryChrome'
import { AcEdSessionAccessoryCoordinator } from '../src/editor/input/ui/AcEdSessionAccessoryCoordinator'
import { AcUiDrawStyleSessionAccessorySource } from '../src/ui/AcUiDrawStyleSessionAccessorySource'

acapSetMarkupBagFactory(() => ({
  store: new AcApMarkupStore(),
  presenter: {} as never,
  history: {} as never,
  sessionUndo: {} as never
}))

function markupRecord(id = 'markup-1'): AcApMarkupRecord {
  return {
    id,
    type: 'text',
    style: { color: '#ff0000', fontSize: 12 },
    text: 'Hello',
    comment: 'note',
    status: 'open',
    author: 'alice',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    geometry: { type: 'text', position: { x: 0, y: 0 } }
  }
}

function createDrawStyleCoordinator(options: {
  activeCommand?: AcEdCommand | null
  isMobilePromptOpen?: () => boolean
  hostHasRibbon?: boolean
}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const desktopChrome = new AcEdDesktopSessionAccessoryChrome(host)
  const drawStyleHost = {
    setActiveKind: jest.fn(),
    createSessionAccessory: jest.fn(() => ({
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }))
  }
  const commandManager = {
    activeCommand: options.activeCommand ?? null
  }

  let commandWillStart: ((args: AcEdCommandEventArgs) => void) | undefined
  let commandEnded: (() => void) | undefined

  const mobileChrome = { setSessionAccessory: jest.fn() }
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
    getContext: () => ({ view }) as never,
    commandManager: commandManager as never,
    desktopChrome,
    mobileChrome: mobileChrome as never,
    isMobilePromptOpen: options.isMobilePromptOpen ?? (() => false)
  })
  const source = new AcUiDrawStyleSessionAccessorySource(
    commandManager as never,
    drawStyleHost
  )
  coordinator.addSource(source)

  AcApSettingManager.instance.isShowRibbon = options.hostHasRibbon !== false

  if (options.activeCommand) {
    commandWillStart?.({ command: options.activeCommand })
  }

  return {
    coordinator,
    desktopChrome,
    mobileChrome,
    drawStyleHost,
    host,
    commandManager,
    fireCommandEnded: () => {
      commandManager.activeCommand = null
      commandEnded?.()
    }
  }
}

describe('AcUiDrawStyleSessionAccessorySource', () => {
  afterEach(() => {
    AcApSettingManager.instance.isShowRibbon = true
    getMarkupStore().reset()
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('mounts draw-style from the command on desktop when ribbon is hidden', () => {
    const activeCommand = {
      globalName: 'measuredistance',
      createSessionAccessory: jest.fn(() => ({
        id: 'draw-style',
        mount: jest.fn(),
        unmount: jest.fn()
      }))
    } as unknown as AcEdCommand
    const { coordinator, desktopChrome, drawStyleHost } =
      createDrawStyleCoordinator({
        activeCommand,
        hostHasRibbon: false
      })

    expect(desktopChrome.hasAccessory).toBe(true)
    expect(activeCommand.createSessionAccessory).toHaveBeenCalled()
    expect(drawStyleHost.createSessionAccessory).not.toHaveBeenCalled()
    coordinator.dispose()
  })

  it('does not mount on desktop when the ribbon is visible', () => {
    const activeCommand = {
      globalName: 'measuredistance',
      createSessionAccessory: jest.fn(() => ({
        id: 'draw-style',
        mount: jest.fn(),
        unmount: jest.fn()
      }))
    } as unknown as AcEdCommand
    const { coordinator, desktopChrome } = createDrawStyleCoordinator({
      activeCommand
    })

    coordinator.refresh()

    expect(desktopChrome.hasAccessory).toBe(false)
    coordinator.dispose()
  })

  it('hides draw-style after the command ends when nothing is selected', async () => {
    const activeCommand = {
      globalName: 'measuredistance',
      createSessionAccessory: jest.fn(() => ({
        id: 'draw-style',
        mount: jest.fn(),
        unmount: jest.fn()
      }))
    } as unknown as AcEdCommand
    const { coordinator, desktopChrome, fireCommandEnded } =
      createDrawStyleCoordinator({
        activeCommand,
        hostHasRibbon: false
      })

    expect(desktopChrome.hasAccessory).toBe(true)

    fireCommandEnded()
    await Promise.resolve()

    expect(desktopChrome.hasAccessory).toBe(false)
    coordinator.dispose()
  })

  it('falls back to the draw-style host for selection-only sessions', () => {
    const { coordinator, desktopChrome, drawStyleHost } =
      createDrawStyleCoordinator({
        hostHasRibbon: false
      })
    getMarkupStore().upsert(markupRecord())
    getMarkupStore().setSelectedId('markup-1')

    coordinator.refresh()

    expect(desktopChrome.hasAccessory).toBe(true)
    expect(drawStyleHost.createSessionAccessory).toHaveBeenCalled()
    expect(drawStyleHost.setActiveKind).toHaveBeenCalledWith('markup')
    coordinator.dispose()
  })

  it('mounts draw-style on mobile from the command while the prompt is open', () => {
    const activeCommand = {
      globalName: 'measuredistance',
      createSessionAccessory: jest.fn(() => ({
        id: 'draw-style',
        mount: jest.fn(),
        unmount: jest.fn()
      }))
    } as unknown as AcEdCommand
    const { coordinator, desktopChrome, mobileChrome } =
      createDrawStyleCoordinator({
        activeCommand,
        hostHasRibbon: false,
        isMobilePromptOpen: () => true
      })

    expect(desktopChrome.hasAccessory).toBe(false)
    expect(mobileChrome.setSessionAccessory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draw-style' })
    )
    coordinator.dispose()
  })

  it('hides draw-style when markup and measurement are both selected', () => {
    jest.mocked(getSelectedMeasurementId).mockReturnValue(undefined)
    const { coordinator, desktopChrome } = createDrawStyleCoordinator({
      hostHasRibbon: false
    })
    getMarkupStore().upsert(markupRecord())
    getMarkupStore().setSelectedId('markup-1')
    coordinator.refresh()
    expect(desktopChrome.hasAccessory).toBe(true)

    jest.mocked(getSelectedMeasurementId).mockReturnValue('measure-1')
    coordinator.refresh()

    expect(desktopChrome.hasAccessory).toBe(false)
    coordinator.dispose()
  })
})
