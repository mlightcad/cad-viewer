import type { MTextObject } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

jest.mock('../src/renderer/AcTrMTextRenderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn()
  }
}))

import { syncDrawSharedGlyphGroup } from '../src/linetype/AcTrComplexLineBuilder'
import { AcTrMText } from '../src/object/AcTrMText'
import { AcTrMTextRenderer } from '../src/renderer/AcTrMTextRenderer'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'

/**
 * Mimic {@link AcTrEntity.flattenObject}: bake TRS into `matrix` and disable
 * auto-update so later `position.set(0,0,0)` alone would leave a stale matrix.
 */
function bakePlacementLikeFlatten(glyph: THREE.Object3D): void {
  glyph.updateMatrix()
  glyph.matrixAutoUpdate = false
  glyph.matrixWorldNeedsUpdate = true
}

function createPlacementRoot(localOffset: THREE.Vector3Like = { x: 0, y: 0, z: 0 }) {
  const placementRoot = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3)
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  mesh.position.set(localOffset.x, localOffset.y, localOffset.z ?? 0)
  placementRoot.add(mesh)
  placementRoot.updateMatrixWorld(true)
  return placementRoot
}

function createSyncMTextObject(placementRoot: THREE.Object3D): MTextObject {
  const rendered = placementRoot as MTextObject
  rendered.box = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 1, 0)
  )
  rendered.createLayoutData = () => ({ lines: [], chars: [] })
  return rendered
}

describe('shared glyph placement (#856)', () => {
  it('does not double placement when flatten left matrixAutoUpdate false', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager())
    const px = 601_589
    const py = 2_256_554

    jest.mocked(AcTrMTextRenderer.getInstance).mockReturnValue({
      syncRenderMText: () => createSyncMTextObject(createPlacementRoot()),
      getMeshGlyphInstancing: () => false
    } as never)

    const a = new AcTrMText(
      {
        text: 'GAS',
        height: 1,
        width: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0
      } as never,
      { layer: '0', color: 7 } as never,
      {} as never,
      context,
      true
    )
    const b = new AcTrMText(
      {
        text: 'GAS',
        height: 1,
        width: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0
      } as never,
      { layer: '0', color: 7 } as never,
      {} as never,
      context,
      true
    )
    a.position.set(px, py, 0)
    b.position.set(px + 10, py, 0)
    bakePlacementLikeFlatten(a)
    bakePlacementLikeFlatten(b)

    syncDrawSharedGlyphGroup([a, b])

    a.updateMatrixWorld(true)
    b.updateMatrixWorld(true)
    const aw = new THREE.Vector3()
    const bw = new THREE.Vector3()
    a.getWorldPosition(aw)
    b.getWorldPosition(bw)

    expect(aw.x).toBeCloseTo(px, 3)
    expect(aw.y).toBeCloseTo(py, 3)
    expect(bw.x).toBeCloseTo(px + 10, 3)
    expect(bw.y).toBeCloseTo(py, 3)

    // Regression: stale matrix + collapse used to land labels at 2P.
    expect(Math.abs(aw.x - 2 * px)).toBeGreaterThan(1_000)
    expect(Math.abs(aw.y - 2 * py)).toBeGreaterThan(1_000)
  })
})
