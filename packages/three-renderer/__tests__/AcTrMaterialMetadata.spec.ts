import * as THREE from 'three'

import {
  followsLayerStyle,
  setMaterialMetadata
} from '../src/style/AcTrMaterialMetadata'

describe('followsLayerStyle', () => {
  it('returns true when material is ByLayer color on the target layer', () => {
    const material = new THREE.LineBasicMaterial()
    setMaterialMetadata(material, {
      layer: 'WALL',
      isByLayerColor: true
    })

    expect(followsLayerStyle(material, 'WALL')).toBe(true)
  })

  it('returns true when objectLayerName matches after INSERT inheritance', () => {
    const material = new THREE.LineBasicMaterial()
    setMaterialMetadata(material, {
      layer: '0',
      isByLayerColor: true
    })

    expect(followsLayerStyle(material, 'INSERT', 'INSERT')).toBe(true)
    expect(followsLayerStyle(material, 'INSERT')).toBe(false)
  })

  it('returns false for explicit foreground materials', () => {
    const material = new THREE.LineBasicMaterial()
    setMaterialMetadata(material, {
      layer: 'WALL',
      isForeground: true
    })

    expect(followsLayerStyle(material, 'WALL')).toBe(false)
  })

  it('returns true for other ByLayer bindings without explicit color flag', () => {
    const material = new THREE.LineBasicMaterial()
    setMaterialMetadata(material, {
      layer: 'WALL',
      isByLayerLineWeight: true
    })

    expect(followsLayerStyle(material, 'WALL')).toBe(true)
  })
})
