import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'

import type { AcApLayerPreviousSnapshot } from '../src/app/AcApLayerSessionState'
import { AcApLayerService } from '../src/service/AcApLayerService'

function createMockDatabase() {
  const layers = new Map<
    string,
    {
      name: string
      objectId: string
      isOff: boolean
      isFrozen: boolean
      standardFlags: number
      color: { clone: () => AcCmColor }
      clonePreservingIdentity: () => unknown
      isLocked?: boolean
    }
  >()
  layers.set('0', {
    name: '0',
    objectId: '0',
    isOff: false,
    isFrozen: false,
    standardFlags: 0,
    color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 7) },
    clonePreservingIdentity() {
      return { ...this }
    },
    get isLocked() {
      return (this.standardFlags & 0x04) !== 0
    }
  })
  layers.set('A', {
    name: 'A',
    objectId: 'A',
    isOff: true,
    isFrozen: false,
    standardFlags: 0,
    color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 1) },
    clonePreservingIdentity() {
      return { ...this }
    },
    get isLocked() {
      return (this.standardFlags & 0x04) !== 0
    }
  })

  const transactionManager = {
    hasTransaction: jest.fn(() => false),
    isRecording: jest.fn(() => false),
    currentTransaction: jest.fn()
  }

  const layerTable = {
    getAt: (name: string) => {
      const layer = layers.get(name)
      if (!layer) return undefined
      return layer
    },
    newIterator: function* () {
      for (const layer of layers.values()) {
        yield layer
      }
    }
  }

  return {
    clayer: '0',
    transactionManager,
    events: {
      layerModified: {
        dispatch: jest.fn()
      }
    },
    tables: {
      layerTable,
      blockTable: {
        getEntityById: jest.fn()
      }
    },
    getObjectById: jest.fn((objectId: string) => layers.get(objectId)),
    openObjectForWrite: jest.fn((objectId: string) => layers.get(objectId)),
    runDatabaseEdit: jest.fn((_label: string, fn: () => void) => fn()),
    isUndoRecording: jest.fn(() => false),
    layers
  }
}

