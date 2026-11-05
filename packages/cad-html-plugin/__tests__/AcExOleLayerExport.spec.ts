/** @jest-environment jsdom */

import './helpers/installTextCodecs'

import { TextDecoder, TextEncoder } from 'util'
Object.assign(globalThis, { TextDecoder, TextEncoder })

import {
  ACEX_SNAPSHOT_VERSION,
  acexHtmlBuildSnapshotFromExportScene
} from '@mlightcad/cad-html-core'
import type { AcDbDatabase } from '@mlightcad/data-model'
import * as THREE from 'three'

/**
 * IMAGE / OLE meshes use a plain MeshBasicMaterial without `userData.layer`.
 * Export must still parent them under the layer root they live in, otherwise
 * the offline viewer shows them under layer "0" when that root is off.
 */

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

/**
 * Mimics AcTrImage / OLE: a mesh material with no `userData.layer`. Without the
 * layer-root stamp, the collector falls back to `"0"` and the offline viewer
 * keeps the watermark visible after that layer is turned off.
 */
function oleLikeMesh(): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, 0, 0, 10, 0, 0, 10, 5, 0, 0, 5, 0]),
      3
    )
  )
  geometry.setIndex(
    new THREE.BufferAttribute(new Uint32Array([0, 1, 2, 0, 2, 3]), 1)
  )
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
}

describe('OLE / IMAGE layer ownership on HTML export', () => {
  it('still exports geometry when the layer root Object3D is invisible', () => {
    const watermarkRoot = new THREE.Group()
    watermarkRoot.visible = false
    watermarkRoot.add(oleLikeMesh())

    const snapshot = acexHtmlBuildSnapshotFromExportScene(
      fakeDatabase(),
      {
        layers: [
          { name: '0', color: 0xffffff, visible: true },
          { name: '0-水印标记', color: 0xffffff, visible: false }
        ],
        layouts: [
          {
            btrId: 'ms',
            isModelSpace: true,
            layers: [
              { name: '0', root: new THREE.Group() },
              { name: '0-水印标记', root: watermarkRoot }
            ]
          }
        ],
        activeLayoutBtrId: 'ms',
        modelSpaceBtrId: 'ms'
      },
      { viewerMode: 'view', exportInvisibleLayers: true }
    )

    expect(snapshot.layouts[0]?.meshBatches).toHaveLength(1)
    expect(snapshot.layouts[0]?.meshBatches[0]!.layer).toBe('0-水印标记')
  })

  it('stamps the layer-root name onto meshes that lack material.layer', () => {
    const watermarkRoot = new THREE.Group()
    watermarkRoot.add(oleLikeMesh())

    const snapshot = acexHtmlBuildSnapshotFromExportScene(
      fakeDatabase(),
      {
        layers: [
          { name: '0', color: 0xffffff, visible: true },
          { name: '0-水印标记', color: 0xffffff, visible: false }
        ],
        layouts: [
          {
            btrId: 'ms',
            isModelSpace: true,
            layers: [
              { name: '0', root: new THREE.Group() },
              { name: '0-水印标记', root: watermarkRoot }
            ]
          }
        ],
        activeLayoutBtrId: 'ms',
        modelSpaceBtrId: 'ms'
      },
      { viewerMode: 'view', exportInvisibleLayers: true }
    )

    expect(snapshot.version).toBe(ACEX_SNAPSHOT_VERSION)
    const watermark = snapshot.layers.find(layer => layer.name === '0-水印标记')
    expect(watermark?.visible).toBe(false)

    const mesh = snapshot.layouts[0]?.meshBatches[0]
    expect(mesh).toBeDefined()
    // Must not fall back to layer "0" — that would keep the OLE visible.
    expect(mesh!.layer).toBe('0-水印标记')
  })

  it('omits invisible-layer OLE geometry when exportInvisibleLayers is false', () => {
    const watermarkRoot = new THREE.Group()
    watermarkRoot.add(oleLikeMesh())

    const snapshot = acexHtmlBuildSnapshotFromExportScene(
      fakeDatabase(),
      {
        layers: [
          { name: '0', color: 0xffffff, visible: true },
          { name: '0-水印标记', color: 0xffffff, visible: false }
        ],
        layouts: [
          {
            btrId: 'ms',
            isModelSpace: true,
            layers: [
              { name: '0', root: new THREE.Group() },
              { name: '0-水印标记', root: watermarkRoot }
            ]
          }
        ],
        activeLayoutBtrId: 'ms',
        modelSpaceBtrId: 'ms'
      },
      { viewerMode: 'view', exportInvisibleLayers: false }
    )

    expect(snapshot.layers.some(layer => layer.name === '0-水印标记')).toBe(
      false
    )
    expect(snapshot.layouts[0]?.meshBatches).toHaveLength(0)
  })
})
