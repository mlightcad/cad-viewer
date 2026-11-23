import {
  AcDbEntity,
  AcDbMText,
  AcDbText,
  AcDbTextHorizontalMode,
  AcDbTextVerticalMode,
  AcGePoint3d,
  AcGiMTextAttachmentPoint
} from '@mlightcad/data-model'

import { acapMTextToPlainText } from '../../find/findText.js'

/** AutoCAD single line spacing as a multiple of text height (DXF group 44 = 1). */
const SINGLE_LINE_SPACING = 5 / 3

/** Gap between two parts of a line (× height) that reads as a space. */
const SPACE_GAP = 0.5

/** Baseline difference (× height) that starts a new paragraph. */
const PARAGRAPH_GAP = 0.6

/**
 * Measures plain-text advance width at width factor 1 for the given height.
 * Return `undefined` when measurement is unavailable.
 */
export type AcApTextMergeMeasure = (
  text: string,
  height: number,
  fontPrimary: string,
  fontBig: string
) => number | undefined

/**
 * Options for {@link acapMergeTextParts} / {@link acapBuildMergedMText}.
 */
export interface AcApTextMergeOptions {
  /** Font advance measurer; improves horizontal spacing. */
  measure?: AcApTextMergeMeasure
  /**
   * When true, wrap each paragraph in `\\W` so measured advance matches the
   * ink span (pdftext auto-width). Off by default — extents without real
   * fonts are only estimates and would otherwise invent bogus factors.
   */
  fitWidth?: boolean
}

/**
 * Style snapshot of one TEXT/MTEXT, used to emit MTEXT inline overrides.
 */
export interface AcApTextMergeStyle {
  styleName: string
  /** Primary font face from the text style, empty when unknown. */
  fontPrimary: string
  /** Big-font face from the text style, empty when none/unknown. */
  fontBig: string
  height: number
  widthFactor: number
  /** Oblique angle in degrees (MTEXT `\\Q` units). */
  obliqueDeg: number
  /**
   * Inline color introducer without the leading backslash, e.g. `C1` or
   * `c16711680`. `undefined` means ByLayer / ByBlock (inherit entity color).
   */
  colorCode?: string
}

/**
 * One text or mtext fragment to fold into a merged MTEXT.
 *
 * Limitations of a single MTEXT (mixed rotations/normals, TEXT mirror flags,
 * FIT/ALIGNED two-point constraints, columns) cannot be preserved perfectly.
 */
export interface AcApTextMergePart {
  /** MTEXT-ready contents (escaped for TEXT, raw for MTEXT). Not trimmed. */
  contents: string
  /** Plain text used for ordering and spacing. Not trimmed. */
  plain: string
  /** Draw anchor in WCS (TEXT grip / MTEXT line baseline). */
  x: number
  y: number
  z: number
  /** Layout rotation after extrusion adjustment. */
  rotation: number
  /** Attachment used to interpret the anchor as baseline/bottom/top. */
  attachment: AcGiMTextAttachmentPoint
  style: AcApTextMergeStyle
  entity: AcDbText | AcDbMText
}

interface PartBox {
  index: number
  part: AcApTextMergePart
  minU: number
  maxU: number
  baseline: number
  bottom: number
  top: number
}

/**
 * Result of merging text parts into one MTEXT description.
 */
export interface AcApTextMergeParagraph {
  contents: string
  plain: string
  minU: number
  maxU: number
  baseline: number
  bottom: number
  /** Representative fragment height used for Exact spacing compensation. */
  height: number
}

export interface AcApTextMergeResult {
  /** Paragraphs from top to bottom. */
  paragraphs: AcApTextMergeParagraph[]
  /** Mean baseline distance between paragraphs, 0 for one paragraph. */
  lineSpacing: number
  /** Dominant rotation of the block. */
  rotation: number
  /** Median text height. */
  height: number
}

/**
 * True when `entity` is TEXT or MTEXT.
 */
export function acapIsTextOrMText(
  entity: AcDbEntity
): entity is AcDbText | AcDbMText {
  return entity instanceof AcDbText || entity instanceof AcDbMText
}

/**
 * Escapes plain text so it renders literally through MTEXT (no control codes).
 */
export function acapEscapePlainTextForMText(text: string): string {
  return text.replace(/[\\{}]/g, char => `\\${char}`)
}

/**
 * Reads the style snapshot of a TEXT or MTEXT entity.
 */
