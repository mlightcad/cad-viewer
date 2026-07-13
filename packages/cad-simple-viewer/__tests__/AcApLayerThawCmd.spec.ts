jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        showMessage: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  const { AcApDocManager } = jest.requireMock('../src/app')

  class AcEdCommand {
    mode: unknown

    showMessage(message: string, type: string = 'info') {
      AcApDocManager.instance.editor.showMessage(message, type)
    }

    notify(message: string, type: string = 'info') {
      AcApDocManager.instance.editor.showMessage(message, type)
    }
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import { AcApDocManager } from '../src/app'
import { AcApLayerThawCmd } from '../src/command/layer/AcApLayerThawCmd'

interface TestLayer {
  objectId: string
  standardFlags?: number
  isFrozen: boolean
}

const frozenFlag = 0x01
const lockedFlag = 0x04

const createLayer = (objectId: string, standardFlags?: number): TestLayer => ({
  objectId,
  standardFlags,
  get isFrozen() {
    return !!((this.standardFlags ?? 0) & frozenFlag)
  }
})

const createContext = (layers: TestLayer[]) => {
  const clear = jest.fn()
  const layersById = new Map(layers.map(layer => [layer.objectId, layer]))
  const openObjectForWrite = jest.fn((objectId: string) =>
    layersById.get(objectId)
  )

  return {
    clear,
    openObjectForWrite,
    context: {
      doc: {
        database: {
          openObjectForWrite,
          getObjectById: jest.fn((objectId: string) =>
            layersById.get(objectId)
          ),
          tables: {
            layerTable: {
              newIterator: () => layers
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

describe('AcApLayerThawCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('thaws frozen layers and preserves other layer flags', async () => {
    const layers = [
      createLayer('layer-0', frozenFlag | lockedFlag),
      createLayer('layer-1', frozenFlag),
      createLayer('layer-2', lockedFlag)
    ]
    const { clear, context } = createContext(layers)
    const cmd = new AcApLayerThawCmd()

    await cmd.execute(context as never)

    expect(layers[0].standardFlags).toBe(lockedFlag)
    expect(layers[1].standardFlags).toBe(0)
    expect(layers[2].standardFlags).toBe(lockedFlag)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laythw.thawed: 2',
      'success'
    )
  })

  test('reports when every layer is already thawed', async () => {
    const { clear, context } = createContext([
      createLayer('layer-0', 0),
      createLayer('layer-1', lockedFlag)
    ])
    const cmd = new AcApLayerThawCmd()

    await cmd.execute(context as never)

    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laythw.alreadyThawed',
      'info'
    )
  })
})
