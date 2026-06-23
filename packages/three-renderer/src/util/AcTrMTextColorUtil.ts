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
      const needsRematerialize = materials.some(material =>
        AcTrMTextColorUtil.shouldRematerializeMaterial(
          material,
          traits,
          styleManager
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
    styleManager: AcTrStyleManager
  ): boolean {
    const metadata = getMaterialMetadata(material)

    if (entityTraits.color.isForeground) {
      return metadata.isForeground !== true
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

    return false
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
