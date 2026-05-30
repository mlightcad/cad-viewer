import { AcTrStyleManager } from '../../three-renderer/src/style/AcTrStyleManager'
import { getSceneDrawableUserData } from '../../three-renderer/src/util/AcTrObjectUserData'
import { AcTrSubEntityTraitsUtil } from '../../three-renderer/src/util/AcTrEntityTraitsUtil'
import * as THREE from 'three'

import {
  createViewerMeshMaterial,
  extractHatchPattern
} from '../src/AcExPatternSnapshot'
import { collectBatchesFromObject3D } from '../src/AcExSceneBatchCollector'
import { decodeSnapshot, encodeSnapshot } from '../src/AcExSnapshotCodec'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'

function createPatternedHatchMaterial(
  styleManager: AcTrStyleManager
): THREE.ShaderMaterial {
  const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
  traits.layer = 'A-HATCH'
  traits.rgbColor = 0x00ff00
  traits.drawOrder = -1
  traits.fillType = {
    solidFill: false,
    patternAngle: 0,
    definitionLines: [
      {
        angle: Math.PI / 4,
        base: { x: 10, y: 20 },
        offset: { x: 0, y: 3.175 },
        dashLengths: [1, -1]
      }
    ]
  }
  return styleManager.getFillMaterial(traits) as THREE.ShaderMaterial
}

function cloneUnbatchedHatchMesh(source: THREE.Mesh): THREE.Mesh {
  const cloned = source.clone() as THREE.Mesh
  const clonedGeometry = source.geometry.clone()
  clonedGeometry.applyMatrix4(source.matrixWorld)
  cloned.geometry = clonedGeometry
  cloned.material = source.material
  getSceneDrawableUserData(cloned).bakedWorldMatrix =
    source.matrixWorld.toArray()
  cloned.position.set(0, 0, 0)
  cloned.rotation.set(0, 0, 0)
  cloned.scale.set(1, 1, 1)
  cloned.updateMatrix()
  return cloned
}

describe('patterned hatch HTML export', () => {
  it('collects hatch pattern data from unbatched world-baked meshes', () => {
    const styleManager = new AcTrStyleManager()
    const material = createPatternedHatchMaterial(styleManager)
    expect(extractHatchPattern(material)).toBeDefined()

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]),
        3
      )
    )

    const source = new THREE.Mesh(geometry, material)
    source.position.set(100, 200, 0)
    source.updateMatrixWorld(true)

    const root = new THREE.Group()
    root.add(cloneUnbatchedHatchMesh(source))

    const { meshBatches } = collectBatchesFromObject3D(root)
    expect(meshBatches).toHaveLength(1)
    expect(meshBatches[0]?.hatchPattern?.patternLines.length).toBeGreaterThan(0)

    const viewerMaterial = createViewerMeshMaterial(meshBatches[0]!)
    expect(viewerMaterial).toBeInstanceOf(THREE.ShaderMaterial)
    expect(viewerMaterial.type).toBe('ShaderMaterial')
  })

  it('round-trips hatch patterns through the snapshot codec', () => {
    const styleManager = new AcTrStyleManager()
    const material = createPatternedHatchMaterial(styleManager)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]),
        3
      )
    )
    const source = new THREE.Mesh(geometry, material)
    source.updateMatrixWorld(true)

    const root = new THREE.Group()
    root.add(cloneUnbatchedHatchMesh(source))
    const { meshBatches } = collectBatchesFromObject3D(root)
    const batch = meshBatches[0]!

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
      layers: [{ name: 'A-HATCH', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [],
          meshBatches: [batch]
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const decoded = decodeSnapshot(encodeSnapshot(snapshot))
    const decodedBatch = decoded.layouts[0]!.meshBatches[0]!
    expect(decodedBatch.hatchPattern).toEqual(batch.hatchPattern)

    const viewerMaterial = createViewerMeshMaterial(decodedBatch)
    expect(viewerMaterial).toBeInstanceOf(THREE.ShaderMaterial)
  })
})
