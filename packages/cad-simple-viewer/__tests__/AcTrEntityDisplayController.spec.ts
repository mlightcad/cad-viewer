import {
  AcCmColor,
  type AcDbBlockTableRecord,
  type AcDbEntity
} from '@mlightcad/data-model'

import { AcTrEntityDisplayController } from '../src/view/AcTrEntityDisplayController'
import { AcTrLayer } from '../src/view/AcTrLayer'

function createDbEntity(
  objectId: string,
  layer: string,
  visibility = true
): AcDbEntity {
  return { objectId, layer, visibility } as AcDbEntity
}

function createBlockTableRecord(entities: AcDbEntity[]): AcDbBlockTableRecord {
  return {
    newIterator: () => entities[Symbol.iterator]()
  } as unknown as AcDbBlockTableRecord
}
describe('AcTrEntityDisplayController', () => {
  it('skips entities on off or frozen layers while keeping entity visibility separate', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const frozenLayer = {
      name: 'frozen',
      isOff: false,
      isFrozen: true,
      color: new AcCmColor()
    }
    const onLayer = {
      name: 'on',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }

    const controller = new AcTrEntityDisplayController(name =>
      name === 'off' ? offLayer : name === 'frozen' ? frozenLayer : onLayer
    )

    expect(controller.shouldConvert({ visibility: true, layer: 'off' })).toBe(
      false
    )
    expect(
      controller.shouldConvert({ visibility: true, layer: 'frozen' })
    ).toBe(false)
    expect(controller.shouldConvert({ visibility: false, layer: 'on' })).toBe(
      false
    )
    expect(controller.shouldConvert({ visibility: true, layer: 'on' })).toBe(
      true
    )
  })

  it('matches AcTrLayer visibility resolution for drawable layers', () => {
    const layerInfo = {
      name: '0',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(() => layerInfo)

    expect(AcTrLayer.isLayerVisible(layerInfo)).toBe(true)
    expect(controller.shouldConvert({ visibility: true, layer: '0' })).toBe(
      true
    )
  })

  it('includes off-layer entities for export conversion', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(() => offLayer)

    expect(controller.shouldConvert({ visibility: true, layer: 'off' })).toBe(
      false
    )
    expect(
      controller.shouldConvertForExport({ visibility: true, layer: 'off' })
    ).toBe(true)
    expect(
      controller.shouldConvertForExport({ visibility: false, layer: 'off' })
    ).toBe(false)
  })

  it('detects layer visibility changes from isOff or standardFlags', () => {
    const controller = new AcTrEntityDisplayController(() => undefined)

    expect(controller.layerVisibilityMayHaveChanged({ isOff: true })).toBe(true)
    expect(controller.layerVisibilityMayHaveChanged({ standardFlags: 1 })).toBe(
      true
    )
    expect(
      controller.layerVisibilityMayHaveChanged({ color: new AcCmColor() })
    ).toBe(false)
  })

  it('collectMissingEntitiesOnLayer returns drawable entities not yet in the scene', () => {
    const onLayer = {
      name: 'on',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(() => onLayer)
    const blockTableRecord = createBlockTableRecord([
      createDbEntity('line-1', 'on'),
      createDbEntity('line-2', 'on'),
      createDbEntity('line-off-layer', 'off')
    ])
    const rendered = new Set(['line-1'])

    const pending = controller.collectMissingEntitiesOnLayer(
      'on',
      blockTableRecord,
      objectId => rendered.has(objectId)
    )

    expect(pending.map(entity => entity.objectId)).toEqual(['line-2'])
  })

  it('collectMissingEntitiesOnLayer includes entities once their layer is visible again', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const onLayer = {
      name: 'off',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }
    let layerInfo = offLayer
    const controller = new AcTrEntityDisplayController(() => layerInfo)
    const blockTableRecord = createBlockTableRecord([
      createDbEntity('line-off', 'off')
    ])

    expect(
      controller.collectMissingEntitiesOnLayer(
        'off',
        blockTableRecord,
        () => false
      )
    ).toEqual([])

    layerInfo = onLayer
    const pending = controller.collectMissingEntitiesOnLayer(
      'off',
      blockTableRecord,
      () => false
    )

    expect(pending.map(entity => entity.objectId)).toEqual(['line-off'])
  })

  it('collectMissingEntitiesForExport includes off-layer entities missing from the scene', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(() => offLayer)
    const blockTableRecord = createBlockTableRecord([
      createDbEntity('line-off', 'off'),
      createDbEntity('line-hidden', 'off', false),
      createDbEntity('line-rendered', 'off')
    ])
    const rendered = new Set(['line-rendered'])

    const pending = controller.collectMissingEntitiesForExport(
      blockTableRecord,
      objectId => rendered.has(objectId)
    )

    expect(pending.map(entity => entity.objectId)).toEqual(['line-off'])
  })

  it('collectMissingEntitiesForExport skips off-layer entities when invisible layers are excluded', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const onLayer = {
      name: '0',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(name =>
      name === 'off' ? offLayer : onLayer
    )
    const blockTableRecord = createBlockTableRecord([
      createDbEntity('line-off', 'off'),
      createDbEntity('line-visible', '0')
    ])
    const rendered = new Set<string>()

    const pending = controller.collectMissingEntitiesForExport(
      blockTableRecord,
      objectId => rendered.has(objectId),
      false
    )

    expect(pending.map(entity => entity.objectId)).toEqual(['line-visible'])
  })
})
