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
import { AcApLayerLockCmd } from '../src/command/layer/AcApLayerLockCmd'
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

describe('AcApLayerLockCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('locks selected object layer and preserves other layer flags', async () => {
    const layer = createLayer('A-Lock', frozenFlag)
    const { clear, context } = createContext(new Map([[layer.name, layer]]))
    const getEntity = jest.mocked(AcApDocManager.instance.editor.getEntity)
    getEntity
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'entity-1'
      })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    const cmd = new AcApLayerLockCmd()
    await cmd.execute(context as never)

    expect(layer.standardFlags).toBe(frozenFlag | lockedFlag)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laylck.locked: A-Lock',
      'success'
    )

    const prompt = getEntity.mock.calls[0][0]
    expect(prompt.message).toBe('jig.laylck.prompt')
    expect(prompt.allowNone).toBe(true)
    expect(prompt.allowObjectOnLockedLayer).toBe(true)
    expect(prompt.rejectMessage).toBe('jig.laylck.invalidSelection')
  })

  test('reports already locked layers without changing selection state', async () => {
    const layer = createLayer('A-Lock', frozenFlag | lockedFlag)
    const { clear, context } = createContext(new Map([[layer.name, layer]]))
    jest
      .mocked(AcApDocManager.instance.editor.getEntity)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: 'entity-1'
      })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    const cmd = new AcApLayerLockCmd()
    await cmd.execute(context as never)

    expect(layer.standardFlags).toBe(frozenFlag | lockedFlag)
    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.laylck.alreadyLocked: A-Lock',
      'info'
    )
  })
})
