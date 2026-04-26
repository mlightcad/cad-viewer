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
  class AcEdCommand {
    mode: unknown
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
  standardFlags?: number
  isFrozen: boolean
}

const frozenFlag = 0x01
const lockedFlag = 0x04

const createLayer = (standardFlags?: number): TestLayer => ({
  standardFlags,
  get isFrozen() {
    return !!((this.standardFlags ?? 0) & frozenFlag)
  }
})

const createContext = (layers: TestLayer[]) => {
  const clear = jest.fn()

  return {
    clear,
    context: {
      doc: {
        database: {
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
      createLayer(frozenFlag | lockedFlag),
      createLayer(frozenFlag),
      createLayer(lockedFlag)
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
      createLayer(0),
      createLayer(lockedFlag)
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
