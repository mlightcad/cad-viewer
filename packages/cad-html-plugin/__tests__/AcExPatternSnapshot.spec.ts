import { AcTrLinePatternShaders } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  computeLineDistancesForSegments,
  createViewerLineMaterial,
  createViewerMeshMaterial,
  extractGradientFill,
  extractHatchPattern,
  extractLinePattern,
  transformHatchPatternToWorldSpace
} from '../src/AcExPatternSnapshot'
import {
  createGradientHatchShaderMaterial,
  createHatchPatternShaderMaterial
} from '@mlightcad/three-renderer'

describe('AcExPatternSnapshot', () => {
  it('extracts scaled linetype data from shader materials', () => {
    const material =
      AcTrLinePatternShaders.createLineShaderMaterialFromScaledPattern(
        [5, -2],
        7,
        0xff0000,
        1.25,
        { value: 1 }
      )

    expect(extractLinePattern(material)).toEqual({
      pattern: [5, -2],
      patternLength: 7,
      viewportScale: 1.25
    })
  })

  it('extracts hatch pattern data from shader materials', () => {
    const patternLines = [
      {
        angle: 0.5,
        base: new THREE.Vector2(1, 2),
        offset: new THREE.Vector2(0, 4),
        dashLengths: [1, -1],
        patternLength: 2
      }
    ]
    const material = createHatchPatternShaderMaterial(
      patternLines,
      0.25,
      { value: 1 },
      new THREE.Color(0x00ff00)
    )

    expect(extractHatchPattern(material)).toEqual({
      patternAngle: 0.25,
      patternLines: [
        {
          angle: 0.5,
          base: [1, 2],
          offset: [0, 4],
          dashLengths: [1, -1],
          patternLength: 2
        }
      ]
    })
  })

  it('computes cumulative line distances for segment pairs', () => {
    expect(
      Array.from(
        computeLineDistancesForSegments(
          Float32Array.from([0, 0, 0, 3, 4, 0, 3, 4, 0, 6, 8, 0])
        )
      )
    ).toEqual([0, 5, 5, 10])
  })

  it('extracts gradient fill data from shader materials', () => {
    const material = createGradientHatchShaderMaterial(
      {
        name: 'CYLINDER',
        angle: 0.75,
        shift: 0.25,
        startColor: 0xff0000,
        endColor: 0x0000ff
      },
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      new THREE.Color(0xffffff)
    )

    expect(extractGradientFill(material)).toEqual({
      startColor: 0xff0000,
      endColor: 0x0000ff,
      angle: 0.75,
      shift: 0.25,
      gradientType: 1
    })
  })

  it('recreates patterned viewer materials from snapshot batches', () => {
    const lineMaterial = createViewerLineMaterial({
      layer: '0',
      color: 0xff0000,
      offset: [0, 0, 0],
      positions: Float32Array.from([0, 0, 0, 1, 0, 0]),
      linePattern: {
        pattern: [4, -2],
        patternLength: 6,
        viewportScale: 1
      }
    })
    expect(lineMaterial).toBeInstanceOf(THREE.ShaderMaterial)

    const meshMaterial = createViewerMeshMaterial({
      layer: '0',
      color: 0x00ff00,
      offset: [0, 0, 0],
      positions: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      hatchPattern: {
        patternAngle: 0,
        patternLines: [
          {
            angle: 0,
            base: [0, 0],
            offset: [0, 1],
            dashLengths: [1, -1],
            patternLength: 2
          }
        ]
      }
    })
    expect(meshMaterial).toBeInstanceOf(THREE.ShaderMaterial)
    expect(
      (meshMaterial as THREE.ShaderMaterial).defines?.MAX_PATTERN_SEGMENT_COUNT
    ).toBe(2)

    const gradientMaterial = createViewerMeshMaterial({
      layer: '0',
      color: 0xff0000,
      offset: [0, 0, 0],
      positions: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      gradientFill: {
        startColor: 0xff0000,
        endColor: 0x0000ff,
        angle: 0.5,
        shift: 0.1,
        gradientType: 0
      },
      gradientPositions: Float32Array.from([-1, 0, 1, 0, 0, 1])
    })
    expect(gradientMaterial).toBeInstanceOf(THREE.ShaderMaterial)
    expect((gradientMaterial as THREE.ShaderMaterial).vertexShader).toContain(
      'gradientPosition'
    )
  })

  it('transforms hatch pattern coordinates into baked world space', () => {
    const pattern = {
      patternAngle: 0,
      patternLines: [
        {
          angle: 0,
          base: [1, 0] as [number, number],
          offset: [0, 1] as [number, number],
          dashLengths: [1, -1],
          patternLength: 2
        }
      ]
    }
    const matrix = new THREE.Matrix4().makeTranslation(10, 20, 0).toArray()
    expect(transformHatchPatternToWorldSpace(pattern, matrix)).toEqual({
      patternAngle: 0,
      patternLines: [
        {
          angle: 0,
          base: [11, 20],
          offset: [0, 1],
          dashLengths: [1, -1],
          patternLength: 2
        }
      ]
    })
  })
})
