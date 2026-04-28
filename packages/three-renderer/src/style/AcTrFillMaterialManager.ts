import {
  type AcGiHatchPatternLine,
  AcGiSubEntityTraits,
  log
} from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  AcTrPatternLine,
  createHatchPatternShaderMaterial
} from './AcTrHatchPatternShaders'
import {
  AcTrGradientBounds,
  createGradientHatchShaderMaterial,
  normalizeGradientBounds
} from './AcTrGradientHatchShaders'
import { AcTrMaterialManager, AcTrMaterialSide } from './AcTrMaterialManager'
import {
  getMaterialMetadata,
  setMaterialMetadata
} from './AcTrMaterialMetadata'

export interface AcTrFillMaterialOptions {
  rebaseOffset: THREE.Vector2
  gradientBounds?: AcTrGradientBounds
  /**
   * Which face the rasteriser keeps.  Defaults to `'front'`.
   *
   * Mirrored block references (negative-determinant transforms) reverse
   * triangle winding, causing `FrontSide` fills to be culled.  The
   * batching layer requests `'back'` for those meshes so the culler
   * keeps the (now CW-wound) triangles — with zero fillrate overhead.
   */
  side?: AcTrMaterialSide
}

/**
 * Material manager for hatch and solid fill entities.
 *
 * Responsibilities:
 * - Returns THREE.MeshBasicMaterial for solid fills or empty/unsupported hatches.
 * - Returns custom shader materials for patterned and gradient hatches.
 * - Caches MeshBasicMaterials and hatch shader materials.
 * - Provides `clear()` method to dispose of all cached materials.
 */
export class AcTrFillMaterialManager extends AcTrMaterialManager<AcTrFillMaterialOptions> {
  /**
   * Returns a `BackSide` variant of the given fill material.
   *
   * The variant is cached under a separate key so that mirrored and
   * non-mirrored fills land in different batches (same draw-call cost
   * per fragment, no `DoubleSide` overhead).
   */
  getBackSideVariant(material: THREE.Material): THREE.Material {
    const metadata = getMaterialMetadata(material)
    const key = metadata.materialKey
    if (!key) return material

    // Already a back-side material — return as-is (idempotent).
    if (metadata.side === 'back') return material

    const traits = this.keyToTraits[key]
    if (!traits) return material

    // `keyToTraits` stores the full options alongside traits, so we
    // preserve the original draw-order tier and only override `side`.
    return this.getMaterial(traits, { ...traits, side: 'back' })
  }

  /**
   * Fill meshes at the normal linework tier (`drawOrder >= 0`) follow
   * COLORTHEME inversion so ACI 7 content stays legible.
   *
   * This covers MText glyphs and wide polylines, both of which are
   * rasterized as meshes but should behave like linework, not like
   * hatches. Negative tiers are reserved for hatch-like fills and are
   * handled by `shouldTrackBackground` instead.
   */
  protected shouldTrackForeground(
    traits: AcGiSubEntityTraits,
    _options: AcTrFillMaterialOptions
  ): boolean {
    return (traits.drawOrder ?? 0) >= 0 && traits.color.isForeground
  }

  /**
   * Solid hatch fills whose resolved colour is the foreground (ACI 7)
   * must follow the canvas background colour rather than keep an
   * absolute RGB — AutoCAD renders them as if they were painted with
   * the paper colour, so they fuse into both light and dark bgs and
   * only the overlaid wireframe remains visible.
   *
   * Hatches with an explicit RGB (including truecolor white) fall
   * outside this rule — `traits.color.isForeground` is only true for
   * the ACI 7 / foreground pseudo-colour, so a DWG author who picked
   * `255,255,255` via the truecolor picker still gets a literal white
   * hatch.
   */
  protected shouldTrackBackground(
    traits: AcGiSubEntityTraits,
    _options: AcTrFillMaterialOptions
  ): boolean {
    return (
      (traits.drawOrder ?? 0) < 0 &&
      traits.color.isForeground &&
      !traits.fillType.gradient
    )
  }

