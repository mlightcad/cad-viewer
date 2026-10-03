import {
  acdbEstimateDatabaseMemory,
  AcDbDatabase,
  AcDbLine,
  acdbWithDatabase
} from '@mlightcad/data-model'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  AcApOverlayAdmission,
  AcApOverlayCapacityError,
  type AcApOverlayLimits
} from '../src/app/AcApOverlayAdmission'
import { acTrPrepareOverlay } from '../src/view/AcTrOverlay'

const limits: AcApOverlayLimits = {
  references: 3,
  preparations: 1,
  inputBytes: 20,
  entities: 4,
  databaseBytes: 200,
  layoutBytes: 100
}

describe('native reference admission', () => {
  it('retains active and detached replacement charges without evicting either', () => {
    const policy = { ...limits }
    const owner = new AcApOverlayAdmission(policy)
    policy.inputBytes = 1000
    const original = owner.reserve(10)
    original.database(2, 90)
    original.layout(40)
    original.ready()
    const replacement = owner.reserve(10)
    replacement.database(2, 100)
    const before = owner.usage
    expect(() => replacement.layout(61)).toThrow(AcApOverlayCapacityError)
    expect(owner.usage).toEqual(before)
    expect(() => owner.reserve(1)).toThrow(AcApOverlayCapacityError)
    replacement.layout(60)
    replacement.ready()
    expect(owner.usage).toEqual({
      references: 2,
      preparations: 0,
      inputBytes: 20,
      entities: 4,
      databaseBytes: 190,
      layoutBytes: 100
    })
    original.release()
    expect(owner.usage).toEqual({
      references: 1,
      preparations: 0,
      inputBytes: 10,
      entities: 2,
      databaseBytes: 100,
      layoutBytes: 60
    })
    expect(before.references).toBe(2)
    replacement.release()
    replacement.release()
    expect(Object.values(owner.usage).every(value => value === 0)).toBe(true)
    expect(() => replacement.database(1, 1)).toThrow('ended')
    expect(Object.isFrozen(owner.usage)).toBe(true)
    expect(Object.isFrozen(owner.limits)).toBe(true)
  })

  it('refuses excess preparation before charging another input', () => {
    const owner = new AcApOverlayAdmission(limits)
    const pending = owner.reserve(4)
    expect(() => owner.reserve(4)).toThrow(
      expect.objectContaining({ dimension: 'preparations' })
    )
    expect(owner.usage.inputBytes).toBe(4)
    pending.release()
    const next = owner.reserve(20)
    next.ready()
    expect(() => owner.reserve(1)).toThrow(
      expect.objectContaining({ dimension: 'inputBytes' })
    )
    expect(owner.usage.references).toBe(1)
    next.release()
  })

  it('rejects invalid or overflowing values without partial admission', () => {
    for (const invalid of [
      -1,
      NaN,
      Infinity,
      0.5,
      Number.MAX_SAFE_INTEGER + 1
    ]) {
      expect(
        () => new AcApOverlayAdmission({ ...limits, entities: invalid })
      ).toThrow(RangeError)
      const owner = new AcApOverlayAdmission(limits)
      expect(() => owner.reserve(invalid)).toThrow(RangeError)
      expect(owner.usage.references).toBe(0)
      const reference = owner.reserve(1)
      expect(() => reference.database(1, invalid)).toThrow(RangeError)
      expect(owner.usage.entities).toBe(0)
      reference.release()
    }
    const owner = new AcApOverlayAdmission({
      ...limits,
      inputBytes: Number.MAX_SAFE_INTEGER
    })
    const first = owner.reserve(Number.MAX_SAFE_INTEGER)
    first.ready()
    expect(() => owner.reserve(1)).toThrow(AcApOverlayCapacityError)
    expect(owner.usage.inputBytes).toBe(Number.MAX_SAFE_INTEGER)
    first.release()
  })

  it('uses the existing native database and packed-layout statistics for a real line reference', async () => {
    const db = new AcDbDatabase()
    acdbWithDatabase(db, () => {
      db.createDefaultData()
      db.tables.blockTable.modelSpace.appendEntity(
        new AcDbLine({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 0 })
      )
    })
    const estimate = acdbEstimateDatabaseMemory(db)
    expect(estimate.entityCount).toBe(1)
    const renderer = new AcTrRenderer({
      getSize: (size: THREE.Vector2) => size.set(800, 600)
    } as THREE.WebGLRenderer)
    const layout = await acTrPrepareOverlay(renderer, db)
    try {
      const after = acdbEstimateDatabaseMemory(db)
      const sizes = layout.stats.summary.totalSize
      const layoutBytes =
        sizes.geometry + sizes.mapping + layout.spatialIndexStats.estimatedBytes
      expect(sizes.geometry).toBeGreaterThan(0)
      expect(layoutBytes).toBeGreaterThan(0)
      const owner = new AcApOverlayAdmission({
        ...limits,
        entities: 1,
        databaseBytes: after.totalBytes,
        layoutBytes
      })
      const reference = owner.reserve(0)
      reference.database(after.entityCount, after.totalBytes)
      reference.layout(layoutBytes)
      reference.ready()
      const second = owner.reserve(0)
      expect(() =>
        second.database(after.entityCount, after.totalBytes)
      ).toThrow(expect.objectContaining({ dimension: 'entities' }))
      second.release()
      layout.clear()
      reference.release()
      expect(owner.usage.layoutBytes).toBe(0)
      expect(owner.usage.databaseBytes).toBe(0)
      expect(layout.entityCount).toBe(0)
    } finally {
      layout.clear()
      renderer.dispose()
    }
  })
})
