/** @jest-environment jsdom */

import './helpers/installTextCodecs'

import { TextDecoder, TextEncoder } from 'util'
Object.assign(globalThis, { TextDecoder, TextEncoder })

jest.mock('@mlightcad/three-renderer', () => {
  const { AcTrBatchedLine } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedLine'
  )
  const { AcTrBatchedLine2 } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedLine2'
  )
  const { AcTrBatchedMesh } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedMesh'
  )
  const { AcTrBatchedPoint } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedPoint'
  )
  const {
    getMaterialMetadata,
    getSceneDrawableUserData,
    isBatchGeometryActive,
    isBatchGeometryVisible,
    isHighlightCloneDrawable,
    isHighlightOverlayDescendant,
    isObjectHierarchyVisible
  } = jest.requireActual('../../three-renderer/src')

  return {
    AcTrBatchedLine,
    AcTrBatchedLine2,
    AcTrBatchedMesh,
    AcTrBatchedPoint,
    getMaterialMetadata,
    getSceneDrawableUserData,
    isBatchGeometryActive,
    isBatchGeometryVisible,
    isHighlightCloneDrawable,
    isHighlightOverlayDescendant,
    isObjectHierarchyVisible
  }
})

import * as THREE from 'three'

import { acexHtmlCollectBatchesFromObject3D } from '../../cad-html-core/src/AcExHtmlSceneBatchCollector'
import { AcTrBatchedGroup } from '../../three-renderer/src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../../three-renderer/src/object/AcTrEntity'
import { AcTrLine } from '../../three-renderer/src/object/AcTrLine'
import { AcTrRenderContext } from '../../three-renderer/src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../../three-renderer/src/util'

function addLine(
  group: AcTrBatchedGroup,
  objectId: string,
  layerName: string
) {
  const context = new AcTrRenderContext()
  const traits = {
    ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
    layer: layerName
  }
  const line = new AcTrLine(
    [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 }
    ],
    traits,
    context,
    false
  )
  line.objectId = objectId
  line.layerName = layerName
  const entity = new AcTrEntity(context)
  entity.objectId = objectId
  entity.layerName = layerName
  entity.visible = true
  entity.add(line)
  entity.updateMatrixWorld(true)
  group.addEntity(entity)
}

describe('frozen INSERT reparent during HTML batch collect', () => {
  it('moves frozen-INSERT fragments onto the INSERT layer', () => {
    const group = new AcTrBatchedGroup()
    addLine(group, 'native-1', 'FRAME0_25')
    addLine(group, '2D8C', 'FRAME0_25')

    const collected = acexHtmlCollectBatchesFromObject3D(group, {
      geometryLayerName: 'FRAME0_25',
      insertLayerByObjectId: new Map([['2D8C', 'VEGA']]),
      frozenLayers: new Set(['VEGA'])
    })

    const layers = collected.lineBatches.map(batch => batch.layer).sort()
    expect(layers).toEqual(['FRAME0_25', 'VEGA'])
    const vega = collected.lineBatches.find(batch => batch.layer === 'VEGA')
    const frame = collected.lineBatches.find(
      batch => batch.layer === 'FRAME0_25'
    )
    expect(vega?.positions.length).toBeGreaterThan(0)
    expect(frame?.positions.length).toBeGreaterThan(0)
  })

  it('keeps Off-INSERT fragments on their geometry layer', () => {
    const group = new AcTrBatchedGroup()
    addLine(group, 'insert-off', 'FRAME0_25')

    const collected = acexHtmlCollectBatchesFromObject3D(group, {
      geometryLayerName: 'FRAME0_25',
      insertLayerByObjectId: new Map([['insert-off', 'OFFLAYER']]),
      frozenLayers: new Set()
    })

    expect(collected.lineBatches.map(batch => batch.layer)).toEqual([
      'FRAME0_25'
    ])
  })

  it('reparents shared-geometry INSERT instances onto a frozen INSERT layer', () => {
    const { getSceneDrawableUserData } = jest.requireActual(
      '../../three-renderer/src'
    ) as typeof import('../../three-renderer/src')

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      userData: { layer: 'FRAME0_25' }
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )

    const makeShared = (objectId: string, y: number) => {
      const line = new THREE.LineSegments(geometry, material)
      line.position.set(0, y, 0)
      line.updateMatrixWorld(true)
      getSceneDrawableUserData(line).sharesTemplateGeometry = true
      const entity = new AcTrEntity(new AcTrRenderContext())
      entity.objectId = objectId
      entity.layerName = 'FRAME0_25'
      entity.visible = true
      entity.add(line)
      return entity
    }

    const group = new AcTrBatchedGroup()
    group.addEntity(makeShared('2D8C', 0))
    group.addEntity(makeShared('native-1', 20))

    const collected = acexHtmlCollectBatchesFromObject3D(group, {
      geometryLayerName: 'FRAME0_25',
      insertLayerByObjectId: new Map([['2D8C', 'VEGA']]),
      frozenLayers: new Set(['VEGA'])
    })

    const layers = collected.lineBatches.map(batch => batch.layer).sort()
    expect(layers).toEqual(['FRAME0_25', 'VEGA'])
  })
})
