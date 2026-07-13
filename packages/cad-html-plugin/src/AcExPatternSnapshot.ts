import {
  AcTrLinePatternShaders,
  type AcTrPatternLine,
  createGradientHatchShaderMaterialFromUniforms,
  createHatchPatternShaderMaterial
} from '@mlightcad/three-renderer'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { copyFloat32Range } from './AcExBatchBuffers'
import type {
  AcExGradientFill,
  AcExHatchPattern,
  AcExHatchPatternLine,
  AcExLineBatch,
  AcExLinePattern,
  AcExMeshBatch
} from './AcExSnapshotTypes'

/** Shared camera zoom uniform updated by the offline HTML viewer. */
export const acexCameraZoomUniform = { value: 1.0 }

function asShaderMaterial(
  material: THREE.Material
): THREE.ShaderMaterial | undefined {
  const candidate = material as THREE.ShaderMaterial
  if (
    candidate.isShaderMaterial === true ||
    material.type === 'ShaderMaterial'
  ) {
    return candidate
  }
  return undefined
}

/**
 * Reads a serialized linetype from a live export-time shader material.
 */
export function extractLinePattern(
  material: THREE.Material
): AcExLinePattern | undefined {
  const shaderMaterial = asShaderMaterial(material)
  if (!shaderMaterial) {
    return undefined
  }
  const patternUniform = shaderMaterial.uniforms.pattern
  const patternLengthUniform = shaderMaterial.uniforms.patternLength
  if (!patternUniform || !patternLengthUniform) {
    return undefined
  }
  const pattern = patternUniform.value as number[] | undefined
  if (!Array.isArray(pattern) || pattern.length === 0) {
    return undefined
  }
  return {
    pattern: [...pattern],
    patternLength: Number(patternLengthUniform.value),
    viewportScale: Number(shaderMaterial.uniforms.u_viewportScale?.value ?? 1)
  }
}

/**
 * Reads a serialized hatch pattern from a live export-time shader material.
 */
export function extractHatchPattern(
  material: THREE.Material
): AcExHatchPattern | undefined {
  const shaderMaterial = asShaderMaterial(material)
  if (!shaderMaterial) {
    return undefined
  }
  const patternLinesUniform = shaderMaterial.uniforms.u_patternLines
  if (!patternLinesUniform) {
    return undefined
  }
  const patternLines = patternLinesUniform.value as
    | Array<{
        angle: number
        base: THREE.Vector2
        offset: THREE.Vector2
        dashLengths: number[]
        patternLength: number
      }>
    | undefined
  if (!Array.isArray(patternLines) || patternLines.length === 0) {
    return undefined
  }
  return {
    patternAngle: Number(shaderMaterial.uniforms.u_patternAngle?.value ?? 0),
    patternLines: patternLines.map(serializeHatchPatternLine)
  }
}

/**
 * Reads a serialized gradient fill from a live export-time shader material.
 */
export function extractGradientFill(
  material: THREE.Material
): AcExGradientFill | undefined {
  const shaderMaterial = asShaderMaterial(material)
  if (!shaderMaterial) {
    return undefined
  }
  if (shaderMaterial.uniforms.u_patternLines) {
    return undefined
  }
  const startColor = shaderMaterial.uniforms.u_startColor?.value as
    | THREE.Color
    | undefined
  const endColor = shaderMaterial.uniforms.u_endColor?.value as
    | THREE.Color
    | undefined
  const gradientTypeUniform = shaderMaterial.uniforms.u_gradientType
  if (!startColor?.getHex || gradientTypeUniform == null) {
    return undefined
  }
  return {
    startColor: startColor.getHex(),
    endColor: endColor?.getHex?.() ?? startColor.getHex(),
    angle: Number(shaderMaterial.uniforms.u_angle?.value ?? 0),
    shift: Number(shaderMaterial.uniforms.u_shift?.value ?? 0),
    gradientType: Number(gradientTypeUniform.value)
  }
}

