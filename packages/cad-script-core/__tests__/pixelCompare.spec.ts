import { AcDbDatabase } from '@mlightcad/data-model'

import {
  acexCompareInk,
  acexCreateRaster,
  acexDistanceTransform,
  acexExtractInk,
  acexRunRedrawCompare,
  acexThinInk,
  type CadRasterImage,
  type CadRedrawRasterHost,
  type CadSession,
  createDatabaseSession,
  executeCadScript,
  type InkMask,
  type RedrawSpec
} from '../src'

/** Draws an axis-aligned rectangle outline (stroke px) into an RGBA image. */
function strokeRect(
  image: CadRasterImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stroke: number,
  value = 0
) {
  const set = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return
    const i = (y * image.width + x) * 4
    image.data[i] = value
    image.data[i + 1] = value
    image.data[i + 2] = value
    image.data[i + 3] = 255
  }
  for (let s = 0; s < stroke; s++) {
    for (let x = x0; x <= x1; x++) {
      set(x, y0 + s)
      set(x, y1 - s)
    }
    for (let y = y0; y <= y1; y++) {
      set(x0 + s, y)
      set(x1 - s, y)
    }
  }
}

function count(mask: InkMask) {
  return mask.data.reduce((sum, v) => sum + v, 0)
}

describe('ink extraction and thinning', () => {
  test('finds dark ink on paper and light ink on a dark screen', () => {
    const paper = acexCreateRaster(80, 60)
    strokeRect(paper, 10, 10, 69, 49, 3)
    const ink = acexExtractInk(paper)
    expect(count(ink)).toBeGreaterThan(300)
    expect(ink.data[30 * 80 + 40]).toBe(0) // inside stays background

    const screen = acexCreateRaster(80, 60, [20, 20, 20, 255])
    strokeRect(screen, 10, 10, 69, 49, 1, 230)
    expect(count(acexExtractInk(screen))).toBeGreaterThan(150)
  })

  test('thins a 3px stroke to a 1px centerline', () => {
    const image = acexCreateRaster(80, 60)
    strokeRect(image, 10, 10, 69, 49, 3)
    const thin = acexThinInk(acexExtractInk(image))
    const perimeter = 2 * (60 + 40)
    expect(count(thin)).toBeGreaterThan(perimeter * 0.8)
    expect(count(thin)).toBeLessThan(perimeter * 1.3)
  })

  test('distance transform is Euclidean', () => {
    const mask: InkMask = { width: 5, height: 5, data: new Uint8Array(25) }
    mask.data[0] = 1
    const dt = acexDistanceTransform(mask)
    expect(dt[0]).toBe(0)
    expect(dt[4 * 5 + 3]).toBeCloseTo(5)
  })
})

describe('acexCompareInk', () => {
  const thinRect = (x0: number, y0: number, x1: number, y1: number) => {
    const image = acexCreateRaster(120, 90)
    strokeRect(image, x0, y0, x1, y1, 2)
    return acexThinInk(acexExtractInk(image))
  }

  test('identical drawings are fully covered with no shift', () => {
    const a = thinRect(20, 15, 99, 74)
    const result = acexCompareInk(a, a, { tolerancePx: 2 })
    expect(result.metrics.coverage).toBe(1)
    expect(result.metrics.precision).toBe(1)
    expect(result.bestShiftPx).toEqual({ x: 0, y: 0 })
    expect(result.hotspots).toHaveLength(0)
  })

  test('detects a systematic offset', () => {
    const reference = thinRect(20, 15, 99, 74)
    const drawn = thinRect(28, 15, 107, 74)
    const result = acexCompareInk(reference, drawn, {
      tolerancePx: 2,
      shiftSearchPx: 12
    })
    expect(result.metrics.coverage).toBeLessThan(0.7)
    expect(Math.abs(result.bestShiftPx.x - 8)).toBeLessThanOrEqual(2)
    expect(result.shiftedCoverage).toBeGreaterThan(0.85)
  })

  test('flags missing geometry as low coverage with hotspots', () => {
    const referenceImage = acexCreateRaster(120, 90)
    strokeRect(referenceImage, 20, 15, 99, 74, 2)
    strokeRect(referenceImage, 45, 30, 75, 60, 2)
    const reference = acexThinInk(acexExtractInk(referenceImage))
    const drawn = thinRect(20, 15, 99, 74)
    const result = acexCompareInk(reference, drawn, { tolerancePx: 2 })
    expect(result.metrics.precision).toBeGreaterThan(0.9)
    expect(result.metrics.coverage).toBeLessThan(0.75)
    expect(result.hotspots.length).toBeGreaterThan(0)
    expect(result.hotspots[0].missing).toBeGreaterThan(0)
  })
})

