import { AcDbPredefinedAcadIsoPat } from '@mlightcad/data-model'
import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

import { AcApPdfHatchSession } from '../src/AcApPdfHatchSession'
import {
  acapPdfRecoverHatches,
  type PdfHatchInput
} from '../src/pdfHatchRecover'
import type { PdfImportShapeItem } from '../src/pdfImportShapes'

type Point = { x: number; y: number }

const DEG = Math.PI / 180

function patternLines(name: string, scale: number) {
  const pattern = AcDbPredefinedAcadIsoPat.patterns.find(p => p.name === name)!
  return pattern.lines.map(line => {
    const angle = line.angle * DEG
    const dx = line.deltaX * scale
    const dy = line.deltaY * scale
    return {
      angle,
      base: { x: line.originX * scale, y: line.originY * scale },
      offset: {
        x: Math.cos(angle) * dx - Math.sin(angle) * dy,
        y: Math.sin(angle) * dx + Math.cos(angle) * dy
      },
      dashLengths: line.dashes.map(d => d * scale)
    }
  })
}

function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 }
  ]
}

/** Rooms with walls (one entity each) and loose pattern strokes. */
function drawing(
  rooms: { outline: Point[]; pattern: string; scale: number; id: string }[]
): PdfHatchInput<string> {
  const items: PdfImportShapeItem[] = []
  const owners: string[] = []
  for (const room of rooms) {
    room.outline.forEach((p, i) => {
      items.push({
        shape: {
          kind: 'line',
          start: p,
          end: room.outline[(i + 1) % room.outline.length]
        },
        layerName: 'WALL'
      })
      owners.push(`${room.id}-wall${i}`)
    })
    const strokes = tessellateHatchPattern(
      [room.outline],
      patternLines(room.pattern, room.scale),
      0
    )
    strokes.forEach(([a, b], i) => {
      items.push({ shape: { kind: 'line', start: a, end: b }, layerName: 'H' })
      owners.push(`${room.id}-s${i}`)
    })
  }
  return { items, owners }
}

function session(input: PdfHatchInput<string>, recognize = true) {
  const recovery = acapPdfRecoverHatches(input)
  return new AcApPdfHatchSession({
    input,
    tolerance: recovery.tolerance,
    hatches: recognize ? recovery.hatches.map(found => found.hatch) : []
  })
}

describe('AcApPdfHatchSession', () => {
  const input = drawing([
    { outline: rect(0, 0, 80, 50), pattern: 'ANSI37', scale: 2, id: 'a' }
  ])
  const strokes = input.owners.filter(id => id.startsWith('a-s'))

  test('starts with the recognized hatches, scored and included', () => {
    const s = session(input)

    expect(s.rows).toHaveLength(1)
    const row = s.rows[0]
    expect(s.patternKey(row)).toBe('predefined:ANSI37')
    expect(s.params(row)?.size).toBeCloseTo(2, 3)
    expect(s.isGood(row)).toBe(true)
    expect(row.included).toBe(true)
    expect(new Set(s.erasedIds)).toEqual(new Set(strokes))
  })

  test('a worse pattern replaces only the strokes it re-draws', () => {
    const s = session(input)
    const row = s.rows[0]

    expect(s.setPattern(row, 'predefined:ANSI31')).toBe(true)

    expect(s.patternKey(row)).toBe('predefined:ANSI31')
    expect(s.isGood(row)).toBe(false)
    expect(row.consumed.length).toBeGreaterThan(0)
    expect(row.consumed.length).toBeLessThan(strokes.length)
    expect(row.consumed.every(id => id.startsWith('a-s'))).toBe(true)
  })

  test('manual size and angle, then auto fit restores the match', () => {
    const s = session(input)
    const row = s.rows[0]

    expect(s.setParams(row, { size: 1, angle: 0 })).toBe(true)
    expect(s.params(row)).toEqual({ size: 1, angle: 0 })
    expect(s.isGood(row)).toBe(false)

    expect(s.autoFit(row)).toBe(true)
    expect(s.params(row)?.size).toBeCloseTo(2, 3)
    expect(s.isGood(row)).toBe(true)
  })

  test('rejects a size that is not positive', () => {
    const s = session(input)

    expect(s.setParams(s.rows[0], { size: 0, angle: 0 })).toBe(false)
  })

  test('excluded rows are neither created nor erased', () => {
    const s = session(input)

    s.setIncluded(s.rows[0], false)

    expect(s.readyRows).toHaveLength(0)
    expect(s.erasedIds).toHaveLength(0)
  })

  test('adds a hatch for a picked area the recognition missed', () => {
    const s = session(input, false)

    const row = s.addRegion({ x: 40.3, y: 25.1 })

    expect(typeof row).toBe('object')
    if (typeof row !== 'object') return
    expect(row.added).toBe(true)
    expect(s.patternKey(row)).toBe('predefined:ANSI37')
    expect(new Set(row.consumed)).toEqual(new Set(strokes))
    expect(s.rows).toContain(row)
  })

  test('reports a pick outside every closed area', () => {
    const s = session(input, false)

    expect(s.addRegion({ x: 500, y: 500 })).toBe('noBoundary')
    expect(s.rows).toHaveLength(0)
  })

  test('lists user-defined and library patterns', () => {
    const s = session(input)
    const keys = s.patternKeys(s.rows[0])

    expect(keys).toContain('user')
    expect(keys).toContain('user2')
    expect(keys).toContain('predefined:ANSI31')
    expect(keys).not.toContain('custom')
  })
})
