import { AcGiSubEntityTraits, deepClone } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrMaterialUtil } from '../util'
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
   * partially or fully ByLayer (color or line type).
   *
   * A material qualifies for replacement if:
   *   material.userData.layer === layerName && material.userData.isLayer === true
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
      const data = oldMaterial.userData || {}

      const isTarget = data.layer === layerName && data.isByLayer
      if (!isTarget) continue

      const oldTraits = this.keyToTraits[oldKey]
      if (!oldTraits) continue

      // Step 1: merged traits
      const mergedTraits = { ...deepClone(oldTraits), ...newTraits }

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
        mergedTraits
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
      const data = oldMaterial.userData || {}

      const isTarget = data.isForeground
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
   * Creates a THREE.js material and stores metadata in userData:
   *   - layer
   *   - isByLayer
   *   - materialKey (cache key, used by getBackSideVariant for reverse lookup)
   */
  protected createMaterial(
    key: string,
    traits: AcGiSubEntityTraits,
    options: T
  ): THREE.Material {
    const material = this.createMaterialImpl(traits, options)

    // Attach metadata required for layer updates and side-variant lookups
    material.userData.layer = traits.layer
    material.userData.isByLayer = this.isByLayer(traits)
    material.userData.isForeground = traits.color.isForeground
    material.userData.materialKey = key

    this.cache[key] = material
    return material
  }

  /** Returns true if either color or linetype is ByLayer. */
  protected isByLayer(traits: AcGiSubEntityTraits): boolean {
    return traits.color.isByLayer || traits.lineType.type === 'ByLayer'
  }

  /** Subclass must build stable key. */
  protected abstract buildKey(traits: AcGiSubEntityTraits, options: T): string

  /** Subclass must create material. */
  protected abstract createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: T
  ): THREE.Material
}
