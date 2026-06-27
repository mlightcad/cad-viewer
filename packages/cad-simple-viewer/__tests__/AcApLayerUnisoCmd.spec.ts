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
import { AcApLayerUnisoCmd } from '../src/command/layer/AcApLayerUnisoCmd'
import { AcApLayerService } from '../src/service/AcApLayerService'

interface TestLayer {
  name: string
  objectId: string
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
  objectId: `layer:${name}`,
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
  const layersById = new Map(layers.map(layer => [layer.objectId, layer]))
  const openObjectForWrite = jest.fn((objectId: string) =>
    layersById.get(objectId)
  )
  const database = {
    clayer: currentLayer,
    openObjectForWrite,
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

  let layerIsoSnapshot: import('../src/service').AcApLayerIsoSnapshot | undefined
  let layerPreviousSnapshot:
    | import('../src/app/AcApLayerSessionState').AcApLayerPreviousSnapshot
    | undefined

  const doc = {
    database,
    captureLayerPreviousState() {
      layerPreviousSnapshot = {
        clayer: database.clayer,
        states: layers.map(layer => ({
          name: layer.name,
          isOn: !layer.isOff,
          isFrozen: layer.isFrozen,
          isLocked: layer.isLocked
        }))
      }
    },
    getLayerPreviousSnapshot() {
      return layerPreviousSnapshot
    },
    clearLayerPreviousState() {
      layerPreviousSnapshot = undefined
    },
    restoreLayerPreviousState() {
      if (!layerPreviousSnapshot) return false
      return AcApLayerService.applyLayerPreviousSnapshot(
        database as never,
        layerPreviousSnapshot
      )
    },
    isolateLayers(
      layerNames: string[],
      isolationMode: import('../src/service/types').AcApLayerIsolationMode
    ) {
      const result = new AcApLayerService(database as never).isolateLayers(
        layerNames,
        isolationMode
      )
      if (!result) return undefined
      layerIsoSnapshot = result.isoSnapshot
      return {
        layerNames: result.layerNames,
        affectedLayerCount: result.affectedLayerCount
      }
    },
    unisolateLayers() {
      if (!layerIsoSnapshot) return undefined
      const snapshot = layerIsoSnapshot
      layerIsoSnapshot = undefined
      return new AcApLayerService(database as never).unisolateFromSnapshot(
        snapshot
      )
    }
  }

  return {
    clear,
    database,
    context: {
      doc,
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
