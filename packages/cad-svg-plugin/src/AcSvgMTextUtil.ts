import {
  AcCmColor,
  AcGeBox2d,
  AcGiMTextAttachmentPoint,
  AcGiMTextData,
  AcGiMTextFlowDirection,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import {
  ChangedProperties,
  MTextColor,
  MTextContext,
  MTextParagraphAlignment,
  MTextParser,
  MTextToken,
  Properties,
  TokenType
} from '@mlightcad/mtext-parser'

import {
  normalizeCadFontName,
  resolveSvgFontFamily,
  resolveSvgFontSizeScale
} from './AcSvgFontMap'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

const DEFAULT_LINE_SPACE_FACTOR = 0.25
const LINE_SPACING_SCALE_FACTOR = 1.666666
const STACK_VERTICAL_SHIFT_FACTOR = 0.3
const LATIN_CHAR_WIDTH_FACTOR = 0.6
const WIDE_CHAR_WIDTH_FACTOR = 1
const DEFAULT_TAB_WIDTH_FACTOR = 4
const STACK_SCRIPT_SCALE = 0.7

function isWideCharacter(char: string): boolean {
  if (!char || char.length !== 1) {
    return false
  }
  const code = char.codePointAt(0) ?? 0
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0x20000 && code <= 0x2ffff)
  )
}

interface LayoutSpan {
  text: string
  x: number
  y: number
  fontSize: number
  tokenCtx: MTextContext
}

interface DecorationLine {
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  lineIndex: number
}

interface LayoutLine {
  spans: LayoutSpan[]
  minX: number
  maxX: number
  minY: number
  maxY: number
  baselineY: number
  columnLeft: number
  paragraphAlign: MTextParagraphAlignment
}

interface LayoutBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  firstBaselineY: number
}

enum FlowMode {
  HorizontalLtr,
  HorizontalRtl,
  VerticalTtb,
  VerticalBtt
}

export interface AcSvgMTextBuildResult {
  localSvg: string
  box: AcGeBox2d
}

function resolveLineAdvance(baseHeight: number, mtext: AcGiMTextData): number {
  const factor =
    typeof mtext.lineSpaceFactor === 'number'
      ? mtext.lineSpaceFactor
      : DEFAULT_LINE_SPACE_FACTOR
  return baseHeight * (1 + factor * LINE_SPACING_SCALE_FACTOR)
}

function resolveWrapWidth(mtext: AcGiMTextData): number | null {
  if (!Number.isFinite(mtext.width) || mtext.width <= 0) {
    return null
  }
  return mtext.width
}

function resolveFlowMode(drawingDirection?: AcGiMTextFlowDirection): FlowMode {
  switch (drawingDirection) {
    case AcGiMTextFlowDirection.RIGHT_TO_LEFT:
      return FlowMode.HorizontalRtl
    case AcGiMTextFlowDirection.TOP_TO_BOTTOM:
      return FlowMode.VerticalTtb
    case AcGiMTextFlowDirection.BOTTOM_TO_TOP:
      return FlowMode.VerticalBtt
    case AcGiMTextFlowDirection.LEFT_TO_RIGHT:
    case AcGiMTextFlowDirection.BY_STYLE:
    default:
      return FlowMode.HorizontalLtr
  }
}

function resolveRotation(mtext: AcGiMTextData): number {
  const dir = mtext.directionVector
  if (dir && (dir.x !== 0 || dir.y !== 0)) {
    return Math.atan2(dir.y, dir.x)
  }
  return mtext.rotation ?? 0
}

function resolveParagraphAlignment(
  mtext: AcGiMTextData
): MTextParagraphAlignment {
  const width = mtext.width
  if (!Number.isFinite(width) || width <= 0 || mtext.attachmentPoint == null) {
    return MTextParagraphAlignment.LEFT
  }

  switch (mtext.attachmentPoint) {
    case AcGiMTextAttachmentPoint.TopCenter:
    case AcGiMTextAttachmentPoint.MiddleCenter:
    case AcGiMTextAttachmentPoint.BottomCenter:
    case AcGiMTextAttachmentPoint.BaselineCenter:
      return MTextParagraphAlignment.CENTER
    case AcGiMTextAttachmentPoint.TopRight:
    case AcGiMTextAttachmentPoint.MiddleRight:
    case AcGiMTextAttachmentPoint.BottomRight:
    case AcGiMTextAttachmentPoint.BaselineRight:
      return MTextParagraphAlignment.RIGHT
    default:
      return MTextParagraphAlignment.LEFT
  }
}

