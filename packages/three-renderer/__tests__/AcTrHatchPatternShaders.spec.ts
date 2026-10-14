import * as THREE from 'three'

import {
  createHatchPatternShaderMaterial,
  packHatchPatternDataTexture,
  releaseHatchPatternTexture,
  retainHatchPatternTexture
} from '../src/style/AcTrHatchPatternShaders'
import { AcTrMaterialUtil } from '../src/util/AcTrMaterialUtil'

/**
 * Regression for #727: a hatch pattern whose line spacing is far below one
 * screen pixel went fully invisible instead of thinning to a solid tone,
 * because `dist / distanceBetweenLines` (in `drawSpaceLine`) overflowed
 * float32's fractional precision and `fract()` returned noise. The fix
 * floors `distanceBetweenLines` at the line's own stroke thickness
 * (`thick`) before it reaches `drawSpaceLine`.
 */
describe('AcTrHatchPatternShaders sub-pixel spacing (#727)', () => {
  function buildMaterial() {
    return createHatchPatternShaderMaterial(
      [
        {
          angle: 0,
          base: new THREE.Vector2(0, 0),
          offset: new THREE.Vector2(0, 0.0635),
          dashLengths: [1, -1],
          patternLength: 2
        }
      ],
      0,
      { value: 1 },
      new THREE.Color(0xffffff)
    ) as THREE.ShaderMaterial
  }

  it('floors the solid-line spacing at the stroke thickness', () => {
    const material = buildMaterial()
    expect(material.fragmentShader).toMatch(
      /float distanceBetweenLines = max\(length\(offset\), thick\);/
    )
  })

  it('floors the dashed-line spacing at the stroke thickness', () => {
    const material = buildMaterial()
    expect(material.fragmentShader).toMatch(
      /float distanceBetweenLines = max\(abs\(offset\.y\), thick\);/
    )
  })
})

/**
 * Regression for #743: pattern lines used to be uniform structs capped by a
 * hard-coded scalar budget of 1024 (~85 lines with 4 dash entries). They are
 * now packed into a float DataTexture so large user patterns keep every line.
 */
describe('AcTrHatchPatternShaders pattern DataTexture (#743)', () => {
  it('avoids three.js unroll_loop around bare loop-index uses that would break GLSL', () => {
    // three.js only rewrites `[ i ]` and UNROLLED_LOOP_INDEX when expanding
    // `#pragma unroll_loop`. Using `float(i)` / `return i` inside an unrolled
    // loop leaves an undeclared `i` and the hatch shader fails to compile —
    // patterned hatches then disappear entirely.
    const material = createHatchPatternShaderMaterial(
      [
        {
          angle: 0,
          base: new THREE.Vector2(0, 0),
          offset: new THREE.Vector2(0, 1),
          dashLengths: [1, -1],
          patternLength: 2
        }
      ],
      0,
      { value: 1 },
      new THREE.Color(0xffffff)
    ) as THREE.ShaderMaterial

    expect(material.fragmentShader).not.toMatch(
      /#pragma unroll_loop_start[\s\S]*?float\s*\(\s*i\s*\)/
    )
    expect(material.fragmentShader).not.toMatch(
      /#pragma unroll_loop_start[\s\S]*?return\s+i\s*;/
    )
  })

  it('packs every pattern line into u_patternData and keeps u_patternLines for export', () => {
    const patternLines = Array.from({ length: 150 }, (_, i) => ({
      angle: (i * Math.PI) / 150,
      base: new THREE.Vector2(i, 0),
      offset: new THREE.Vector2(0, 10),
      dashLengths: [5, -2, 0, -2],
      patternLength: 9
    }))

    const material = createHatchPatternShaderMaterial(
      patternLines,
      0,
      { value: 1 },
      new THREE.Color(0xff0000)
    ) as THREE.ShaderMaterial

    expect(material.uniforms.u_patternLines.value).toHaveLength(150)
    expect(material.uniforms.u_patternData.value).toBeInstanceOf(
      THREE.DataTexture
    )
    expect(material.uniforms.u_patternLineCount.value).toBe(150)
    expect(material.fragmentShader).toContain('uniform sampler2D u_patternData')
    expect(material.fragmentShader).not.toContain(
      'uniform PatternLine u_patternLines'
    )
  })

  it('round-trips header floats and dash lengths through the packed texture', () => {
    const patternLines = [
      {
        angle: 0.25,
        base: new THREE.Vector2(1, 2),
        offset: new THREE.Vector2(3, 4),
        dashLengths: [5, -2, 0, -2],
        patternLength: 9
      }
    ]
    const { texture, texelsPerLine } = packHatchPatternDataTexture(
      patternLines,
      4
    )
    expect(texelsPerLine).toBe(3)
    const data = texture.image.data as Float32Array
    expect(data[0]).toBeCloseTo(0.25)
    expect(data[1]).toBeCloseTo(1)
    expect(data[2]).toBeCloseTo(2)
    expect(data[3]).toBeCloseTo(3)
    expect(data[4]).toBeCloseTo(4)
    expect(data[5]).toBeCloseTo(9)
    expect(Array.from(data.slice(6, 10))).toEqual([5, -2, 0, -2])
    texture.dispose()
  })

  it('keeps the shared pattern texture alive until the last clone disposes', () => {
    const material = createHatchPatternShaderMaterial(
      [
        {
          angle: 0,
          base: new THREE.Vector2(0, 0),
          offset: new THREE.Vector2(0, 1),
          dashLengths: [1, -1],
          patternLength: 2
        }
      ],
      0,
      { value: 1 },
      new THREE.Color(0xffffff)
    ) as THREE.ShaderMaterial
    const texture = material.uniforms.u_patternData.value as THREE.DataTexture
    const disposeSpy = jest.spyOn(texture, 'dispose')

    const cloned = AcTrMaterialUtil.cloneMaterial(
      material
    ) as THREE.ShaderMaterial
    expect(cloned.uniforms.u_patternData.value).toBe(texture)

    material.dispose()
    expect(disposeSpy).not.toHaveBeenCalled()

    cloned.dispose()
    expect(disposeSpy).toHaveBeenCalledTimes(1)
  })

  it('refcount helpers dispose only on the final release', () => {
    const { texture } = packHatchPatternDataTexture(
      [
        {
          angle: 0,
          base: new THREE.Vector2(0, 0),
          offset: new THREE.Vector2(0, 1),
          dashLengths: [1, -1],
          patternLength: 2
        }
      ],
      2
    )
    const disposeSpy = jest.spyOn(texture, 'dispose')
    retainHatchPatternTexture(texture)
    retainHatchPatternTexture(texture)
    releaseHatchPatternTexture(texture)
    expect(disposeSpy).not.toHaveBeenCalled()
    releaseHatchPatternTexture(texture)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
  })
})
