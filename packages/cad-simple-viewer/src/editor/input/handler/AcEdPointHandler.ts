import { AcGePoint3dLike } from '@mlightcad/data-model'

import { AcEdPromptPointOptions } from '../prompt/AcEdPromptPointOptions'
import { AcEdInputHandler, AcEdPointInputContext } from './AcEdInputHandler'

const NUMERIC_TOKEN = /^-?(?:\d+\.?\d*|\.\d+)$/

type AcEdPointReference = {
  x: number
  y: number
  z?: number
}

/**
 * Splits a Cartesian point token into x/y/(optional z) components.
 *
 * Accepts comma-separated (`50,30` / `50,30,10`) or whitespace-separated
 * (`50 30` / `50 30 10`) forms.
 */
function splitCartesianPointToken(
  token: string
): { x: string; y: string; z?: string } | undefined {
  const trimmed = token.trim()
  if (!trimmed) return undefined

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(v => v.trim())
    if (parts.length !== 2 && parts.length !== 3) return undefined
    if (parts.some(part => part === '' || Number.isNaN(Number(part)))) {
      return undefined
    }
    return parts.length === 3
      ? { x: parts[0], y: parts[1], z: parts[2] }
      : { x: parts[0], y: parts[1] }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length < 2 || parts.length > 3) return undefined
  if (parts.some(part => part === '' || Number.isNaN(Number(part)))) {
    return undefined
  }
  return parts.length === 3
    ? { x: parts[0], y: parts[1], z: parts[2] }
    : { x: parts[0], y: parts[1] }
}

/**
 * Strips AutoCAD coordinate prefixes from a command-line token.
 *
 * Supported prefixes (any order, typically `@`/`#` then `*`):
 * - `#` — force absolute (dynamic-input absolute override)
 * - `@` — relative to the last / reference point
 * - `*` — interpret in WCS (UCS and WCS are currently the same frame)
 */
function stripCoordinatePrefixes(token: string): {
  body: string
  isRelative: boolean
  useWcs: boolean
} {
  let body = token.trim()
  let forceAbsolute = false
  let isRelative = false
  let useWcs = false

  while (body.length > 0) {
    const first = body[0]
    if (first === '#') {
      forceAbsolute = true
      isRelative = false
      body = body.slice(1).trim()
      continue
    }
    if (first === '@') {
      if (!forceAbsolute) isRelative = true
      body = body.slice(1).trim()
      continue
    }
    if (first === '*') {
      useWcs = true
      body = body.slice(1).trim()
      continue
    }
    break
  }

  return { body, isRelative, useWcs }
}

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Parses a required numeric token. Empty strings must fail — `Number('')`
 * is `0`, which would silently accept incomplete forms like `10<` or `<90`.
 */
function parseNumberToken(token: string): number | null {
  const trimmed = token.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isNaN(value) ? null : value
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
   * - Absolute Cartesian: `X,Y` / `X,Y,Z` or `X Y` / `X Y Z`
   * - Relative Cartesian: `@X,Y` / `@X,Y,Z`
   * - Absolute polar: `distance<angle`
   * - Relative polar: `@distance<angle`
   * - Cylindrical: `distance<angle,Z` (and `@` / `#` variants)
   * - Spherical: `distance<angle<angle` (XY projection kept; Z stored)
   * - Absolute override: `#…` (dynamic-input absolute prefix)
   * - WCS force: `*…` / `@*…` / `#*…` (parsed; same as UCS while no UCS transform)
   * - Rubber-band distance: plain number when a reference point and cursor
   *   position are available
   */
  parseCommandLine(token: string, context?: AcEdPointInputContext) {
    const trimmed = token.trim()
    if (!trimmed) return null

    // useWcs is reserved for a future UCS→WCS transform; prefixes are still
    // stripped so `*3,4` / `@*2,0` parse while UCS equals WCS.
    const { body, isRelative, useWcs: _useWcs } = stripCoordinatePrefixes(
      trimmed
    )
    if (!body) return null

    const reference = context?.referencePoint ?? undefined

    const ltIndex = body.indexOf('<')
    if (ltIndex >= 0) {
      const dist = parseNumberToken(body.slice(0, ltIndex))
      const rest = body.slice(ltIndex + 1).trim()
      if (dist == null) return null

      const secondLt = rest.indexOf('<')
      if (secondLt >= 0) {
        // Spherical: distance < azimuth < elevation
        const azimDeg = parseNumberToken(rest.slice(0, secondLt))
        const elevDeg = parseNumberToken(rest.slice(secondLt + 1))
        if (azimDeg == null || elevDeg == null) return null

        const azimRad = degToRad(azimDeg)
        const elevRad = degToRad(elevDeg)
        const xyDist = dist * Math.cos(elevRad)
        return this.resolvePoint(
          isRelative,
          reference,
          xyDist * Math.cos(azimRad),
          xyDist * Math.sin(azimRad),
          dist * Math.sin(elevRad)
        )
      }

      // Polar or cylindrical: distance < angle[, Z]
      let angleStr = rest
      let z = 0
      const comma = rest.indexOf(',')
      if (comma >= 0) {
        angleStr = rest.slice(0, comma)
        const parsedZ = parseNumberToken(rest.slice(comma + 1))
        if (parsedZ == null) return null
        z = parsedZ
      }

      const angleDeg = parseNumberToken(angleStr)
      if (angleDeg == null) return null

      const angleRad = degToRad(angleDeg)
      return this.resolvePoint(
        isRelative,
        reference,
        dist * Math.cos(angleRad),
        dist * Math.sin(angleRad),
        z
      )
    }

    const cartesian = splitCartesianPointToken(body)
    if (cartesian) {
      const offsetX = Number(cartesian.x)
      const offsetY = Number(cartesian.y)
      const offsetZ = cartesian.z != null ? Number(cartesian.z) : 0
      if (
        Number.isNaN(offsetX) ||
        Number.isNaN(offsetY) ||
        Number.isNaN(offsetZ)
      ) {
        return null
      }

      return this.resolvePoint(
        isRelative,
        reference,
        offsetX,
        offsetY,
        offsetZ
      )
    }

    if (NUMERIC_TOKEN.test(body)) {
      // Direct-distance entry is a bare number only (`10`), never `#10` / `@10`.
      if (trimmed !== body) return null

      const distance = Number(body)
      const cursor = context?.cursorPoint
      if (!reference || !cursor || Number.isNaN(distance)) return null

      const dx = cursor.x - reference.x
      const dy = cursor.y - reference.y
      const len = Math.hypot(dx, dy)
      const angleRad = len > 1e-10 ? Math.atan2(dy, dx) : 0
      return this.resolvePoint(
        true,
        reference,
        distance * Math.cos(angleRad),
        distance * Math.sin(angleRad),
        0
      )
    }

    return null
  }

  private resolvePoint(
    isRelative: boolean,
    reference: AcEdPointReference | null | undefined,
    offsetX: number,
    offsetY: number,
    offsetZ: number
  ): AcGePoint3dLike | null {
    if (isRelative) {
      if (!reference) return null
      return {
        x: reference.x + offsetX,
        y: reference.y + offsetY,
        // AutoCAD relative `@x,y,z` / `@dist<ang,z` offsets Z from the last point.
        z: (reference.z ?? 0) + offsetZ
      }
    }
    return { x: offsetX, y: offsetY, z: offsetZ }
  }
}