function createMockDocument(db: ReturnType<typeof createMockDatabase>) {
  let layerPreviousSnapshot: AcApLayerPreviousSnapshot | undefined
  let layerIsoSnapshot:
    | import('../src/service').AcApLayerIsoSnapshot
    | undefined

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
      objectId: 'L',
      isOff: false,
      isFrozen: false,
      standardFlags: 0x04,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 7) },
      clonePreservingIdentity() {
        return { ...this }
      }
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
      objectId: 'L',
      isOff: false,
      isFrozen: false,
      standardFlags: 0x04,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 7) },
      clonePreservingIdentity() {
        return { ...this }
      }
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
      objectId: 'B',
      isOff: false,
      isFrozen: false,
      standardFlags: 0,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 2) },
      clonePreservingIdentity() {
        return { ...this }
      }
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

  test('resolveLayerTraits returns sub-entity traits from the layer table', () => {
    const db = createMockDatabase()
    db.layers.set('WALL', {
      name: 'WALL',
      isOff: false,
      isFrozen: false,
      standardFlags: 0,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 3) },
      lineStyle: 'DASHED',
      lineWeight: 50,
      transparency: 0.5
    } as never)

    const service = new AcApLayerService(db as never)
    const traits = service.getEffectiveLayerTraits('WALL')

    expect(traits).toEqual({
      layer: 'WALL',
      color: expect.any(AcCmColor),
      lineType: 'DASHED',
      lineWeight: 50,
      transparency: 0.5
    })
    expect(AcApLayerService.resolveLayerTraits(db as never, 'MISSING')).toBe(
      undefined
    )
  })

  test('setLayerOn updates the layer-table record when handles collide across symbol tables', () => {
    const plateLayer = {
      name: 'PLATE',
      objectId: '11',
      isOff: false,
      isFrozen: false,
      standardFlags: 0,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 2) },
      clonePreservingIdentity() {
        return { ...this }
      }
    }
    const conflictingRecord = {
      name: 'Standard',
      objectId: '11',
      isOff: false,
      clonePreservingIdentity() {
        return { ...this }
      }
    }

    const openedObjects = new Map<string, unknown>()
    const originalStates = new Map<string, unknown>()
    const recorder = {
      changes: [] as Array<{
        kind: string
        objectId: string
        before?: unknown
      }>,
      hasModify(objectId: string) {
        return this.changes.some(
          change => change.kind === 'modify' && change.objectId === objectId
        )
      },
      recordModify(object: {
        objectId: string
        clonePreservingIdentity: () => unknown
      }) {
        if (this.hasModify(object.objectId)) return
        this.changes.push({
          kind: 'modify',
          objectId: object.objectId,
          before: object.clonePreservingIdentity()
        })
      }
    }

    const transaction = {
      openedObjects,
      originalStates,
      recorder
    }

    const db = {
      clayer: '0',
      events: {
        layerModified: {
          dispatch: jest.fn()
        }
      },
      getObjectById: jest.fn(() => conflictingRecord),
      transactionManager: {
        hasTransaction: jest.fn(() => false),
        isRecording: jest.fn(() => true),
        currentTransaction: () => transaction
      },
      tables: {
        layerTable: {
          getAt: (name: string) => (name === 'PLATE' ? plateLayer : undefined)
        }
      },
      openObjectForWrite: jest.fn(() => conflictingRecord),
      runDatabaseEdit: jest.fn((_label: string, fn: () => void) => fn()),
      isUndoRecording: jest.fn(() => true)
    }

    const service = new AcApLayerService(db as never)
    expect(service.setLayerOn('PLATE', false)).toBe(true)
    expect(plateLayer.isOff).toBe(true)
    expect(conflictingRecord.isOff).toBe(false)
    expect(db.openObjectForWrite).not.toHaveBeenCalled()
  })

  test('setLayerFrozen dispatches layerModified when handles collide across symbol tables', () => {
    const plateLayer = {
      name: 'PLATE',
      objectId: '11',
      isOff: false,
      isFrozen: false,
      standardFlags: 0,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 2) },
      clonePreservingIdentity() {
        return { ...this }
      }
    }
    const conflictingRecord = {
      name: 'Standard',
      objectId: '11',
      isOff: false,
      standardFlags: 0,
      clonePreservingIdentity() {
        return { ...this }
      }
    }

    const db = {
      clayer: '0',
      events: {
        layerModified: {
          dispatch: jest.fn()
        }
      },
      getObjectById: jest.fn(() => conflictingRecord),
      transactionManager: {
        hasTransaction: jest.fn(() => false),
        isRecording: jest.fn(() => false)
      },
      tables: {
        layerTable: {
          getAt: (name: string) => (name === 'PLATE' ? plateLayer : undefined)
        }
      },
      openObjectForWrite: jest.fn(() => conflictingRecord),
      runDatabaseEdit: jest.fn((_label: string, fn: () => void) => fn()),
      isUndoRecording: jest.fn(() => false)
    }

    const service = new AcApLayerService(db as never)
    expect(service.setLayerFrozen('PLATE', true)).toBe(true)
    expect(plateLayer.standardFlags & 0x01).toBe(0x01)
    expect(conflictingRecord.standardFlags).toBe(0)
    expect(db.events.layerModified.dispatch).toHaveBeenCalledWith({
      database: db,
      layer: plateLayer,
      changes: { standardFlags: plateLayer.standardFlags }
    })
    expect(db.openObjectForWrite).not.toHaveBeenCalled()
  })

  test('undo restores the layer-table record when handles collide across symbol tables', () => {
    const plateLayer = {
      name: 'PLATE',
      objectId: '11',
      isOff: false,
      isFrozen: false,
      standardFlags: 0,
      color: { clone: () => new AcCmColor(AcCmColorMethod.ByACI, 2) },
      clonePreservingIdentity() {
        return { ...this, isOff: this.isOff }
      },
      restoreFrom(snapshot: { isOff?: boolean }) {
        if (snapshot.isOff !== undefined) {
          this.isOff = snapshot.isOff
        }
      }
    }
    const conflictingRecord = {
      name: 'Standard',
      objectId: '11',
      isOff: false,
      restoreFrom: jest.fn(),
      clonePreservingIdentity() {
        return { ...this }
      }
    }

    const openedObjects = new Map<string, unknown>()
    const originalStates = new Map<string, unknown>()
    const changes: Array<{
      kind: 'modify'
      objectId: string
      before?: { name: string; isOff: boolean }
      after?: { name: string; isOff: boolean }
    }> = []

    const recorder = {
      changes,
      getChanges() {
        return changes
      },
      hasModify(objectId: string) {
        return changes.some(
          change => change.kind === 'modify' && change.objectId === objectId
        )
      },
      recordModify(object: typeof plateLayer) {
        if (this.hasModify(object.objectId)) return
        changes.push({
          kind: 'modify',
          objectId: object.objectId,
          before: object.clonePreservingIdentity()
        })
      },
      finalize(database: { getObjectById: () => typeof conflictingRecord }) {
        for (const change of changes) {
          if (change.kind !== 'modify') continue
          const object = database.getObjectById()
          change.after = object.clonePreservingIdentity()
        }
      }
    }

    const transaction = { openedObjects, originalStates, recorder }

    const db = {
      clayer: '0',
      events: {
        layerModified: {
          dispatch: jest.fn()
        }
      },
      getObjectById: jest.fn(() => conflictingRecord),
      transactionManager: {
        hasTransaction: jest.fn(() => true),
        isRecording: jest.fn(() => true),
        currentTransaction: () => transaction,
        changeApplier: {
          applyModify(change: (typeof changes)[number], forward: boolean) {
            const object = db.getObjectById()
            const snapshot = forward ? change.after : change.before
            if (object && snapshot) {
              object.restoreFrom(snapshot)
            }
          }
        }
      },
      tables: {
        layerTable: {
          getAt: (name: string) => (name === 'PLATE' ? plateLayer : undefined)
        }
      },
      openObjectForWrite: jest.fn(() => conflictingRecord),
      runDatabaseEdit: jest.fn((_label: string, fn: () => void) => fn()),
      isUndoRecording: jest.fn(() => true)
    }

    const service = new AcApLayerService(db as never)
    expect(service.setLayerOn('PLATE', false)).toBe(true)
    expect(plateLayer.isOff).toBe(true)

    recorder.finalize(db as never)
    expect(changes[0]?.after).toEqual(
      expect.objectContaining({ name: 'PLATE', isOff: true })
    )

    db.transactionManager.changeApplier.applyModify(changes[0]!, false)
    expect(plateLayer.isOff).toBe(false)
    expect(conflictingRecord.restoreFrom).not.toHaveBeenCalled()
  })
})