export function acapTextEntityMergeStyle(
  entity: AcDbText | AcDbMText
): AcApTextMergeStyle {
  const styleRecord = resolveTextStyleRecord(entity)
  const draw = textDrawingAdjust(entity)
  const obliqueRad =
    entity instanceof AcDbText
      ? entity.oblique
      : (styleRecord?.obliquingAngle ?? 0)
  const widthFactor =
    entity instanceof AcDbText
      ? Math.abs(draw.widthFactor)
      : Math.abs(styleRecord?.xScale ?? 1)
  return {
    styleName: entity.styleName,
    fontPrimary: styleRecord?.fileName ?? '',
    fontBig: styleRecord?.bigFontFileName ?? '',
    height: entity.height,
    widthFactor: widthFactor > 0 ? widthFactor : 1,
    obliqueDeg: (obliqueRad * 180) / Math.PI,
    colorCode: colorCodeOf(entity)
  }
}

/**
 * Builds a merge part from a TEXT or single-line MTEXT entity.
 *
 * Prefer {@link acapTextEntityToMergeParts} so multi-line MTEXT is expanded
 * into one part per paragraph with the original baseline spacing.
 */
export function acapTextEntityToMergePart(
  entity: AcDbText | AcDbMText
): AcApTextMergePart {
  return acapTextEntityToMergeParts(entity)[0]
}

/**
 * Builds merge parts from a TEXT or MTEXT entity.
 *
 * Multi-line MTEXT (`\\P`) is expanded into one part per paragraph, with
 * baselines spaced by the entity's original line-spacing factor / style so the
 * merged MTEXT can keep that spacing. Contents are not trimmed.
 */
export function acapTextEntityToMergeParts(
  entity: AcDbText | AcDbMText
): AcApTextMergePart[] {
  if (entity instanceof AcDbText) {
    return [textEntityToMergePart(entity)]
  }
  return expandMTextToMergeParts(entity)
}

/**
 * Expands an MTEXT into one merge part per paragraph.
 *
 * Paragraph baselines follow the entity attachment point and its
 * `lineSpacingFactor` / `lineSpacingStyle`, matching AutoCAD DXF groups 44/73.
 */
export function expandMTextToMergeParts(
  entity: AcDbMText
): AcApTextMergePart[] {
  const contents = entity.contents ?? ''
  const paragraphs = splitMTextParagraphs(contents)
  const style = acapTextEntityMergeStyle(entity)
  const angle = entity.rotation
  const z = entity.location.z
  const attachment = entity.attachmentPoint

  if (paragraphs.length <= 1) {
    const line = paragraphs[0] ?? ''
    return [
      {
        contents: line,
        plain: acapMTextToPlainText(line),
        x: entity.location.x,
        y: entity.location.y,
        z,
        rotation: angle,
        attachment,
        style,
        entity
      }
    ]
  }

  const step = mtextBaselineStep(entity)
  const { u, v: anchorV } = toLocal(
    entity.location.x,
    entity.location.y,
    angle
  )
  const firstBaseline = firstLineBaselineLocalV(
    attachment,
    anchorV,
    paragraphs.length,
    entity.height,
    step
  )
  // Keep horizontal alignment of the source; each line sits on its baseline.
  const lineAttachment = baselineAttachmentKeepingHorizontal(attachment)

  return paragraphs.map((paragraph, index) => {
    const baseline = firstBaseline - index * step
    const world = toWorld(u, baseline, angle, z)
    return {
      contents: paragraph,
      plain: acapMTextToPlainText(paragraph),
      x: world.x,
      y: world.y,
      z: world.z,
      rotation: angle,
      attachment: lineAttachment,
      style,
      entity
    }
  })
}

/**
 * Baseline-to-baseline distance for an MTEXT, in drawing units.
 *
 * Single spacing is `5/3` of the text height. At Least (style 0/1) never packs
 * tighter than one text height; Exact (style 2) keeps the factor spacing.
 */
export function mtextBaselineStep(entity: AcDbMText): number {
  const height = entity.height
  if (!(height > 0)) return 0
  const factorSpacing =
    Math.max(entity.lineSpacingFactor || 1, 0) * SINGLE_LINE_SPACING
  const spacing =
    entity.lineSpacingStyle === 2 ? factorSpacing : Math.max(factorSpacing, 1)
  return height * spacing
}