interface AnchorMetrics {
  minX: number
  maxX: number
  minY: number
  maxY: number
  baselineY: number
}

function layoutBoundsToAnchorMetrics(bounds: LayoutBounds): AnchorMetrics {
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: -bounds.maxY,
    maxY: -bounds.minY,
    baselineY: -bounds.firstBaselineY
  }
}

function computeAttachmentOffset(
  attachmentPoint: AcGiMTextAttachmentPoint | undefined,
  bounds: LayoutBounds
): { x: number; y: number } {
  const m = layoutBoundsToAnchorMetrics(bounds)
  const centerX = (m.minX + m.maxX) / 2
  const centerY = (m.minY + m.maxY) / 2

  switch (attachmentPoint) {
    case AcGiMTextAttachmentPoint.TopCenter:
      return { x: -centerX, y: -m.maxY }
    case AcGiMTextAttachmentPoint.TopRight:
      return { x: -m.maxX, y: -m.maxY }
    case AcGiMTextAttachmentPoint.MiddleLeft:
      return { x: -m.minX, y: -centerY }
    case AcGiMTextAttachmentPoint.MiddleCenter:
      return { x: -centerX, y: -centerY }
    case AcGiMTextAttachmentPoint.MiddleRight:
      return { x: -m.maxX, y: -centerY }
    case AcGiMTextAttachmentPoint.BottomLeft:
      return { x: -m.minX, y: -m.minY }
    case AcGiMTextAttachmentPoint.BottomCenter:
      return { x: -centerX, y: -m.minY }
    case AcGiMTextAttachmentPoint.BottomRight:
      return { x: -m.maxX, y: -m.minY }
    case AcGiMTextAttachmentPoint.BaselineCenter:
      return { x: -centerX, y: -m.baselineY }
    case AcGiMTextAttachmentPoint.BaselineRight:
      return { x: -m.maxX, y: -m.baselineY }
    case AcGiMTextAttachmentPoint.BaselineLeft:
      return { x: -m.minX, y: -m.baselineY }
    case AcGiMTextAttachmentPoint.TopLeft:
    default:
      return { x: -m.minX, y: -m.maxY }
  }
}

/**
 * Builds SVG {@code <text>/<tspan>} output from raw MTEXT using {@link MTextParser}.
 */
export function buildSvgMText(
  mtext: AcGiMTextData,
  style: AcGiTextStyle,
  traits: AcGiSubEntityTraits,
  ctx: AcSvgStyleContext
): AcSvgMTextBuildResult {
  const box = new AcGeBox2d()
  const { text, height, position } = mtext

  if (!text || height <= 0) {
    return { localSvg: '', box }
  }

  const baseHeight = height
  const lineAdvance = resolveLineAdvance(baseHeight, mtext)
  const wrapWidth = resolveWrapWidth(mtext)
  const flowMode = resolveFlowMode(mtext.drawingDirection)
  const defaultFont = resolveSvgFontFamily(
    style.extendedFont || style.font,
    'sans-serif'
  )
  const entityWidthFactor =
    typeof mtext.widthFactor === 'number' && mtext.widthFactor > 0
      ? mtext.widthFactor
      : typeof style.widthFactor === 'number' && style.widthFactor > 0
        ? style.widthFactor
        : 1

  const initialCtx = new MTextContext()
  initialCtx.capHeight = { value: baseHeight, isRelative: false }
  initialCtx.widthFactor = { value: entityWidthFactor, isRelative: false }
  initialCtx.paragraph.align = resolveParagraphAlignment(mtext)
  if (typeof style.obliqueAngle === 'number') {
    initialCtx.oblique = style.obliqueAngle
  }
  initialCtx.fontFace.family = normalizeCadFontName(
    style.extendedFont || style.font || defaultFont
  )

  const parser = new MTextParser(text, initialCtx, {
    resetParagraphParameters: true,
    yieldPropertyCommands: true
  })
  const layout = new MTextSvgLayout(
    baseHeight,
    lineAdvance,
    wrapWidth,
    flowMode,
    defaultFont,
    style,
    traits,
    ctx
  )

  for (const token of parser.parse()) {
    layout.consume(token)
  }
  layout.finish()

  const bounds = layout.bounds
  const attachment = computeAttachmentOffset(mtext.attachmentPoint, bounds)
  const { x, y } = position
  const rotDeg = (resolveRotation(mtext) * 180) / Math.PI

  const transformParts = [`translate(${x},${y})`]
  if (rotDeg !== 0) {
    transformParts.push(`rotate(${-rotDeg})`)
  }
  transformParts.push(`translate(${attachment.x},${attachment.y})`)
  transformParts.push('scale(1,-1)')

  const textAttrs = {
    'font-size': String(baseHeight),
    'font-family': defaultFont,
    ...AcSvgStyleUtil.textAttributes(traits, ctx)
  }

  const innerMarkup = [
    AcSvgStyleUtil.tag('text', textAttrs, layout.tspanMarkup),
    layout.decorationMarkup
  ].join('')

  const localSvg = AcSvgStyleUtil.tag(
    'g',
    { transform: transformParts.join(' ') },
    innerMarkup
  )
  expandBox(box, bounds, attachment, x, y)

  return { localSvg, box }
}

