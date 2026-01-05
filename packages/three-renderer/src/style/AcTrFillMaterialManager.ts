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
    if (!style.definitionLines || style.definitionLines.length < 1) {
      return this.createMeshBasicMaterial(traits)
    }

    // Validate pattern lines
    if (style.definitionLines.some(line => !line.dashLengths)) {
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
    style.definitionLines.forEach(definitionLine => {
      maxPatternSegmentCount = Math.max(
        definitionLine.dashLengths.length,
        maxPatternSegmentCount
      )
    })

    let currentUniformCount = 0

    const patternLines: AcTrPatternLine[] = []
    const tempCenter = new THREE.Vector2()
    for (const hatchPatternLine of style.definitionLines) {
      const base = new THREE.Vector2(
        hatchPatternLine.base.x,
        hatchPatternLine.base.y
      )
        .sub(options.rebaseOffset)
        .rotateAround(tempCenter, -style.patternAngle)

      const offset = new THREE.Vector2(
        hatchPatternLine.offset.x,
        hatchPatternLine.offset.y
      ).rotateAround(tempCenter, -hatchPatternLine.angle)

      if (offset.y === 0) {
        console.warn('offset.y is zero, skipping pattern line')
        continue
      }

      const numberOfDashes = hatchPatternLine.dashLengths.length
      // Indicates the dot pattern when the dashPatterns contain only 0 and negative numbers
      let bDotPattern = true
      // calculates the total length of the pattern
      let length = 0
      for (let i = 0; i < numberOfDashes; ++i) {
        const value = hatchPatternLine.dashLengths[i]
        if (value > 0) {
          bDotPattern = false
        }
        length += Math.abs(value)
      }

      // TODO: because we cannot (or, it's kind of hard to) draw a dot, let's draw a short dash.
      const ratio = bDotPattern
        ? RATIO_FOR_DOT_PATTERN
        : RATIO_FOR_NONDOT_PATTERN

      const dashLengths: number[] = []
      let patternLength = 0
      for (let i = 0; i < numberOfDashes; ++i) {
        dashLengths[i] = hatchPatternLine.dashLengths[i]
        if (dashLengths[i] === 0) {
          dashLengths[i] = ratio * length
        }
        patternLength += Math.abs(dashLengths[i])
      }

      // fill 0 for extra pattern segments in case a pattern doesn't have maxPatternSegmentCount segments
      for (let i = numberOfDashes; i < maxPatternSegmentCount; ++i) {
        dashLengths[i] = 0
      }

      const angle = hatchPatternLine.angle - style.patternAngle
      const patternLine = {
        angle,
        base,
        offset,
        dashLengths,
        patternLength,
    }

      currentUniformCount += 4 // angle, base, offset, patternLength
      currentUniformCount += maxPatternSegmentCount // dashLengths, consistent with HatchPatternShader
      currentUniformCount += 4 // patternLength
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
    const isSolid = !style.definitionLines || style.definitionLines.length === 0
    if (isSolid) {
      return `solid_${traits.layer}_${traits.rgbColor}`
    }

    const patternHash = style.definitionLines
      .map(
        pl =>
          pl.dashLengths.join(',') +
          `@${pl.angle},${pl.base.x},${pl.base.y}`
      )
      .join('|')

    return `hatch_${traits.layer}_${traits.rgbColor}_${style.patternAngle}_${patternHash}`
  }
}
