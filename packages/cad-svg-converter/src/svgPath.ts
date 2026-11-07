import type { AcDbSvgPoint } from './svgTypes'

const PATH_COMMANDS = /([MmLlHhVvCcQqAaZzSsTt])/g

/**
 * Tessellates an SVG path `d` attribute into polylines (open/closed).
 *
 * Curves (C/Q/A/S/T) are approximated with chords. Relative commands and
 * multiple subpaths are supported.
 */
export function acdbSvgTessellatePath(
  d: string,
  segmentsPerCurve = 16
): { points: AcDbSvgPoint[]; closed: boolean }[] {
  const tokens = tokenizePath(d)
  const subpaths: { points: AcDbSvgPoint[]; closed: boolean }[] = []
  let points: AcDbSvgPoint[] = []
  let closed = false
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let lastCtrlX = 0
  let lastCtrlY = 0
  let lastCmd = ''

  const flush = () => {
    if (points.length >= 2) {
      subpaths.push({ points, closed })
    }
    points = []
    closed = false
  }

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (isCommand(token)) {
      const cmd = token
      i++
      const relative = cmd === cmd.toLowerCase()
      const type = cmd.toUpperCase()

      const readNums = (count: number): number[] => {
        const nums: number[] = []
        while (nums.length < count && i < tokens.length && !isCommand(tokens[i])) {
          const n = Number.parseFloat(tokens[i++])
          if (Number.isFinite(n)) nums.push(n)
        }
        return nums
      }

      if (type === 'Z') {
        if (points.length > 0) {
          points.push({ x: startX, y: startY })
          closed = true
        }
        cx = startX
        cy = startY
        lastCmd = type
        flush()
        continue
      }

      // Implicit repetition of the same command with leftover numbers.
      while (true) {
        if (type === 'M') {
          const nums = readNums(2)
          if (nums.length < 2) break
          const x = relative ? cx + nums[0] : nums[0]
          const y = relative ? cy + nums[1] : nums[1]
          flush()
          points = [{ x, y }]
          cx = x
          cy = y
          startX = x
          startY = y
          lastCtrlX = x
          lastCtrlY = y
          // Subsequent coordinate pairs after M are treated as L.
          while (i < tokens.length && !isCommand(tokens[i])) {
            const more = readNums(2)
            if (more.length < 2) break
            const lx = relative ? cx + more[0] : more[0]
            const ly = relative ? cy + more[1] : more[1]
            points.push({ x: lx, y: ly })
            cx = lx
            cy = ly
            lastCtrlX = lx
            lastCtrlY = ly
          }
          lastCmd = 'L'
          break
        }

        if (type === 'L') {
          const nums = readNums(2)
          if (nums.length < 2) break
          const x = relative ? cx + nums[0] : nums[0]
          const y = relative ? cy + nums[1] : nums[1]
          points.push({ x, y })
          cx = x
          cy = y
          lastCtrlX = x
          lastCtrlY = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'H') {
          const nums = readNums(1)
          if (nums.length < 1) break
          const x = relative ? cx + nums[0] : nums[0]
          points.push({ x, y: cy })
          cx = x
          lastCtrlX = x
          lastCtrlY = cy
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'V') {
          const nums = readNums(1)
          if (nums.length < 1) break
          const y = relative ? cy + nums[0] : nums[0]
          points.push({ x: cx, y })
          cy = y
          lastCtrlX = cx
          lastCtrlY = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'C') {
          const nums = readNums(6)
          if (nums.length < 6) break
          const x1 = relative ? cx + nums[0] : nums[0]
          const y1 = relative ? cy + nums[1] : nums[1]
          const x2 = relative ? cx + nums[2] : nums[2]
          const y2 = relative ? cy + nums[3] : nums[3]
          const x = relative ? cx + nums[4] : nums[4]
          const y = relative ? cy + nums[5] : nums[5]
          appendCubic(points, cx, cy, x1, y1, x2, y2, x, y, segmentsPerCurve)
          lastCtrlX = x2
          lastCtrlY = y2
          cx = x
          cy = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'S') {
          const nums = readNums(4)
          if (nums.length < 4) break
          const x1 =
            lastCmd === 'C' || lastCmd === 'S' ? 2 * cx - lastCtrlX : cx
          const y1 =
            lastCmd === 'C' || lastCmd === 'S' ? 2 * cy - lastCtrlY : cy
          const x2 = relative ? cx + nums[0] : nums[0]
          const y2 = relative ? cy + nums[1] : nums[1]
          const x = relative ? cx + nums[2] : nums[2]
          const y = relative ? cy + nums[3] : nums[3]
          appendCubic(points, cx, cy, x1, y1, x2, y2, x, y, segmentsPerCurve)
          lastCtrlX = x2
          lastCtrlY = y2
          cx = x
          cy = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'Q') {
          const nums = readNums(4)
          if (nums.length < 4) break
          const x1 = relative ? cx + nums[0] : nums[0]
          const y1 = relative ? cy + nums[1] : nums[1]
          const x = relative ? cx + nums[2] : nums[2]
          const y = relative ? cy + nums[3] : nums[3]
          appendQuadratic(points, cx, cy, x1, y1, x, y, segmentsPerCurve)
          lastCtrlX = x1
          lastCtrlY = y1
          cx = x
          cy = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'T') {
          const nums = readNums(2)
          if (nums.length < 2) break
          const x1 =
            lastCmd === 'Q' || lastCmd === 'T' ? 2 * cx - lastCtrlX : cx
          const y1 =
            lastCmd === 'Q' || lastCmd === 'T' ? 2 * cy - lastCtrlY : cy
          const x = relative ? cx + nums[0] : nums[0]
          const y = relative ? cy + nums[1] : nums[1]
          appendQuadratic(points, cx, cy, x1, y1, x, y, segmentsPerCurve)
          lastCtrlX = x1
          lastCtrlY = y1
          cx = x
          cy = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        if (type === 'A') {
          const nums = readNums(7)
          if (nums.length < 7) break
          const rx = Math.abs(nums[0])
          const ry = Math.abs(nums[1])
          const phi = nums[2]
          const largeArc = nums[3] !== 0
          const sweep = nums[4] !== 0
          const x = relative ? cx + nums[5] : nums[5]
          const y = relative ? cy + nums[6] : nums[6]
          appendArc(
            points,
            cx,
            cy,
            rx,
            ry,
            phi,
            largeArc,
            sweep,
            x,
            y,
            segmentsPerCurve
          )
          cx = x
          cy = y
          lastCtrlX = x
          lastCtrlY = y
          lastCmd = type
          if (i >= tokens.length || isCommand(tokens[i])) break
          continue
        }

        break
      }
    } else {
      i++
    }
  }
  flush()
  return subpaths
}