function expandBox(
  box: AcGeBox2d,
  bounds: LayoutBounds,
  attachment: { x: number; y: number },
  originX: number,
  originY: number
) {
  if (bounds.maxX <= bounds.minX && bounds.maxY <= bounds.minY) {
    return
  }
  const corners = [
    { x: bounds.minX + attachment.x, y: attachment.y - bounds.minY },
    { x: bounds.maxX + attachment.x, y: attachment.y - bounds.minY },
    { x: bounds.minX + attachment.x, y: attachment.y - bounds.maxY },
    { x: bounds.maxX + attachment.x, y: attachment.y - bounds.maxY }
  ]
  for (const corner of corners) {
    box.expandByPoint({ x: originX + corner.x, y: originY + corner.y })
  }
}

class MTextSvgLayout {
  private x = 0
  private y = 0
  private lineStartX = 0
  private columnStartY = 0
  private columnAdvance = 0
  private isLineStart = true
  private firstLineOfParagraph = true
  private currentLine: LayoutLine | null = null
  private readonly lines: LayoutLine[] = []
  private readonly decorationLines: DecorationLine[] = []
  private activeLineIndex = 0
  private minX = 0
  private maxX = 0
  private minY = 0
  private maxY = 0
  private firstBaselineY = 0
  private hasContent = false

  constructor(
    private readonly baseHeight: number,
    private readonly lineAdvance: number,
    private readonly wrapWidth: number | null,
    private readonly flowMode: FlowMode,
    private readonly defaultFont: string,
    private readonly style: AcGiTextStyle,
    private readonly traits: AcGiSubEntityTraits,
    private readonly ctx: AcSvgStyleContext
  ) {
    this.resetParagraphPosition(new MTextContext())
  }

  get tspanMarkup(): string {
    let markup = ''
    let isFirstLine = true

    for (const line of this.lines) {
      let lineStartX: number | undefined
      let expectedX: number | undefined

      for (const span of line.spans) {
        const attrs = this.tspanAttributes(span.tokenCtx, span.fontSize)
        const isLineStart = lineStartX === undefined

        if (this.isVertical()) {
          attrs.x = String(span.x)
          attrs.y = String(span.y)
        } else if (isLineStart) {
          lineStartX = span.x
          attrs.x = String(span.x)
          attrs.dy = isFirstLine ? '0' : String(this.lineAdvance)
          isFirstLine = false
          expectedX =
            span.x + this.measureText(span.text, span.fontSize, span.tokenCtx)
        } else if (expectedX != null && Math.abs(span.x - expectedX) > 1e-6) {
          attrs.x = String(span.x)
          expectedX =
            span.x + this.measureText(span.text, span.fontSize, span.tokenCtx)
        } else {
          expectedX =
            (expectedX ?? span.x) +
            this.measureText(span.text, span.fontSize, span.tokenCtx)
        }

        markup += AcSvgStyleUtil.tag('tspan', attrs, escapeXml(span.text))
      }
    }

    return markup
  }

  get decorationMarkup(): string {
    return this.decorationLines
      .map(line =>
        AcSvgStyleUtil.tag('line', {
          x1: String(line.x1),
          y1: String(line.y1),
          x2: String(line.x2),
          y2: String(line.y2),
          stroke: line.stroke,
          'stroke-width': String(Math.max(this.baseHeight * 0.05, 0.05)),
          'stroke-linecap': 'butt'
        })
      )
      .join('')
  }

  get bounds(): LayoutBounds {
    return {
      minX: this.minX,
      maxX: this.maxX,
      minY: this.minY,
      maxY: this.maxY,
      firstBaselineY: this.firstBaselineY
    }
  }