describe('acexRunRedrawCompare', () => {
  // Reference: 200 x 150 px image of a 100 x 75 rectangle at 2 px / unit.
  const reference = acexCreateRaster(200, 150)
  strokeRect(reference, 0 + 20, 150 - 20 - 75, 20 + 100 * 1.6, 150 - 20, 2)

  /** Renders the CAD box with the given CAD rectangles at the requested size. */
  function hostFor(
    rects: Array<[number, number, number, number]>
  ): CadRedrawRasterHost & { encoded: number } {
    const host = {
      encoded: 0,
      getReferenceImage: async (index: number) =>
        index === 0 ? reference : undefined,
      renderDrawing: async (
        box: { min: { x: number; y: number }; max: { x: number; y: number } },
        width: number,
        height: number
      ) => {
        const image = acexCreateRaster(width, height)
        const sx = width / (box.max.x - box.min.x)
        const sy = height / (box.max.y - box.min.y)
        for (const [x0, y0, x1, y1] of rects) {
          strokeRect(
            image,
            Math.round((x0 - box.min.x) * sx),
            Math.round((box.max.y - y1) * sy),
            Math.round((x1 - box.min.x) * sx),
            Math.round((box.max.y - y0) * sy),
            1
          )
        }
        return image
      },
      encodePng: async () => {
        host.encoded++
        return 'data:image/png;base64,AAAA'
      }
    }
    return host
  }

  // Pixel (20, 130) ↔ CAD (0, 0); 1.6 px per unit horizontally and vertically.
  const spec: RedrawSpec = {
    entities: [{ type: 'rectangle', x: 0, y: 0, width: 100, height: 46.875 }],
    calibration: [
      {
        id: 'cal',
        method: 'similarity',
        evidence: 'known',
        sourcePoints: [
          [20, 130],
          [180, 130]
        ],
        cadPoints: [
          [0, 0],
          [100, 0]
        ]
      }
    ]
  }

  test('reports an aligned redraw with overlay and difference images', async () => {
    const host = hostFor([[0, 0, 100, 46.875]])
    const { result, images } = await acexRunRedrawCompare(
      { spec, options: {}, index: 0 },
      host
    )
    expect(result.ok).toBe(true)
    expect(result.verdict).toBe('aligned')
    expect(result.metrics!.coverage).toBeGreaterThan(0.9)
    expect(images.map(image => image.label)).toEqual(['overlay', 'difference'])
  })

  test('suggests a CAD move for an offset drawing', async () => {
    const host = hostFor([[10, 0, 110, 46.875]])
    const { result } = await acexRunRedrawCompare(
      { spec, options: { images: false }, index: 0 },
      host
    )
    expect(result.verdict).toBe('offset')
    expect(result.suggestedMove!.x).toBeLessThan(-6)
    expect(Math.abs(result.suggestedMove!.y)).toBeLessThan(3)
    expect(host.encoded).toBe(0)
  })

  test('calls a small missing feature incomplete even when coverage is high', async () => {
    // Reference has an extra short line the drawing lacks.
    const withSlot = acexCreateRaster(200, 150)
    strokeRect(withSlot, 20, 55, 180, 130, 2)
    for (let x = 40; x <= 80; x++) {
      for (let s = 0; s < 2; s++) {
        const i = ((70 + s) * 200 + x) * 4
        withSlot.data[i] = withSlot.data[i + 1] = withSlot.data[i + 2] = 0
      }
    }
    const host = { ...hostFor([[0, 0, 100, 46.875]]), getReferenceImage: async () => withSlot }
    const { result } = await acexRunRedrawCompare(
      { spec, options: { images: false }, index: 0 },
      host
    )
    expect(result.metrics!.coverage).toBeGreaterThan(0.8)
    expect(result.verdict).toBe('incomplete')
    expect(result.hotspots!.length).toBeGreaterThan(0)
  })

  test('explains why it cannot compare', async () => {
    const host = hostFor([])
    const noCal = await acexRunRedrawCompare(
      { spec: { entities: spec.entities }, options: {}, index: 0 },
      host
    )
    expect(noCal.result).toMatchObject({ ok: false, reason: 'no_calibration' })
    const noRef = await acexRunRedrawCompare(
      { spec, options: { referenceIndex: 3 }, index: 1 },
      host
    )
    expect(noRef.result).toMatchObject({
      ok: false,
      reason: 'no_reference_image'
    })
  })
})

describe('cad.redraw.compare in scripts', () => {
  test('queues a comparison and attaches results and images', async () => {
    const db = new AcDbDatabase()
    const base = createDatabaseSession(db)
    const reference = acexCreateRaster(100, 80)
    strokeRect(reference, 10, 10, 89, 69, 2)
    const session: CadSession = {
      ...base,
      getDocument: () => base.getDocument(),
      getView: () => base.getView(),
      redrawRaster: {
        getReferenceImage: async () => reference,
        renderDrawing: async (_box, width, height) => {
          const image = acexCreateRaster(width, height)
          strokeRect(image, 0, 0, width - 1, height - 1, 1)
          return image
        },
        encodePng: async () => 'data:image/png;base64,AAAA'
      }
    }
    const result = await executeCadScript(
      {
        code: `
          const spec = {
            entities: [{ type: 'rectangle', x: 0, y: 0, width: 80, height: 60 }],
            calibration: [{ id: 'c', method: 'similarity', evidence: 'known',
              sourcePoints: [[10, 70], [90, 70]], cadPoints: [[0, 0], [80, 0]] }],
            views: [{ id: 'v', sourceRoi: [10, 10, 90, 70], calibration: 'c' }]
          }
          cad.redraw.draw(spec)
          return cad.redraw.compare(spec, { viewId: 'v' })
        `
      },
      session
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ queued: true, index: 0 })
    expect(result.redrawCompare).toHaveLength(1)
    expect(result.redrawCompare![0]).toMatchObject({ ok: true, viewId: 'v' })
    expect(result.images).toHaveLength(2)
  })

  test('reports no_raster_host on headless sessions', async () => {
    const result = await executeCadScript(
      {
        code: 'return cad.redraw.compare({ entities: [{ type: \'line\', start: [0, 0], end: [1, 0] }] })'
      },
      createDatabaseSession(new AcDbDatabase())
    )
    expect(result.redrawCompare).toEqual([
      expect.objectContaining({ ok: false, reason: 'no_raster_host' })
    ])
  })
})
