import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  AcTrPatternLine,
  createHatchPatternShaderMaterial
} from './AcTrHatchPatternShaders'
import { AcTrMaterialManager } from './AcTrMaterialManager'

export interface AcTrFillMaterialOptions {
  rebaseOffset: THREE.Vector2
}

/**
 * Material manager for hatch and solid fill entities.
 *
 * Responsibilities:
 * - Returns THREE.MeshBasicMaterial for solid fills or empty/unsupported hatches.
 * - Returns custom shader materials for patterned hatches.
 * - Caches both MeshBasicMaterials and hatch shader materials.
 * - Provides `clear()` method to dispose of all cached materials.
 */
export class AcTrFillMaterialManager extends AcTrMaterialManager<AcTrFillMaterialOptions> {
  /**
   * Create either MeshBasicMaterial or hatch shader material
   */
  protected createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): THREE.Material {
    const style = traits.fillType
    if (!style.patternLines || style.patternLines.length < 1) {
      return this.createMeshBasicMaterial(traits)
    }

    // Validate pattern lines
    if (style.patternLines.some(line => !line.dashPattern)) {
      console.warn('Invalid dash pattern', style)
      return this.createMeshBasicMaterial(traits)
    }

    // Otherwise create new hatch shader material
    return this.createHatchShaderMaterial(traits, options)
  }

  /**
   * Create a hatch shader material and cache it
   */
  private createHatchShaderMaterial(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): THREE.Material {
    const style = traits.fillType
    const RATIO_FOR_NONDOT_PATTERN = 0.005
    const RATIO_FOR_DOT_PATTERN = 0.05

    // Get a max size to be used for all patternLines, this value will be used during
    // glsl compile time, and it cannot be 0 (compile error) and cannot be 1 (run time warning).
    let maxPatternSegmentCount = 2
    style.patternLines.forEach(patternLine => {
      maxPatternSegmentCount = Math.max(
        patternLine.dashPattern.length,
        maxPatternSegmentCount
      )
    })

    let currentUniformCount = 0

    const patternLines: AcTrPatternLine[] = []
    const tempCenter = new THREE.Vector2()
    for (const hatchPatternLine of style.patternLines) {
      const origin = new THREE.Vector2(
        hatchPatternLine.origin.x,
        hatchPatternLine.origin.y
      )
        .sub(options.rebaseOffset)
        .rotateAround(tempCenter, -style.patternAngle)

      const delta = new THREE.Vector2(
        hatchPatternLine.delta.x,
        hatchPatternLine.delta.y
      ).rotateAround(
        tempCenter,
        -hatchPatternLine.angle
      )

      if (delta.y === 0) {
        console.warn('delta.y is zero, skipping pattern line')
        continue
      }

      const patternCount = hatchPatternLine.dashPattern.length
      // Indicates the dot pattern when the dashPatterns contain only 0 and negative numbers
      let bDotPattern = true
      // calculates the total length of the pattern
      let length = 0
      for (let i = 0; i < patternCount; ++i) {
        const value = hatchPatternLine.dashPattern[i]
        if (value > 0) {
          bDotPattern = false
        }
        length += Math.abs(value)
      }

      // TODO: because we cannot (or, it's kind of hard to) draw a dot, let's draw a short dash.
      const ratio = bDotPattern
        ? RATIO_FOR_DOT_PATTERN
        : RATIO_FOR_NONDOT_PATTERN

      const pattern: number[] = []
      const patternSum: number[] = []
      let patternLength = 0
      patternSum[0] = patternLength
      for (let i = 0; i < patternCount; ++i) {
        pattern[i] = hatchPatternLine.dashPattern[i]
        if (pattern[i] === 0) {
          pattern[i] = ratio * length
        }
        patternLength += Math.abs(pattern[i])
        patternSum[i + 1] = patternLength
      }

      // fill 0 for extra pattern segments in case a pattern doesn't have maxPatternSegmentCount segments
      for (let i = patternCount; i < maxPatternSegmentCount; ++i) {
        pattern[i] = 0
      }
      for (let i = patternSum.length; i < maxPatternSegmentCount + 1; ++i) {
        patternSum[i] = patternLength
      }

      const angle = hatchPatternLine.angle - style.patternAngle
      const patternLine = {
        origin,
        delta,
        angle,
        pattern,
        patternSum,
        patternLength
      }

      currentUniformCount += 4 // orgin,delta,angle,patternLength
      currentUniformCount += maxPatternSegmentCount //pattern, consistent with HatchPatternShader
      currentUniformCount += maxPatternSegmentCount + 1 //patternSum, consistent with HatchPatternShader
      if (currentUniformCount > this.options.maxFragmentUniforms) {
        console.warn(
          'There will be warning in fragment shader when number of uniforms exceeds 1024, so extra hatch line patterns are ignored here!'
        )
        break
      }
      patternLines.push(patternLine)
    }

    const material = createHatchPatternShaderMaterial(
      patternLines,
      style.patternAngle,
      AcTrMaterialManager.CameraZoomUniform,
      new THREE.Color(traits.rgbColor)
    )
    material.defines = {
      MAX_PATTERN_SEGMENT_COUNT: maxPatternSegmentCount
    }
    return material
  }

  private createMeshBasicMaterial(traits: AcGiSubEntityTraits): THREE.Material {
    return new THREE.MeshBasicMaterial({ color: traits.rgbColor })
  }

  /**
   * Build a deterministic caching key based on traits and options
   */
  protected buildKey(
    traits: AcGiSubEntityTraits,
    _options: AcTrFillMaterialOptions
  ): string {
    const style = traits.fillType

    // Use color + layer + rebaseOffset + pattern info for key
    const isSolid = !style.patternLines || style.patternLines.length === 0
    if (isSolid) {
      return `solid_${traits.layer}_${traits.rgbColor}`
    }

    const patternHash = style.patternLines
      .map(
        pl =>
          pl.dashPattern.join(',') +
          `@${pl.angle},${pl.origin.x},${pl.origin.y}`
      )
      .join('|')

    return `hatch_${traits.layer}_${traits.rgbColor}_${style.patternAngle}_${patternHash}`
  }
}
