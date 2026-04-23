import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrFillMaterialManager } from './AcTrFillMaterialManager'
import { AcTrLineMaterialManager } from './AcTrLineMaterialManager'
import { AcTrPointMaterialManager } from './AcTrPointMaterialManager'
import { AcTrStyleManagerOptions } from './AcTrStyleManagerOptions'

/**
 * Central style/material access point for the CAD viewer.
 *
 * This class delegates all material creation to the four specialized
 * AcTrMaterialManager implementations:
 *
 * - Point materials
 * - Line materials
 * - Mesh materials
 * - Hatch materials
 *
 * This ensures consistent material reuse, improved rendering performance,
 * and clean separation of material logic.
 */
export class AcTrStyleManager {
  public options: AcTrStyleManagerOptions = {
    // cameraZoomUniform: 1.0,
    ltscale: 1.0,
    celtscale: 1.0,
    viewportScaleUniform: 1.0,
    maxFragmentUniforms: 1024,
    resolution: new THREE.Vector2(1, 1),
    showLineWeight: false,
    // Matches DEFAULT_VIEW_2D_OPTIONS.background in cad-simple-viewer.
    // The setter below keeps this in sync with the canvas bg and fires
    // `changeBackground` so existing materials are repainted on a flip.
    currentBackgroundColor: 0x000000
  }
  private pointMgr: AcTrPointMaterialManager
  private lineMgr: AcTrLineMaterialManager
  private fillMgr: AcTrFillMaterialManager

  constructor() {
    this.pointMgr = new AcTrPointMaterialManager(this.options)
    this.lineMgr = new AcTrLineMaterialManager(this.options)
    this.fillMgr = new AcTrFillMaterialManager(this.options)
  }

  /** Stores unsupported text styles mapped by name → usage count. */
  public unsupportedTextStyles: Record<string, number> = {}

  /**
   * Returns a material for point entities.
   *
   * @param size - Point size (default = 2).
   */
  getPointsMaterial(
    traits: AcGiSubEntityTraits,
    size: number = 2
  ): THREE.Material {
    return this.pointMgr.getMaterial(traits, { size })!
  }

  /**
   * Returns a basic or shader line material depending on the lineType.
   *
   * @param traits - Current entity traits.
   * @param basicMaterialOnly - The flag whether to search and return the basic material only
   */
  getLineMaterial(
    traits: AcGiSubEntityTraits,
    basicMaterialOnly?: boolean
  ): THREE.Material {
    const hasLinePattern = !!(
      traits.lineType.pattern && traits.lineType.pattern.length > 0
    )
    const forceBasicMaterial = !this.options.showLineWeight && !hasLinePattern
    return this.lineMgr.getMaterial(traits, {
      basicMaterialOnly: basicMaterialOnly || forceBasicMaterial
    })!
  }

  /**
   * Gets whether lineweights are currently displayed.
   */
  get showLineWeight(): boolean {
    return this.options.showLineWeight
  }

  /**
   * Sets whether lineweights are displayed.
   */
  set showLineWeight(value: boolean) {
    this.options.showLineWeight = value
  }

  /**
   * Current canvas background colour tracked by the style manager.
   *
   * See `AcTrStyleManagerOptions.currentBackgroundColor` for the full
   * contract.  In short: this is the single source of truth that the
   * fill material manager consults when creating a background-follow
   * material so it is born with the right colour, and it is also what
   * `changeBackground` repaints existing materials to when the theme
   * flips mid-session.
   */
  get currentBackgroundColor(): number {
    return this.options.currentBackgroundColor
  }

  /**
   * Updates the canvas background colour and repaints existing
   * background-follow materials so they track the new colour.
   *
   * Order matters:
   * 1. Write to `options.currentBackgroundColor` first, so any material
   *    created AFTER this point (e.g. hatches from a DWG that finishes
   *    loading later in the boot sequence) is born with the new colour.
   * 2. Fire `changeBackground(value)` so materials already in the
   *    cache (created BEFORE the flip) are repainted in place.
   *
   * Together these cover both the mid-session theme toggle (step 2
   * alone) and the initial boot-in-dark edge case where the theme is
   * set before the DWG finishes parsing (step 1 alone).
   */
  set currentBackgroundColor(value: number) {
    this.options.currentBackgroundColor = value
    this.changeBackground(value)
  }

  /**
   * Returns the shader hatch material or a mesh fallback.
   *
   * @param traits - Current entity traits.
   * @param rebaseOffset - Offset used to transform pattern origins.
   */
  getFillMaterial(
    traits: AcGiSubEntityTraits,
    rebaseOffset: THREE.Vector2 = _rebaseOffset
  ): THREE.Material {
    return this.fillMgr.getMaterial(traits, {
      rebaseOffset
    })
  }