  consume(token: MTextToken) {
    switch (token.type) {
      case TokenType.WORD:
        this.emitText(String(token.data ?? ''), token.ctx)
        break
      case TokenType.SPACE:
        this.emitSpace(token.ctx)
        break
      case TokenType.NBSP:
        this.emitText('\u00A0', token.ctx)
        break
      case TokenType.TABULATOR:
        this.advanceToTab(token.ctx)
        break
      case TokenType.NEW_PARAGRAPH:
        this.newParagraph(token.ctx)
        break
      case TokenType.NEW_COLUMN:
        this.newColumn(token.ctx)
        break
      case TokenType.WRAP_AT_DIMLINE:
        this.wrapLine(token.ctx)
        break
      case TokenType.PROPERTIES_CHANGED:
        this.applyPropertyChange(token.data as ChangedProperties, token.ctx)
        break
      case TokenType.STACK:
        if (Array.isArray(token.data) && token.data.length === 3) {
          this.emitStack(token.data as [string, string, string], token.ctx)
        }
        break
      default:
        break
    }
  }

  finish() {
    this.finalizeCurrentLine()
    this.applyLineAlignment()
    this.recomputeBoundsFromLines()
  }

  private applyPropertyChange(item: ChangedProperties, tokenCtx: MTextContext) {
    if (item.changes.paragraph?.align != null && this.currentLine) {
      this.currentLine.paragraphAlign = item.changes.paragraph.align
    }

    if (item.command === 'f' || item.command === 'F') {
      this.applyFontFaceChange(item.changes.fontFace, tokenCtx)
    } else if (item.command === 'p') {
      if (item.changes.paragraph?.indent != null && this.firstLineOfParagraph) {
        const indent = item.changes.paragraph.indent * this.baseHeight
        if (this.isHorizontalRtl()) {
          this.x -= indent
        } else if (!this.isVertical()) {
          this.x += indent
        }
      }
    }
  }

  private applyFontFaceChange(
    fontFace: Properties['fontFace'],
    tokenCtx: MTextContext
  ) {
    if (!fontFace?.family) {
      return
    }
    const family = normalizeCadFontName(fontFace.family)
    tokenCtx.fontFace = { ...fontFace, family }
    if (fontFace.style === 'Italic') {
      tokenCtx.oblique = (this.style.obliqueAngle ?? 0) || 15
    }
  }

