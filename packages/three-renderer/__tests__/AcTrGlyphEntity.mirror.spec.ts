import {
  MESH_GLYPH_PLACEMENTS_USERDATA,
  type MTextObject
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

jest.mock('../src/renderer/AcTrMTextRenderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn(() => ({
      getMeshGlyphInstancing: () => true,
      enqueueMeshGlyphPlacementsFromObject: jest.fn()
    }))
  }
}))

import type { AcTrBatchDrawPolicy } from '../src/draw/AcTrBatchDrawPolicy'
import { AcTrGlyphEntity } from '../src/object/AcTrGlyphEntity'
import type { AcTrMTextRenderer } from '../src/renderer/AcTrMTextRenderer'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'

const unbatchPolicy: AcTrBatchDrawPolicy = {
  resolveDrawMode: () => 'unbatch'
}

/**
 * Minimal glyph entity that exposes mirror-related glyph helpers.
 */
class AcTrTestGlyphEntity extends AcTrGlyphEntity {
  constructor(context: AcTrRenderContext) {
    super(
      context,
      { color: 7, layer: '0' } as never,
      { font: 'txt', widthFactor: 1 } as never
    )
  }

  exposeShouldSkipMeshGlyphInstancing() {
    return this.shouldSkipMeshGlyphInstancing()
  }

  exposeAttachRendered(rendered: MTextObject) {
    this.attachRendered(rendered)
  }

  protected getDrawPosition() {
    return { x: 0, y: 0, z: 0 }
  }

  protected renderSync(_renderer: AcTrMTextRenderer): MTextObject {
    return new THREE.Group() as unknown as MTextObject
  }

  protected async renderAsync(
    _renderer: AcTrMTextRenderer
  ): Promise<MTextObject> {
    return new THREE.Group() as unknown as MTextObject
  }

  protected describeRenderFailure() {
    return 'test'
  }
}

/** Builds a placement-mode MTextObject with one unit mesh glyph and no Mesh child. */
function createPlacementOnlyRendered(): {
  rendered: MTextObject
  geometry: THREE.BufferGeometry
  material: THREE.MeshBasicMaterial
} {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const group = new THREE.Group() as unknown as MTextObject
  ;(group as THREE.Object3D & { box: THREE.Box3 }).box = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 1, 1)
  )
  const matrix = new THREE.Matrix4().makeTranslation(2, 3, 0)
  group.userData[MESH_GLYPH_PLACEMENTS_USERDATA] = [
    {
      geometry,
      matrixElements: new Float32Array(matrix.elements)
    }
  ]
  group.userData.meshGlyphMaterial = material
  return { rendered: group, geometry, material }
}

describe('AcTrGlyphEntity mirrored INSERT mesh-glyph instancing', () => {
  it('skips InstancedMesh batching under a negative-determinant parent', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager())
    const insert = new THREE.Group()
    insert.scale.set(1, -1, 1)
    insert.updateMatrix()
    insert.updateMatrixWorld(true)

    const glyph = new AcTrTestGlyphEntity(context)
    insert.add(glyph)

    expect(glyph.exposeShouldSkipMeshGlyphInstancing()).toBe(true)
  })

  it('allows InstancedMesh batching under a positive-determinant parent', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager())
    const insert = new THREE.Group()
    insert.scale.set(1, 1, 1)
    insert.updateMatrix()
    insert.updateMatrixWorld(true)

    const glyph = new AcTrTestGlyphEntity(context)
    insert.add(glyph)

    expect(glyph.exposeShouldSkipMeshGlyphInstancing()).toBe(false)
  })

  it('materializes placement glyphs when InstancedMesh is skipped under a mirror', () => {
    // Always unbatch so flatten does not steal the materialized mesh.
    const context = new AcTrRenderContext(
      new AcTrStyleManager(),
      unbatchPolicy
    )

    const insert = new THREE.Group()
    insert.scale.set(1, -1, 1)
    insert.updateMatrix()
    insert.updateMatrixWorld(true)

    const glyph = new AcTrTestGlyphEntity(context)
    insert.add(glyph)

    const { rendered, geometry, material } = createPlacementOnlyRendered()
    glyph.exposeAttachRendered(rendered)

    expect(rendered.userData[MESH_GLYPH_PLACEMENTS_USERDATA]).toBeUndefined()
    expect(rendered.userData.meshGlyphMaterial).toBeUndefined()
    expect(rendered.children).toHaveLength(1)
    const mesh = rendered.children[0] as THREE.Mesh
    expect(mesh).toBeInstanceOf(THREE.Mesh)
    expect(mesh.geometry).toBe(geometry)
    expect(mesh.material).toBe(material)
    expect(mesh.matrix.elements[12]).toBeCloseTo(2)
    expect(mesh.matrix.elements[13]).toBeCloseTo(3)
  })
})
