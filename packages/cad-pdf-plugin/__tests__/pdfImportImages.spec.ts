import {
  acapPdfFlattenInkOnPaper,
  acapPdfImagePlacement,
  acapPdfImageToRgba
} from '../src/pdfImportImages'

/** Applies a canvas `setTransform` matrix to an image pixel position. */
function apply(
  m: [number, number, number, number, number, number],
  x: number,
  y: number
) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }
}

describe('acapPdfImagePlacement', () => {
  test('places an axis-aligned image at native resolution', () => {
    // 200×100 px image drawn 20×10 mm at (5, 7).
    const p = acapPdfImagePlacement(
      { a: 20, b: 0, c: 0, d: 10, e: 5, f: 7 },
      200,
      100
    )!
    expect(p.box).toEqual({ x: 5, y: 7, width: 20, height: 10 })
    expect(p.canvasWidth).toBe(200)
    expect(p.canvasHeight).toBe(100)
    // Top-left pixel lands on the canvas top-left, bottom-right on the
    // bottom-right corner.
    expect(apply(p.transform, 0, 0)).toEqual({ x: 0, y: 0 })
    const br = apply(p.transform, 200, 100)
    expect(br.x).toBeCloseTo(200)
    expect(br.y).toBeCloseTo(100)
  })

  test('bakes a 90° rotation into an axis-aligned box', () => {
    // Image x axis points up the page: first row ends up on the left.
    const p = acapPdfImagePlacement(
      { a: 0, b: 30, c: -10, d: 0, e: 100, f: 50 },
      300,
      100
    )!
    expect(p.box.x).toBeCloseTo(90)
    expect(p.box.y).toBeCloseTo(50)
    expect(p.box.width).toBeCloseTo(10)
    expect(p.box.height).toBeCloseTo(30)
    expect(p.canvasWidth).toBe(100)
    expect(p.canvasHeight).toBe(300)
    // Pixel (0, 0) is image top-left = unit (0, 1) = CAD (90, 50): canvas
    // bottom-left.
    const tl = apply(p.transform, 0, 0)
    expect(tl.x).toBeCloseTo(0)
    expect(tl.y).toBeCloseTo(300)
  })

  test('caps the canvas size', () => {
    const p = acapPdfImagePlacement(
      { a: 10, b: 0, c: 0, d: 10, e: 0, f: 0 },
      20000,
      20000,
      4096
    )!
    expect(p.canvasWidth).toBe(4096)
    expect(p.canvasHeight).toBe(4096)
  })

  test('rejects degenerate placements', () => {
    expect(
      acapPdfImagePlacement({ a: 0, b: 0, c: 0, d: 10, e: 0, f: 0 }, 10, 10)
    ).toBeUndefined()
  })
})

describe('acapPdfImageToRgba', () => {
  test('expands RGB pixels', () => {
    const rgba = acapPdfImageToRgba({
      width: 2,
      height: 1,
      kind: 2,
      data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6])
    })
    expect(Array.from(rgba!)).toEqual([1, 2, 3, 255, 4, 5, 6, 255])
  })

  test('passes RGBA through', () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4])
    expect(
      Array.from(acapPdfImageToRgba({ width: 1, height: 1, kind: 3, data })!)
    ).toEqual([1, 2, 3, 4])
  })

  test('unpacks 1-bit rows padded to whole bytes', () => {
    // 3 px wide, 2 rows: row 0 = 1,0,1 ; row 1 = 0,1,0
    const rgba = acapPdfImageToRgba({
      width: 3,
      height: 2,
      kind: 1,
      data: new Uint8ClampedArray([0b10100000, 0b01000000])
    })!
    const gray = []
    for (let i = 0; i < rgba.length; i += 4) gray.push(rgba[i])
    expect(gray).toEqual([255, 0, 255, 0, 255, 0])
  })

  test('returns undefined for unknown or short data', () => {
    expect(
      acapPdfImageToRgba({
        width: 2,
        height: 2,
        kind: 2,
        data: new Uint8ClampedArray(3)
      })
    ).toBeUndefined()
    expect(acapPdfImageToRgba({ width: 1, height: 1 })).toBeUndefined()
  })
})

describe('acapPdfFlattenInkOnPaper', () => {
  test('puts dark ink on transparency onto white paper', () => {
    // black, transparent, near-black, transparent
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255, 0, 0, 0, 0, 20, 20, 20, 255, 9, 9, 9, 0
    ])
    expect(acapPdfFlattenInkOnPaper(rgba)).toBe(true)
    expect(Array.from(rgba)).toEqual([
      0, 0, 0, 255, 255, 255, 255, 255, 20, 20, 20, 255, 255, 255, 255, 255
    ])
  })

  test('blends partial alpha over white', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 128])
    expect(acapPdfFlattenInkOnPaper(rgba)).toBe(true)
    expect(Array.from(rgba.slice(4))).toEqual([127, 127, 127, 255])
  })

  test('leaves coloured or opaque images alone', () => {
    const coloured = new Uint8ClampedArray([0, 160, 140, 255, 0, 0, 0, 0])
    expect(acapPdfFlattenInkOnPaper(coloured)).toBe(false)
    expect(Array.from(coloured)).toEqual([0, 160, 140, 255, 0, 0, 0, 0])
    const opaque = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    expect(acapPdfFlattenInkOnPaper(opaque)).toBe(false)
  })
})