function serializeHatchPatternLine(line: {
  angle: number
  base: THREE.Vector2
  offset: THREE.Vector2
  dashLengths: number[]
  patternLength: number
}): AcExHatchPatternLine {
  return {
    angle: line.angle,
    base: [line.base.x, line.base.y],
    offset: [line.offset.x, line.offset.y],
    dashLengths: [...line.dashLengths],
    patternLength: line.patternLength
  }
}

function deserializeHatchPatternLine(
  line: AcExHatchPatternLine
): AcTrPatternLine {
  return {
    angle: line.angle,
    base: new THREE.Vector2(line.base[0], line.base[1]),
    offset: new THREE.Vector2(line.offset[0], line.offset[1]),
    dashLengths: [...line.dashLengths],
    patternLength: line.patternLength
  }
}

/**
 * Computes cumulative `lineDistance` values for line-segment geometry.
 */
export function computeLineDistancesForSegments(
  positions: Float32Array
): Float32Array {
  const vertexCount = positions.length / 3
  if (vertexCount < 2) {
    return new Float32Array(0)
  }
  const lineDistances = new Float32Array(vertexCount)
  for (let i = 0; i < vertexCount; i += 2) {
    if (i === 0) {
      lineDistances[i] = 0
    } else {
      lineDistances[i] = lineDistances[i - 1]!
    }
    const x1 = positions[i * 3]!
    const y1 = positions[i * 3 + 1]!
    const z1 = positions[i * 3 + 2] ?? 0
    const x2 = positions[(i + 1) * 3]!
    const y2 = positions[(i + 1) * 3 + 1]!
    const z2 = positions[(i + 1) * 3 + 2] ?? 0
    const dx = x2 - x1
    const dy = y2 - y1
    const dz = z2 - z1
    lineDistances[i + 1] =
      lineDistances[i]! + Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
  return lineDistances
}

/**
 * Copies the `lineDistance` attribute honoring the geometry draw range.
 */
export function exportLineDistanceSlice(
  geometry: THREE.BufferGeometry
): Float32Array | undefined {
  const lineDistanceAttr = geometry.getAttribute('lineDistance') as
    | THREE.BufferAttribute
    | undefined
  if (!lineDistanceAttr || lineDistanceAttr.count === 0) {
    return undefined
  }

  const indexAttr = geometry.getIndex()
  if (indexAttr) {
    const array = lineDistanceAttr.array as ArrayLike<number>
    return copyFloat32Range(array, 0, lineDistanceAttr.count)
  }

  const drawRange = geometry.drawRange
  const total = lineDistanceAttr.count
  const vertexStart = Math.max(0, Math.min(Math.floor(drawRange.start), total))
  const available = Math.max(0, total - vertexStart)
  const drawCount =
    !Number.isFinite(drawRange.count) || drawRange.count <= 0
      ? available
      : Math.min(Math.floor(drawRange.count), available)
  if (drawCount <= 0) {
    return undefined
  }

  const array = lineDistanceAttr.array as ArrayLike<number>
  return copyFloat32Range(array, vertexStart, drawCount)
}

/**
 * Copies a per-vertex buffer attribute honoring the geometry draw range.
 */
export function exportVertexAttributeSlice(
  geometry: THREE.BufferGeometry,
  attributeName: string
): Float32Array | undefined {
  const attribute = geometry.getAttribute(attributeName) as
    | THREE.BufferAttribute
    | undefined
  if (!attribute || attribute.count === 0) {
    return undefined
  }

  const itemSize = attribute.itemSize
  const indexAttr = geometry.getIndex()
  if (indexAttr) {
    const array = attribute.array as ArrayLike<number>
    return copyFloat32Range(array, 0, attribute.count * itemSize)
  }

  const drawRange = geometry.drawRange
  const total = attribute.count
  const vertexStart = Math.max(0, Math.min(Math.floor(drawRange.start), total))
  const available = Math.max(0, total - vertexStart)
  const drawCount =
    !Number.isFinite(drawRange.count) || drawRange.count <= 0
      ? available
      : Math.min(Math.floor(drawRange.count), available)
  if (drawCount <= 0) {
    return undefined
  }

  const array = attribute.array as ArrayLike<number>
  return copyFloat32Range(array, vertexStart * itemSize, drawCount * itemSize)
}

/**
 * Creates a viewer material for one exported line batch.
 */
export function createViewerLineMaterial(
  batch: AcExLineBatch,
  resolution?: THREE.Vector2
): THREE.Material {
  if (batch.lineWidth != null && batch.lineWidth > 0) {
    const material = new LineMaterial({
      color: batch.color,
      linewidth: batch.lineWidth
    })
    if (resolution) {
      material.resolution.copy(resolution)
    }
    return material
  }
  if (batch.linePattern) {
    return AcTrLinePatternShaders.createLineShaderMaterialFromScaledPattern(
      batch.linePattern.pattern,
      batch.linePattern.patternLength,
      batch.color,
      batch.linePattern.viewportScale,
      acexCameraZoomUniform
    )
  }
  return new THREE.LineBasicMaterial({ color: batch.color })
}

/**
 * Creates a viewer material for one exported point batch.
 */
export function createViewerPointsMaterial(
  batch: AcExMeshBatch
): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color: batch.color,
    size: 1,
    sizeAttenuation: false
  })
}

