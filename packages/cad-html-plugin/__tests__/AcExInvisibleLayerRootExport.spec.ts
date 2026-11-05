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

import {
  acexHtmlBuildSnapshotFromExportScene,
  acexHtmlCollectBatchesFromObject3D
} from '@mlightcad/cad-html-core'
import type { AcDbDatabase } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrBatchedGroup } from '../../three-renderer/src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../../three-renderer/src/object/AcTrEntity'
import { AcTrLine } from '../../three-renderer/src/object/AcTrLine'
import { AcTrRenderContext } from '../../three-renderer/src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../../three-renderer/src/util'

function fakeDatabase(): AcDbDatabase {
  return {
    extmin: { x: 0, y: 0 },
    extmax: { x: 100, y: 100 },
    insunits: 4,
    lunits: 2,
    luprec: 4,
    aunits: 0,
    auprec: 0,
    measurement: 1,
    ltscale: 1,
    angbase: 0,
    angdir: 0,
    objects: { layout: { newIterator: () => [][Symbol.iterator]() } },
    tables: {
      blockTable: { newIterator: () => [][Symbol.iterator]() }
    }
  } as unknown as AcDbDatabase
}

function addLineToGroup(group: AcTrBatchedGroup, layerName: string) {
  const context = new AcTrRenderContext()
  const traits = {
    ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
    layer: layerName
  }
  const line = new AcTrLine(
    [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 }
    ],
    traits,
    context,
    false
  )
  line.objectId = `id-${layerName}`
  line.layerName = layerName
  const entity = new AcTrEntity(context)
  entity.objectId = line.objectId
  entity.layerName = layerName
  entity.visible = true
  entity.add(line)
  entity.updateMatrixWorld(true)
  group.addEntity(entity)
}

describe('export from invisible layer roots (all layers off)', () => {
  it('collects batched geometry when AcTrBatchedGroup.visible is false', () => {
    const group = new AcTrBatchedGroup()
    addLineToGroup(group, 'Wall')
    expect(
      acexHtmlCollectBatchesFromObject3D(group).lineBatches.length
    ).toBeGreaterThan(0)

    group.visible = false
    const collected = acexHtmlCollectBatchesFromObject3D(group)
    expect(collected.lineBatches.length).toBeGreaterThan(0)
  })

  it('snapshot keeps geometry for layers that are off in the live scene', () => {
    const wallRoot = new AcTrBatchedGroup()
    addLineToGroup(wallRoot, 'Wall')
    wallRoot.visible = false

    const snapshot = acexHtmlBuildSnapshotFromExportScene(
      fakeDatabase(),
      {
        layers: [{ name: 'Wall', color: 0xff0000, visible: false }],
        layouts: [
          {
            btrId: 'ms',
            isModelSpace: true,
            layers: [{ name: 'Wall', root: wallRoot }]
          }
        ],
        activeLayoutBtrId: 'ms',
        modelSpaceBtrId: 'ms'
      },
      { viewerMode: 'view', exportInvisibleLayers: true }
    )

    expect(snapshot.layers[0]?.visible).toBe(false)
    expect(snapshot.layouts[0]?.lineBatches.length).toBeGreaterThan(0)
    expect(snapshot.layouts[0]?.lineBatches[0]?.layer).toBe('Wall')
  })

  it('collects plain drawables when the layer root itself is invisible', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    )
    const root = new THREE.Group()
    root.visible = false
    root.add(line)

    expect(acexHtmlCollectBatchesFromObject3D(root).lineBatches).toHaveLength(1)
  })
})
