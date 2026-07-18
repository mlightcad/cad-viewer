const acapRunDatabaseEdit = jest.fn(
  (_db: unknown, _label: string, fn: () => boolean) => {
    fn()
  }
)

const sysVarChangedListeners = new Set<(...args: unknown[]) => void>()

jest.mock('../src/util/AcApDatabaseEdit', () => ({
  acapRunDatabaseEdit
}))

jest.mock('@mlightcad/data-model', () => {
  const actual = jest.requireActual('@mlightcad/data-model')
  return {
    ...actual,
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
    }
  }
})

import type { AcApDocument } from '../src/app/AcApDocument'
import { AcApLayerService } from '../src/service/AcApLayerService'
import { AcApLayerStore } from '../src/service/AcApLayerStore'

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

const createDatabase = (
  layers: TestLayer[],
  currentLayer = layers[0]?.name
) => {
  const layersByName = new Map(layers.map(layer => [layer.name, layer]))
  const layersById = new Map(layers.map(layer => [layer.objectId, layer]))
  const db = {
    clayer: currentLayer,
    openObjectForWrite: jest.fn((objectId: string) => layersById.get(objectId)),
    getObjectById: jest.fn((objectId: string) => layersById.get(objectId)),
    transactionManager: { hasTransaction: jest.fn(() => false) },
    runDatabaseEdit: jest.fn((_label: string, fn: () => void) => fn()),
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

const createDocument = (db: ReturnType<typeof createDatabase>['db']) => {
  let layerService: AcApLayerService | undefined
  return {
    database: db,
    get layerService() {
      if (!layerService) {
        layerService = new AcApLayerService(db as never)
      }
      return layerService
    }
  } as unknown as AcApDocument
}

describe('AcApLayerStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sysVarChangedListeners.clear()
  })

  it('getLayers returns a shallow copy of cached layers', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', true)
    const { db } = createDatabase([layer0, layer1], '0')
    const store = new AcApLayerStore(createDocument(db))

    const snapshot = store.getLayers()
    snapshot.push({
      name: 'mutated',
      color: '7',
      cssColor: '#fff',
      isOn: true,
      isFrozen: false,
      isLocked: false
    })

    expect(store.getLayers().some(layer => layer.name === 'mutated')).toBe(
      false
    )
    expect(store.getLayers()).toHaveLength(2)
  })

  it('events.changed dispatches cached layer snapshots', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', true)
    const { db } = createDatabase([layer0, layer1], '0')
    const store = new AcApLayerStore(createDocument(db))
    const listener = jest.fn()

    store.events.changed.addEventListener(listener)

    layer1.isOff = false
    db.events.layerModified.addEventListener.mock.calls[0][0]({
      layer: layer1
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      layers: [
        {
          name: '0',
          color: '7',
          cssColor: '#FFFFFF',
          isOn: true,
          isFrozen: false,
          isLocked: false
        },
        {
          name: 'A',
          color: '7',
          cssColor: '#FFFFFF',
          isOn: true,
          isFrozen: false,
          isLocked: false
        }
      ],
      currentLayerName: '0'
    })
  })

  it('setCurrentLayer updates cached current layer name immediately', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const { db } = createDatabase([layer0, layer1], '0')
    const store = new AcApLayerStore(createDocument(db))

    expect(store.getCurrentLayerName()).toBe('0')
    expect(store.setCurrentLayer('A')).toBe(true)
    expect(db.clayer).toBe('A')
    expect(store.getCurrentLayerName()).toBe('A')
  })

  it('setLayerOn turns a non-current layer off without changing clayer', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const { db } = createDatabase([layer0, layer1], '0')
    const store = new AcApLayerStore(createDocument(db))

    expect(store.setLayerOn('A', false)).toBe(true)
    expect(layer1.isOff).toBe(true)
    expect(db.clayer).toBe('0')
    expect(acapRunDatabaseEdit).toHaveBeenCalledTimes(1)
  })

  it('setLayerOn switches clayer before turning off the current layer', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const { db } = createDatabase([layer0, layer1], '0')
    const store = new AcApLayerStore(createDocument(db))

    expect(store.setLayerOn('0', false)).toBe(true)
    expect(layer0.isOff).toBe(true)
    expect(db.clayer).toBe('A')
    expect(layer1.isOff).toBe(false)
  })

  it('setAllLayersOn turns on every off layer in one edit', () => {
    const layer0 = createLayer('0', true)
    const layer1 = createLayer('A', true)
    const { db } = createDatabase([layer0, layer1], '0')
    const store = new AcApLayerStore(createDocument(db))

    expect(store.setAllLayersOn()).toBe(true)
    expect(layer0.isOff).toBe(false)
    expect(layer1.isOff).toBe(false)
    expect(acapRunDatabaseEdit).toHaveBeenCalledTimes(1)
  })

  it('setAllLayersOffExceptCurrent leaves only the current layer on', () => {
    const layer0 = createLayer('0', false)
    const layer1 = createLayer('A', false)
    const layer2 = createLayer('B', false)
    const { db } = createDatabase([layer0, layer1, layer2], '0')
    const store = new AcApLayerStore(createDocument(db))

    expect(store.setAllLayersOffExceptCurrent()).toBe(true)
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
    const store = new AcApLayerStore(createDocument(db))

    expect(store.setAllLayersOffExceptCurrent()).toBe(false)
    expect(layer0.isOff).toBe(false)
    expect(layer1.isOff).toBe(true)
    expect(layer2.isOff).toBe(true)
  })

  it('getLayerService returns the owning document layer service', () => {
    const layer0 = createLayer('0', false)
    const { db } = createDatabase([layer0], '0')
    const document = createDocument(db)
    const store = new AcApLayerStore(document)

    expect(store.getLayerService()).toBe(document.layerService)
  })

  it('destroy removes database listeners and clears cached layers', () => {
    const layer0 = createLayer('0', false)
    const { db } = createDatabase([layer0], '0')
    const store = new AcApLayerStore(createDocument(db))

    store.destroy()

    expect(db.events.layerAppended.removeEventListener).toHaveBeenCalled()
    expect(db.events.layerErased.removeEventListener).toHaveBeenCalled()
    expect(db.events.layerModified.removeEventListener).toHaveBeenCalled()
    expect(store.getLayers()).toEqual([])
    expect(store.getCurrentLayerName()).toBe('')
  })
})
