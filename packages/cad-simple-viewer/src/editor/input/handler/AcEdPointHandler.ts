import { AcGePoint3dLike } from '@mlightcad/data-model'

import { AcEdPromptPointOptions } from '../prompt/AcEdPromptPointOptions'
import { AcEdInputHandler, AcEdPointInputContext } from './AcEdInputHandler'

const NUMERIC_TOKEN = /^-?(?:\d+\.?\d*|\.\d+)$/

/**
 * Splits a Cartesian point token into x/y components.
 *
 * Accepts comma-separated (`50,30`) or whitespace-separated (`50 30`) forms.
 * An optional third `z` component is tolerated but ignored by 2D prompts.
 */
function splitCartesianPointToken(
  token: string
): { x: string; y: string } | undefined {
  const trimmed = token.trim()
  if (!trimmed) return undefined

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(v => v.trim())
    if (parts.length !== 2 && parts.length !== 3) return undefined
    if (parts.length === 3 && Number.isNaN(Number(parts[2]))) return undefined
    return { x: parts[0], y: parts[1] }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length < 2) return undefined
  return { x: parts[0], y: parts[1] }
}

/**
 * Handles validation and parsing of point user input.
 */
export class AcEdPointHandler implements AcEdInputHandler<AcGePoint3dLike> {
  protected options: AcEdPromptPointOptions

  constructor(options: AcEdPromptPointOptions) {
    this.options = options
  }

  parse(x: string, y?: string) {
    const nx = Number(x)
    const ny = Number(y)

    if (isNaN(nx) || isNaN(ny)) {
      return null
    }

    return { x: nx, y: ny, z: 0 }
  }

  /**
   * Parses an AutoCAD-style point token from the command line.
   *
   * Supported forms:
   * - Absolute Cartesian: `X,Y` or `X Y`
   * - Relative Cartesian: `@X,Y` or `@X Y`
   * - Absolute polar: `distance<angle`
   * - Relative polar: `@distance<angle`
   * - Rubber-band distance: plain number when a reference point and cursor
   *   position are available
   */
  parseCommandLine(token: string, context?: AcEdPointInputContext) {
    const trimmed = token.trim()
    if (!trimmed) return null

    const isRelative = trimmed.startsWith('@')
    const body = isRelative ? trimmed.slice(1).trim() : trimmed
    if (!body) return null

    const reference = context?.referencePoint ?? undefined

    const ltIndex = body.indexOf('<')
    if (ltIndex >= 0) {
      const distStr = body.slice(0, ltIndex).trim()
      const angleStr = body.slice(ltIndex + 1).trim()
      const dist = Number(distStr)
      const angleDeg = Number(angleStr)
      if (Number.isNaN(dist) || Number.isNaN(angleDeg)) return null

      const angleRad = (angleDeg * Math.PI) / 180
      const offsetX = dist * Math.cos(angleRad)
      const offsetY = dist * Math.sin(angleRad)

      if (isRelative) {
        if (!reference) return null
        return this.parse(
          String(reference.x + offsetX),
          String(reference.y + offsetY)
        )
      }

      return this.parse(String(offsetX), String(offsetY))
    }

    const cartesian = splitCartesianPointToken(body)
    if (cartesian) {
      const offsetX = Number(cartesian.x)
      const offsetY = Number(cartesian.y)
      if (Number.isNaN(offsetX) || Number.isNaN(offsetY)) return null

      if (isRelative) {
        if (!reference) return null
        return this.parse(
          String(reference.x + offsetX),
          String(reference.y + offsetY)
        )
      }

      return this.parse(cartesian.x, cartesian.y)
    }

    if (NUMERIC_TOKEN.test(body)) {
      const distance = Number(body)
      const cursor = context?.cursorPoint
      if (!reference || !cursor || Number.isNaN(distance)) return null

      const dx = cursor.x - reference.x
      const dy = cursor.y - reference.y
      const len = Math.hypot(dx, dy)
      const angleRad = len > 1e-10 ? Math.atan2(dy, dx) : 0
      return this.parse(
        String(reference.x + distance * Math.cos(angleRad)),
        String(reference.y + distance * Math.sin(angleRad))
      )
    }

    return null
  }
}
