jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getSelection: jest.fn(),
        showMessage: jest.fn()
      },
      regen: jest.fn()
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class AcEdPromptSelectionOptions {
    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptSelectionOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Cancel: 'Cancel'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import { AcApDocManager } from '../src/app'
import { AcApLayerCurCmd } from '../src/command/layer/AcApLayerCurCmd'
import { AcEdPromptStatus } from '../src/editor'

interface TestEntity {
  layer: string
  triggerModifiedEvent: jest.Mock
}

interface TestLayer {
  name: string
}

const createEntity = (layer: string): TestEntity => ({
  layer,
  triggerModifiedEvent: jest.fn()
})

const createContext = (
  entities: Map<string, TestEntity>,
  layers: Map<string, TestLayer>,
  selectionIds: string[] = [],
  currentLayer = 'Current'
) => {
  const clear = jest.fn()

  return {
    clear,
    context: {
      doc: {
        database: {
          clayer: currentLayer,
          tables: {
            blockTable: {
              getEntityById: jest.fn((objectId: string) =>
                entities.get(objectId)
              )
            },
            layerTable: {
              getAt: jest.fn((name: string) => layers.get(name))
            }
          }
        }
      },
      view: {
        selectionSet: {
          count: selectionIds.length,
          ids: selectionIds,
          clear
        }
      }
    }
  }
}

describe('AcApLayerCurCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('changes preselected objects to the current layer', async () => {
    const line = createEntity('Old')
    const alreadyCurrent = createEntity('Current')
    const { clear, context } = createContext(
      new Map([
        ['line', line],
        ['already-current', alreadyCurrent]
      ]),
      new Map([['Current', { name: 'Current' }]]),
      ['line', 'line', 'already-current', 'missing']
    )

    const cmd = new AcApLayerCurCmd()
    await cmd.execute(context as never)

    expect(AcApDocManager.instance.editor.getSelection).not.toHaveBeenCalled()
    expect(line.layer).toBe('Current')
    expect(line.triggerModifiedEvent).toHaveBeenCalledTimes(1)
    expect(alreadyCurrent.triggerModifiedEvent).not.toHaveBeenCalled()
    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.regen).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laycur.changed: 1 (Current)',
      'success'
    )
  })

  test('prompts for selection when no objects are preselected', async () => {
    const line = createEntity('Old')
    const { context } = createContext(
      new Map([['line', line]]),
      new Map([['Current', { name: 'Current' }]])
    )
    const getSelection = jest.mocked(
      AcApDocManager.instance.editor.getSelection
    )
    getSelection.mockResolvedValueOnce({
      status: AcEdPromptStatus.OK,
      value: { ids: ['line'] } as never
    })

    const cmd = new AcApLayerCurCmd()
    await cmd.execute(context as never)

    const prompt = getSelection.mock.calls[0][0]
    expect(prompt.message).toBe('jig.laycur.prompt')
    expect(line.layer).toBe('Current')
    expect(line.triggerModifiedEvent).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.regen).toHaveBeenCalledTimes(1)
  })

  test('does not modify objects when the current layer cannot be resolved', async () => {
    const line = createEntity('Old')
    const { clear, context } = createContext(
      new Map([['line', line]]),
      new Map(),
      ['line']
    )

    const cmd = new AcApLayerCurCmd()
    await cmd.execute(context as never)

    expect(line.layer).toBe('Old')
    expect(line.triggerModifiedEvent).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.regen).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laycur.currentLayerNotFound',
      'warning'
    )
  })

  test('reports when selected objects are already on the current layer', async () => {
    const line = createEntity('Current')
    const { clear, context } = createContext(
      new Map([['line', line]]),
      new Map([['Current', { name: 'Current' }]]),
      ['line']
    )

    const cmd = new AcApLayerCurCmd()
    await cmd.execute(context as never)

    expect(line.triggerModifiedEvent).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.regen).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laycur.alreadyCurrent',
      'info'
    )
  })
})
