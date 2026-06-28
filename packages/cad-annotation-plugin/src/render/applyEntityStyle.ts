import {
  AcCmColor,
  AcCmColorMethod,
  type AcDbEntity,
  type AcGiLineWeight
} from '@mlightcad/data-model'

import type { AnnotationStyle } from '../model/types'

function parseAciColor(color: string): AcCmColor {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return new AcCmColor(AcCmColorMethod.ByColor, (r << 16) | (g << 8) | b)
    }
  }
  const fromString = AcCmColor.fromString(color)
  if (fromString) return fromString
  return new AcCmColor(AcCmColorMethod.ByACI, 1)
}

export function applyEntityStyle(entity: AcDbEntity, style: AnnotationStyle) {
  entity.color = parseAciColor(style.lineColor)
  entity.lineWeight = style.lineWeight as AcGiLineWeight
}

export function styleToCssColor(color: string): string {
  if (color === 'transparent') return 'transparent'
  if (color.startsWith('#')) return color
  const parsed = AcCmColor.fromString(color)
  if (!parsed) return color
  const rgb = parsed.RGB ?? 0
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  return `rgb(${r}, ${g}, ${b})`
}