/**
 * Splits MTEXT contents on paragraph breaks (`\\P` / `\\p`), keeping escaped
 * backslashes (`\\\\`) intact.
 */
export function splitMTextParagraphs(contents: string): string[] {
  const parts: string[] = []
  let current = ''
  for (let i = 0; i < contents.length; i++) {
    const char = contents[i]
    if (char === '\\' && i + 1 < contents.length) {
      const next = contents[i + 1]
      if (next === '\\') {
        current += '\\\\'
        i++
        continue
      }
      if (next === 'P' || next === 'p') {
        parts.push(current)
        current = ''
        i++
        continue
      }
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && contents[i + 1] === '\n') i++
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts.length > 0 ? parts : ['']
}

/**
 * Style defaults of the output MTEXT (entity height + text-style width/oblique).
 *
 * TEXT stores widthFactor on the entity; MTEXT inherits width from the style
 * (typically 1) unless contents use `\\W`. Comparing wraps to the first
 * fragment's widthFactor therefore drops that factor on the first run.
 */
export function acapMTextMergeWrapBase(
  sample: AcApTextMergeStyle,
  entityHeight: number,
  styleWidthFactor = 1,
  styleObliqueDeg = 0
): AcApTextMergeStyle {
  return {
    styleName: sample.styleName,
    fontPrimary: sample.fontPrimary,
    fontBig: sample.fontBig,
    height: entityHeight > 0 ? entityHeight : sample.height,
    widthFactor: styleWidthFactor > 0 ? styleWidthFactor : 1,
    obliqueDeg: styleObliqueDeg,
    colorCode: undefined
  }
}

/**
 * Wraps MTEXT contents with inline format codes for properties that differ
 * from `base`, so each fragment keeps its original look inside one MTEXT.
 */
export function acapWrapMTextContentsWithStyle(
  contents: string,
  style: AcApTextMergeStyle,
  base: AcApTextMergeStyle
): string {
  if (!contents) return contents
  const codes: string[] = []

  const font = fontFaceOf(style)
  const baseFont = fontFaceOf(base)
  if (font && font !== baseFont) {
    codes.push(`\\f${font}|b0|i0;`)
  }

  if (!nearlyEqual(style.height, base.height) && style.height > 0) {
    codes.push(`\\H${formatNumber(style.height)};`)
  }

  if (!nearlyEqual(style.widthFactor, base.widthFactor)) {
    codes.push(`\\W${formatNumber(style.widthFactor)};`)
  }

  if (!nearlyEqual(style.obliqueDeg, base.obliqueDeg)) {
    codes.push(`\\Q${formatNumber(style.obliqueDeg)};`)
  }

  if (style.colorCode && style.colorCode !== base.colorCode) {
    codes.push(`\\${style.colorCode};`)
  }

  if (codes.length === 0) return contents
  return `{${codes.join('')}${contents}}`
}

/**
 * Merges parts into paragraphs ordered for reading (top to bottom, left to
 * right in the block's local frame).
 *
 * @param parts - Fragments to merge.
 * @param baseStyle - Style of the resulting MTEXT; fragments that differ get
 *   inline overrides so their original look is preserved.
 * @param options - Optional font measurer for horizontal spacing.
 */
export function acapMergeTextParts(
  parts: AcApTextMergePart[],
  baseStyle?: AcApTextMergeStyle,
  options: AcApTextMergeOptions = {}
): AcApTextMergeResult | undefined {
  if (parts.length === 0) return undefined

  const base = baseStyle ?? parts[0].style
  const rotation = dominantRotation(parts, options.measure)
  const boxes = parts.map((part, index) =>
    partBox(part, index, rotation, options.measure)
  )
  const height = median(boxes.map(box => box.part.style.height)) || 1e-9

  const byBaseline = [...boxes].sort((a, b) => b.baseline - a.baseline)
  const groups: PartBox[][] = []
  for (const box of byBaseline) {
    const group = groups[groups.length - 1]
    if (
      group &&
      Math.abs(median(group.map(item => item.baseline)) - box.baseline) <=
        PARAGRAPH_GAP * height
    ) {
      group.push(box)
    } else {
      groups.push([box])
    }
  }

  const paragraphs = groups.map(group => {
    const ordered = [...group].sort((a, b) => a.minU - b.minU)
    const spacesBetween = spaceCounter(ordered, height, options.measure)
    let contents = ''
    let plain = ''
    let previous: PartBox | undefined
    for (const box of ordered) {
      const piecePlain = box.part.plain
      const rawContents = box.part.contents
      if (!rawContents && !piecePlain) continue
      if (previous && (contents || plain)) {
        const spaces = spacesBetween(previous, box)
        contents += ' '.repeat(spaces)
        plain += ' '.repeat(spaces)
      }
      contents += acapWrapMTextContentsWithStyle(
        rawContents,
        box.part.style,
        base
      )
      plain += piecePlain
      previous = box
    }
    return {
      contents,
      plain,
      baseline: median(group.map(box => box.baseline)),
      bottom: Math.min(...group.map(box => box.bottom)),
      minU: Math.min(...group.map(box => box.minU)),
      maxU: Math.max(...group.map(box => box.maxU)),
      height:
        median(group.map(box => box.part.style.height)) ||
        group[0].part.style.height
    }
  })

  const spacings = paragraphs
    .slice(1)
    .map((item, i) => paragraphs[i].baseline - item.baseline)

  return {
    paragraphs,
    rotation,
    height,
    lineSpacing:
      spacings.length > 0
        ? spacings.reduce((sum, value) => sum + value, 0) / spacings.length
        : 0
  }
}

/**
 * Leading horizontal offset for a paragraph that starts right of the block
 * min-U, without paragraph `\\p` margins (unsafe when MTEXT `width = 0`).
 *
 * Emits one space with `\\W` scaled so its advance equals `indentU`.
 */
export function acapMTextIndentPrefix(
  indentU: number,
  height: number,
  measure?: AcApTextMergeMeasure,
  style?: AcApTextMergeStyle
): string {
  if (!(indentU > 0) || !(height > 0)) return ''
  const fontPrimary = style?.fontPrimary ?? ''
  const fontBig = style?.fontBig ?? ''
  const measured = measure?.(' ', height, fontPrimary, fontBig)
  const spaceAdvance =
    measured !== undefined && measured > 0 ? measured : height * 0.5
  const factor = indentU / spaceAdvance
  if (factor >= 0.05 && factor < 100) {
    return `{\\W${formatNumber(Number(factor.toFixed(6)))}; }`
  }
  return ' '.repeat(Math.max(1, Math.round(Math.max(factor, 1))))
}

/**
 * Exact line advance so rendered baseline gaps match the originals.
 *
 * mtext-renderer lays out top-to-bottom by parking each line's glyph top at
 * `vOffset` (`charY = vOffset - drawnHeight`) and then stepping `vOffset` by
 * the Exact spacing. The visible baseline gap between lines i and i+1 is
 * therefore `spacing - h_i + h_{i+1}`. Invert that to recover `spacing`.
 */
export function acapExactSpacingForBaselines(
  paragraphs: { baseline: number; height: number }[],
  entityHeight: number
): number {
  const fallback = entityHeight * SINGLE_LINE_SPACING
  if (paragraphs.length < 2) return fallback
  const advances: number[] = []
  for (let i = 0; i < paragraphs.length - 1; i++) {
    const gap = paragraphs[i].baseline - paragraphs[i + 1].baseline
    const hi =
      paragraphs[i].height > 0 ? paragraphs[i].height : entityHeight
    const hj =
      paragraphs[i + 1].height > 0 ? paragraphs[i + 1].height : entityHeight
    advances.push(gap + hi - hj)
  }
  return (
    advances.reduce((sum, value) => sum + value, 0) / advances.length ||
    fallback
  )
}

/**
 * Builds one MTEXT from TEXT/MTEXT entities. Returns `undefined` when fewer
 * than two entities are provided.
 *
 * Geometry follows the pdftext merge convention: bottom-left attachment at the
 * lowest ink of the last paragraph, Exact line spacing, no word wrap
 * (`width = 0`). Fragments keep their look through inline MTEXT codes.
 *
 * A single MTEXT cannot perfectly preserve mixed rotations/normals, TEXT
 * mirror flags, FIT/ALIGNED two-point constraints, or columns.
 */
export function acapBuildMergedMText(
  entities: (AcDbText | AcDbMText)[],
  options: AcApTextMergeOptions = {}
): AcDbMText | undefined {
  if (entities.length < 2) return undefined

  const parts = entities.flatMap(acapTextEntityToMergeParts)
  if (parts.length === 0) return undefined

  const sample = parts[0].style
  const height = sample.height > 0 ? sample.height : 1
  const styleRecord = resolveTextStyleRecord(entities[0])
  const wrapBase = acapMTextMergeWrapBase(
    sample,
    height,
    styleRecord?.xScale ?? 1,
    ((styleRecord?.obliquingAngle ?? 0) * 180) / Math.PI
  )
  const merged = acapMergeTextParts(parts, wrapBase, options)
  if (!merged || merged.paragraphs.length === 0) return undefined

  const first = entities[0]
  const last = merged.paragraphs[merged.paragraphs.length - 1]
  const blockMinU = Math.min(...merged.paragraphs.map(item => item.minU))
  const z = parts[0]?.z ?? 0

  const lines = merged.paragraphs.map(paragraph => {
    let line = paragraph.contents
    // Prefer a stretched leading space over `\\pl` / `\\pxi`. With `width = 0`
    // (no-wrap), a left margin makes `maxLineWidth` negative and CJK soft-wraps
    // one character per line — "技术要求" became a vertical stack.
    const indentU = paragraph.minU - blockMinU
    if (indentU > SPACE_GAP * height && height > 0) {
      line =
        acapMTextIndentPrefix(indentU, height, options.measure, wrapBase) +
        line
    }
    if (options.fitWidth && line && !line.includes('\\W')) {
      const natural = measurePlain(
        options.measure,
        paragraph.plain,
        height,
        wrapBase
      )
      const span = paragraph.maxU - paragraph.minU
      if (natural && natural > 0 && span > 0) {
        const factor = Math.min(4, Math.max(0.1, span / natural))
        if (Math.abs(factor - 1) >= 0.005) {
          line = `{\\W${formatNumber(Number(factor.toFixed(3)))};${line}}`
        }
      }
    }
    return line
  })

  const mtext = new AcDbMText()
  mtext.contents = lines.join('\\P')
  mtext.styleName = sample.styleName
  mtext.height = height
  mtext.width = 0
  mtext.rotation = merged.rotation
  mtext.attachmentPoint = AcGiMTextAttachmentPoint.BottomLeft
  mtext.location = toWorld(blockMinU, last.bottom, merged.rotation, z)
  mtext.normal = first.normal.clone()
  if (merged.paragraphs.length > 1) {
    const spacing = acapExactSpacingForBaselines(merged.paragraphs, height)
    mtext.lineSpacingStyle = 2
    mtext.lineSpacingFactor = spacing / (height * SINGLE_LINE_SPACING)
  }

  return mtext
}

function textEntityToMergePart(entity: AcDbText): AcApTextMergePart {
  const plain = entity.textString ?? ''
  const style = acapTextEntityMergeStyle(entity)
  const draw = textDrawingAdjust(entity)
  const attachment = textAttachmentPoint(entity)
  const anchor = textDrawAnchor(entity, attachment)
  return {
    contents: acapEscapePlainTextForMText(plain),
    plain,
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
    rotation: draw.rotation,
    attachment,
    style,
    entity
  }
}

/**
 * TEXT draw anchor: alignment point when set for non-default alignment,
 * otherwise insertion `position`. Prefer grip points when available.
 */
function textDrawAnchor(
  entity: AcDbText,
  attachment: AcGiMTextAttachmentPoint
): AcGePoint3d {
  try {
    const grips = entity.subGetGripPoints()
    if (grips.length > 0) return grips[0].clone()
  } catch {
    // Detached entities may not resolve grips without a working database.
  }
  if (attachment === AcGiMTextAttachmentPoint.BaselineLeft) {
    return entity.position.clone()
  }
  // Do not treat (0,0,0) as unset — center/middle TEXT can legitimately sit
  // at the origin. Rely on hasAlignmentPoint only.
  if (!entity.hasAlignmentPoint) return entity.position.clone()
  return entity.alignmentPoint.clone()
}

/** Maps TEXT horizontal/vertical modes to an MTEXT attachment point. */
export function textAttachmentPoint(
  entity: AcDbText
): AcGiMTextAttachmentPoint {
  const h = entity.horizontalMode
  const v = entity.verticalMode
  if (h === AcDbTextHorizontalMode.MIDDLE) {
    return AcGiMTextAttachmentPoint.MiddleCenter
  }
  if (
    h === AcDbTextHorizontalMode.ALIGNED ||
    h === AcDbTextHorizontalMode.FIT
  ) {
    return AcGiMTextAttachmentPoint.BaselineLeft
  }
  switch (v) {
    case AcDbTextVerticalMode.TOP:
      if (h === AcDbTextHorizontalMode.CENTER)
        return AcGiMTextAttachmentPoint.TopCenter
      if (h === AcDbTextHorizontalMode.RIGHT)
        return AcGiMTextAttachmentPoint.TopRight
      return AcGiMTextAttachmentPoint.TopLeft
    case AcDbTextVerticalMode.MIDDLE:
      if (h === AcDbTextHorizontalMode.CENTER)
        return AcGiMTextAttachmentPoint.MiddleCenter
      if (h === AcDbTextHorizontalMode.RIGHT)
        return AcGiMTextAttachmentPoint.MiddleRight
      return AcGiMTextAttachmentPoint.MiddleLeft
    case AcDbTextVerticalMode.BOTTOM:
      if (h === AcDbTextHorizontalMode.CENTER)
        return AcGiMTextAttachmentPoint.BottomCenter
      if (h === AcDbTextHorizontalMode.RIGHT)
        return AcGiMTextAttachmentPoint.BottomRight
      return AcGiMTextAttachmentPoint.BottomLeft
    case AcDbTextVerticalMode.BASELINE:
    default:
      if (h === AcDbTextHorizontalMode.CENTER)
        return AcGiMTextAttachmentPoint.BaselineCenter
      if (h === AcDbTextHorizontalMode.RIGHT)
        return AcGiMTextAttachmentPoint.BaselineRight
      return AcGiMTextAttachmentPoint.BaselineLeft
  }
}

/** Maps any attachment to the baseline row while keeping left/center/right. */
function baselineAttachmentKeepingHorizontal(
  attachment: AcGiMTextAttachmentPoint
): AcGiMTextAttachmentPoint {
  switch (attachment) {
    case AcGiMTextAttachmentPoint.TopCenter:
    case AcGiMTextAttachmentPoint.MiddleCenter:
    case AcGiMTextAttachmentPoint.BottomCenter:
    case AcGiMTextAttachmentPoint.BaselineCenter:
      return AcGiMTextAttachmentPoint.BaselineCenter
    case AcGiMTextAttachmentPoint.TopRight:
    case AcGiMTextAttachmentPoint.MiddleRight:
    case AcGiMTextAttachmentPoint.BottomRight:
    case AcGiMTextAttachmentPoint.BaselineRight:
      return AcGiMTextAttachmentPoint.BaselineRight
    default:
      return AcGiMTextAttachmentPoint.BaselineLeft
  }
}

/**
 * Local-v baseline of the first (top) paragraph for an MTEXT attachment.
 */
function firstLineBaselineLocalV(
  attachment: AcGiMTextAttachmentPoint,
  anchorV: number,
  lineCount: number,
  textHeight: number,
  step: number
): number {
  const safeHeight = textHeight > 0 ? textHeight : 0
  const blockHeight = safeHeight + Math.max(lineCount - 1, 0) * step
  switch (attachment) {
    case AcGiMTextAttachmentPoint.BottomLeft:
    case AcGiMTextAttachmentPoint.BottomCenter:
    case AcGiMTextAttachmentPoint.BottomRight:
    case AcGiMTextAttachmentPoint.BaselineLeft:
    case AcGiMTextAttachmentPoint.BaselineCenter:
    case AcGiMTextAttachmentPoint.BaselineRight:
      return anchorV + Math.max(lineCount - 1, 0) * step
    case AcGiMTextAttachmentPoint.MiddleLeft:
    case AcGiMTextAttachmentPoint.MiddleCenter:
    case AcGiMTextAttachmentPoint.MiddleRight:
      return anchorV + blockHeight / 2 - safeHeight
    case AcGiMTextAttachmentPoint.TopLeft:
    case AcGiMTextAttachmentPoint.TopCenter:
    case AcGiMTextAttachmentPoint.TopRight:
    default:
      return anchorV - safeHeight
  }
}

/**
 * Drawing rotation / width factor after extrusion adjust (mirrors AcDbText).
 */
function textDrawingAdjust(entity: AcDbText | AcDbMText): {
  rotation: number
  widthFactor: number
} {
  const rotation =
    entity instanceof AcDbText ? entity.rotation : entity.rotation
  const widthFactor =
    entity instanceof AcDbText ? entity.widthFactor : 1
  const n = entity.normal
  if (n.x === 0 && n.y === 0 && n.z === 1) {
    return { rotation, widthFactor }
  }
  if (n.x === 0 && n.y === 0 && n.z < 0) {
    return { rotation: -rotation, widthFactor: -widthFactor }
  }
  return { rotation, widthFactor }
}

function dominantRotation(
  parts: AcApTextMergePart[],
  measure?: AcApTextMergeMeasure
): number {
  let best = parts[0]
  let bestWeight = -1
  for (const part of parts) {
    const height = part.style.height > 0 ? part.style.height : 1
    const measured = measurePlain(measure, part.plain, height, part.style)
    const measuredWeight =
      measured !== undefined && measured > 0
        ? measured * part.style.widthFactor
        : undefined
    const weight =
      measuredWeight ??
      (part.plain.replace(/\s/g, '').length || part.plain.length || 1)
    if (weight > bestWeight) {
      best = part
      bestWeight = weight
    }
  }
  return best?.rotation ?? 0
}

function partBox(
  part: AcApTextMergePart,
  index: number,
  angle: number,
  measure: AcApTextMergeMeasure | undefined
): PartBox {
  const { u, v } = toLocal(part.x, part.y, angle)
  const height = part.style.height > 0 ? part.style.height : 1e-9
  const vertical = verticalFromAttachment(part.attachment, v, height)
  // Prefer projected geometric extents (ink) so measured font advance can
  // still drive spaceCounter / optional \\W fit against a different span.
  const extents = extentsAlongU(part, angle)
  const measured = measurePlain(measure, part.plain, height, part.style)
  const estimated = estimateWidth(
    part.plain,
    height,
    part.style.widthFactor
  )
  let minU: number
  let maxU: number
  if (extents) {
    minU = extents.minU
    maxU = extents.maxU
  } else if (measured !== undefined && measured > 0) {
    const span = Math.max(
      measured * part.style.widthFactor,
      height * 0.25 * part.style.widthFactor
    )
    ;({ minU, maxU } = horizontalFromAttachment(part.attachment, u, span))
  } else {
    const span = Math.max(estimated, height * 0.25 * part.style.widthFactor)
    ;({ minU, maxU } = horizontalFromAttachment(part.attachment, u, span))
  }
  return {
    index,
    part,
    minU,
    maxU,
    baseline: vertical.baseline,
    bottom: vertical.bottom,
    top: vertical.top
  }
}

function verticalFromAttachment(
  attachment: AcGiMTextAttachmentPoint,
  v: number,
  height: number
): { baseline: number; bottom: number; top: number } {
  const h = height > 0 ? height : 0
  switch (attachment) {
    case AcGiMTextAttachmentPoint.TopLeft:
    case AcGiMTextAttachmentPoint.TopCenter:
    case AcGiMTextAttachmentPoint.TopRight: {
      const baseline = v - h
      return { baseline, bottom: baseline, top: v }
    }
    case AcGiMTextAttachmentPoint.MiddleLeft:
    case AcGiMTextAttachmentPoint.MiddleCenter:
    case AcGiMTextAttachmentPoint.MiddleRight: {
      const baseline = v - h / 2
      return { baseline, bottom: baseline, top: baseline + h }
    }
    case AcGiMTextAttachmentPoint.BottomLeft:
    case AcGiMTextAttachmentPoint.BottomCenter:
    case AcGiMTextAttachmentPoint.BottomRight:
    case AcGiMTextAttachmentPoint.BaselineLeft:
    case AcGiMTextAttachmentPoint.BaselineCenter:
    case AcGiMTextAttachmentPoint.BaselineRight:
    default:
      return { baseline: v, bottom: v, top: v + h }
  }
}

function horizontalFromAttachment(
  attachment: AcGiMTextAttachmentPoint,
  u: number,
  span: number
): { minU: number; maxU: number } {
  switch (attachment) {
    case AcGiMTextAttachmentPoint.TopCenter:
    case AcGiMTextAttachmentPoint.MiddleCenter:
    case AcGiMTextAttachmentPoint.BottomCenter:
    case AcGiMTextAttachmentPoint.BaselineCenter:
      return { minU: u - span / 2, maxU: u + span / 2 }
    case AcGiMTextAttachmentPoint.TopRight:
    case AcGiMTextAttachmentPoint.MiddleRight:
    case AcGiMTextAttachmentPoint.BottomRight:
    case AcGiMTextAttachmentPoint.BaselineRight:
      return { minU: u - span, maxU: u }
    default:
      return { minU: u, maxU: u + span }
  }
}

function extentsAlongU(
  part: AcApTextMergePart,
  angle: number
): { minU: number; maxU: number } | undefined {
  try {
    const box = part.entity.geometricExtents
    if (!box || box.isEmpty()) return undefined
    const corners = [
      box.min,
      box.max,
      { x: box.min.x, y: box.max.y, z: box.min.z },
      { x: box.max.x, y: box.min.y, z: box.min.z }
    ]
    let minU = Infinity
    let maxU = -Infinity
    for (const p of corners) {
      const local = toLocal(p.x, p.y, angle)
      minU = Math.min(minU, local.u)
      maxU = Math.max(maxU, local.u)
    }
    if (!Number.isFinite(minU) || !Number.isFinite(maxU) || maxU <= minU) {
      return undefined
    }
    return { minU, maxU }
  } catch {
    return undefined
  }
}

function estimateWidth(
  plain: string,
  height: number,
  widthFactor: number
): number {
  if (!(height > 0)) return 0
  let width = 0
  for (const char of plain) {
    width += /[\u3000-\u9fff\uff00-\uffef]/.test(char) ? height : height * 0.5
  }
  return Math.max(width, height * 0.25) * (widthFactor > 0 ? widthFactor : 1)
}

/**
 * Returns how many spaces go between two parts of a paragraph.
 * Ports pdfTextMerge.spaceCounter: with a measurer, fill the free advance;
 * otherwise a gap wider than half the text height is one space.
 */
function spaceCounter(
  boxes: PartBox[],
  height: number,
  measure: AcApTextMergeMeasure | undefined
): (previous: PartBox, next: PartBox) => number {
  const fallback = (previous: PartBox, next: PartBox) =>
    next.minU - previous.maxU > SPACE_GAP * height ? 1 : 0
  if (!measure) return fallback

  const advance = (box: PartBox, text: string) => {
    const value = measurePlain(measure, text, height, box.part.style)
    return value !== undefined && Number.isFinite(value) && value > 0
      ? value
      : undefined
  }

  const fits = boxes.flatMap(box => {
    const text = box.part.plain
    const natural = text ? advance(box, text) : undefined
    return natural ? [(box.maxU - box.minU) / natural] : []
  })
  const widthFactor = median(fits)
  const spaceSample = boxes[0]
    ? advance(boxes[0], ' ')
    : measure(' ', height, '', '')
  if (!(widthFactor > 0) || !spaceSample) return fallback

  return (previous, next) => {
    const natural = advance(previous, previous.part.plain)
    if (natural === undefined) return fallback(previous, next)
    const free = next.minU - previous.minU - natural * widthFactor
    return Math.max(0, Math.round(free / (spaceSample * widthFactor)))
  }
}

function measurePlain(
  measure: AcApTextMergeMeasure | undefined,
  text: string,
  height: number,
  style: AcApTextMergeStyle
): number | undefined {
  if (!measure || !text) return undefined
  return measure(text, height, style.fontPrimary, style.fontBig)
}

function fontFaceOf(style: AcApTextMergeStyle): string {
  const primary = style.fontPrimary.trim()
  if (!primary) return ''
  const big = style.fontBig.trim()
  return big ? `${primary},${big}` : primary
}

function colorCodeOf(entity: AcDbEntity): string | undefined {
  try {
    const color = entity.color
    if (!color || color.isByLayer || color.isByBlock) return undefined
    if (color.isByACI && color.colorIndex != null) {
      return `C${color.colorIndex}`
    }
    if (color.isByColor && color.RGB != null) {
      return `c${color.RGB}`
    }
  } catch {
    // Detached entities may not resolve color without a working database.
  }
  return undefined
}

function resolveTextStyleRecord(entity: AcDbText | AcDbMText) {
  try {
    return entity.database.tables.textStyleTable.resolveAt(entity.styleName)
  } catch {
    return undefined
  }
}

function nearlyEqual(a: number, b: number, eps = 1e-6): boolean {
  return (
    Math.abs(a - b) <=
    Math.max(eps, 1e-6 * Math.max(Math.abs(a), Math.abs(b)))
  )
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(6)))
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function toLocal(x: number, y: number, angle: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { u: x * c + y * s, v: -x * s + y * c }
}

function toWorld(u: number, v: number, angle: number, z: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new AcGePoint3d(u * c - v * s, u * s + v * c, z)
}
