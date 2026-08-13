import { AcGiLineWeight } from '@mlightcad/data-model'

import {
  measurementSidecarFileName,
  parseMeasurementSidecar,
  stringifyMeasurementSidecar
} from '../src/command/measure/AcApMeasurementSidecar'
import type { AcApMeasurementSidecarFile } from '../src/command/measure/AcApMeasurementTypes'

describe('AcApMeasurementSidecar', () => {
  it('round-trips distance, angle, area, arc, and point measurements', () => {
    const file: AcApMeasurementSidecarFile = {
      version: 1,
      drawingName: 'demo.dwg',
      measurements: [
        {
          id: 'dist-1',
          type: 'distance',
          style: {
            color: '#ff0000',
            lineWeight: AcGiLineWeight.LineWeight070,
            fontSize: 13
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
            lineWeight: AcGiLineWeight.LineWeight013,
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
            lineWeight: AcGiLineWeight.LineWeight070,
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
            lineWeight: AcGiLineWeight.LineWeight070,
            fontSize: 13
          },
          geometry: {
            type: 'arc',
            center: { x: 0, y: 0 },
            radius: 5,
            start: { x: 5, y: 0 },
            end: { x: 0, y: 5 }
          }
        },
        {
          id: 'point-1',
          type: 'point',
          style: {
            color: '#ffffff',
            lineWeight: AcGiLineWeight.LineWeight013,
            fontSize: 11
          },
          geometry: {
            type: 'point',
            position: { x: 3, y: 4 }
          }
        }
      ]
    }
    const parsed = parseMeasurementSidecar(stringifyMeasurementSidecar(file))
    expect(parsed.version).toBe(1)
    expect(parsed.drawingName).toBe('demo.dwg')
    expect(parsed.measurements).toHaveLength(5)
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
      end: { x: 0, y: 5 }
    })
    expect(parsed.measurements[4].geometry).toEqual({
      type: 'point',
      position: { x: 3, y: 4 }
    })
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
  })
})
