import { AcDbBlockReference, type AcDbDatabase } from '@mlightcad/data-model'

import { shouldConvertEntity } from '../src/convertDatabase'

function createDatabase(layers: {
  name: string
  isOff?: boolean
  isFrozen?: boolean
}[]): AcDbDatabase {
  const byName = new Map(
    layers.map(layer => [
      layer.name,
      {
        name: layer.name,
        isOff: layer.isOff === true,
        isFrozen: layer.isFrozen === true
      }
    ])
  )
  return {
    tables: {
      layerTable: {
        getAt: (name: string) => byName.get(name)
      }
    }
  } as unknown as AcDbDatabase
}

function createEntity(
  layer: string,
  visibility = true
): { layer: string; visibility: boolean } {
  return { layer, visibility }
}

function createInsert(layer: string, visibility = true): AcDbBlockReference {
  const insert = Object.create(
    AcDbBlockReference.prototype
  ) as AcDbBlockReference
  Object.defineProperties(insert, {
    layer: { value: layer, writable: true, configurable: true },
    visibility: { value: visibility, writable: true, configurable: true }
  })
  return insert
}

describe('shouldConvertEntity', () => {
  it('includes frozen INSERTs when exportInvisibleLayers is true', () => {
    const database = createDatabase([
      { name: 'VEGA', isFrozen: true },
      { name: 'Wall', isOff: true },
      { name: '0' }
    ])

    expect(shouldConvertEntity(createInsert('VEGA'), database, true)).toBe(true)
    expect(shouldConvertEntity(createInsert('Wall'), database, true)).toBe(true)
    expect(shouldConvertEntity(createInsert('0'), database, true)).toBe(true)
    expect(
      shouldConvertEntity(createEntity('VEGA') as never, database, true)
    ).toBe(true)
  })

  it('skips frozen-layer content when exportInvisibleLayers is false', () => {
    const database = createDatabase([{ name: 'VEGA', isFrozen: true }])
    expect(shouldConvertEntity(createInsert('VEGA'), database, false)).toBe(
      false
    )
    expect(
      shouldConvertEntity(createEntity('VEGA') as never, database, false)
    ).toBe(false)
  })

  it('still converts Off INSERTs when exportInvisibleLayers is false', () => {
    const database = createDatabase([
      { name: 'OFFLAYER', isOff: true },
      { name: '0' }
    ])
    expect(
      shouldConvertEntity(createInsert('OFFLAYER'), database, false)
    ).toBe(true)
    expect(
      shouldConvertEntity(createEntity('OFFLAYER') as never, database, false)
    ).toBe(false)
  })

  it('skips entity-level invisible content', () => {
    const database = createDatabase([{ name: '0' }])
    expect(
      shouldConvertEntity(createEntity('0', false) as never, database, true)
    ).toBe(false)
  })
})
