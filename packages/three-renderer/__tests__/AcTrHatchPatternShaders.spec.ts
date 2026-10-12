import * as THREE from 'three'

import { createHatchPatternShaderMaterial } from '../src/style/AcTrHatchPatternShaders'

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