/**
 * Tokenizes SVG path `d` data into commands and numbers.
 *
 * Inserts separators before command letters and before signed numbers that
 * abut a previous number (`L10-5`, `M-10-10`), matching SVG path grammar.
 */
function tokenizePath(d: string): string[] {
  const normalized = d
    // Separate path command letters.
    .replace(PATH_COMMANDS, ' $1 ')
    // Separate a signed number abutting a previous number (`10-5`, `M-10-10`).
    // Exponents (`1e-2`) keep their sign because it follows `e`/`E`, not a digit.
    .replace(/([0-9.])([+-])/g, '$1 $2')
    // Separate concatenated decimals: `1.2.3` → `1.2 .3`
    .replace(/(\.[0-9]+)(\.)/g, '$1 $2')
    .trim()
  return normalized.split(/[\s,]+/).filter(Boolean)
}

function isCommand(token: string): boolean {
  return /^[MmLlHhVvCcQqAaZzSsTt]$/.test(token)
}

function appendCubic(
  points: AcDbSvgPoint[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  segments: number
) {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const u = 1 - t
    const x =
      u * u * u * x0 +
      3 * u * u * t * x1 +
      3 * u * t * t * x2 +
      t * t * t * x3
    const y =
      u * u * u * y0 +
      3 * u * u * t * y1 +
      3 * u * t * t * y2 +
      t * t * t * y3
    points.push({ x, y })
  }
}

function appendQuadratic(
  points: AcDbSvgPoint[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments: number
) {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * x1 + t * t * x2
    const y = u * u * y0 + 2 * u * t * y1 + t * t * y2
    points.push({ x, y })
  }
}

/**
 * Endpoint-parameterized SVG arc → chord polyline (W3C SVG impl notes).
 */
function appendArc(
  points: AcDbSvgPoint[],
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
  segments: number
) {
  if (rxIn === 0 || ryIn === 0) {
    points.push({ x: x2, y: y2 })
    return
  }
  const phi = (phiDeg * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy

  let rx = rxIn
  let ry = ryIn
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }

  const rxSq = rx * rx
  const rySq = ry * ry
  const x1pSq = x1p * x1p
  const y1pSq = y1p * y1p
  let radicand =
    (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq)
  radicand = Math.max(0, radicand)
  const sign = largeArc === sweep ? -1 : 1
  const cxp = (sign * Math.sqrt(radicand) * (rx * y1p)) / ry
  const cyp = (sign * Math.sqrt(radicand) * (-ry * x1p)) / rx

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let delta = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  )
  if (!sweep && delta > 0) delta -= Math.PI * 2
  if (sweep && delta < 0) delta += Math.PI * 2

  const n = Math.max(segments, Math.ceil((Math.abs(delta) / Math.PI) * segments))
  for (let i = 1; i <= n; i++) {
    const t = theta1 + (delta * i) / n
    const cosT = Math.cos(t)
    const sinT = Math.sin(t)
    const x = cosPhi * rx * cosT - sinPhi * ry * sinT + cx
    const y = sinPhi * rx * cosT + cosPhi * ry * sinT + cy
    points.push({ x, y })
  }
}

function angle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy)
  let ang = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 0 : dot / len)))
  if (ux * vy - uy * vx < 0) ang = -ang
  return ang
}
