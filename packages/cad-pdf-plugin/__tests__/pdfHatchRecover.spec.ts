import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  acapPdfRecoverHatches,
  type PdfHatchInput
} from '../src/pdfHatchRecover'
import type { PdfImportShapeItem } from '../src/pdfImportShapes'

function fixtureInput(name: string): PdfHatchInput<number> {
  const items = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', `${name}.json`), 'utf8')
  ) as PdfImportShapeItem[]
  return { items, owners: items.map((_, i) => i) }
}

describe('acapPdfRecoverHatches', () => {
  // Entities imported at scale 1 lose the paper scale; the tolerance is
  // derived from the strokes instead.
  test.each([
    ['cathedral-ansi36', 'ANSI36'],
    ['cathedral-ansi32-wall', 'ANSI32'],
    ['cathedral-ansi32-arch', 'ANSI32']
  ])('finds %s without being told the tolerance', (name, pattern) => {
    const input = fixtureInput(name)

    const { hatches, tolerance } = acapPdfRecoverHatches(input)

    expect(tolerance).toBeGreaterThan(0)
    expect(hatches).toHaveLength(1)
    const { hatch, consumed } = hatches[0]
    expect(hatch.pattern.type === 'predefined' && hatch.pattern.name).toBe(
      pattern
    )
    expect(consumed.length).toBe(hatch.items.length)
  })

  test('erases a polyline only when every segment is a stroke', () => {
    const input = fixtureInput('cathedral-ansi36')
    const { hatches } = acapPdfRecoverHatches(input)
    const stroke = hatches[0].hatch.items[0]
    // Pretend the first stroke came from a polyline that also has a segment
    // outside the hatch.
    input.owners.push(input.owners[stroke])
    input.items.push({
      shape: {
        kind: 'line',
        start: { x: -1000, y: -1000 },
        end: { x: -999, y: -1000 }
      }
    })

    const again = acapPdfRecoverHatches(input)

    expect(again.hatches[0].consumed).not.toContain(input.owners[stroke])
  })
})
