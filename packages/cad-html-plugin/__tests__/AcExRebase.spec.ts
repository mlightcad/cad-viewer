import * as THREE from 'three'

import {
  acexHtmlBakePlainDrawableSlice,
  acexHtmlReadBatchWorldOffset,
  acexHtmlRebasePlainDrawableSliceAroundCentroid,
  acexHtmlToWcsCoord
} from '@mlightcad/cad-html-core'
import { AcExOsnapIndex } from '../src/AcExOsnap'

describe('rebase and measurement precision', () => {
  it('combines float32 local vertices with double origins in WCS', () => {
    const origin = 1_000_000_000.5
    const local = 0.125
    expect(acexHtmlToWcsCoord(local, origin)).toBe(1_000_000_000.625)
  })

  it('snaps using analytic osnap primitives stored as number', () => {
    const origin = 5_000_000
    const layout = {
      btrId: 'model',
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: {
        primitives: [
          {
            kind: 'line' as const,
            layer: '0',
            x0: origin + 0.25,
            y0: origin + 0.5,
            x1: origin + 10.25,
            y1: origin + 0.5
          }
        ]
      }
    }
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    const snap = index.findSnap(origin + 0.26, origin + 0.51, 1)
    expect(snap).toEqual({
      x: origin + 0.25,
      y: origin + 0.5,
      mode: 'endpoint'
    })
  })

  it('derives WCS from rebased batch geometry without baking the origin', () => {
    const origin = 2_000_000_000
    const layout = {
      btrId: 'model',
      name: 'Model',
      isModelSpace: true,
      lineBatches: [
        {
          layer: '0',
          color: 0xffffff,
          offset: [origin, origin, 0] as [number, number, number],
          positions: Float32Array.from([0, 0, 0, 100, 0, 0])
        }
      ],
      meshBatches: []
    }
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    const snap = index.findSnap(origin + 0.1, origin + 0.1, 1)
    expect(snap).toEqual({ x: origin, y: origin, mode: 'endpoint' })
  })

  it('keeps sub-unit glyph detail when baking at survey-scale WCS', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 0.05, 0, 0, 0, 0.05, 0]),
        3
      )
    )
    const mesh = new THREE.Mesh(geometry)
    mesh.position.set(5_000_000, 3_000_000, 0)
    mesh.updateMatrixWorld(true)

    // float32 world bake would snap 0.05 onto ~0.25 steps at 5e6.
    const baked = acexHtmlBakePlainDrawableSlice(
      { positions: Float32Array.from([0, 0, 0, 0.05, 0, 0, 0, 0.05, 0]) },
      mesh.matrixWorld
    )
    expect(baked.positions).toBeInstanceOf(Float64Array)
    expect(baked.positions[3]).toBeCloseTo(5_000_000.05, 6)

    const rebased = acexHtmlRebasePlainDrawableSliceAroundCentroid(baked)
    expect(
      acexHtmlToWcsCoord(rebased.slice.positions[3]!, rebased.offset[0]!)
    ).toBeCloseTo(5_000_000.05, 5)
  })

  it('reads nested drawable offsets from matrixWorld instead of local position', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-50, -25, 0, 50, 25, 0]), 3)
    )
    const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
    line.position.set(100_060, 200_045, 0)

    const parent = new THREE.Group()
    parent.position.set(900_000, 1_800_000, 0)
    parent.add(line)
    parent.updateMatrixWorld(true)

    expect(acexHtmlReadBatchWorldOffset(line)).toEqual([1_000_060, 2_000_045, 0])
  })
})