  /**
   * Create either MeshBasicMaterial or hatch shader material
   */
  protected createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): THREE.Material {
    const style = traits.fillType
    const side = options.side ?? 'front'
    const threeSide = side === 'back' ? THREE.BackSide : THREE.FrontSide

    // Background-follow fills must be BORN with the current canvas
    // bg, not with their resolved trait RGB.  Without this, opening a
    // DWG in dark theme shows ACI 7 hatches as solid white on the
    // first frame — `changeBackground` iterates only materials already
    // in the cache, so it cannot fix materials created AFTER the theme
    // was set.  Overriding `rgbColor` here lets the existing
    // `createMeshBasicMaterial` / `createHatchShaderMaterial` helpers
    // stay untouched while the material still lands on the right
    // `userData.isBackgroundFill` bucket for future repaints.
    const effectiveTraits: AcGiSubEntityTraits = this.shouldTrackBackground(
      traits,
      options
    )
      ? { ...traits, rgbColor: this.options.currentBackgroundColor }
      : traits

    let material: THREE.Material
    if (style.gradient) {
      material = this.createGradientShaderMaterial(
        effectiveTraits,
        options,
        threeSide
      )
    } else if (!style.definitionLines || style.definitionLines.length < 1) {
      material = this.createMeshBasicMaterial(effectiveTraits, threeSide)
    } else if (
      style.definitionLines.some(line => !this.isValidDefinitionLine(line))
    ) {
      log.warn(
        'Invalid hatch pattern definition line, fallback to solid fill',
        style
      )
      material = this.createMeshBasicMaterial(effectiveTraits, threeSide)
    } else {
      material = this.createHatchShaderMaterial(
        effectiveTraits,
        options,
        threeSide
      )
    }

    // Store side in userData so getBackSideVariant can check idempotency.
    // Draw-order metadata is stamped by the base material manager from
    // `traits.drawOrder`.
    setMaterialMetadata(material, {
      side
    })
    return material
  }

  private createGradientShaderMaterial(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions,
    threeSide: THREE.Side
  ): THREE.Material {
    return createGradientHatchShaderMaterial(
      traits.fillType.gradient!,
      normalizeGradientBounds(options.gradientBounds),
      new THREE.Color(traits.rgbColor),
      threeSide
    )
  }

  /**
   * Create a hatch shader material and cache it
   */
  private createHatchShaderMaterial(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions,
    threeSide: THREE.Side
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
        log.warn('offset.y is zero, skipping pattern line')
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
        patternLength
      }

      currentUniformCount += 4 // angle, base, offset, patternLength
      currentUniformCount += maxPatternSegmentCount // dashLengths, consistent with HatchPatternShader
      currentUniformCount += 4 // patternLength
      if (currentUniformCount > this.options.maxFragmentUniforms) {
        log.warn(
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
      new THREE.Color(traits.rgbColor),
      0,
      threeSide
    )
    material.defines = {
      MAX_PATTERN_SEGMENT_COUNT: maxPatternSegmentCount
    }
    return material
  }

  private createMeshBasicMaterial(
    traits: AcGiSubEntityTraits,
    side: THREE.Side
  ): THREE.Material {
    return new THREE.MeshBasicMaterial({ color: traits.rgbColor, side })
  }

  /**
   * Build a deterministic caching key based on traits and options.
   *
   * Two partitioning dimensions beyond colour/layer/pattern:
   *
   * - `side`: `'back'` variant goes in a separate key so mirrored
   *   fills don't steal the front-side material of the common path.
   * - `drawOrder`: hatch fills must not share a material instance with
   *   line-like fill meshes (wide polylines, text glyphs) because the
   *   batcher groups by material id and applies one `renderOrder` tier
   *   per batch.
   *
   * Both suffixes are appended only when they differ from the
   * default, keeping existing keys stable and avoiding unnecessary
   * cache fragmentation on the common path.
   */
  protected buildKey(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): string {
    const style = traits.fillType
    const sideSuffix = options.side === 'back' ? '_back' : ''
    const drawOrderSuffix = this.buildDrawOrderSuffix(traits)
    // Foreground-tracking fills (solid hatches with ACI 7) get their
    // own partition so `changeBackground` can mutate them in place
    // without affecting any literal-RGB hatch that happens to share
    // layer + colour.  The suffix is appended only when the condition
    // matches, keeping the common path's keys bit-identical.
    const bgSuffix =
      (traits.drawOrder ?? 0) < 0 &&
      traits.color.isForeground &&
      !style.gradient
        ? '_bgfill'
        : ''

    // Use color + layer + rebaseOffset + pattern info for key
    if (style.gradient) {
      const gradient = style.gradient
      const bounds = normalizeGradientBounds(options.gradientBounds)
      return [
        'gradient',
        traits.layer,
        traits.rgbColor,
        gradient.name || 'LINEAR',
        gradient.angle ?? 0,
        gradient.shift ?? 0,
        gradient.oneColorMode ? 1 : 0,
        gradient.shadeTintValue ?? 0,
        gradient.startColor ?? '',
        gradient.endColor ?? '',
        bounds.minX,
        bounds.minY,
        bounds.maxX,
        bounds.maxY,
        sideSuffix,
        drawOrderSuffix
      ].join('_')
    }

    const isSolid = !style.definitionLines || style.definitionLines.length === 0
    if (isSolid) {
      return `solid_${traits.layer}_${traits.rgbColor}${sideSuffix}${drawOrderSuffix}${bgSuffix}`
    }

    const patternHash = style.definitionLines
      .map(pl => {
        if (!this.isValidDefinitionLine(pl)) {
          return 'invalid'
        }

        const dash = pl.dashLengths!.join(',')
        const angle = Number.isFinite(pl.angle) ? pl.angle : 0
        const baseX = pl.base!.x!
        const baseY = pl.base!.y!
        return `${dash}@${angle},${baseX},${baseY}`
      })
      .join('|')

    return `hatch_${traits.layer}_${traits.rgbColor}_${style.patternAngle}_${patternHash}${sideSuffix}${drawOrderSuffix}${bgSuffix}`
  }

  /**
   * Normalizes one hatch pattern definition line in-place and validates it.
   *
   * DXF payloads occasionally contain partial pattern-line records. To keep
   * hatch rendering resilient, this method applies fallback defaults:
   * - `base` missing  -> `{ x: 0, y: 0 }`
   * - `offset` missing -> `{ x: 0, y: 0 }`
   * - `angle` missing  -> `0`
   *
   * `dashLengths` must still be an array; when absent or malformed, the line is
   * considered invalid and the caller can fall back to solid fill rendering.
   *
   * @param line Candidate value read from hatch pattern data.
   * @returns `true` when the line is usable for hatch shader generation.
   */
  private isValidDefinitionLine(line: AcGiHatchPatternLine) {
    if (!line || typeof line !== 'object') return false
    const mutable = line as AcGiHatchPatternLine & {
      angle?: unknown
      dashLengths?: unknown
      base?: { x?: unknown; y?: unknown } | null
      offset?: { x?: unknown; y?: unknown } | null
    }

    if (!Array.isArray(mutable.dashLengths)) return false

    mutable.base = {
      x: this.toFiniteNumber(mutable.base?.x, 0),
      y: this.toFiniteNumber(mutable.base?.y, 0)
    }
    mutable.offset = {
      x: this.toFiniteNumber(mutable.offset?.x, 0),
      y: this.toFiniteNumber(mutable.offset?.y, 0)
    }
    mutable.angle = this.toFiniteNumber(mutable.angle, 0)
    mutable.dashLengths = mutable.dashLengths.map(item =>
      this.toFiniteNumber(item, 0)
    )

    return true
  }

  private toFiniteNumber(value: unknown, fallback = 0): number {
    return Number.isFinite(value) ? (value as number) : fallback
  }
}
