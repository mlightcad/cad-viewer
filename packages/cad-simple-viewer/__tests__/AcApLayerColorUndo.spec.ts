import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbLayerTableRecord
} from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../../three-renderer/src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../../three-renderer/src/util/AcTrEntityTraitsUtil'

import { AcApLayerService } from '../src/service/AcApLayerService'

describe('layer color undo', () => {
  test('undo dispatches layerModified with reverted color in changes', () => {
    const db = new AcDbDatabase()
    const layer = new AcDbLayerTableRecord({
      name: 'TEST',
      color: new AcCmColor(AcCmColorMethod.ByACI, 1)
    })
    db.tables.layerTable.add(layer)

    const events: Array<{ color?: AcCmColor; layerColor: AcCmColor }> = []
    db.events.layerModified.addEventListener(args => {
      events.push({
        color: args.changes.color,
        layerColor: args.layer.color
      })
    })

    const service = new AcApLayerService(db)
    const newColor = new AcCmColor(AcCmColorMethod.ByACI, 3)

    service.setLayerColor('TEST', newColor)
    expect(db.tables.layerTable.getAt('TEST')?.color.colorIndex).toBe(3)

    const forwardEvent = events[events.length - 1]
    expect(forwardEvent?.color?.colorIndex).toBe(3)

    const undone = db.transactionManager.undo()
    expect(undone).toBe(true)
    expect(db.tables.layerTable.getAt('TEST')?.color.colorIndex).toBe(1)

    const undoEvent = events[events.length - 1]
    expect(undoEvent?.layerColor.colorIndex).toBe(1)
    expect(undoEvent?.color?.colorIndex).toBe(1)
    expect(typeof undoEvent?.color?.clone).toBe('function')
    expect(undoEvent?.color?.clone().colorIndex).toBe(1)

    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'TEST'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial

    const forwardUpdates = styleManager.updateLayerMaterial('TEST', {
      layer: 'TEST',
      color: newColor.clone()
    })
    const afterChange = forwardUpdates[original.id] as THREE.LineBasicMaterial
    expect(afterChange).toBeDefined()

    const undoUpdates = styleManager.updateLayerMaterial('TEST', {
      layer: 'TEST',
      color: undoEvent!.layerColor.clone()
    })
    const afterUndo = undoUpdates[afterChange.id] as THREE.LineBasicMaterial
    expect(afterUndo.color.getHex()).toBe(0xff0000)
  })
})
