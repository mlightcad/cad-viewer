const acapRunDatabaseEdit = jest.fn(
  (_db: unknown, _label: string, fn: () => boolean) => {
    fn()
  }
)

const documentActivatedListeners = new Set<(...args: unknown[]) => void>()
const sysVarChangedListeners = new Set<(...args: unknown[]) => void>()

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  acapRunDatabaseEdit,
  AcApDocManager: {
    instance: {
      curDocument: undefined,
      events: {
        documentActivated: {
          addEventListener: (fn: (...args: unknown[]) => void) =>
            documentActivatedListeners.add(fn),
          removeEventListener: (fn: (...args: unknown[]) => void) =>
            documentActivatedListeners.delete(fn)
        }
      }
    }
  }
}))

jest.mock('@mlightcad/data-model', () => ({
  AcDbSysVarManager: {
    instance: () => ({
      events: {
        sysVarChanged: {
          addEventListener: (fn: (...args: unknown[]) => void) =>
            sysVarChangedListeners.add(fn),
          removeEventListener: (fn: (...args: unknown[]) => void) =>
            sysVarChangedListeners.delete(fn)
        }
      }
    })
  },
  AcCmColor: {
    fromString: jest.fn()
  }
}))

import { AcExLayerService } from '../src/service/AcExLayerService'

interface TestLayer {
  name: string
  objectId: string
  isOff: boolean
  standardFlags?: number
  isFrozen: boolean
  color: {
    toString: () => string
    cssColor: string
    clone: () => TestLayer['color']
  }
}

const frozenFlag = 0x01

const createColor = (value = '7') => {
  const color = {
    toString: () => value,
    cssColor: '#FFFFFF',
    clone: () => color
  }
  return color
}

const createLayer = (
  name: string,
  isOff = false,
  standardFlags = 0
): TestLayer => ({
  name,
  objectId: `layer:${name}`,
  isOff,
  standardFlags,
  get isFrozen() {
    return !!((this.standardFlags ?? 0) & frozenFlag)
  },
  color: createColor()
})

const createDatabase = (layers: TestLayer[], currentLayer = layers[0]?.name) => {
  const layersByName = new Map(layers.map(layer => [layer.name, layer]))
  const layersById = new Map(layers.map(layer => [layer.objectId, layer]))
  const db = {
    clayer: currentLayer,
    openObjectForWrite: jest.fn((objectId: string) => layersById.get(objectId)),
    tables: {
      layerTable: {
        getAt: jest.fn((name: string) => layersByName.get(name)),
        newIterator: () => layers
      }
    },
    events: {
      layerAppended: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      },
      layerErased: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      },
      layerModified: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    }
  }
  return { db, layersByName, layersById }
}

const createEditor = (database?: ReturnType<typeof createDatabase>['db']) => ({
  curDocument: database ? { database } : undefined,
  events: {
    documentActivated: {
      addEventListener: (fn: (...args: unknown[]) => void) =>
        documentActivatedListeners.add(fn),
      removeEventListener: (fn: (...args: unknown[]) => void) =>
        documentActivatedListeners.delete(fn)
    }
  }
})

describe('AcExLayerService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    documentActivatedListeners.clear()
    sysVarChangedListeners.clear()
  })

  it('getLayers returns a shallow copy of cached layers', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', true)
    const { db } = createDatabase([layer0, layer1], '0')
    const editor = createEditor(db)
    const service = new AcExLayerService(editor as never)

    const snapshot = service.getLayers()
    snapshot.push({
      name: 'mutated',
      color: '7',
      cssColor: '#fff',
      isOn: true
    })

    expect(service.getLayers().some(layer => layer.name === 'mutated')).toBe(
      false
    )
    expect(service.getLayers()).toHaveLength(2)
  })

  it('setLayerOn turns a non-current layer off without changing clayer', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const { db } = createDatabase([layer0, layer1], '0')
    const editor = createEditor(db)
    const service = new AcExLayerService(editor as never)

    expect(service.setLayerOn('A', false)).toBe(true)
    expect(layer1.isOff).toBe(true)
    expect(db.clayer).toBe('0')
    expect(acapRunDatabaseEdit).toHaveBeenCalledTimes(1)
  })

  it('setLayerOn switches clayer before turning off the current layer', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const { db } = createDatabase([layer0, layer1], '0')
    const editor = createEditor(db)
    const service = new AcExLayerService(editor as never)

    expect(service.setLayerOn('0', false)).toBe(true)
    expect(layer0.isOff).toBe(true)
    expect(db.clayer).toBe('A')
    expect(layer1.isOff).toBe(false)
  })

  it('setAllLayersOn turns on every off layer in one edit', () => {
    const layer0 = createLayer('0', true)
    const layer1 = createLayer('A', true)
    const { db } = createDatabase([layer0, layer1], '0')
    const editor = createEditor(db)
    const service = new AcExLayerService(editor as never)

    expect(service.setAllLayersOn()).toBe(true)
    expect(layer0.isOff).toBe(false)
    expect(layer1.isOff).toBe(false)
    expect(acapRunDatabaseEdit).toHaveBeenCalledTimes(1)
  })

  it('setAllLayersOffExceptCurrent leaves only the current layer on', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const layer2 = createLayer('B', false)
    const { db } = createDatabase([layer0, layer1, layer2], '0')
    const editor = createEditor(db)
    const service = new AcExLayerService(editor as never)

    expect(service.setAllLayersOffExceptCurrent()).toBe(true)
    expect(layer0.isOff).toBe(false)
    expect(layer1.isOff).toBe(true)
    expect(layer2.isOff).toBe(true)
    expect(db.clayer).toBe('0')
    expect(acapRunDatabaseEdit).toHaveBeenCalledTimes(1)
  })

  it('setAllLayersOffExceptCurrent is a no-op when only current layer is on', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', true)
    const layer2 = createLayer('B', true)
    const { db } = createDatabase([layer0, layer1, layer2], '0')
    const editor = createEditor(db)
    const service = new AcExLayerService(editor as never)

    expect(service.setAllLayersOffExceptCurrent()).toBe(false)
    expect(layer0.isOff).toBe(false)
    expect(layer1.isOff).toBe(true)
    expect(layer2.isOff).toBe(true)
  })
})
