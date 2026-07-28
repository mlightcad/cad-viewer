import {
  AcCmColor,
  ACGI_PAPER_SPACE_BACKGROUND,
  AcGiContext,
  acgiForegroundColorForBackground,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { ColorSettings, MTextColor } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { getMaterialMetadata } from '../style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from './AcTrEntityTraitsUtil'
import { getSceneDrawableUserData } from './AcTrObjectUserData'

export type AcTrMTextEntityTraits = Pick<AcGiSubEntityTraits, 'color' | 'layer'>

/**
 * Utility helpers for converting between MTextColor and AcCmColor.
 */
export class AcTrMTextColorUtil {
  /**
   * Builds {@link ColorSettings} from entity traits produced by `worldDraw`.
   *
   * Uses {@link AcGiContext.resolveSubEntityTraitsRgb} with the layout background so ByLayer /
   * ByBlock branches and ACI 7 stay correct on light paper backgrounds.
   */
  static buildColorSettingsFromTraits(
    traits: AcGiSubEntityTraits,
    backgroundColor: number = ACGI_PAPER_SPACE_BACKGROUND
  ): ColorSettings {
    const context = AcGiContext.fromBackgroundColor(backgroundColor)
    const color = this.normalizeEntityColor(traits.color)
    const resolvedRgb = context.resolveSubEntityTraitsRgb({ ...traits, color })
    return {
      layer: traits.layer,
      color: this.toMTextColor(color),
      byLayerColor: resolvedRgb,
      byBlockColor: resolvedRgb
    }
  }

  /**
   * Snapshot entity traits needed to rebuild text materials after the mtext
   * renderer finishes layout (especially in worker + reconstruct paths).
   */
  static snapshotEntityTraits(
    traits: AcGiSubEntityTraits
  ): AcTrMTextEntityTraits {
    return {
      color: this.normalizeEntityColor(traits.color),
      layer: traits.layer
    }
  }

  /** Clones a text-entity traits snapshot for storage on scene drawables. */
  static cloneEntityTraits(
    traits: AcTrMTextEntityTraits
  ): AcTrMTextEntityTraits {
    return {
      color: traits.color.clone(),
      layer: traits.layer
    }
  }

  /** Stores a text traits snapshot on one drawable for later rematerialization. */
  static storeTextEntityTraitsOnDrawable(
    object: THREE.Object3D,
    traits: AcTrMTextEntityTraits
  ): void {
    getSceneDrawableUserData(object).textEntityTraits =
      AcTrMTextColorUtil.cloneEntityTraits(traits)
  }

  /**
   * Rebinds only text materials that lost CAD colour semantics (ACI-7 foreground
   * tracking, INSERT layer inherit). Inline `\C` segments keep their own materials.
   */
  static rematerializeTextHierarchy(
    root: THREE.Object3D,
    traits: AcTrMTextEntityTraits,
    styleManager: AcTrStyleManager
  ): void {
    const entityTraits: AcGiSubEntityTraits = {
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: traits.color,
      layer: traits.layer,
      drawOrder: 0
    }

    const fillMaterial = styleManager.getMTextFillMaterial(entityTraits)
    const lineMaterial = styleManager.getLineMaterial(entityTraits, true)

    root.traverse(object => {
      if (!('material' in object)) {
        return
      }

      const drawable = object as THREE.Mesh | THREE.Line | THREE.LineSegments
      const materialKind = AcTrMTextColorUtil.resolveTextMaterialKind(drawable)
      if (materialKind == null) {
        return
      }

      const materials = Array.isArray(drawable.material)
        ? drawable.material
        : [drawable.material as THREE.Material]
      const glyphColor = AcTrMTextColorUtil.readGlyphMTextColor(drawable)
      const needsRematerialize = materials.some(material =>
        AcTrMTextColorUtil.shouldRematerializeMaterial(
          material,
          traits,
          styleManager,
          glyphColor
        )
      )
      if (!needsRematerialize) {
        return
      }

      if (materialKind === 'fill') {
        drawable.material = fillMaterial
      } else {
        drawable.material = lineMaterial
      }
    })
  }

  /**
   * Copies worldDraw colour data into a real {@link AcCmColor}.
   *
   * Tests and legacy call sites may pass partial trait stubs instead of a
   * cloned {@link AcCmColor} instance.
   */
  private static normalizeEntityColor(
    color: AcGiSubEntityTraits['color']
  ): AcCmColor {
    if (color instanceof AcCmColor) {
      return color.clone()
    }

    const resolved = new AcCmColor()

    if (typeof color === 'number') {
      if (color === 7) {
        resolved.setForeground()
      } else if (color === 256) {
        resolved.setByLayer()
      } else if (color === 0) {
        resolved.setByBlock()
      } else {
        resolved.colorIndex = color
      }
      return resolved
    }

    if (color && typeof color === 'object') {
      const partial = color as {
        isForeground?: boolean
        isByLayer?: boolean
        isByBlock?: boolean
        colorIndex?: number
        RGB?: number
      }
      if (partial.isForeground) {
        resolved.setForeground()
      } else if (partial.isByLayer) {
        resolved.setByLayer()
      } else if (partial.isByBlock) {
        resolved.setByBlock()
      } else if (typeof partial.colorIndex === 'number') {
        if (partial.colorIndex === 7) {
          resolved.setForeground()
        } else {
          resolved.colorIndex = partial.colorIndex
        }
      } else if (typeof partial.RGB === 'number') {
        resolved.setRGBValue(partial.RGB)
      }
      return resolved
    }

    return resolved
  }

  private static shouldRematerializeMaterial(
    material: THREE.Material,
    entityTraits: AcTrMTextEntityTraits,
    styleManager: AcTrStyleManager,
    glyphColor?: MTextColor | null
  ): boolean {
    const metadata = getMaterialMetadata(material)

    if (entityTraits.color.isForeground) {
      // Keep materials that already track ACI-7 foreground.
      if (metadata.isForeground === true) {
        return false
      }

      // Reconstruct stashes per-glyph ACI. Preserve true inline `\C` overrides
      // (e.g. 90/255) while recovering baked entity ACI 7.
      const glyphAci = glyphColor?.aci
      if (
        typeof glyphAci === 'number' &&
        glyphAci !== 7 &&
        glyphAci !== 0 &&
        glyphAci !== 256
      ) {
        return false
      }
      if (glyphColor?.isRgb && typeof glyphColor.rgbValue === 'number') {
        const expectedFg = acgiForegroundColorForBackground(
          styleManager.currentBackgroundColor
        )
        // Absolute RGB that differs from entity foreground is an inline override.
        if (glyphColor.rgbValue !== expectedFg) {
          return false
        }
      }

      // Rematerialize ByLayer-bound materials that should follow entity ACI 7.
      if (metadata.isByLayerColor === true) {
        return true
      }
      // Glyph explicitly carries entity ACI 7 / ByLayer / ByBlock — recover it.
      if (
        glyphAci === 7 ||
        glyphAci === 0 ||
        glyphAci === 256 ||
        (glyphColor?.isRgb &&
          glyphColor.rgbValue ===
            acgiForegroundColorForBackground(
              styleManager.currentBackgroundColor
            ))
      ) {
        return true
      }
      // mtext-renderer inline `\C` segments usually have no CAD metadata.
      // Do not paint them with the entity colour (that used to wipe \C90/\C255).
      if (
        metadata.isByLayerColor == null &&
        metadata.isForeground == null &&
        metadata.materialKey == null
      ) {
        return false
      }
      return true
    }

    if (
      metadata.isByLayerColor === true &&
      metadata.layer != null &&
      metadata.layer !== entityTraits.layer
    ) {
      return true
    }

    const background = styleManager.currentBackgroundColor
    const context = AcGiContext.fromBackgroundColor(background)
    const expectedRgb = context.resolveSubEntityTraitsRgb({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: entityTraits.color,
      layer: entityTraits.layer
    })
    const materialRgb = AcTrMTextColorUtil.getMaterialDisplayRgb(material)
    if (
      materialRgb === ACGI_PAPER_SPACE_BACKGROUND &&
      expectedRgb !== ACGI_PAPER_SPACE_BACKGROUND &&
      metadata.isForeground !== true &&
      (entityTraits.color.isByLayer || entityTraits.color.isByBlock)
    ) {
      return true
    }

    if (entityTraits.color.isByLayer && metadata.isByLayerColor === true) {
      return true
    }
    if (
      entityTraits.color.isByLayer &&
      metadata.isByLayerColor !== false &&
      metadata.isForeground !== true &&
      (metadata.layer == null || metadata.layer === entityTraits.layer)
    ) {
      return true
    }

    return false
  }

  /** Reads reconstruct-time segment colour from a glyph drawable, if present. */
  private static readGlyphMTextColor(
    object: THREE.Object3D
  ): MTextColor | null {
    const raw = object.userData?.mtextColor
    if (!raw) {
      return null
    }
    if (raw instanceof MTextColor) {
      return raw
    }
    if (typeof raw !== 'object') {
      return null
    }
    const partial = raw as {
      aci?: number | null
      rgbValue?: number | null
      _aci?: number | null
      _rgbValue?: number | null
      isRgb?: boolean
    }
    const color = new MTextColor()
    if (typeof partial.rgbValue === 'number') {
      color.rgbValue = partial.rgbValue
      return color
    }
    if (typeof partial._rgbValue === 'number') {
      color.rgbValue = partial._rgbValue
      return color
    }
    if (typeof partial.aci === 'number') {
      color.aci = partial.aci
      return color
    }
    if (typeof partial._aci === 'number') {
      color.aci = partial._aci
      return color
    }
    return null
  }

  private static getMaterialDisplayRgb(
    material: THREE.Material
  ): number | undefined {
    if (
      material instanceof THREE.MeshBasicMaterial ||
      material instanceof THREE.LineBasicMaterial
    ) {
      return material.color.getHex()
    }

    const shaderMaterial = material as THREE.ShaderMaterial
    const uniformColor = shaderMaterial.uniforms?.u_color?.value
    if (uniformColor instanceof THREE.Color) {
      return uniformColor.getHex()
    }

    return undefined
  }

  /**
   * Classifies drawable text leaves by Three.js `type` string instead of
   * `instanceof` so materials apply even when multiple Three.js copies exist.
   */
  private static resolveTextMaterialKind(
    object: THREE.Object3D
  ): 'fill' | 'line' | undefined {
    switch (object.type) {
      case 'Mesh':
        return 'fill'
      case 'Line':
      case 'LineSegments':
      case 'LineLoop':
        return 'line'
      default:
        return undefined
    }
  }

  static toAcCmColor(color?: MTextColor | null): AcCmColor {
    const resolved = new AcCmColor()
    if (!color) {
      return resolved
    }

    if (color.isRgb && typeof color.rgbValue === 'number') {
      resolved.setRGBValue(color.rgbValue)
      return resolved
    }

    if (typeof color.aci === 'number') {
      if (color.aci === 256) {
        resolved.setByLayer()
      } else if (color.aci === 0) {
        resolved.setByBlock()
      } else if (color.aci === 7) {
        // Worker reconstruct must keep ACI 7 as canvas foreground so
        // background switches can repaint it (not literal white RGB).
        resolved.setForeground()
      } else {
        resolved.colorIndex = color.aci
      }
    }

    return resolved
  }

  static toMTextColor(color?: AcCmColor | null): MTextColor {
    const resolved = new MTextColor()
    if (!color) {
      return resolved
    }

    if (color.isByLayer) {
      resolved.aci = 256
      return resolved
    }

    if (color.isByBlock) {
      resolved.aci = 0
      return resolved
    }

    // ACI 7 must stay an explicit index so the renderer can treat it as
    // canvas foreground — do not fall through to RGB / ByLayer.
    if (color.isForeground) {
      resolved.aci = 7
      return resolved
    }

    if (color.isByACI && typeof color.colorIndex === 'number') {
      resolved.aci = color.colorIndex
      return resolved
    }

    const rgbValue = color.RGB
    if (typeof rgbValue === 'number') {
      resolved.rgbValue = rgbValue
    }

    return resolved
  }

  static resolveRgbColor(
    settings: ColorSettings,
    backgroundColor: number = ACGI_PAPER_SPACE_BACKGROUND
  ): number {
    const { color, byBlockColor, byLayerColor } = settings

    if (color.isRgb && typeof color.rgbValue === 'number') {
      return color.rgbValue
    }

    if (color.aci === 0) {
      return byBlockColor
    }

    if (color.aci === 256 || color.aci == null) {
      return byLayerColor
    }

    if (color.aci === 7) {
      return acgiForegroundColorForBackground(backgroundColor)
    }

    const aciColor = new AcCmColor()
    aciColor.colorIndex = color.aci
    const rgbValue = aciColor.RGB
    return typeof rgbValue === 'number' ? rgbValue : byLayerColor
  }
}
