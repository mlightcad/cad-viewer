import {
  AcGiLineWeight,
  AcGiSubEntityTraits,
  deepClone
} from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrMaterialUtil } from '../util'
import {
  AcTrByLayerBindingFlags,
  getMaterialMetadata,
  hasByLayerBinding,
  setMaterialMetadata
} from './AcTrMaterialMetadata'
import { AcTrStyleManagerOptions } from './AcTrStyleManagerOptions'

/**
 * Valid material side values for cache partitioning.
 *
 * - `'front'` — default; culls back-faces (CW winding after CCW input).
 * - `'back'`  — culls front-faces; used for meshes whose winding was
 *   reversed by a mirrored transform (negative determinant).
 *
 * `DoubleSide` is intentionally excluded: in 2-D CAD every fill has a
 * deterministic winding after the matrix bake, so one of the two
 * single-side values always suffices with zero fillrate overhead.
 */
export type AcTrMaterialSide = 'front' | 'back'

/**
 * Base class for all material managers (line, fill, point).
 *
 * This class implements:
 * - caching
 * - key → traits storage
 * - getMaterial()
 * - updateLayerMaterial()
 * - dispose()
 *
 * Subclasses must implement:
 * - buildKey()
 * - createMaterialImpl()
 */
export abstract class AcTrMaterialManager<T> {
  /** Materials share this uniform */
  static CameraZoomUniform = { value: 1.0 }

  /** Material cache indexed by key. */
  protected cache: Record<string, THREE.Material> = {}

  /** Original cloned traits for each key (needed for layer updates). */
  protected keyToTraits: Record<string, AcGiSubEntityTraits & T> = {}

  /** Options shared with subclasses (viewport scale, zoom uniforms, etc.) */
  protected options: AcTrStyleManagerOptions

  constructor(options: AcTrStyleManagerOptions) {
    this.options = options
  }

  /**
   * Returns (or creates) a material matching traits.
   * Subclasses provide buildKey() and createMaterialImpl().
   */
  getMaterial(traits: AcGiSubEntityTraits, options: T): THREE.Material {
    const key = this.buildKey(traits, options)

    // cache original traits
    if (!this.keyToTraits[key]) {
      this.keyToTraits[key] = { ...deepClone(traits), ...options }
    }

    // hit cache
    if (this.cache[key]) {
      return this.cache[key]
    }

    // otherwise create
    return this.createMaterial(key, traits, options)
  }

  /**
   * Updates all materials belonging to a given layer and whose style is
   * partially or fully ByLayer.
   *
   * A material qualifies for replacement if:
   *   metadata.layer === layerName &&
   *   one of {isByLayerColor,isByLayerLineType,isByLayerLineWeight,isByLayerTransparency} is true
   *
   * For each qualifying material:
   * 1. Rebuild merged traits (old traits + new layer-level traits)
   * 2. Compute a NEW material key
   * 3. Dispose old material
   * 4. Create the new material
   * 5. Update cache/keyToTraits
   * 6. Return mapping { oldMaterialId → newMaterial }
   */
  updateLayerMaterial(
    layerName: string,
    newTraits: Partial<AcGiSubEntityTraits>
  ): Record<number, THREE.Material> {
    const idMap: Record<number, THREE.Material> = {}

    // iterate all cached materials and check userData
    for (const oldKey of Object.keys(this.cache)) {
      const oldMaterial = this.cache[oldKey]
      const metadata = getMaterialMetadata(oldMaterial)

      const isTarget =
        metadata.layer === layerName && hasByLayerBinding(metadata)
      if (!isTarget) continue

      const oldTraits = this.keyToTraits[oldKey]
      if (!oldTraits) continue

      const byLayerBindings = this.resolveByLayerBindings(
        oldTraits,
        oldMaterial
      )

      // Step 1: merged traits (only mutate traits that are actually ByLayer)
      const mergedTraits = deepClone(oldTraits)
      this.applyInheritedLayerTraits(mergedTraits, newTraits, byLayerBindings)
      if (newTraits.layer != null) {
        mergedTraits.layer = newTraits.layer
      }

      // Step 2: build new key
      const newKey = this.buildKey(mergedTraits, mergedTraits)

      const oldMaterialId = oldMaterial.id

      // Step 3: dispose old
      oldMaterial.dispose()
      delete this.cache[oldKey]
      delete this.keyToTraits[oldKey]

      // Step 4: create new material
      const newMaterial = this.createMaterial(
        newKey,
        mergedTraits,
        mergedTraits,
        byLayerBindings
      )

      // Step 5: store merged traits
      this.keyToTraits[newKey] = mergedTraits

      // Step 6: id mapping
      idMap[oldMaterialId] = newMaterial
    }

    return idMap
  }

