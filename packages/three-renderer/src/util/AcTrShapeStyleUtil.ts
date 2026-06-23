import {
  AcDbDatabase,
  AcGiShapeData,
  AcGiTextStyle
} from '@mlightcad/data-model'
import {
  FontManager,
  ShxFontData,
  ShxParserFont
} from '@mlightcad/mtext-renderer'

import type { AcTrRenderContext } from '../renderer/AcTrRenderContext'

const SHX_SUFFIX = /\.(shx|ttf|otf|woff2?)$/i

const EMPTY_TEXT_STYLE: AcGiTextStyle = {
  name: '',
  standardFlag: 0,
  fixedTextHeight: 0,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 0,
  font: '',
  bigFont: '',
  extendedFont: ''
}

function normalizeCadFontName(fontName: string): string {
  const trimmed = fontName.trim()
  const base = trimmed.replace(SHX_SUFFIX, '')
  return base.toLowerCase()
}

/**
 * Resolves which SHX glyph key a SHAPE entity should use.
 *
 * Named shapes are looked up by name only; numeric codes are used only when
 * the entity has no shape name.
 */
export function resolveShapeGlyphKey(shape: AcGiShapeData): {
  byName?: string
  byCode?: number
} {
  const name = shape.name?.trim()
  if (name) {
    return { byName: name }
  }
  const code = shape.shapeNumber
  if (code != null && code !== 0) {
    return { byCode: code }
  }
  return {}
}

function hasDrawableShapeInFont(
  shape: AcGiShapeData,
  fontName: string
): boolean {
  const normalized = normalizeCadFontName(fontName)
  const size = shape.size
  const { byName, byCode } = resolveShapeGlyphKey(shape)
  const fontManager = FontManager.instance

  const fromManager = byName
    ? fontManager.getShapeByName(byName, normalized, size)
    : byCode != null
      ? fontManager.getShapeByCode(byCode, normalized, size)
      : undefined
  if (fromManager) {
    return true
  }

  const font = fontManager.getFontByName(normalized, false)
  if (font?.type !== 'shx') {
    return false
  }

  const parser = new ShxParserFont(font.data as ShxFontData)
  try {
    const glyph = byName
      ? parser.getShapeByName(byName, size)
      : byCode != null
        ? parser.getCharShape(byCode, size)
        : undefined
    const polylines = glyph?.polylines
    return !!polylines?.some(line => line.length >= 2)
  } finally {
    parser.release()
  }
}

/**
 * Resolves the text style used to render a SHAPE entity.
 *
 * When {@link style} is omitted, searches every shape definition file in the
 * drawing's text style table for a glyph matching {@link shape}.
 */
export function resolveShapeTextStyle(
  shape: AcGiShapeData,
  style: AcGiTextStyle | null | undefined,
  context: AcTrRenderContext
): AcGiTextStyle {
  if (style != null) {
    const fontName = style.font?.trim()
    if (fontName && hasDrawableShapeInFont(shape, fontName)) {
      return { ...style }
    }
  }

  const database = context.database as AcDbDatabase | undefined
  if (!database) {
    return { ...EMPTY_TEXT_STYLE }
  }

  for (const record of database.tables.textStyleTable.shapeFiles) {
    const fontName = record.fileName || record.textStyle.font
    if (!fontName) {
      continue
    }
    if (hasDrawableShapeInFont(shape, fontName)) {
      return { ...record.textStyle }
    }
  }

  return { ...EMPTY_TEXT_STYLE }
}