  /**
   * Returns a fill material for MText glyph geometry.
   *
   * MText glyphs are rendered as mesh fills, so they share the
   * `AcTrFillMaterialManager` with hatches — but the two have
   * opposite COLORTHEME semantics: text must stay legible against
   * the theme background (invert ACI 7 with the theme), whereas
   * hatches keep their resolved RGB in both themes.  This method
   * sets the `isTextFill` option so the fill manager opts the
   * resulting material into `changeForeground` inversion AND
   * keeps it in a separate cache slot from any hatch that happens
   * to share colour + layer.
   *
   * @param traits - Current entity traits (built via
   *                 `AcTrSubEntityTraitsUtil.createTraitsForMText`).
   * @param rebaseOffset - Offset used to transform pattern origins
   *                       (unused for solid glyph fills, kept for
   *                       API symmetry with `getFillMaterial`).
   */
  getMTextFillMaterial(
    traits: AcGiSubEntityTraits,
    rebaseOffset: THREE.Vector2 = _rebaseOffset
  ): THREE.Material {
    return this.fillMgr.getMaterial(traits, {
      rebaseOffset,
      isTextFill: true
    })
  }

  /**
   * Returns a `BackSide` variant of the given fill material.
   *
   * Mirrored block references (transforms with negative determinant)
   * reverse triangle winding.  Instead of paying `DoubleSide` for every
   * fill in the scene, the batching layer calls this method only for
   * meshes that actually need it.  The variant is cached so repeated
   * calls for the same material are free.
   *
   * For non-fill materials (lines, points) this is a no-op — those
   * primitives are unaffected by face culling.
   */
  getBackSideVariant(material: THREE.Material): THREE.Material {
    return this.fillMgr.getBackSideVariant(material)
  }

  /**
   * Forces all materials that belong to the given layer to update,
   * for traits that use ByLayer color or ByLayer lineType.
   *
   * @param layerName - The name of the layer whose materials need to be updated.
   * @param newTraits - Layer-level traits (color, lineType, etc.) resolved from your layer table.
   * @returns Mapping: oldMaterialId → newMaterial
   */
  updateLayerMaterial(
    layerName: string,
    newTraits: Partial<AcGiSubEntityTraits>
  ): Record<number, THREE.Material> {
    return {
      ...this.lineMgr.updateLayerMaterial(layerName, newTraits),
      ...this.pointMgr.updateLayerMaterial(layerName, newTraits),
      ...this.fillMgr.updateLayerMaterial(layerName, newTraits)
    }
  }

  /**
   * Returns a cached material bound to an effective layer without changing symbolic traits.
   *
   * This is used when block contents authored on layer `0` inherit the layer of the INSERT that
   * owns them. The returned material keeps the same appearance now, but future layer updates
   * will target the effective layer instead of the source layer.
   *
   * @param material - Existing material used by a rendered object.
   * @param layerName - Effective layer that should own future updates for this material.
   * @param layerTraits - Optional resolved layer traits applied immediately for ByLayer attributes.
   * @returns A cached material bound to the effective layer.
   */
  getLayerBoundMaterial(
    material: THREE.Material,
    layerName: string,
    layerTraits?: Partial<AcGiSubEntityTraits>
  ) {
    return (
      this.lineMgr.getLayerBoundMaterial(material, layerName, layerTraits) ||
      this.pointMgr.getLayerBoundMaterial(material, layerName, layerTraits) ||
      this.fillMgr.getLayerBoundMaterial(material, layerName, layerTraits) ||
      material
    )
  }

  /**
   * Changes material color to the specified color if its userData 'isForeground' is true.
   * Generally this function is used to change rendering color of entities whose color is
   * ACI 7.
   * @param color - New rendering color.
   */
  changeForeground(color: number) {
    this.lineMgr.changeForeground(color)
    this.pointMgr.changeForeground(color)
    this.fillMgr.changeForeground(color)
  }

  /**
   * Repaints every material marked as `isBackgroundFill` with the
   * given colour — used to keep ACI 7 solid hatches fused with the
   * canvas bg as the theme flips (see `AcTrFillMaterialManager`).
   *
   * Point and line managers currently never opt materials into this
   * behaviour, so their delegation is a no-op; keeping it symmetric
   * with `changeForeground` allows future managers to opt in without
   * touching the callers.
   *
   * @param color - New rendering color (typically the canvas bg).
   */
  changeBackground(color: number) {
    this.lineMgr.changeBackground(color)
    this.pointMgr.changeBackground(color)
    this.fillMgr.changeBackground(color)
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose(): void {
    this.lineMgr.dispose()
    this.pointMgr.dispose()
    this.fillMgr.dispose()
  }

  updateLineResolution(width: number, height: number): void {
    this.options.resolution.set(width, height)
    this.lineMgr.updateResolution()
  }
}

const _rebaseOffset = /*@__PURE__*/ new THREE.Vector2(0, 0)
