import { AcGiSubEntityTraits, log } from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  AcTrPatternLine,
  createHatchPatternShaderMaterial
} from './AcTrHatchPatternShaders'
import { AcTrMaterialManager, AcTrMaterialSide } from './AcTrMaterialManager'
import {
  getMaterialMetadata,
  setMaterialMetadata
} from './AcTrMaterialMetadata'

export interface AcTrFillMaterialOptions {
  rebaseOffset: THREE.Vector2
  /**
   * Which face the rasteriser keeps.  Defaults to `'front'`.
   *
   * Mirrored block references (negative-determinant transforms) reverse
   * triangle winding, causing `FrontSide` fills to be culled.  The
   * batching layer requests `'back'` for those meshes so the culler
   * keeps the (now CW-wound) triangles — with zero fillrate overhead.
   */
  side?: AcTrMaterialSide
  /**
   * Whether this fill material is for a text glyph (MText renderer)
   * rather than a hatch / solid area fill.  Defaults to `false`.
   *
   * Text glyph fills must follow COLORTHEME inversion so that ACI 7
   * text stays legible against both light and dark backgrounds.
   * Hatch / solid area fills do NOT invert — AutoCAD keeps them on
   * their resolved RGB regardless of theme.  This flag partitions
   * the two into separate cache keys so that an MText glyph sharing
   * colour + layer with a nearby hatch does not end up in the same
   * material (their `userData.isForeground` values must differ).
   */
  isTextFill?: boolean
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

    // Propagate `isTextFill` into the back-side variant so mirrored
    // text glyphs keep their draw-order tier (above lines / hatches).
    // `keyToTraits` stores the full options alongside traits, so we
    // preserve that payload and only override `side`.
    return this.getMaterial(traits, { ...traits, side: 'back' })
  }

  /**
   * Only text glyph fills follow COLORTHEME inversion (i.e. get their
   * colour flipped to the *opposite* of the canvas bg so that ACI 7
   * text stays legible on both light and dark themes).
   *
   * Hatch / solid area fills never invert — when their resolved colour
   * is the foreground (ACI 7) they follow the bg instead via
   * `shouldTrackBackground`, so they fuse with the paper and leave
   * the wireframe visible.  Inverting hatch fills the same way we
   * invert lines produced the pre-fix bug where ACI 7 hatches became
   * solid black rectangles in light mode, covering the wireframe.
   *
   * Text glyphs rendered through `AcTrMTextRenderer` share this
   * manager (MText glyph geometry is a mesh fill), but their
   * contract is the opposite of hatches: they must stay legible
   * against the theme bg.  The `isTextFill` option — set exclusively
   * by `AcTrStyleManager.getMTextFillMaterial` — routes text fills
   * through `shouldTrackForeground` and hatches through
   * `shouldTrackBackground`, without leaking the distinction into
   * consumer code.
   */
  protected shouldTrackForeground(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): boolean {
    return options.isTextFill === true && traits.color.isForeground
  }

  /**
   * Solid hatch fills whose resolved colour is the foreground (ACI 7)
   * must follow the canvas background colour rather than keep an
   * absolute RGB — AutoCAD renders them as if they were painted with
   * the paper colour, so they fuse into both light and dark bgs and
   * only the overlaid wireframe remains visible.
   *
   * Text glyph fills (`isTextFill: true`) are explicitly excluded:
   * they go through `changeForeground` instead (ACI 7 text flips to
   * the *opposite* of the bg so it stays legible).
   *
   * Hatches with an explicit RGB (including truecolor white) fall
   * outside this rule — `traits.color.isForeground` is only true for
   * the ACI 7 / foreground pseudo-colour, so a DWG author who picked
   * `255,255,255` via the truecolor picker still gets a literal white
   * hatch.
   */
  protected shouldTrackBackground(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): boolean {
    return options.isTextFill !== true && traits.color.isForeground
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
    if (!style.definitionLines || style.definitionLines.length < 1) {
      material = this.createMeshBasicMaterial(effectiveTraits, threeSide)
    } else if (style.definitionLines.some(line => !line.dashLengths)) {
      log.warn('Invalid dash pattern', style)
      material = this.createMeshBasicMaterial(effectiveTraits, threeSide)
    } else {
      material = this.createHatchShaderMaterial(
        effectiveTraits,
        options,
        threeSide
      )
    }

    // Store side in userData so getBackSideVariant can check idempotency
    // Stamp `isTextFill` so downstream consumers (notably
    // `AcTrBatchedGroup.addMesh`) can differentiate text glyph meshes
    // from hatch/solid area fills when deciding draw order.  AutoCAD's
    // default `SortentsTable` puts hatches BELOW linework and text
    // ABOVE it; without this marker both would be batched as generic
    // meshes and end up in the same THREE render queue slot, causing
    // hatches to occlude BYLAYER outlines (see tower DWG where interior
    // floor divisions disappear because white hatches paint over the
    // dark BYLAYER lines).
    setMaterialMetadata(material, {
      side,
      isTextFill: options.isTextFill === true
    })
    return material
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
   * - `isTextFill`: text glyph fills (from `AcTrMTextRenderer`) must
   *   not share a material instance with hatch/solid area fills even
   *   when colour + layer match, because their `userData.isForeground`
   *   values differ (text inverts with COLORTHEME, hatch does not).
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
    const textSuffix = options.isTextFill ? '_text' : ''
    // Foreground-tracking fills (solid hatches with ACI 7) get their
    // own partition so `changeBackground` can mutate them in place
    // without affecting any literal-RGB hatch that happens to share
    // layer + colour.  The suffix is appended only when the condition
    // matches, keeping the common path's keys bit-identical.
    const bgSuffix =
      options.isTextFill !== true && traits.color.isForeground ? '_bgfill' : ''

    // Use color + layer + rebaseOffset + pattern info for key
    const isSolid = !style.definitionLines || style.definitionLines.length === 0
    if (isSolid) {
      return `solid_${traits.layer}_${traits.rgbColor}${sideSuffix}${textSuffix}${bgSuffix}`
    }

    const patternHash = style.definitionLines
      .map(
        pl =>
          pl.dashLengths.join(',') + `@${pl.angle},${pl.base.x},${pl.base.y}`
      )
      .join('|')

    return `hatch_${traits.layer}_${traits.rgbColor}_${style.patternAngle}_${patternHash}${sideSuffix}${textSuffix}${bgSuffix}`
  }
}
