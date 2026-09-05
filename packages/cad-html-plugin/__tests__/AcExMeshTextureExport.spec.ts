/** @jest-environment jsdom */

// Value import after the polyfill: `@mlightcad/data-model` needs TextDecoder in jsdom.
import { TextDecoder, TextEncoder } from 'util'
Object.assign(globalThis, { TextDecoder, TextEncoder })

import * as THREE from 'three'

import { readMeshBatch, writeMeshBatch } from '../src/AcExBatchBinaryCodec'
import { AcExBinaryReader, AcExBinaryWriter } from '../src/AcExBinaryIO'
import {
  exportUvsForPositionSlice,
  isTransparentImagePlaceholder
} from '../src/AcExMeshTextureExport'
import { decodeSnapshot, encodeSnapshot } from '../src/AcExSnapshotCodec'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'

describe('AcEx mesh texture export', () => {
  it('round-trips uvs + png texture through the binary mesh codec', () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3])
    const writer = new AcExBinaryWriter()
    writeMeshBatch(writer, {
      layer: '0',
      color: 0xffffff,
      offset: [1, 2, 0],
      positions: Float32Array.from([0, 0, 0, 10, 0, 0, 10, 5, 0, 0, 5, 0]),
      indices: Uint32Array.from([0, 1, 2, 0, 2, 3]),
      uvs: Float32Array.from([0, 0, 1, 0, 1, 1, 0, 1]),
      texture: { mimeType: 'image/png', bytes: png },
      side: THREE.DoubleSide
    })

    const decoded = readMeshBatch(new AcExBinaryReader(writer.toUint8Array()))
    expect(decoded.uvs).toEqual(Float32Array.from([0, 0, 1, 0, 1, 1, 0, 1]))
    expect(decoded.texture?.mimeType).toBe('image/png')
    expect(Array.from(decoded.texture?.bytes ?? [])).toEqual(Array.from(png))
  })

  it('round-trips a textured mesh through encodeSnapshot', () => {
    const snapshot = {
      version: ACEX_SNAPSHOT_VERSION,
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        extents: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        units: {
          insunits: 4,
          lunits: 2,
          luprec: 4,
          aunits: 0,
          auprec: 0,
          measurement: 1,
          ltscale: 1,
          angbase: 0,
          angdir: 0
        },
        background: 0
      },
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [],
          meshBatches: [
            {
              layer: '0',
              color: 0xffffff,
              offset: [0, 0, 0] as [number, number, number],
              positions: Float32Array.from([0, 0, 0, 1, 0, 0, 1, 1, 0]),
              indices: Uint32Array.from([0, 1, 2]),
              uvs: Float32Array.from([0, 0, 1, 0, 1, 1]),
              texture: {
                mimeType: 'image/png',
                bytes: Uint8Array.from([1, 2, 3, 4])
              }
            }
          ]
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const decoded = decodeSnapshot(encodeSnapshot(snapshot).payload)
    const mesh = decoded.layouts[0]!.meshBatches[0]!
    expect(mesh.uvs?.length).toBe(6)
    expect(Array.from(mesh.texture!.bytes)).toEqual([1, 2, 3, 4])
  })

  it('exports uvs trimmed to the position vertex count', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(12), 3)
    )
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 9, 9]), 2)
    )
    const uvs = exportUvsForPositionSlice(
      geometry,
      new Float32Array(12) // 4 vertices
    )
    expect(uvs).toEqual(Float32Array.from([0, 0, 1, 0, 1, 1, 0, 1]))
  })

  it('detects transparent IMAGE/OLE placeholders without a map', () => {
    expect(
      isTransparentImagePlaceholder(
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      )
    ).toBe(true)
    expect(
      isTransparentImagePlaceholder(
        new THREE.MeshBasicMaterial({
          map: new THREE.Texture(),
          transparent: true,
          opacity: 1
        })
      )
    ).toBe(false)
  })
})
