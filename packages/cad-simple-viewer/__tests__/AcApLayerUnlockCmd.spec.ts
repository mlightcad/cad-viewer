jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getEntity: jest.fn(),
        showMessage: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class AcEdPromptEntityOptions {
    allowNone = false
    allowObjectOnLockedLayer = false
    rejectMessage = 'Invalid object selected.'

    constructor(readonly message: string) {}

    setRejectMessage(message: string) {
      this.rejectMessage = message
      return this
    }
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptEntityOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      None: 'None'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import { AcApDocManager } from '../src/app'
import { AcApLayerUnlockCmd } from '../src/command/layer/AcApLayerUnlockCmd'
import { AcEdPromptStatus } from '../src/editor'

interface TestLayer {
  name: string
  standardFlags?: number
  isLocked: boolean
}

const frozenFlag = 0x01
const lockedFlag = 0x04

const createLayer = (name: string, standardFlags?: number): TestLayer => ({
  name,
  standardFlags,
  get isLocked() {
    return !!((this.standardFlags ?? 0) & lockedFlag)
  }
})

const createContext = (layers: Map<string, TestLayer>) => {
  const clear = jest.fn()

  return {
    clear,
    context: {
      doc: {
        database: {
          tables: {
            blockTable: {
              getEntityById: jest.fn((objectId: string) =>
                objectId === 'entity-1' ? { layer: 'A-Lock' } : undefined
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
          clear
        }
      }
    }
  }
}

describe('AcApLayerUnlockCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('unlocks selected object layer and preserves other layer flags', async () => {
    const layer = createLayer('A-Lock', lockedFlag | frozenFlag)
    const { clear, context } = createContext(new Map([[layer.name, layer]]))
    const getEntity = jest.mocked(AcApDocManager.instance.editor.getEntity)
    getEntity
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'entity-1'
      })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    const cmd = new AcApLayerUnlockCmd()
    await cmd.execute(context as never)

    expect(layer.standardFlags).toBe(frozenFlag)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.layulk.unlocked: A-Lock',
      'success'
    )

    const prompt = getEntity.mock.calls[0][0]
    expect(prompt.message).toBe('jig.layulk.prompt')
    expect(prompt.allowNone).toBe(true)
    expect(prompt.allowObjectOnLockedLayer).toBe(true)
    expect(prompt.rejectMessage).toBe('jig.layulk.invalidSelection')
  })

  test('reports already unlocked layers without changing selection state', async () => {
    const layer = createLayer('A-Lock', frozenFlag)
    const { clear, context } = createContext(new Map([[layer.name, layer]]))
    jest
      .mocked(AcApDocManager.instance.editor.getEntity)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'entity-1'
      })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    const cmd = new AcApLayerUnlockCmd()
    await cmd.execute(context as never)

    expect(layer.standardFlags).toBe(frozenFlag)
    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.layulk.alreadyUnlocked: A-Lock',
      'info'
    )
  })
})
