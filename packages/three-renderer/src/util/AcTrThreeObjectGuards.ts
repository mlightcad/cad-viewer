import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

/**
 * Duck-typed Three.js object guards.
 *
 * `instanceof` fails when more than one `three` copy is present in the bundle
 * (common with pnpm + linked packages such as mtext-renderer). Glyph meshes and
 * line segments created by mtext-renderer would then be silently dropped from
 * {@link AcTrBatchedGroup.addEntity}. Prefer these flags / `type` strings, which
 * Three.js sets on every instance regardless of which package copy constructed
 * it.
 */

type ThreeFlagObject = THREE.Object3D & {
  isMesh?: boolean
  isLine?: boolean
  isLineSegments?: boolean
  isLineLoop?: boolean
  isPoints?: boolean
  isLineSegments2?: boolean
  geometry?: unknown
  material?: unknown
}

export function isThreeMesh(object: THREE.Object3D): object is THREE.Mesh {
  const o = object as ThreeFlagObject
  return o.isMesh === true || object.type === 'Mesh'
}

export function isThreeLineSegments(
  object: THREE.Object3D
): object is THREE.LineSegments {
  const o = object as ThreeFlagObject
  return o.isLineSegments === true || object.type === 'LineSegments'
}

export function isThreeLine(object: THREE.Object3D): object is THREE.Line {
  const o = object as ThreeFlagObject
  // LineSegments / LineLoop also set isLine; keep the broad Line check for
  // dispose paths that intentionally cover all line-like leaves.
  return (
    o.isLine === true ||
    object.type === 'Line' ||
    object.type === 'LineSegments' ||
    object.type === 'LineLoop'
  )
}

export function isThreePoints(object: THREE.Object3D): object is THREE.Points {
  const o = object as ThreeFlagObject
  return o.isPoints === true || object.type === 'Points'
}

export function isThreeLineSegments2(
  object: THREE.Object3D
): object is LineSegments2 {
  const o = object as ThreeFlagObject
  return o.isLineSegments2 === true || object instanceof LineSegments2
}

export function isThreeBufferGeometry(
  value: unknown
): value is THREE.BufferGeometry {
  if (value == null || typeof value !== 'object') {
    return false
  }
  if (value instanceof THREE.BufferGeometry) {
    return true
  }
  const geom = value as { isBufferGeometry?: boolean; type?: string }
  return geom.isBufferGeometry === true || geom.type === 'BufferGeometry'
}

/**
 * True when the object is a render leaf that exposes buffer geometry
 * (mesh / line / points), including across duplicate three.js copies.
 */
export function isThreeGeometryLeaf(
  object: THREE.Object3D
): object is THREE.Mesh | THREE.Line | THREE.Points {
  const o = object as ThreeFlagObject
  if (!isThreeBufferGeometry(o.geometry)) {
    return false
  }
  return (
    isThreeMesh(object) ||
    isThreeLineSegments(object) ||
    isThreeLine(object) ||
    isThreePoints(object)
  )
}
