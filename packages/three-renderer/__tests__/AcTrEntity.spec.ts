import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'

describe('AcTrEntity wcsBbox', () => {
  it('starts empty and accepts explicit WCS bounds', () => {
    const entity = new AcTrEntity(new AcTrRenderContext())

    expect(entity.wcsBbox.isEmpty()).toBe(true)

    entity.wcsBbox.set(new THREE.Vector3(1, 2, 3), new THREE.Vector3(4, 5, 6))

    expectWcsBboxCloseTo(entity.wcsBbox, [1, 2, 3], [4, 5, 6])
  })

  it('updates wcsBbox when applyMatrix is called', () => {
    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.wcsBbox.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 5, 0))

    entity.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 200, 0))

    expectWcsBboxCloseTo(entity.wcsBbox, [100, 200, 0], [110, 205, 0])
  })

  it('copies wcsBbox in fastDeepClone', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager())
    const entity = new AcTrEntity(context)
    entity.objectId = 'entity-1'
    entity.wcsBbox.set(new THREE.Vector3(3, 4, 0), new THREE.Vector3(8, 9, 0))

    const cloned = entity.fastDeepClone()

    expectWcsBboxCloseTo(cloned.wcsBbox, [3, 4, 0], [8, 9, 0])
  })
})
