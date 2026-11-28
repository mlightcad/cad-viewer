import {
  ACEX_HTML_CAMERA_NEAR,
  ACEX_HTML_DEFAULT_DEPTH_HALF,
  acexHtmlCreateEmptyDepthRange,
  acexHtmlDepthRangeIsEmpty,
  acexHtmlExpandDepthRangeFromBatches,
  acexHtmlFitOrthographicDepthRange,
  type AcExHtmlLineBatch,
  type AcExHtmlMeshBatch} from '@mlightcad/cad-html-core'
import * as THREE from 'three'

/**
 * NDC Z for a world point directly under the camera. Values outside [-1, 1]
 * are clipped by the near/far planes.
 */
function ndcDepth(camera: THREE.OrthographicCamera, z: number) {
  camera.updateMatrixWorld(true)
  return new THREE.Vector3(camera.position.x, camera.position.y, z).project(
    camera
  ).z
}

function createBatch(
  offset: [number, number, number],
  localPositions: number[]
): AcExHtmlLineBatch {
  return {
    layer: '0',
    color: 0xffffff,
    offset,
    positions: Float32Array.from(localPositions),
    indices: new Uint32Array([0, 1])
  }
}

describe('acexHtmlFitOrthographicDepthRange', () => {
  it('keeps the default depth band for geometry near Z=0', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF

    acexHtmlFitOrthographicDepthRange(camera, -10, 10)

    expect(camera.position.z).toBe(ACEX_HTML_DEFAULT_DEPTH_HALF)
    expect(camera.near).toBe(ACEX_HTML_CAMERA_NEAR)
    expect(camera.far).toBe(2 * ACEX_HTML_DEFAULT_DEPTH_HALF)
  })

  it('does not clip elevated geometry such as contour lines', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF
    // Survey contour polylines carry their height as elevation (e.g. 1105-1243).
    expect(Math.abs(ndcDepth(camera, 1243))).toBeGreaterThan(1)

    acexHtmlFitOrthographicDepthRange(camera, 0, 1243)

    for (const z of [0, 1105, 1243]) {
      expect(Math.abs(ndcDepth(camera, z))).toBeLessThanOrEqual(1)
    }
  })

  it('does not clip geometry far below Z=0', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF

    acexHtmlFitOrthographicDepthRange(camera, -3000, 0)

    expect(Math.abs(ndcDepth(camera, -3000))).toBeLessThanOrEqual(1)
    expect(Math.abs(ndcDepth(camera, 0))).toBeLessThanOrEqual(1)
  })

  it('ignores non-finite ranges', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF

    acexHtmlFitOrthographicDepthRange(camera, Infinity, -Infinity)

    expect(camera.position.z).toBe(ACEX_HTML_DEFAULT_DEPTH_HALF)
    expect(camera.far).toBe(2 * ACEX_HTML_DEFAULT_DEPTH_HALF)
  })

  it('ignores absurd finite Z that would destroy depth precision', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF

    acexHtmlFitOrthographicDepthRange(camera, -16, 1.2141680576410807e83)

    expect(camera.position.z).toBe(ACEX_HTML_DEFAULT_DEPTH_HALF)
    expect(camera.far).toBe(2 * ACEX_HTML_DEFAULT_DEPTH_HALF)
    expect(Math.abs(ndcDepth(camera, 0))).toBeLessThanOrEqual(1)
  })

  it('rejects a half-corrupt elevated range instead of mixing bounds', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF

    acexHtmlFitOrthographicDepthRange(camera, 1100, 1.2141680576410807e83)

    expect(camera.position.z).toBe(ACEX_HTML_DEFAULT_DEPTH_HALF)
    expect(camera.far).toBe(2 * ACEX_HTML_DEFAULT_DEPTH_HALF)
  })

  it('still fits large but realistic survey elevations', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = ACEX_HTML_DEFAULT_DEPTH_HALF

    acexHtmlFitOrthographicDepthRange(camera, 0, 5_000_000)

    expect(camera.position.z).toBe(5_000_000 + 100)
    expect(Math.abs(ndcDepth(camera, 5_000_000))).toBeLessThanOrEqual(1)
  })
})

describe('acexHtmlExpandDepthRangeFromBatches', () => {
  it('tracks WCS Z through the batch origin rebase', () => {
    const range = acexHtmlCreateEmptyDepthRange()
    expect(acexHtmlDepthRangeIsEmpty(range)).toBe(true)

    // Contour segment rebased around elevation 1174; local ±69 → WCS 1105..1243.
    const lines: AcExHtmlLineBatch[] = [
      createBatch([100_000, 2_000_000, 1174], [0, 0, -69, 10, 0, 69])
    ]
    const meshes: AcExHtmlMeshBatch[] = [
      {
        layer: 'TEXT',
        color: 0xffffff,
        offset: [100_010, 2_000_010, 1200],
        positions: Float32Array.from([0, 0, -5, 1, 0, 5, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2])
      }
    ]

    acexHtmlExpandDepthRangeFromBatches(range, lines, meshes)

    expect(range.min).toBeCloseTo(1105, 5)
    expect(range.max).toBeCloseTo(1243, 5)
  })
})
