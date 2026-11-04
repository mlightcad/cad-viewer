import {
  acexHtmlComputeLayerExtentsMap,
  acexHtmlComputeLayoutExtents,
  acexHtmlComputeLayoutViewExtents,
  acexHtmlResolveLayoutFallbackExtents,
  acexHtmlResolveLayoutViewExtents
} from '@mlightcad/cad-html-core'

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

describe('AcExLayerExtents', () => {
  it('computes per-layer bounds from batches', () => {
    const map = acexHtmlComputeLayerExtentsMap(
      [
        {
          layer: 'A',
          color: 0,
          offset: [0, 0, 0],
          positions: f32([0, 0, 0, 10, 5, 0])
        }
      ],
      [
        {
          layer: 'B',
          color: 0,
          offset: [1, 2, 0],
          positions: f32([0, 0, 0, 2, 2, 0])
        }
      ]
    )
    expect(map.get('A')).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5
    })
    expect(map.get('B')).toEqual({
      minX: 1,
      minY: 2,
      maxX: 3,
      maxY: 4
    })
  })

  it('unions all batches into one layout extent', () => {
    expect(
      acexHtmlComputeLayoutExtents(
        [
          {
            layer: 'A',
            color: 0,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 10, 5, 0])
          }
        ],
        [
          {
            layer: 'B',
            color: 0,
            offset: [1, 2, 0],
            positions: f32([0, 0, 0, 2, 2, 0])
          }
        ]
      )
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5
    })
  })

  it('prefers batch extents over persisted viewExtents fallback', () => {
    expect(
      acexHtmlResolveLayoutViewExtents(
        {
          lineBatches: [
            {
              layer: '0',
              color: 0,
              offset: [0, 0, 0],
              positions: f32([0, 0, 0, 5, 5, 0])
            }
          ],
          meshBatches: []
        },
        { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
      )
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 5,
      maxY: 5
    })
  })

  it('unions viewport paper frames when a paper layout has no batches', () => {
    expect(
      acexHtmlComputeLayoutViewExtents({
        lineBatches: [],
        meshBatches: [],
        viewports: [
          {
            paper: { minX: 0, minY: 0, maxX: 12, maxY: 9 },
            model: { minX: 100, minY: 200, maxX: 400, maxY: 500 }
          },
          {
            paper: { minX: 20, minY: 4, maxX: 40, maxY: 30 },
            model: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
          }
        ]
      })
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 40,
      maxY: 30
    })
  })

  it('frames empty paper layouts to viewport paper instead of the unit box', () => {
    expect(
      acexHtmlResolveLayoutViewExtents({
        lineBatches: [],
        meshBatches: [],
        viewports: [
          {
            paper: { minX: 2, minY: 3, maxX: 14, maxY: 12 },
            model: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
          }
        ]
      })
    ).toEqual({
      minX: 2,
      minY: 3,
      maxX: 14,
      maxY: 12
    })
  })

  it('prefers the export-time fit box over partially painted geometry', () => {
    // Progressive packages paint viewport frames before their chunks arrive;
    // the persisted export box keeps the initial framing stable.
    expect(
      acexHtmlResolveLayoutViewExtents({
        lineBatches: [],
        meshBatches: [],
        viewports: [
          {
            paper: { minX: 2, minY: 3, maxX: 14, maxY: 12 },
            model: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
          }
        ],
        fitExtents: { minX: 1, minY: 2, maxX: 40, maxY: 30 }
      })
    ).toEqual({
      minX: 1,
      minY: 2,
      maxX: 40,
      maxY: 30
    })
  })

  it('keeps the export-time fit box after geometry becomes resident', () => {
    expect(
      acexHtmlResolveLayoutViewExtents({
        lineBatches: [
          {
            layer: '0',
            color: 0,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 5, 5, 0])
          }
        ],
        meshBatches: [],
        fitExtents: { minX: 0, minY: 0, maxX: 5, maxY: 5 }
      })
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 5,
      maxY: 5
    })
  })

  describe('acexHtmlResolveLayoutFallbackExtents', () => {
    const meta = {
      createdAt: '2026-01-01T00:00:00.000Z',
      extents: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 },
      viewExtents: { minX: 0, minY: 0, maxX: 12, maxY: 9 },
      units: {
        insunits: 4,
        lunits: 2,
        luprec: 4,
        aunits: 0,
        auprec: 0,
        measurement: 1,
        ltscale: 1,
        angbase: 0,
        angdir: 0
      },
      background: 0
    }

    it('prefers the geometry-derived viewExtents for the active layout', () => {
      // savedView is the printable sheet (LIMMIN/LIMMAX), not the drawn content,
      // so it must not beat the batch-derived box on the active layout.
      expect(
        acexHtmlResolveLayoutFallbackExtents(
          {
            btrId: 'ps',
            savedView: { minX: 0, minY: 0, maxX: 200, maxY: 150 }
          },
          { activeLayoutBtrId: 'ps', meta }
        )
      ).toEqual({ minX: 0, minY: 0, maxX: 12, maxY: 9 })
    })

    it('never reuses viewExtents for a non-active layout', () => {
      // Falling back to viewExtents here would frame the paper sheet when
      // fitting model space.
      expect(
        acexHtmlResolveLayoutFallbackExtents(
          { btrId: 'ms' },
          { activeLayoutBtrId: 'ps', meta }
        )
      ).toEqual(meta.extents)
    })

    it('prefers a non-active layout saved view over the header extents', () => {
      expect(
        acexHtmlResolveLayoutFallbackExtents(
          { btrId: 'ms', savedView: { minX: 1, minY: 2, maxX: 30, maxY: 40 } },
          { activeLayoutBtrId: 'ps', meta }
        )
      ).toEqual({ minX: 1, minY: 2, maxX: 30, maxY: 40 })
    })

    it('falls back to savedView then header extents when viewExtents is absent', () => {
      const { viewExtents: _omit, ...metaNoView } = meta
      expect(
        acexHtmlResolveLayoutFallbackExtents(
          { btrId: 'ps', savedView: { minX: 0, minY: 0, maxX: 3, maxY: 4 } },
          { activeLayoutBtrId: 'ps', meta: metaNoView }
        )
      ).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 4 })
      expect(
        acexHtmlResolveLayoutFallbackExtents(
          { btrId: 'ps' },
          { activeLayoutBtrId: 'ps', meta: metaNoView }
        )
      ).toEqual(meta.extents)
    })
  })
})
