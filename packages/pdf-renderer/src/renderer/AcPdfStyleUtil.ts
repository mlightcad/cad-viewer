import {
  AcGiContext,
  AcGiLineTypePatternElement,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'

import { lineWeightToDrawingUnits } from '../AcPdfUnits'
import { isComplexLineType } from '../linetype/AcPdfLineTypeStroker'
import {
  AcPdfFillStyle,
  AcPdfStrokeStyle,
  rgbFromPacked
} from './AcPdfStyle'

/** Runtime style options passed from {@link AcPdfRenderer}. */
export interface AcPdfStyleContext {
  ltscale: number
  celtscale: number
  /** 24-bit RGB canvas / export background. */
  backgroundColor: number
  /** Resolved foreground colour for ACI 7 linework (24-bit RGB). */
  foregroundColor: number
  /** Mirrors LWDISPLAY: when false, lineweights are not rendered. */
  showLineWeight: boolean
  /** Drawing INSUNITS code. */
  insunits: number
}

export type AcPdfPrimitiveKind = 'line' | 'fill' | 'text' | 'point'

/**
 * Converts entity traits and export context into PDF stroke/fill styles.
 */
export class AcPdfStyleUtil {
  static resolveRgb(
    traits: AcGiSubEntityTraits,
    ctx: AcPdfStyleContext,
    _kind: AcPdfPrimitiveKind
  ): number {
    return AcGiContext.fromBackgroundColor(
      ctx.backgroundColor
    ).resolveSubEntityTraitsRgb(traits)
  }

  static strokeStyle(
    traits: AcGiSubEntityTraits,
    ctx: AcPdfStyleContext
  ): AcPdfStrokeStyle {
    const packed = this.contrastAgainstPaper(
      this.resolveRgb(traits, ctx, 'line'),
      ctx
    )
    const opacity = this.resolveOpacity(traits)
    const style: AcPdfStrokeStyle = {
      rgb: rgbFromPacked(packed),
      opacity: opacity ?? 1,
      lineWidth: ctx.showLineWeight
        ? this.resolveStrokeWidth(traits.lineWeight, ctx.insunits)
        : 0
    }
    const dashArray = this.strokeDasharray(traits, ctx)
    if (dashArray) {
      style.dashArray = dashArray
    }
    return style
  }

  static fillStyle(
    traits: AcGiSubEntityTraits,
    ctx: AcPdfStyleContext
  ): AcPdfFillStyle {
    const packed = this.contrastAgainstPaper(
      this.resolveRgb(traits, ctx, 'fill'),
      ctx
    )
    const opacity = this.resolveOpacity(traits)
    return {
      rgb: rgbFromPacked(packed),
      opacity: opacity ?? 1
    }
  }

  static pointStyle(
    traits: AcGiSubEntityTraits,
    ctx: AcPdfStyleContext
  ): AcPdfFillStyle {
    const packed = this.contrastAgainstPaper(
      this.resolveRgb(traits, ctx, 'point'),
      ctx
    )
    const opacity = this.resolveOpacity(traits)
    return {
      rgb: rgbFromPacked(packed),
      opacity: opacity ?? 1
    }
  }

  /**
   * True-colour white (and ACI 7) geometry on white paper would otherwise
   * vanish. Hatches use the same contrast as strokes: AutoCAD plots ACI 7
   * as foreground, and the Three.js viewer inverts hatch-tier ACI 7 so it
   * stays visible against both light and dark canvases.
   */
  private static contrastAgainstPaper(
    packed: number,
    ctx: AcPdfStyleContext
  ): number {
    const paper = ctx.backgroundColor
    const dr = ((packed >> 16) & 0xff) - ((paper >> 16) & 0xff)
    const dg = ((packed >> 8) & 0xff) - ((paper >> 8) & 0xff)
    const db = (packed & 0xff) - (paper & 0xff)
    if (dr * dr + dg * dg + db * db < 40 * 40) {
      return ctx.foregroundColor
    }
    return packed
  }

  private static resolveStrokeWidth(
    lineWeight: AcGiLineWeight,
    insunits: number
  ): number {
    if (lineWeight < 0) {
      return 0
    }
    return lineWeightToDrawingUnits(lineWeight, insunits)
  }

  /**
   * Maps {@link AcCmTransparency} to PDF opacity in `[0, 1]`.
   *
   * `AcCmTransparency.alpha` is 0–255 and only meaningful when the method is
   * `ByAlpha`. ByLayer / ByBlock leave opacity unset (fully opaque).
   *
   * Fully clear (`alpha === 0` / `isClear`) is also left unset: the Three.js
   * viewer does not apply entity transparency to materials yet, and some DWGs
   * mark visible FORMAT/dimension linework as `0x02000000` (ByAlpha clear).
   * Honoring that literally made dimensions vanish from PDF while still
   * visible on canvas.
   */
  private static resolveOpacity(traits: AcGiSubEntityTraits): number | null {
    const transparency = traits.transparency as
      | {
          alpha?: number
          isByAlpha?: boolean
          isByLayer?: boolean
          method?: number
        }
      | undefined
    if (!transparency?.isByAlpha) {
      return null
    }
    const alpha = transparency.alpha
    if (alpha == null || Number.isNaN(alpha) || alpha <= 0) {
      return null
    }
    return Math.min(1, Math.max(0, alpha / 255))
  }

  private static strokeDasharray(
    traits: AcGiSubEntityTraits,
    ctx: AcPdfStyleContext
  ): number[] | undefined {
    const pattern = traits.lineType.pattern
    if (!pattern || pattern.length === 0 || isComplexLineType(pattern)) {
      return undefined
    }
    const scale = ctx.ltscale * ctx.celtscale * traits.lineTypeScale
    const segments = this.patternToDashSegments(pattern, scale)
    return segments.length === 0 ? undefined : segments
  }

  private static patternToDashSegments(
    pattern: AcGiLineTypePatternElement[],
    scale: number
  ): number[] {
    const segments: number[] = []
    for (const element of pattern) {
      let len = element.elementLength
      if (len < 0 && element.elementTypeFlag !== 0) {
        len = Math.abs(len)
      }
      len *= scale
      if (len === 0) {
        len = 0.5 * scale
      }
      segments.push(Math.abs(len))
    }
    return segments
  }
}
