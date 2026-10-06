import { AcCmColor } from '@mlightcad/data-model'

import {
  measurementSidecarFileName,
  parseMeasurementSidecar,
  serializeMeasurementStyle,
  stringifyMeasurementSidecar
} from '../src/command/measure/AcApMeasurementSidecar'
import type { AcApMeasurementSidecarFile } from '../src/command/measure/AcApMeasurementTypes'

describe('AcApMeasurementSidecar', () => {
  it('round-trips distance, angle, area, arc, and point measurements as hairline', () => {
    const file: AcApMeasurementSidecarFile = {
      version: 1,
      drawingName: 'demo.dwg',
      measurements: [
        {
          id: 'dist-1',
          type: 'distance',
          style: {
            color: '#ff0000',
            lineWeight: 70,
            fontSize: 13,
            textHeightWcs: 2.5,
            arrowSizeWcs: 1.2,
            strokeWidthWcs: 0.4
          },
          geometry: {
            type: 'distance',
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 }
          }
        },
        {
          id: 'angle-1',
          type: 'angle',
          style: {
            color: '#00ff00',
            lineWeight: 13,
            fontSize: 12
          },
          geometry: {
            type: 'angle',
            vertex: { x: 0, y: 0 },
            arm1: { x: 1, y: 0 },
            arm2: { x: 0, y: 1 }
          }
        },
        {
          id: 'area-1',
          type: 'area',
          layoutId: 'layout-a',
          style: {
            color: '#0000ff',
            lineWeight: 70,
            fontSize: 14
          },
          geometry: {
            type: 'area',
            points: [
              { x: 0, y: 0 },
              { x: 2, y: 0 },
              { x: 2, y: 2 }
            ]
          }
        },
        {
          id: 'arc-1',
          type: 'arc',
          style: {
            color: '#ffff00',
            lineWeight: 70,
            fontSize: 13
          },
          geometry: {
            type: 'arc',
            center: { x: 0, y: 0 },
            radius: 5,
            start: { x: 5, y: 0 },
            end: { x: 0, y: 5 },
            through: { x: -5, y: 0 }
          }
        },
        {
          id: 'point-1',
          type: 'point',
          style: {
            color: '#ffffff',
            lineWeight: 13,
            fontSize: 11
          },
          geometry: {
            type: 'point',
            position: { x: 3, y: 4 }
          }
        }
      ]
    }
    const text = stringifyMeasurementSidecar(file)
    expect(text).not.toMatch(/"strokeWidthWcs"\s*:/)
    const parsed = parseMeasurementSidecar(text)
    expect(parsed.version).toBe(1)
    expect(parsed.drawingName).toBe('demo.dwg')
    expect(parsed.measurements).toHaveLength(5)
    expect(parsed.measurements[0].style.textHeightWcs).toBe(2.5)
    expect(parsed.measurements[0].style.arrowSizeWcs).toBe(1.2)
    expect(parsed.measurements[0].style.lineWeight).toBe(0)
    expect(parsed.measurements[0].style.strokeWidthWcs).toBeUndefined()
    expect(parsed.measurements[0].geometry).toEqual({
      type: 'distance',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 }
    })
    expect(parsed.measurements[1].type).toBe('angle')
    expect(parsed.measurements[2].layoutId).toBe('layout-a')
    expect(parsed.measurements[3].geometry).toEqual({
      type: 'arc',
      center: { x: 0, y: 0 },
      radius: 5,
      start: { x: 5, y: 0 },
      end: { x: 0, y: 5 },
      through: { x: -5, y: 0 }
    })
    expect(parsed.measurements[4].geometry).toEqual({
      type: 'point',
      position: { x: 3, y: 4 }
    })
  })

  it('ignores legacy non-zero lineWeight and strokeWidthWcs on parse', () => {
    const parsed = parseMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          {
            id: 'legacy',
            type: 'point',
            style: {
              color: '#abcabc',
              lineWeight: 35,
              fontSize: 13,
              strokeWidthWcs: 0.5
            },
            geometry: { type: 'point', position: { x: 1, y: 2 } }
          }
        ]
      })
    )
    expect(parsed.measurements[0].style.lineWeight).toBe(0)
    expect(parsed.measurements[0].style.textHeightWcs).toBeUndefined()
    expect(parsed.measurements[0].style.strokeWidthWcs).toBeUndefined()
  })

  it('keeps hairline line weight 0 in sidecar styles', () => {
    const parsed = parseMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          {
            id: 'hairline',
            type: 'point',
            style: { color: '#abcabc', lineWeight: 0, fontSize: 13 },
            geometry: { type: 'point', position: { x: 1, y: 2 } }
          }
        ]
      })
    )
    expect(parsed.measurements[0].style.lineWeight).toBe(0)
    expect(parsed.measurements[0].style.strokeWidthWcs).toBeUndefined()
  })

  it('suggests sidecar file names', () => {
    expect(measurementSidecarFileName('plan.dwg')).toBe('plan.measurement.json')
    expect(measurementSidecarFileName('plan.DXF')).toBe('plan.measurement.json')
    expect(measurementSidecarFileName()).toBe('drawing.measurement.json')
  })

  it('rejects invalid version', () => {
    expect(() =>
      parseMeasurementSidecar('{"version":2,"measurements":[]}')
    ).toThrow(/version 1/)
  })

  it('skips invalid records and keeps valid ones', () => {
    const parsed = parseMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          { id: 'bad', type: 'distance' },
          {
            id: 'ok',
            type: 'point',
            style: { color: '#abcabc', lineWeight: 35, fontSize: 13 },
            geometry: { type: 'point', position: { x: 1, y: 2 } }
          }
        ]
      })
    )
    expect(parsed.measurements).toHaveLength(1)
    expect(parsed.measurements[0].id).toBe('ok')
    expect(parsed.measurements[0].style.lineWeight).toBe(0)
  })

  it('keeps legacy arc records that omit the through point', () => {
    const parsed = parseMeasurementSidecar(
      JSON.stringify({
        version: 1,
        measurements: [
          {
            id: 'arc-legacy',
            type: 'arc',
            style: { color: '#ffff00', lineWeight: 70, fontSize: 13 },
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
    expect(parsed.measurements[0].style.lineWeight).toBe(0)
    expect(parsed.measurements[0].geometry).toEqual({
      type: 'arc',
      center: { x: 0, y: 0 },
      radius: 5,
      start: { x: 5, y: 0 },
      end: { x: 0, y: 5 }
    })
  })
})

describe('serializeMeasurementStyle text height', () => {
  const view = {
    worldToScreen: (p: { x: number; y: number }) => ({
      x: p.x * 10,
      y: p.y * 10
    })
  } as never

  it('keeps custom WCS height without reconverting from fontSize', () => {
    const out = serializeMeasurementStyle(
      {
        color: new AcCmColor(),
        lineWeight: 0,
        fontSize: 20,
        textHeightMode: 'custom',
        textHeightWcs: 7.5
      },
      view
    )
    expect(out.textHeightWcs).toBe(7.5)
  })

  it('bakes Fit-to-screen fontSize into WCS at the current view', () => {
    const out = serializeMeasurementStyle(
      {
        color: new AcCmColor(),
        lineWeight: 0,
        fontSize: 20,
        textHeightMode: 'adaptive'
      },
      view
    )
    // ppu = 10 → 20px / 10 = 2 WCS
    expect(out.textHeightWcs).toBe(2)
  })
})
