import * as THREE from 'three'

import {
  getSceneDrawableUserData,
  patchDrawableMaterialFromCache,
  syncStyleMaterialIdFromMaterials
} from '../src/util/AcTrObjectUserData'

describe('drawable style material helpers', () => {
  it('syncStyleMaterialIdFromMaterials stores one id for uniform array materials', () => {
    const material = new THREE.LineBasicMaterial()
    const userData = getSceneDrawableUserData(new THREE.Line())

    syncStyleMaterialIdFromMaterials(userData, [material, material])

    expect(userData.styleMaterialId).toBe(material.id)
  })

  it('syncStyleMaterialIdFromMaterials clears styleMaterialId for mixed array materials', () => {
    const materialA = new THREE.LineBasicMaterial()
    const materialB = new THREE.LineBasicMaterial()
    const userData = getSceneDrawableUserData(new THREE.Line())
    userData.styleMaterialId = materialA.id

    syncStyleMaterialIdFromMaterials(userData, [materialA, materialB])

    expect(userData.styleMaterialId).toBeUndefined()
  })

  it('patchDrawableMaterialFromCache remaps every array material slot', () => {
    const oldMaterialA = new THREE.LineBasicMaterial({ color: 0xffffff })
    const oldMaterialB = new THREE.LineBasicMaterial({ color: 0x00ff00 })
    const newMaterialA = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const newMaterialB = new THREE.LineBasicMaterial({ color: 0x0000ff })
    const materials: Record<number, THREE.Material> = {
      [oldMaterialA.id]: newMaterialA,
      [oldMaterialB.id]: newMaterialB
    }

    const line = new THREE.Line(new THREE.BufferGeometry(), [
      oldMaterialA,
      oldMaterialB
    ])

    patchDrawableMaterialFromCache(line, materials)

    expect(line.material).toEqual([newMaterialA, newMaterialB])
    expect(getSceneDrawableUserData(line).styleMaterialId).toBeUndefined()
  })
})