  /**
   * Changes material color to the specified color if its userData 'isForeground' is true.
   * Generally this function is used to change rendering color of entities whose color is
   * ACI 7.
   * @param color - New rendering color.
   */
  changeForeground(color: number) {
    // iterate all cached materials and check userData
    for (const oldKey of Object.keys(this.cache)) {
      const oldMaterial = this.cache[oldKey]
      const metadata = getMaterialMetadata(oldMaterial)

      const isTarget = metadata.isForeground === true
      if (!isTarget) continue

      const oldTraits = this.keyToTraits[oldKey]
      if (!oldTraits) continue

      AcTrMaterialUtil.setMaterialColor(oldMaterial, new THREE.Color(color))
    }
  }

  /**
   * Changes material color to the specified color if its userData
   * 'isBackgroundFill' is true — i.e. fills that should fuse with the
   * canvas background instead of carrying an absolute RGB.
   *
   * AutoCAD renders solid hatches whose colour resolves to the
   * foreground (ACI 7) by painting them with the **background** colour,
   * so they vanish against the paper in both light and dark themes and
   * only the overlaid wireframe remains visible.  `changeForeground`
   * handles the inverse flip (lines/text stay legible); this method is
   * the symmetric counterpart for fills that must follow the canvas
   * colour rather than its inverse.
   *
   * Only the fill material manager opts materials into this behaviour
   * (see `AcTrFillMaterialManager.shouldTrackBackground`); managers for
   * lines, points and text glyphs return `false` by default, so their
   * caches are a no-op here.
   *
   * @param color - New rendering color (typically the canvas background).
   */
  changeBackground(color: number) {
    for (const oldKey of Object.keys(this.cache)) {
      const oldMaterial = this.cache[oldKey]
      const metadata = getMaterialMetadata(oldMaterial)

      const isTarget = metadata.isBackgroundFill === true
      if (!isTarget) continue

      const oldTraits = this.keyToTraits[oldKey]
      if (!oldTraits) continue

      AcTrMaterialUtil.setMaterialColor(oldMaterial, new THREE.Color(color))
    }
  }

  /**
   * Clears all cached materials.
   */
  dispose(): void {
    Object.values(this.cache).forEach(m => m.dispose())
    this.cache = {}
    this.keyToTraits = {}
  }

  /**
   * Returns a `BackSide` variant of the given material.
   *
   * The default implementation returns the material unchanged — only
   * subclasses whose primitives are affected by face culling (i.e.
   * meshes / fills) override this to produce a cached `BackSide` clone.
   *
   * @param material - A material previously obtained from this manager.
   */
  getBackSideVariant(material: THREE.Material): THREE.Material {
    return material
  }