/**
 * Re-aligns hatch pattern coordinates after hatch meshes were world-baked
 * during batch-group cloning (pattern fills stay on the unbatched draw path).
 */
export function transformHatchPatternToWorldSpace(
  pattern: AcExHatchPattern,
  matrixElements: number[]
): AcExHatchPattern {
  const rotation = Math.atan2(matrixElements[1]!, matrixElements[0]!)
  const transformPoint = (x: number, y: number): [number, number] => [
    matrixElements[0]! * x + matrixElements[4]! * y + matrixElements[12]!,
    matrixElements[1]! * x + matrixElements[5]! * y + matrixElements[13]!
  ]
  const transformVector = (x: number, y: number): [number, number] => [
    matrixElements[0]! * x + matrixElements[4]! * y,
    matrixElements[1]! * x + matrixElements[5]! * y
  ]

  return {
    patternAngle: pattern.patternAngle + rotation,
    patternLines: pattern.patternLines.map(line => ({
      angle: line.angle + rotation,
      base: transformPoint(line.base[0], line.base[1]),
      offset: transformVector(line.offset[0], line.offset[1]),
      dashLengths: [...line.dashLengths],
      patternLength: line.patternLength
    }))
  }
}

/**
 * Creates a viewer material for one exported mesh batch.
 */
export function createViewerMeshMaterial(batch: AcExMeshBatch): THREE.Material {
  if (batch.hatchPattern && batch.hatchPattern.patternLines.length > 0) {
    try {
      const patternLines = batch.hatchPattern.patternLines.map(
        deserializeHatchPatternLine
      )
      return createHatchPatternShaderMaterial(
        patternLines,
        batch.hatchPattern.patternAngle,
        acexCameraZoomUniform,
        new THREE.Color(batch.color),
        0,
        (batch.side ?? THREE.FrontSide) as THREE.Side
      )
    } catch {
      // Fall back to a solid fill if pattern shader creation fails.
    }
  }
  if (
    batch.gradientFill &&
    batch.gradientPositions &&
    batch.gradientPositions.length >= 2
  ) {
    try {
      return createGradientHatchShaderMaterialFromUniforms(
        batch.gradientFill,
        (batch.side ?? THREE.FrontSide) as THREE.Side
      )
    } catch {
      // Fall back to a solid fill if gradient shader creation fails.
    }
  }
  return new THREE.MeshBasicMaterial({
    color: batch.color,
    side: THREE.DoubleSide
  })
}
