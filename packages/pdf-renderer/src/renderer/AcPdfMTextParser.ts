/**
 * Adapter around `@mlightcad/mtext-parser` that converts its token stream
 * into the paragraph/segment model the PDF text layout engine consumes.
 *
 * The tokenizer handles the full MTEXT inline-code grammar (`\H \W \T \Q \C
 * \c \F \L\O\K \S \p \A \P \N \X \U+XXXX \M+hex`, `%%` symbol codes, brace
 * groups, control characters). This adapter resolves each token's context
 * snapshot into an absolute style — entity height/width factor as the
 * baseline, absolute `\H`/`\W` overrides replacing it, relative (`x`-suffixed)
 * values composing per mtext-renderer semantics — and groups words between
 * paragraph breaks, carrying `\pxq*` alignment per paragraph.
 */
import { AcCmColorUtil } from '@mlightcad/data-model'
import {
  type MTextColor,
  MTextContext,
  MTextParagraphAlignment,
  MTextParser as MTextTokenizer,
  TokenType
} from '@mlightcad/mtext-parser'

import type { AcPdfRgb } from './AcPdfStyle'
import { rgbFromPacked } from './AcPdfStyle'

/**
 * Colour resolution context for inline `\C` / `\c` codes.
 *
 * ACI 0 (ByBlock) and 256 (ByLayer) must resolve to concrete RGB here —
 * returning `undefined` would incorrectly keep the entity colour (e.g. ACI 7
 * white) for `\C256` green layer text.
 */
export interface AcPdfMTextColorContext {
  /** Resolved layer colour as packed 0xRRGGBB. */
  byLayerColor: number
  /** Resolved block / ByBlock display colour as packed 0xRRGGBB. */
  byBlockColor: number
}

export type AcPdfMTextJustify = 'left' | 'center' | 'right'

export interface AcPdfMTextStyle {
  /** Absolute glyph height in drawing units. */
  size: number
  /** Width factor (style factor × `\W`). */
  hScale: number
  /** `\T` tracking: 1 = none; 1.1 adds 0.1×height×hScale per glyph. */
  tracking: number
  /** `\Q` oblique angle in degrees. */
  obliqueDeg: number
  underline: boolean
  overline: boolean
  strike: boolean
  /** `\C`/`\c` color override; `undefined` keeps the entity color. */
  rgb?: AcPdfRgb
  /** `\F`/`\f` font override (raw CAD font name, flags stripped). */
  fontName?: string
}

export interface AcPdfMTextStack {
  num: AcPdfMTextSegment[]
  den: AcPdfMTextSegment[]
  divider: '^' | '/' | '#'
}

export interface AcPdfMTextSegment {
  style: AcPdfMTextStyle
  /** Literal text when this is a plain run. */
  text?: string
  /** Stacked numerator/denominator when this is a `\S` stack. */
  stack?: AcPdfMTextStack
}

export interface AcPdfMTextParagraph {
  /** `\pxq*` justification override; `undefined` = attachment default. */
  justify?: AcPdfMTextJustify
  segments: AcPdfMTextSegment[]
}

/** Maps the parser's paragraph alignment onto the layout's justify model. */
function toJustify(
  align: MTextParagraphAlignment
): AcPdfMTextJustify | undefined {
  switch (align) {
    case MTextParagraphAlignment.CENTER:
      return 'center'
    case MTextParagraphAlignment.RIGHT:
      return 'right'
    case MTextParagraphAlignment.LEFT:
    case MTextParagraphAlignment.JUSTIFIED:
    case MTextParagraphAlignment.DISTRIBUTED:
      return 'left'
    default:
      return undefined
  }
}

/** Resolves an inline color override; "keep entity color" states → undefined. */
function toRgb(
  color: MTextColor,
  colors?: AcPdfMTextColorContext
): AcPdfRgb | undefined {
  const rgb = color.rgb
  if (rgb) {
    return { r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 }
  }
  const aci = color.aci
  if (aci === null || aci === undefined) {
    return undefined
  }
  // ACI 7 is canvas foreground — keep the entity fill (already contrasted).
  if (aci === 7) {
    return undefined
  }
  if (aci === 256) {
    return colors ? rgbFromPacked(colors.byLayerColor) : undefined
  }
  if (aci === 0) {
    return colors ? rgbFromPacked(colors.byBlockColor) : undefined
  }
  const packed = AcCmColorUtil.getColorByIndex(aci)
  return typeof packed === 'number' ? rgbFromPacked(packed) : undefined
}

/**
 * Parses `raw` MTEXT contents into paragraphs of styled segments. `base.size`
 * is the entity's text height and `base.hScale` its style width factor; both
 * seed the tokenizer's root context so brace-group restores fall back to them.
 *
 * @param colors - Optional ByLayer / ByBlock swatches for `\C256` / `\C0`.
 */