  private applyLineAlignment() {
    if (this.wrapWidth == null) {
      return
    }
    for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
      const line = this.lines[lineIndex]
      const lineWidth = line.maxX - line.minX
      if (lineWidth <= 0) {
        continue
      }
      const tokenCtx = line.spans[0]?.tokenCtx ?? new MTextContext()
      const contentWidth =
        this.wrapWidth -
        this.paragraphLeft(tokenCtx) -
        this.rightMargin(tokenCtx)
      let shift = 0
      switch (line.paragraphAlign) {
        case MTextParagraphAlignment.CENTER:
          shift =
            line.columnLeft + contentWidth / 2 - (line.minX + line.maxX) / 2
          break
        case MTextParagraphAlignment.RIGHT:
          shift = line.columnLeft + contentWidth - line.maxX
          break
        case MTextParagraphAlignment.JUSTIFIED:
        case MTextParagraphAlignment.DISTRIBUTED:
        case MTextParagraphAlignment.LEFT:
        case MTextParagraphAlignment.DEFAULT:
        default:
          shift = 0
          break
      }
      if (shift === 0) {
        continue
      }
      for (const span of line.spans) {
        span.x += shift
      }
      line.minX += shift
      line.maxX += shift
      for (const decoration of this.decorationLines) {
        if (decoration.lineIndex === lineIndex) {
          decoration.x1 += shift
          decoration.x2 += shift
        }
      }
    }
  }

  private recomputeBoundsFromLines() {
    this.minX = 0
    this.maxX = 0
    this.minY = 0
    this.maxY = 0
    this.hasContent = false
    for (const line of this.lines) {
      for (const span of line.spans) {
        this.includeSpanBounds(span)
      }
    }
  }

  private emitSpace(tokenCtx: MTextContext) {
    const width = this.spaceWidth(tokenCtx)
    if (this.isLineStart) {
      return
    }
    if (this.isHorizontal()) {
      this.ensureFits(width, tokenCtx)
      if (this.isLineStart) {
        return
      }
    }
    this.advancePosition(width, this.resolveCapHeight(tokenCtx))
  }

  private emitText(value: string, tokenCtx: MTextContext) {
    if (!value) {
      return
    }
    if (this.isVertical()) {
      for (const char of value) {
        this.emitTextRun(char, tokenCtx)
      }
      return
    }
    if (this.wrapWidth == null) {
      this.emitTextRun(value, tokenCtx)
      return
    }

    const fontSize = this.resolveCapHeight(tokenCtx)
    const wordWidth = this.measureText(value, fontSize, tokenCtx)
    if (
      !this.isLineStart &&
      wordWidth > 0 &&
      this.penOffset(tokenCtx) + wordWidth > this.maxLineWidth(tokenCtx)
    ) {
      this.wrapLine(tokenCtx)
    }

    for (const char of value) {
      this.emitTextRun(char, tokenCtx)
    }
  }

  private emitTextRun(value: string, tokenCtx: MTextContext) {
    if (!value) {
      return
    }
    const fontSize = this.resolveCapHeight(tokenCtx)
    const width = this.measureText(value, fontSize, tokenCtx)
    const advance = this.isVertical() ? fontSize : width
    this.ensureFits(advance, tokenCtx)

    const pos = this.currentPosition()
    const span: LayoutSpan = {
      text: value,
      x: pos.x,
      y: pos.y,
      fontSize,
      tokenCtx: tokenCtx.copy()
    }
    this.currentLine?.spans.push(span)
    this.includeSpanBounds(span)
    this.advancePosition(width, fontSize)
    this.firstLineOfParagraph = false
  }

  private emitStack(data: [string, string, string], tokenCtx: MTextContext) {
    const [numerator, denominator, divider] = data
    const start = this.currentPosition()
    const wasLineStart = this.isLineStart
    const baseFontSize = this.resolveCapHeight(tokenCtx)

    if (divider === '^') {
      const scriptCtx = tokenCtx.copy()
      scriptCtx.capHeight = {
        value: STACK_SCRIPT_SCALE,
        isRelative: true
      }
      if (numerator && !denominator) {
        this.setPosition(start.x, start.y - baseFontSize * 0.35)
        this.isLineStart = true
        this.emitText(numerator, scriptCtx)
        const width = this.measureHorizontalSpan(start, this.currentPosition())
        this.setPosition(start.x + width, start.y)
      } else if (!numerator && denominator) {
        this.setPosition(start.x, start.y + baseFontSize * 0.2)
        this.isLineStart = true
        this.emitText(denominator, scriptCtx)
        const width = this.measureHorizontalSpan(start, this.currentPosition())
        this.setPosition(start.x + width, start.y)
      } else if (numerator && denominator) {
        this.setPosition(start.x, start.y - baseFontSize * 0.2)
        this.isLineStart = true
        this.emitText(numerator, scriptCtx)
        const width = this.measureHorizontalSpan(start, this.currentPosition())
        this.setPosition(start.x + width, start.y)
      }

      this.isLineStart = wasLineStart
      return
    }

    if (divider === '/') {
      this.emitText(`${numerator}/${denominator}`, tokenCtx)
      return
    }

    const numWidth = this.measureText(numerator, baseFontSize, tokenCtx)
    const denWidth = this.measureText(denominator, baseFontSize, tokenCtx)
    const fractionWidth = Math.max(numWidth, denWidth)
    const numOffset = (fractionWidth - numWidth) / 2
    const denOffset = (fractionWidth - denWidth) / 2
    const stroke = resolveMTextFill(tokenCtx.color, this.traits, this.ctx)

    this.setPosition(start.x + numOffset, start.y - baseFontSize * 0.35)
    this.isLineStart = true
    this.emitText(numerator, tokenCtx)

    this.setPosition(start.x + denOffset, start.y + baseFontSize * 0.2)
    this.isLineStart = true
    this.emitText(denominator, tokenCtx)

    if (divider === '/' || divider === '#') {
      const lineY =
        start.y -
        baseFontSize * 0.05 +
        this.baseHeight * STACK_VERTICAL_SHIFT_FACTOR
      this.decorationLines.push({
        x1: start.x,
        y1: lineY,
        x2: start.x + fractionWidth,
        y2: lineY,
        stroke,
        lineIndex: this.activeLineIndex
      })
    }

    const nextX = this.isHorizontalRtl()
      ? start.x - fractionWidth
      : start.x + fractionWidth
    this.setPosition(nextX, start.y)
    this.isLineStart = wasLineStart
  }

  private newParagraph(tokenCtx: MTextContext) {
    this.finalizeCurrentLine()
    if (this.isVertical()) {
      this.newColumn(tokenCtx)
      return
    }
    this.y += this.lineAdvance
    this.columnStartY = this.y
    this.resetParagraphPosition(tokenCtx)
  }

  private wrapLine(tokenCtx: MTextContext) {
    this.finalizeCurrentLine()
    if (this.isVertical()) {
      this.newColumn(tokenCtx)
      return
    }
    this.y += this.lineAdvance
    this.columnStartY = this.y
    this.resetLinePosition(tokenCtx)
  }

  private newColumn(tokenCtx: MTextContext) {
    this.finalizeCurrentLine()
    if (this.isVertical()) {
      this.x += this.columnAdvance > 0 ? this.columnAdvance : this.baseHeight
      this.columnAdvance = 0
      if (this.isVerticalTtb()) {
        this.columnStartY = 0
      }
      this.resetParagraphPosition(tokenCtx)
      return
    }
    this.x += this.wrapWidth ?? this.baseHeight * 4
    this.resetParagraphPosition(tokenCtx)
  }

  private finalizeCurrentLine() {
    if (this.currentLine && this.currentLine.spans.length > 0) {
      this.lines.push(this.currentLine)
      this.activeLineIndex = this.lines.length
    }
    this.currentLine = null
  }

  private resetParagraphPosition(tokenCtx: MTextContext) {
    this.firstLineOfParagraph = true
    this.resetLinePosition(tokenCtx)
  }

  private resetLinePosition(tokenCtx: MTextContext) {
    const left = this.paragraphLeft(tokenCtx)
    const indent = this.firstLineOfParagraph
      ? this.firstLineIndent(tokenCtx)
      : 0
    const limits = this.lineLimits(tokenCtx)

    if (this.isHorizontalRtl()) {
      this.x = limits.right - indent
      this.y = this.columnStartY
    } else if (this.isVerticalTtb()) {
      this.x = left
      this.y = this.columnStartY + indent
    } else if (this.isVerticalBtt()) {
      this.x = left
      this.y =
        (this.wrapWidth != null ? this.wrapWidth : this.baseHeight * 10) -
        indent
      this.columnStartY = this.y
    } else {
      this.x = left + indent
      this.y = this.columnStartY
    }

    this.lineStartX = left
    this.isLineStart = true
    this.currentLine = {
      spans: [],
      minX: this.x,
      maxX: this.x,
      minY: this.y,
      maxY: this.y,
      baselineY: this.y,
      columnLeft: left,
      paragraphAlign: tokenCtx.paragraph.align
    }
  }

  private wouldOverflow(width: number, tokenCtx: MTextContext): boolean {
    if (this.wrapWidth == null || width <= 0 || this.isLineStart) {
      return false
    }

    if (this.isHorizontal()) {
      return this.penOffset(tokenCtx) + width > this.maxLineWidth(tokenCtx)
    }

    const limits = this.verticalLimits(tokenCtx)
    return this.isVerticalTtb()
      ? this.y + width > limits.bottom
      : this.y - width < limits.top
  }

  private penOffset(tokenCtx: MTextContext): number {
    if (this.isHorizontalRtl()) {
      return this.lineLimits(tokenCtx).right - this.x
    }
    return this.x - this.paragraphLeft(tokenCtx)
  }

  private maxLineWidth(tokenCtx: MTextContext): number {
    if (this.wrapWidth == null) {
      return Number.POSITIVE_INFINITY
    }
    return (
      this.wrapWidth - this.paragraphLeft(tokenCtx) - this.rightMargin(tokenCtx)
    )
  }

  private ensureFits(width: number, tokenCtx: MTextContext) {
    if (
      this.wrapWidth != null &&
      this.isHorizontal() &&
      !this.isLineStart &&
      this.penOffset(tokenCtx) > this.maxLineWidth(tokenCtx)
    ) {
      this.wrapLine(tokenCtx)
    }
    if (!this.wouldOverflow(width, tokenCtx)) {
      return
    }
    this.wrapLine(tokenCtx)
  }

  private advancePosition(width: number, fontSize: number) {
    if (this.isHorizontalRtl()) {
      this.x -= width
    } else if (this.isVerticalTtb()) {
      this.y += fontSize
    } else if (this.isVerticalBtt()) {
      this.y -= fontSize
    } else {
      this.x += width
    }
    this.isLineStart = false
    this.columnAdvance = Math.max(this.columnAdvance, width)
  }

  private advanceToTab(tokenCtx: MTextContext) {
    const tabWidth = this.baseHeight * DEFAULT_TAB_WIDTH_FACTOR
    const tabs = tokenCtx.paragraph.tabs
    if (tabs.length === 0) {
      const target = this.isHorizontalRtl()
        ? Math.floor(this.x / tabWidth) * tabWidth
        : Math.ceil((this.x + 1) / tabWidth) * tabWidth
      const delta = this.isHorizontalRtl() ? this.x - target : target - this.x
      this.advancePosition(Math.max(0, delta), this.resolveCapHeight(tokenCtx))
      return
    }
    for (const stop of tabs) {
      const pos =
        this.lineStartX +
        (typeof stop === 'number'
          ? stop * this.baseHeight
          : parseFloat(String(stop)) * this.baseHeight)
      if (this.isHorizontalRtl()) {
        if (!Number.isNaN(pos) && pos < this.x) {
          this.advancePosition(this.x - pos, this.resolveCapHeight(tokenCtx))
          return
        }
      } else if (!Number.isNaN(pos) && pos > this.x) {
        this.advancePosition(pos - this.x, this.resolveCapHeight(tokenCtx))
        return
      }
    }
    this.advancePosition(tabWidth, this.resolveCapHeight(tokenCtx))
  }

  private lineLimits(tokenCtx: MTextContext): { left: number; right: number } {
    const left = this.paragraphLeft(tokenCtx)
    const rightMargin = tokenCtx.paragraph.right * this.baseHeight
    const right =
      this.wrapWidth != null
        ? left + this.wrapWidth - rightMargin
        : Number.POSITIVE_INFINITY
    return { left, right }
  }

  private verticalLimits(tokenCtx: MTextContext): {
    top: number
    bottom: number
  } {
    if (this.isVerticalBtt()) {
      const bottom =
        this.columnStartY - tokenCtx.paragraph.right * this.baseHeight
      const top =
        this.wrapWidth != null
          ? this.columnStartY - this.wrapWidth + this.firstLineIndent(tokenCtx)
          : Number.NEGATIVE_INFINITY
      return { top, bottom }
    }
    const top = this.columnStartY + this.firstLineIndent(tokenCtx)
    const bottom =
      this.wrapWidth != null
        ? this.columnStartY +
          this.wrapWidth -
          tokenCtx.paragraph.right * this.baseHeight
        : Number.POSITIVE_INFINITY
    return { top, bottom }
  }

  private currentPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  private setPosition(x: number, y: number) {
    this.x = x
    this.y = y
  }

  private includeSpanBounds(span: LayoutSpan) {
    const width = this.measureText(span.text, span.fontSize, span.tokenCtx)
    const spanMinX = this.isHorizontalRtl() ? span.x - width : span.x
    const spanMaxX = this.isHorizontalRtl() ? span.x : span.x + width
    const spanMinY = span.y - span.fontSize
    const spanMaxY = span.y

    if (!this.hasContent) {
      this.minX = spanMinX
      this.maxX = spanMaxX
      this.minY = spanMinY
      this.maxY = spanMaxY
      this.firstBaselineY = span.y
      this.hasContent = true
    } else {
      this.minX = Math.min(this.minX, spanMinX)
      this.maxX = Math.max(this.maxX, spanMaxX)
      this.minY = Math.min(this.minY, spanMinY)
      this.maxY = Math.max(this.maxY, spanMaxY)
    }

    if (this.currentLine) {
      this.currentLine.minX = Math.min(this.currentLine.minX, spanMinX)
      this.currentLine.maxX = Math.max(this.currentLine.maxX, spanMaxX)
      this.currentLine.minY = Math.min(this.currentLine.minY, spanMinY)
      this.currentLine.maxY = Math.max(this.currentLine.maxY, spanMaxY)
    }
  }

  private measureHorizontalSpan(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): number {
    return Math.abs(end.x - start.x)
  }

  private spaceWidth(tokenCtx: MTextContext): number {
    const fontSize = this.resolveCapHeight(tokenCtx)
    return this.measureText(' ', fontSize, tokenCtx)
  }

  private measureCharWidth(
    char: string,
    fontSize: number,
    tokenCtx: MTextContext
  ): number {
    const widthFactor = this.resolveWidthFactor(tokenCtx)
    const tracking = this.resolveTracking(tokenCtx)
    const baseFactor = isWideCharacter(char)
      ? WIDE_CHAR_WIDTH_FACTOR
      : LATIN_CHAR_WIDTH_FACTOR
    return fontSize * baseFactor * widthFactor * tracking
  }

  private measureText(
    value: string,
    fontSize: number,
    tokenCtx: MTextContext
  ): number {
    let width = 0
    for (const char of value) {
      width += this.measureCharWidth(char, fontSize, tokenCtx)
    }
    return width
  }

  private paragraphLeft(tokenCtx: MTextContext): number {
    return tokenCtx.paragraph.left * this.baseHeight
  }

  private firstLineIndent(tokenCtx: MTextContext): number {
    return tokenCtx.paragraph.indent * this.baseHeight
  }

  private rightMargin(tokenCtx?: MTextContext): number {
    return (tokenCtx?.paragraph.right ?? 0) * this.baseHeight
  }

  private resolveCapHeight(tokenCtx: MTextContext): number {
    const cap = tokenCtx.capHeight
    const size = cap.isRelative ? this.baseHeight * cap.value : cap.value
    const cadFont = tokenCtx.fontFace.family || this.defaultFont
    return size * resolveSvgFontSizeScale(cadFont)
  }

  private resolveWidthFactor(tokenCtx: MTextContext): number {
    const wf = tokenCtx.widthFactor
    if (wf.isRelative) {
      const ref = this.wrapWidth ?? this.baseHeight * 4
      return wf.value * ref
    }
    return wf.value * 0.85
  }

  private resolveTracking(tokenCtx: MTextContext): number {
    const tf = tokenCtx.charTrackingFactor
    if (tf.isRelative) {
      return tf.value + 1
    }
    return tf.value
  }

  private isHorizontal(): boolean {
    return (
      this.flowMode === FlowMode.HorizontalLtr ||
      this.flowMode === FlowMode.HorizontalRtl
    )
  }

  private isHorizontalRtl(): boolean {
    return this.flowMode === FlowMode.HorizontalRtl
  }

  private isVertical(): boolean {
    return (
      this.flowMode === FlowMode.VerticalTtb ||
      this.flowMode === FlowMode.VerticalBtt
    )
  }

  private isVerticalTtb(): boolean {
    return this.flowMode === FlowMode.VerticalTtb
  }

  private isVerticalBtt(): boolean {
    return this.flowMode === FlowMode.VerticalBtt
  }

  private tspanAttributes(
    tokenCtx: MTextContext,
    fontSize: number
  ): Record<string, string> {
    const attrs: Record<string, string> = {}

    if (Math.abs(fontSize - this.baseHeight) > 1e-9) {
      attrs['font-size'] = String(fontSize)
    }

    const cadFont = tokenCtx.fontFace.family
    attrs['font-family'] = resolveSvgFontFamily(cadFont, this.defaultFont)

    if (tokenCtx.bold) {
      attrs['font-weight'] = '700'
    }
    if (tokenCtx.italic) {
      attrs['font-style'] = 'italic'
    }

    const widthFactor = this.resolveWidthFactor(tokenCtx)
    const tracking = this.resolveTracking(tokenCtx)
    if (tracking !== 1) {
      attrs['letter-spacing'] =
        `${((tracking - 1) * fontSize * 0.25).toFixed(3)}`
    }

    const oblique = tokenCtx.oblique
    if (oblique !== 0) {
      const transforms: string[] = [`skewX(${-oblique})`]
      if (widthFactor !== 1) {
        transforms.unshift(`scale(${widthFactor},1)`)
      }
      attrs.transform = transforms.join(' ')
    } else if (widthFactor !== 1) {
      attrs.transform = `scale(${widthFactor},1)`
    }

    attrs.fill = resolveMTextFill(tokenCtx.color, this.traits, this.ctx)

    const decorations: string[] = []
    if (tokenCtx.underline) {
      decorations.push('underline')
    }
    if (tokenCtx.overline) {
      decorations.push('overline')
    }
    if (tokenCtx.strikeThrough) {
      decorations.push('line-through')
    }
    if (decorations.length > 0) {
      attrs['text-decoration'] = decorations.join(' ')
    }

    return attrs
  }
}

function resolveMTextFill(
  color: MTextColor,
  traits: AcGiSubEntityTraits,
  ctx: AcSvgStyleContext
): string {
  if (color.isRgb && color.rgbValue != null) {
    return AcSvgStyleUtil.rgbToHex(color.rgbValue)
  }

  if (color.aci === 256 || color.aci == null) {
    return AcSvgStyleUtil.rgbToHex(
      AcSvgStyleUtil.resolveRgb(traits, ctx, 'text')
    )
  }

  if (color.aci === 0) {
    return AcSvgStyleUtil.rgbToHex(
      AcSvgStyleUtil.resolveRgb(traits, ctx, 'text')
    )
  }

  const aciColor = new AcCmColor()
  aciColor.colorIndex = color.aci
  const rgb = aciColor.RGB
  if (typeof rgb === 'number') {
    return AcSvgStyleUtil.rgbToHex(rgb)
  }
  return AcSvgStyleUtil.rgbToHex(AcSvgStyleUtil.resolveRgb(traits, ctx, 'text'))
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export {
  normalizeCadFontName,
  resolveSvgFontFamily,
  resolveSvgFontSizeScale,
  setSvgFontMapping,
  setSvgFontSizeScales
} from './AcSvgFontMap'
