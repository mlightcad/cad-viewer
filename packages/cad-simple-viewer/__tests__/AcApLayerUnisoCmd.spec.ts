jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        showMessage: jest.fn(),
        getSelection: jest.fn(),
        getKeywords: jest.fn()
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

  class AcEdPromptSelectionOptions {
    keywords = new MockKeywordCollection()

    constructor(public message: string) {}
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
    AcEdPromptSelectionOptions,
    AcEdPromptKeywordOptions
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

const createContext = (
  layers: TestLayer[],
  entitiesById: Record<string, { layer?: string }>,
  selectedIds: string[] = [],
  currentLayer = 'Current'
) => {
  const clear = jest.fn()
  const layersByName = new Map(layers.map(layer => [layer.name, layer]))
  const database = {
    clayer: currentLayer,
    tables: {
      blockTable: {
        getEntityById: (objectId: string) => entitiesById[objectId]
      },
      layerTable: {
        getAt: (name: string) => layersByName.get(name),
        newIterator: () => layers
      }
    }
  }

  return {
    clear,
    database,
    context: {
      doc: {
        database
      },
      view: {
        selectionSet: {
          ids: selectedIds,
          clear
        }
      }
    }
  }
}

describe('AcApLayerUnisoCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    AcApLayerIsoState.consume()
  })

  test('reports when no LAYISO state has been captured', async () => {
    const { clear, context } = createContext([], {})
    const cmd = new AcApLayerUnisoCmd()

    await cmd.execute(context as never)

    expect(clear).not.toHaveBeenCalled()
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenCalledWith(
      'jig.layuniso.noPrevious',
      'warning'
    )
  })

  test('restores the previous LAYISO state and retains later layer edits', async () => {
    const current = createLayer('Current')
    const target = createLayer('Target', true, frozenFlag | lockedFlag)
    const changedAfterIso = createLayer('ChangedAfterIso')
    const layers = [current, target, changedAfterIso]
    const { clear, context, database } = createContext(
      layers,
      {
        selected: { layer: 'Target' }
      },
      ['selected']
    )

    await new AcApLayerIsoCmd().execute(context as never)

    expect(database.clayer).toBe('Target')
    expect(current.isOff).toBe(true)
    expect(target.isOff).toBe(false)
    expect(target.isFrozen).toBe(false)
    expect(target.isLocked).toBe(false)
    expect(changedAfterIso.isOff).toBe(true)

    changedAfterIso.isOff = false

    await new AcApLayerUnisoCmd().execute(context as never)

    expect(database.clayer).toBe('Current')
    expect(current.isOff).toBe(false)
    expect(target.isOff).toBe(true)
    expect(target.isFrozen).toBe(true)
    expect(target.isLocked).toBe(true)
    expect(changedAfterIso.isOff).toBe(false)
    expect(clear).toHaveBeenCalledTimes(2)
    expect(AcApDocManager.instance.editor.showMessage).toHaveBeenLastCalledWith(
      'jig.layuniso.restored: 2',
      'success'
    )
  })
})
