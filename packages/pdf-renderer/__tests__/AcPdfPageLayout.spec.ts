import { AcGeBox2d } from '@mlightcad/data-model'

import { PDF_MAX_PAGE_SIZE } from '../src/AcPdfUnits'
import {
  computePageLayout,
  mapDrawingToPage
} from '../src/pdf/AcPdfPageLayout'

function box(minX: number, minY: number, maxX: number, maxY: number) {
  const b = new AcGeBox2d()
  b.min.set(minX, minY)
  b.max.set(maxX, maxY)
  return b
}

function expectOnPage(
  layout: ReturnType<typeof computePageLayout>,
  x: number,
  y: number
) {
  const p = mapDrawingToPage(layout, x, y)
  expect(p.x).toBeGreaterThanOrEqual(0)
  expect(p.x).toBeLessThanOrEqual(layout.pageWidth)
  expect(p.y).toBeGreaterThanOrEqual(0)
  expect(p.y).toBeLessThanOrEqual(layout.pageHeight)
}

describe('computePageLayout', () => {
  it('keeps a small millimetre drawing near 1:1 mapping', () => {
    const layout = computePageLayout(box(0, 0, 100, 50), { insunits: 4 })
    expect(layout.pageWidth).toBeLessThan(400)
    expect(layout.pageHeight).toBeLessThan(250)
    expectOnPage(layout, 0, 0)
    expectOnPage(layout, 100, 50)
  })

  it('fits kilometre-scale extents onto the PDF page cap', () => {
    // Typical metric mine plan: metres stored as drawing units, INSUNITS=metres.
    const layout = computePageLayout(box(400000, 3000000, 410000, 3008000), {
      insunits: 6
    })
    expect(layout.pageWidth).toBeLessThanOrEqual(PDF_MAX_PAGE_SIZE)
    expect(layout.pageHeight).toBeLessThanOrEqual(PDF_MAX_PAGE_SIZE)
    expectOnPage(layout, 400000, 3000000)
    expectOnPage(layout, 410000, 3008000)
    expectOnPage(layout, 405000, 3004000)
  })

  it('fits a large millimetre drawing whose 2% padding would exceed the page', () => {
    const layout = computePageLayout(box(0, 0, 500000, 400000), {
      insunits: 4
    })
    expect(layout.pageWidth).toBeLessThanOrEqual(PDF_MAX_PAGE_SIZE)
    expect(layout.pageHeight).toBeLessThanOrEqual(PDF_MAX_PAGE_SIZE)
    expectOnPage(layout, 0, 0)
    expectOnPage(layout, 500000, 400000)
  })

  it('scales a large drawing down to a fixed paper size', () => {
    const layout = computePageLayout(box(0, 0, 10000, 8000), {
      insunits: 4,
      paper: { widthMm: 297, heightMm: 210 }
    })
    expect(layout.pageWidth).toBeCloseTo(297 * (72 / 25.4), 4)
    expect(layout.pageHeight).toBeCloseTo(210 * (72 / 25.4), 4)
    expectOnPage(layout, 0, 0)
    expectOnPage(layout, 10000, 8000)
  })
})
