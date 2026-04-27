jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getKeywords: jest.fn(),
        getSelection: jest.fn(),
        showMessage: jest.fn()
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

  class AcEdPromptKeywordOptions {
    allowNone = false
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
  }

  class AcEdPromptSelectionOptions {
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptKeywordOptions,
    AcEdPromptSelectionOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
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
import { AcApLayerIsoCmd } from '../src/command/layer/AcApLayerIsoCmd'
import { AcApLayerIsoState } from '../src/command/layer/AcApLayerIsoState'
import { AcApLayerUnisoCmd } from '../src/command/layer/AcApLayerUnisoCmd'
import { AcEdPromptStatus } from '../src/editor'

interface TestLayer {
  name: string
  isOff: boolean
  standardFlags?: number
  isFrozen: boolean
  isLocked: boolean
}

const frozenFlag = 0x01
const lockedFlag = 0x04

const createLayer = (
  name: string,
  isOff = false,
  standardFlags?: number
): TestLayer => ({
  name,
  isOff,
  standardFlags,
  get isFrozen() {
    return !!((this.standardFlags ?? 0) & frozenFlag)
  },
  get isLocked() {
    return !!((this.standardFlags ?? 0) & lockedFlag)
  }
})

const resetLayisoSettings = () => {
  ;(
    AcApLayerIsoCmd as unknown as {
      _settings: {
        isolationMode: 'Off' | 'LockAndFade'
        offMode: 'Off' | 'Vpfreeze'
      }
    }
  )._settings = {
    isolationMode: 'Off',
    offMode: 'Off'
  }
}

const createContext = (
  layers: TestLayer[],
  entitiesById: Record<string, { layer?: string }>,
  selectionIds: string[] = [],
  currentLayer = '0'
) => {
  const clear = jest.fn()
  const layersByName = new Map(layers.map(layer => [layer.name, layer]))
  const db = {
    clayer: currentLayer,
    tables: {
      blockTable: {
        getEntityById: jest.fn((objectId: string) => entitiesById[objectId])
      },
      layerTable: {
        getAt: jest.fn((name: string) => layersByName.get(name)),
        newIterator: () => layers
      }
    }
  }

  return {
    clear,
    db,
    context: {
      doc: {
        database: db
      },
      view: {
        selectionSet: {
          ids: selectionIds,
          clear
        }
      }
    }
  }
}

describe('AcApLayerIsoCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetLayisoSettings()
    AcApLayerIsoState.consume()
  })

  test('isolates preselected object layers and LAYUNISO restores the snapshot', async () => {
    const layers = [
      createLayer('Keep', true, frozenFlag | lockedFlag),
      createLayer('Other'),
      createLayer('Another')
    ]
    const { clear, context, db } = createContext(
      layers,
      {
        line1: { layer: 'Keep' }
      },
      ['line1'],
      'Other'
    )

    await new AcApLayerIsoCmd().execute(context as never)

    expect(layers[0].isOff).toBe(false)
    expect(layers[0].standardFlags).toBe(0)
    expect(layers[1].isOff).toBe(true)
    expect(layers[2].isOff).toBe(true)
    expect(db.clayer).toBe('Keep')
    expect(clear).toHaveBeenCalledTimes(1)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenLastCalledWith(
      'jig.layiso.isolated: Keep (jig.layiso.affectedLayers: 3)',
      'success'
    )

    await new AcApLayerUnisoCmd().execute(context as never)

    expect(layers[0].isOff).toBe(true)
    expect(layers[0].standardFlags).toBe(frozenFlag | lockedFlag)
    expect(layers[1].isOff).toBe(false)
    expect(layers[2].isOff).toBe(false)
    expect(db.clayer).toBe('Other')
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenLastCalledWith(
      'jig.layuniso.restored: 3',
      'success'
    )
  })

  test('supports Lock and fade settings by locking non-isolated layers', async () => {
    const layers = [createLayer('Keep'), createLayer('Other')]
    const { context } = createContext(layers, {
      line1: { layer: 'Keep' }
    })

    jest
      .mocked(AcApDocManager.instance.editor.getSelection)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Keyword,
        stringResult: 'Settings'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { ids: ['line1'] } as never
      })
    jest
      .mocked(AcApDocManager.instance.editor.getKeywords)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'LockAndFade'
      })

    await new AcApLayerIsoCmd().execute(context as never)

    expect(layers[0].isOff).toBe(false)
    expect(layers[0].isLocked).toBe(false)
    expect(layers[1].isOff).toBe(false)
    expect(layers[1].isLocked).toBe(true)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.layiso.lockFadeFallback',
      'info'
    )
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenLastCalledWith(
      'jig.layiso.isolated: Keep (jig.layiso.affectedLayers: 1)',
      'success'
    )
  })

  test('reports when selection has no valid layer', async () => {
    const layers = [createLayer('0')]
    const { clear, context } = createContext(
      layers,
      {
        line1: { layer: 'Missing' }
      },
      ['line1']
    )

    await new AcApLayerIsoCmd().execute(context as never)

    expect(layers[0].isOff).toBe(false)
    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenLastCalledWith(
      'jig.layiso.noLayers',
      'warning'
    )
  })
})