export function parseMText(
  raw: string,
  base: { size: number; hScale: number },
  colors?: AcPdfMTextColorContext
): AcPdfMTextParagraph[] {
  const root = new MTextContext()
  root.capHeight = { value: base.size, isRelative: false }
  root.widthFactor = { value: base.hScale, isRelative: false }
  // Seed ACI 7 so an explicit `\C256` / `\C0` is detected as a colour change
  // (mtext-parser defaults the root colour to ByLayer 256).
  root.color.aci = 7
  const tokenizer = new MTextTokenizer(raw, root, {
    // `\P` starts a fresh paragraph: AutoCAD resets paragraph properties.
    resetParagraphParameters: true
  })

  const paragraphs: AcPdfMTextParagraph[] = []
  let segments: AcPdfMTextSegment[] = []
  let justify: AcPdfMTextJustify | undefined

  // Resolved style state. Factor changes are detected by diffing consecutive
  // context snapshots, mirroring mtext-renderer's apply*Change semantics.
  let prevCtx = root
  let heightBase: number | undefined // absolute \H override (undefined = entity height)
  let heightScale = 1 // cumulative relative \H factors
  let hScale = base.hScale
  let tracking = 1
  let obliqueDeg = 0
  let rgb: AcPdfRgb | undefined
  let fontName: string | undefined

  const currentStyle = (): AcPdfMTextStyle => ({
    size: (heightBase ?? base.size) * heightScale,
    hScale,
    tracking,
    obliqueDeg,
    underline: prevCtx.underline,
    overline: prevCtx.overline,
    strike: prevCtx.strikeThrough,
    rgb,
    fontName
  })

  const applyCtx = (ctx: MTextContext) => {
    const cap = ctx.capHeight
    if (
      cap.value !== prevCtx.capHeight.value ||
      cap.isRelative !== prevCtx.capHeight.isRelative
    ) {
      if (cap.isRelative) {
        heightScale *= cap.value
      } else {
        heightBase = cap.value
      }
    }
    const width = ctx.widthFactor
    if (
      width.value !== prevCtx.widthFactor.value ||
      width.isRelative !== prevCtx.widthFactor.isRelative
    ) {
      // Absolute \W replaces; relative (`0.8x`) multiplies the current factor.
      hScale = width.isRelative ? hScale * width.value : width.value
    }
    const charTracking = ctx.charTrackingFactor
    if (
      charTracking.value !== prevCtx.charTrackingFactor.value ||
      charTracking.isRelative !== prevCtx.charTrackingFactor.isRelative
    ) {
      // \T0.1x means +0.1 spacing → multiplier 1.1; absolute \T1.1 → 1.1.
      tracking = charTracking.isRelative ? charTracking.value + 1 : charTracking.value
    }
    if (ctx.oblique !== prevCtx.oblique) {
      obliqueDeg = ctx.oblique
    }
    if (
      ctx.color.aci !== prevCtx.color.aci ||
      ctx.color.rgbValue !== prevCtx.color.rgbValue
    ) {
      rgb = toRgb(ctx.color, colors)
    }
    if (JSON.stringify(ctx.fontFace) !== JSON.stringify(prevCtx.fontFace)) {
      const family = ctx.fontFace.family
      fontName = family ? family.replace(/^@/, '') : undefined
    }
    prevCtx = ctx
  }

  const flushParagraph = () => {
    paragraphs.push({ justify, segments })
    segments = []
    justify = undefined
  }

  for (const token of tokenizer.parse()) {
    applyCtx(token.ctx)
    switch (token.type) {
      case TokenType.WORD:
        if (!segments.length) {
          justify = toJustify(token.ctx.paragraph.align)
        }
        segments.push({ style: currentStyle(), text: token.data as string })
        break
      case TokenType.STACK: {
        const [num, den, divider] = token.data as [string, string, string]
        if (!segments.length) {
          justify = toJustify(token.ctx.paragraph.align)
        }
        const style = currentStyle()
        segments.push({
          style,
          stack: {
            num: num ? [{ style, text: num }] : [],
            den: den ? [{ style, text: den }] : [],
            divider: divider === '^' || divider === '#' ? divider : '/'
          }
        })
        break
      }
      case TokenType.SPACE:
      case TokenType.TABULATOR:
        if (!segments.length) {
          justify = toJustify(token.ctx.paragraph.align)
        }
        segments.push({ style: currentStyle(), text: ' ' })
        break
      case TokenType.NBSP:
        if (!segments.length) {
          justify = toJustify(token.ctx.paragraph.align)
        }
        // Non-breaking space: wrapUnits glues it into adjacent Latin words,
        // so wrapping never breaks at it and it is never trimmed as a space.
        segments.push({ style: currentStyle(), text: '\u00A0' })
        break
      case TokenType.NEW_PARAGRAPH:
        flushParagraph()
        break
      case TokenType.NEW_COLUMN:
      case TokenType.WRAP_AT_DIMLINE:
        // Line break inside the same paragraph block: keep its justification.
        flushParagraph()
        justify = toJustify(prevCtx.paragraph.align)
        break
      default:
        break
    }
  }
  flushParagraph()
  return paragraphs
}
