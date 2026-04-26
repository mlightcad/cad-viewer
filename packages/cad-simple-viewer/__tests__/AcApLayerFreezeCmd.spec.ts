jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        showMessage: jest.fn(),
        getEntity: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class MockKeywordCollection {
    default: unknown
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptEntityOptions {
    allowNone = false
    allowObjectOnLockedLayer = false
    keywords = new MockKeywordCollection()
    rejectMessage?: string

    constructor(public message: string) {}

    setRejectMessage(message: string) {
      this.rejectMessage = message
    }
  }

  class AcEdPromptKeywordOptions {
    allowNone = false
    keywords = new MockKeywordCollection()

    constructor(public message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel'
    },
    AcEdPromptEntityOptions,
    AcEdPromptKeywordOptions
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import { AcApDocManager } from '../src/app'
import { AcApLayerFreezeCmd } from '../src/command/layer/AcApLayerFreezeCmd'
import { AcEdPromptStatus } from '../src/editor'

interface TestLayer {
  name: string
  standardFlags?: number
  isFrozen: boolean
}

const frozenFlag = 0x01
const lockedFlag = 0x04

const createLayer = (name: string, standardFlags?: number): TestLayer => ({
  name,
  standardFlags,
  get isFrozen() {
    return !!((this.standardFlags ?? 0) & frozenFlag)
  }
})

const createContext = (
  layers: TestLayer[],
  entitiesById: Record<string, { layer?: string }>,
  currentLayer = '0'
) => {
  const clear = jest.fn()
  const layersByName = new Map(layers.map(layer => [layer.name, layer]))

  return {
    clear,
    context: {
      doc: {
        database: {
          clayer: currentLayer,
          tables: {
            blockTable: {
              getEntityById: (objectId: string) => entitiesById[objectId]
            },
            layerTable: {
              getAt: (name: string) => layersByName.get(name)
            }
          }
        }
      },
      view: {
        selectionSet: {
          clear
        }
      }
    }
  }
}

describe('AcApLayerFreezeCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('freezes the picked entity layer and preserves other flags', async () => {
    const layers = [createLayer('0'), createLayer('Hidden', lockedFlag)]
    const { clear, context } = createContext(layers, {
      line1: { layer: 'Hidden' }
    })
    const cmd = new AcApLayerFreezeCmd()

    jest
      .mocked(AcApDocManager.instance.editor.getEntity)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'line1'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel
      })

    await cmd.execute(context as never)

    expect(layers[1].standardFlags).toBe(frozenFlag | lockedFlag)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.layfrz.frozen: Hidden',
      'success'
    )
  })

  test('does not freeze the current layer', async () => {
    const layers = [createLayer('Current')]
    const { clear, context } = createContext(
      layers,
      {
        line1: { layer: 'Current' }
      },
      'Current'
    )
    const cmd = new AcApLayerFreezeCmd()

    jest
      .mocked(AcApDocManager.instance.editor.getEntity)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'line1'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel
      })

    await cmd.execute(context as never)

    expect(layers[0].standardFlags).toBeUndefined()
    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.layfrz.cannotFreezeCurrent',
      'warning'
    )
  })

  test('undo restores the last frozen layer state from the command run', async () => {
    const layers = [createLayer('0'), createLayer('Hidden', lockedFlag)]
    const { clear, context } = createContext(layers, {
      line1: { layer: 'Hidden' }
    })
    const cmd = new AcApLayerFreezeCmd()

    jest
      .mocked(AcApDocManager.instance.editor.getEntity)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'line1'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Keyword,
        stringResult: 'Undo'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel
      })

    await cmd.execute(context as never)

    expect(layers[1].standardFlags).toBe(lockedFlag)
    expect(clear).toHaveBeenCalledTimes(2)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenLastCalledWith(
      'jig.layfrz.restored: Hidden',
      'success'
    )
  })
})
