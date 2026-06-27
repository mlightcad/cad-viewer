import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'

import type { AcApLayerPreviousSnapshot } from '../src/app/AcApLayerSessionState'
import { AcApLayerService } from '../src/service/AcApLayerService'

function createMockDatabase() {
  const layers = new Map<
    string,
    {
      name: string
      isOff: boolean
      isFrozen: boolean
      standardFlags: number
      color: { clone: () => AcCmColor }
    }
  >()
  layers.set('0', {
    name: '0',
    isOff: false,
    isFrozen: false,
    standardFlags: 0,
    color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 7) }
  })
  layers.set('A', {
    name: 'A',
    isOff: true,
    isFrozen: false,
    standardFlags: 0,
    color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 1) }
  })

  const transactionManager = {
    hasTransaction: jest.fn(() => false)
  }

  const layerTable = {
    getAt: (name: string) => {
      const layer = layers.get(name)
      if (!layer) return undefined
      return {
        ...layer,
        objectId: name,
        get isLocked() {
          return (layer.standardFlags & 0x04) !== 0
        }
      }
    },
    newIterator: function* () {
      for (const layer of layers.values()) {
        yield {
          ...layer,
          objectId: layer.name,
          get isLocked() {
            return (layer.standardFlags & 0x04) !== 0
          }
        }
      }
    }
  }

  return {
    clayer: '0',
    transactionManager,
    tables: {
      layerTable,
      blockTable: {
        getEntityById: jest.fn()
      }
    },
    openObjectForWrite: jest.fn((objectId: string) => layers.get(objectId)),
    runDatabaseEdit: jest.fn((_label: string, fn: () => void) => fn()),
    isUndoRecording: jest.fn(() => false),
    layers
  }
}

function createMockDocument(db: ReturnType<typeof createMockDatabase>) {
  let layerPreviousSnapshot: AcApLayerPreviousSnapshot | undefined
  let layerIsoSnapshot: import('../src/service').AcApLayerIsoSnapshot | undefined

  return {
    captureLayerPreviousState() {
      layerPreviousSnapshot = {
        clayer: db.clayer,
        states: [...db.tables.layerTable.newIterator()].map(layer => ({
          name: layer.name,
          isOn: !layer.isOff,
          isFrozen: layer.isFrozen,
          isLocked: (layer.standardFlags & 0x04) !== 0
        }))
      }
    },
    getLayerPreviousSnapshot() {
      return layerPreviousSnapshot
    },
    restoreLayerPreviousState() {
      const snapshot = layerPreviousSnapshot
      if (!snapshot) return false
      return AcApLayerService.applyLayerPreviousSnapshot(db as never, snapshot)
    },
    isolateLayers(
      layerNames: string[],
      isolationMode: import('../src/service/types').AcApLayerIsolationMode
    ) {
      const result = new AcApLayerService(db as never).isolateLayers(
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
      return new AcApLayerService(db as never).unisolateFromSnapshot(snapshot)
    }
  }
}

describe('AcApLayerService', () => {
  test('setAllLayersOn turns on off layers', () => {
    const db = createMockDatabase()
    const service = new AcApLayerService(db as never)

    const count = service.setAllLayersOn()

    expect(count).toBe(1)
    expect(db.layers.get('A')?.isOff).toBe(false)
  })

  test('setLayerOn with switchCurrentLayer switches CLAYER before turning off current layer', () => {
    const db = createMockDatabase()
    db.clayer = '0'
    const service = new AcApLayerService(db as never)

    const ok = service.setLayerOn('0', false, { switchCurrentLayer: true })

    expect(ok).toBe(true)
    expect(db.clayer).toBe('A')
    expect(db.layers.get('0')?.isOff).toBe(true)
  })

  test('setLayersFrozen skips current layer by default', () => {
    const db = createMockDatabase()
    db.clayer = '0'
    const service = new AcApLayerService(db as never)

    const { skippedCurrent } = service.setLayersFrozen(['0', 'A'], true)

    expect(skippedCurrent).toEqual(['0'])
    expect((db.layers.get('A')?.standardFlags ?? 0) & 0x01).toBe(0x01)
  })

  test('getLayerSummaries reads locked state from standardFlags', () => {
    const db = createMockDatabase()
    db.layers.set('L', {
      name: 'L',
      isOff: false,
      isFrozen: false,
      standardFlags: 0x04,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 7) }
    })
    const service = new AcApLayerService(db as never)

    expect(service.getLayerSummaries()).toEqual([
      expect.objectContaining({ name: '0', locked: 'No' }),
      expect.objectContaining({ name: 'A', locked: 'No' }),
      expect.objectContaining({ name: 'L', locked: 'Yes' })
    ])
  })

  test('lockLayerByEntity detects locked layers via standardFlags', () => {
    const db = createMockDatabase()
    db.layers.set('L', {
      name: 'L',
      isOff: false,
      isFrozen: false,
      standardFlags: 0x04,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 7) }
    })
    db.tables.blockTable.getEntityById = jest.fn(() => ({ layer: 'L' }))
    const service = new AcApLayerService(db as never)

    expect(service.lockLayerByEntity('entity:1' as never)).toEqual({
      ok: false,
      reason: 'already_locked',
      layerName: 'L'
    })
  })

  test('restorePreviousState restores captured layer state per document', () => {
    const dbA = createMockDatabase()
    const dbB = createMockDatabase()
    dbB.layers.set('B', {
      name: 'B',
      isOff: false,
      isFrozen: false,
      standardFlags: 0,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 2) }
    })
    dbB.clayer = 'B'

    const docA = createMockDocument(dbA)
    const docB = createMockDocument(dbB)

    docA.captureLayerPreviousState()
    docB.captureLayerPreviousState()

    dbA.layers.get('A')!.isOff = false
    dbB.layers.get('0')!.isOff = true

    expect(docA.restoreLayerPreviousState()).toBe(true)
    expect(dbA.layers.get('A')?.isOff).toBe(true)
    expect(dbB.layers.get('0')?.isOff).toBe(true)

    expect(docB.restoreLayerPreviousState()).toBe(true)
    expect(dbB.layers.get('0')?.isOff).toBe(false)
  })
})
