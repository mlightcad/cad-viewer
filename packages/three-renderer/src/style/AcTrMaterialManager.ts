import { AcGiSubEntityTraits, deepClone } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManagerOptions } from './AcTrStyleManagerOptions'

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
   * Clears all cached materials.
   */
  dispose(): void {
    Object.values(this.cache).forEach(m => m.dispose())
    this.cache = {}
    this.keyToTraits = {}
  }

  /**
   * Creates a THREE.js material and stores metadata in userData:
   *   - layer
   *   - isByLayer
   */
  protected createMaterial(
    key: string,
    traits: AcGiSubEntityTraits,
    options: T
  ): THREE.Material {
    const material = this.createMaterialImpl(traits, options)

    // Attach metadata required for layer updates
    material.userData.layer = traits.layer
    material.userData.isByLayer = this.isByLayer(traits)

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
