import {
  acexMeasurementSidecarFileName,
  parseAcExMeasurementSidecar,
  stringifyAcExMeasurementSidecar
} from '../src/AcExMeasurementSidecar'
import type { AcExMeasurementSidecarFile } from '../src/AcExMeasurementTypes'

describe('AcExMeasurementSidecar', () => {
  const sample: AcExMeasurementSidecarFile = {
    version: 1,
    drawingName: 'plan.dwg',
    measurements: [
      {
        id: 'm1',
        type: 'distance',
        style: { color: '#08e8de', lineWeight: 70, fontSize: 13 },
        geometry: {
          type: 'distance',
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 }
        }
      },
      {
        id: 'm2',
        type: 'point',
        style: { color: '#08e8de', lineWeight: 70, fontSize: 13 },
        geometry: { type: 'point', position: { x: 3, y: 4 } }
      },
      {
        id: 'm3',
        type: 'arc',
        style: { color: '#ff0000', lineWeight: 70, fontSize: 13 },
        geometry: {
          type: 'arc',
          center: { x: 0, y: 0 },
          radius: 5,
          start: { x: 5, y: 0 },
          end: { x: 0, y: 5 },
          through: { x: -5, y: 0 }
        }
      }
    ]
  }

  it('round-trips sidecar JSON as hairline', () => {
    const text = stringifyAcExMeasurementSidecar(sample)
    expect(text).not.toMatch(/"strokeWidthWcs"\s*:/)
    const parsed = parseAcExMeasurementSidecar(text)
    expect(parsed.version).toBe(1)
    expect(parsed.drawingName).toBe('plan.dwg')
    expect(parsed.measurements).toHaveLength(3)
    expect(parsed.measurements[0]?.type).toBe('distance')
    expect(parsed.measurements[0]?.style.lineWeight).toBe(0)
    expect(parsed.measurements[1]?.type).toBe('point')
    expect(parsed.measurements[2]?.geometry).toEqual({
      type: 'arc',
      center: { x: 0, y: 0 },
      radius: 5,
      start: { x: 5, y: 0 },
      end: { x: 0, y: 5 },
      through: { x: -5, y: 0 }
    })
  })

  it('keeps textHeightWcs and ignores legacy strokeWidthWcs', () => {
    const withWcs: AcExMeasurementSidecarFile = {
      version: 1,
      measurements: [
        {
          id: 'wcs',
          type: 'distance',
          style: {
            color: '#08e8de',
            lineWeight: 70,
            fontSize: 13,
            textHeightWcs: 0.65,
            arrowSizeWcs: 1.2,
            strokeWidthWcs: 0.1
          },
          geometry: {
            type: 'distance',
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 }
          }
        }
      ]
    }
    const text = stringifyAcExMeasurementSidecar(withWcs)
    expect(text).not.toMatch(/"strokeWidthWcs"\s*:/)
    const parsed = parseAcExMeasurementSidecar(text)
    expect(parsed.measurements[0]?.style.textHeightWcs).toBe(0.65)
    expect(parsed.measurements[0]?.style.arrowSizeWcs).toBe(1.2)
    expect(parsed.measurements[0]?.style.lineWeight).toBe(0)
    expect(parsed.measurements[0]?.style.strokeWidthWcs).toBeUndefined()
  })

  it('normalizes legacy thick styles to hairline on parse', () => {
    const parsed = parseAcExMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          {
            id: 'thick',
            type: 'point',
            style: {
              color: '#08e8de',
              lineWeight: 70,
              fontSize: 13,
              strokeWidthWcs: 0.2
            },
            geometry: { type: 'point', position: { x: 1, y: 2 } }
          }
        ]
      })
    )
    expect(parsed.measurements[0]?.style.lineWeight).toBe(0)
    expect(parsed.measurements[0]?.style.strokeWidthWcs).toBeUndefined()
  })

  it('keeps hairline line weight 0 in sidecar styles', () => {
    const parsed = parseAcExMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          {
            id: 'hairline',
            type: 'point',
            style: { color: '#08e8de', lineWeight: 0, fontSize: 13 },
            geometry: { type: 'point', position: { x: 1, y: 2 } }
          }
        ]
      })
    )
    expect(parsed.measurements[0]?.style.lineWeight).toBe(0)
    expect(parsed.measurements[0]?.style.strokeWidthWcs).toBeUndefined()
  })

  it('rejects invalid payloads', () => {
    expect(() => parseAcExMeasurementSidecar('not-json')).toThrow(/not JSON/)
    expect(() =>
      parseAcExMeasurementSidecar('{"version":2,"measurements":[]}')
    ).toThrow(/version 1/)
  })

  it('suggests sidecar file names', () => {
    expect(acexMeasurementSidecarFileName('plan.dwg')).toBe(
      'plan.measurement.json'
    )
    expect(acexMeasurementSidecarFileName('plan.html')).toBe(
      'plan.measurement.json'
    )
    expect(acexMeasurementSidecarFileName()).toBe('drawing.measurement.json')
  })

  it('keeps legacy arc records that omit the through point', () => {
    const parsed = parseAcExMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          {
            id: 'arc-legacy',
            type: 'arc',
            style: { color: '#ff0000', lineWeight: 70, fontSize: 13 },
            geometry: {
              type: 'arc',
              center: { x: 0, y: 0 },
              radius: 5,
              start: { x: 5, y: 0 },
              end: { x: 0, y: 5 }
            }
          }
        ]
      })
    )
    expect(parsed.measurements).toHaveLength(1)
    expect(parsed.measurements[0]?.style.lineWeight).toBe(0)
    expect(parsed.measurements[0]?.geometry).toEqual({
      type: 'arc',
      center: { x: 0, y: 0 },
      radius: 5,
      start: { x: 5, y: 0 },
      end: { x: 0, y: 5 }
    })
  })
})