  /**
   * Returns a cached material bound to the specified effective layer.
   *
   * This is primarily used for block contents that are authored on layer `0` but inherit the
   * layer of the INSERT that owns them. The returned material preserves visual traits and
   * cache semantics, but future layer updates will target the effective layer instead of the
   * original source layer.
   *
   * @param material - Existing cached material to bind.
   * @param layerName - Effective layer name that should own the returned material.
   * @returns The layer-bound cached material, or `undefined` when the input material is not owned
   * by this manager.
   */
  getLayerBoundMaterial(
    material: THREE.Material,
    layerName: string,
    layerTraits?: Partial<AcGiSubEntityTraits>
  ): THREE.Material | undefined {
    const metadata = getMaterialMetadata(material)
    const key = metadata.materialKey
    if (!key) return undefined

    const traits = this.keyToTraits[key]
    if (!traits) return undefined

    if (traits.layer === layerName && !layerTraits) {
      return material
    }

    const remappedTraits: AcGiSubEntityTraits & T = {
      ...deepClone(traits),
      layer: layerName
    }
    const byLayerBindings = this.resolveByLayerBindings(traits, material)
    this.applyInheritedLayerTraits(remappedTraits, layerTraits, byLayerBindings)
    const remappedKey = this.buildKey(remappedTraits, remappedTraits)

    if (this.cache[remappedKey]) {
      return this.cache[remappedKey]
    }

    this.keyToTraits[remappedKey] = remappedTraits
    return this.createMaterial(
      remappedKey,
      remappedTraits,
      remappedTraits,
      byLayerBindings
    )
  }

  /**
   * Applies target-layer traits only to attributes that are actually ByLayer on this entity.
   *
   * This preserves explicit per-entity settings while resolving inherited values during
   * block layer-0 remapping.
   */
  private applyInheritedLayerTraits(
    traits: AcGiSubEntityTraits & T,
    layerTraits?: Partial<AcGiSubEntityTraits>,
    byLayerBindings?: AcTrByLayerBindingFlags
  ) {
    if (!layerTraits) return

    const isByLayerColor = byLayerBindings?.isByLayerColor === true
    const isByLayerLineType = byLayerBindings?.isByLayerLineType === true
    const isByLayerLineWeight = byLayerBindings?.isByLayerLineWeight === true
    const isByLayerTransparency =
      byLayerBindings?.isByLayerTransparency === true

    if (isByLayerColor) {
      if (layerTraits.rgbColor != null) {
        traits.rgbColor = layerTraits.rgbColor
      } else if (layerTraits.color) {
        const inheritedRgb = layerTraits.color.RGB
        if (inheritedRgb != null) {
          traits.rgbColor = inheritedRgb
        }
      }
    }

    if (isByLayerLineType && layerTraits.lineType) {
      traits.lineType = deepClone(layerTraits.lineType)
    }

    if (isByLayerLineWeight && layerTraits.lineWeight != null) {
      traits.lineWeight = layerTraits.lineWeight
    }

    if (isByLayerTransparency && layerTraits.transparency) {
      traits.transparency = deepClone(layerTraits.transparency)
    }
  }

  /**
   * Resolves ByLayer binding flags from explicit metadata first, then falls back
   * to symbolic traits when metadata is unavailable.
   */
  private resolveByLayerBindings(
    traits: AcGiSubEntityTraits,
    material?: THREE.Material
  ): AcTrByLayerBindingFlags {
    const metadata = material ? getMaterialMetadata(material) : undefined
    const inferredTransparencyByLayer =
      (traits.transparency as Partial<{ isByLayer: boolean }>)?.isByLayer ===
      true

    return {
      isByLayerColor:
        metadata?.isByLayerColor ?? traits.color.isByLayer === true,
      isByLayerLineType:
        metadata?.isByLayerLineType ?? traits.lineType.type === 'ByLayer',
      isByLayerLineWeight:
        metadata?.isByLayerLineWeight ??
        traits.lineWeight === AcGiLineWeight.ByLayer,
      isByLayerTransparency:
        metadata?.isByLayerTransparency ?? inferredTransparencyByLayer
    }
  }

  /**
   * Creates a THREE.js material and stores metadata in userData:
   *   - layer
   *   - isByLayerColor/isByLayerLineType/isByLayerLineWeight/isByLayerTransparency
   *   - isForeground      (inverts with COLORTHEME when tracked by manager)
   *   - isBackgroundFill  (follows canvas bg when tracked by manager)
   *   - materialKey (cache key, used by getBackSideVariant for reverse lookup)
   *
   * `isForeground` and `isBackgroundFill` are mutually exclusive in
   * practice: the former flips a material to the colour *opposite* the
   * canvas bg (so ACI 7 text stays legible), whereas the latter paints
   * the material with the canvas bg itself (so ACI 7 hatches fuse with
   * the paper and leave the wireframe visible).  Subclasses enforce the
   * split via `shouldTrackForeground` and `shouldTrackBackground`.
   */
  protected createMaterial(
    key: string,
    traits: AcGiSubEntityTraits,
    options: T,
    byLayerBindings?: AcTrByLayerBindingFlags
  ): THREE.Material {
    const material = this.createMaterialImpl(traits, options)
    const isForeground = this.shouldTrackForeground(traits, options)
    const isBackgroundFill = this.shouldTrackBackground(traits, options)

    // Foreground-follow materials (typically ACI 7 lines/text) must be
    // initialized against the current canvas background color, otherwise
    // they can be created with stale white color on a light background
    // before any theme-change repaint occurs.
    if (isForeground) {
      const foregroundColor =
        this.options.currentBackgroundColor === 0 ? 0xffffff : 0x000000
      AcTrMaterialUtil.setMaterialColor(
        material,
        new THREE.Color(foregroundColor)
      )
    }

    const resolvedByLayerBindings =
      byLayerBindings ?? this.resolveByLayerBindings(traits)

    // Attach metadata required for layer updates and side-variant lookups
    setMaterialMetadata(material, {
      layer: traits.layer,
      isByLayerColor: resolvedByLayerBindings.isByLayerColor,
      isByLayerLineType: resolvedByLayerBindings.isByLayerLineType,
      isByLayerLineWeight: resolvedByLayerBindings.isByLayerLineWeight,
      isByLayerTransparency: resolvedByLayerBindings.isByLayerTransparency,
      isForeground,
      isBackgroundFill,
      materialKey: key
    })

    this.cache[key] = material
    return material
  }

  /**
   * Returns whether traits should be cached as layer-scoped instead of entity-scoped.
   *
   * This flag is used for material-key partitioning only; userData stores granular
   * ByLayer flags per trait.
   */
  protected hasByLayerKeyTraits(traits: AcGiSubEntityTraits): boolean {
    return traits.color.isByLayer || traits.lineType.type === 'ByLayer'
  }

  /**
   * Whether materials from this manager should follow COLORTHEME
   * inversion (i.e. be flipped by `changeForeground`).
   *
   * The default implementation delegates to `AcCmColor.isForeground`,
   * so lines, points and text glyph fills keep inverting ACI 7 with
   * the theme to preserve legibility (dark stroke on light background
   * / light stroke on dark background).
   *
   * Subclasses can override this to opt a primitive type out of the
   * inversion — `AcTrFillMaterialManager` uses `options.isTextFill`
   * to distinguish text glyph fills (invert) from hatch/solid area
   * fills (do NOT invert — AutoCAD keeps ACI 7 hatches at their
   * resolved RGB in both themes).
   */
  protected shouldTrackForeground(
    traits: AcGiSubEntityTraits,
    _options: T
  ): boolean {
    return traits.color.isForeground
  }

  /**
   * Whether materials from this manager should follow the canvas
   * background colour — i.e. be repainted by `changeBackground` when
   * the theme flips.
   *
   * Default is `false`: lines, points and text glyph fills never fuse
   * with the background — they need to stay visible against it.
   *
   * `AcTrFillMaterialManager` overrides this to opt solid hatch fills
   * whose resolved colour is the foreground (ACI 7) into the
   * background-follow behaviour, matching AutoCAD's rendering where
   * such hatches vanish into the paper in both light and dark themes
   * and only the overlaid wireframe remains visible.
   */
  protected shouldTrackBackground(
    _traits: AcGiSubEntityTraits,
    _options: T
  ): boolean {
    return false
  }

  /** Subclass must build stable key. */
  protected abstract buildKey(traits: AcGiSubEntityTraits, options: T): string

  /** Subclass must create material. */
  protected abstract createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: T
  ): THREE.Material
}
