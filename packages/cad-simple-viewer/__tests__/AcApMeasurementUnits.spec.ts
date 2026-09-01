import type { AcDbDatabase } from '@mlightcad/data-model'

import {
  formatMeasurementAngle,
  formatMeasurementArea,
  formatMeasurementLength,
  formatMeasurementValue,
  getEffectiveMeasurementUnits,
  getMeasurementUnitOverride,
  MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING,
  resetMeasurementUnitOverride,
  setMeasurementUnitOverride
} from '../src/util/AcApMeasurementUnits'

function mockDb(): AcDbDatabase {
  const db = {
    _lunits: 2,
    _luprec: 4,
    _aunits: 0,
    _auprec: 0,
    insunits: 4,
    get lunits() {
      return this._lunits
    },
    get luprec() {
      return this._luprec
    },
    get aunits() {
      return this._aunits
    },
    get auprec() {
      return this._auprec
    },
    formatter: {
      formatLength(value: number, options?: { showUnits?: boolean }) {
        // insunits = 4 is millimeters, mirroring the real formatter's suffix.
        const suffix = options?.showUnits === false ? '' : ' mm'
        return `L${Number(value).toFixed(db._luprec)}:${db._lunits}${suffix}`
      },
      formatAngle(radians: number) {
        return `A${radians}:${db._aunits}:${db._auprec}`
      }
    }
  }
  return db as unknown as AcDbDatabase
}

describe('AcApMeasurementUnits', () => {
  afterEach(() => {
    resetMeasurementUnitOverride()
  })

  it('follows drawing units until the user overrides a field', () => {
    const db = mockDb()
    expect(getEffectiveMeasurementUnits(db)).toEqual({
      lunits: 2,
      luprec: 4,
      aunits: 0,
      auprec: 0,
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })

    setMeasurementUnitOverride({ luprec: 2, aunits: 3 })
    expect(getEffectiveMeasurementUnits(db)).toEqual({
      lunits: 2,
      luprec: 2,
      aunits: 3,
      auprec: 0,
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })
    expect(getMeasurementUnitOverride()).toEqual({ luprec: 2, aunits: 3 })
  })

  it('formats length with the override without changing drawing units', () => {
    const db = mockDb()
    setMeasurementUnitOverride({ lunits: 1, luprec: 1 })

    expect(formatMeasurementLength(db, 12.3456)).toBe('L12.3:1 mm')
    expect(db.lunits).toBe(2)
    expect(db.luprec).toBe(4)
  })

  it('formats angle, area, and coordinate labels from stored values', () => {
    const db = mockDb()
    setMeasurementUnitOverride({ aunits: 1, auprec: 2, luprec: 1 })

    expect(formatMeasurementAngle(db, 1.5)).toBe('A1.5:1:2')
    expect(formatMeasurementValue(db, { kind: 'area', value: 10 })).toBe(
      'L10.0:2 mm²'
    )
    expect(
      formatMeasurementValue(db, { kind: 'coordinate', x: 1, y: 2 })
    ).toBe('X L1.0:2 mm  Y L2.0:2 mm')
  })

  it('converts length to the selected unit and appends its symbol', () => {
    const db = mockDb() // insunits = 4 (millimeters)
    setMeasurementUnitOverride({ lengthUnit: 6 }) // meters

    expect(formatMeasurementLength(db, 1000)).toBe('L1.0000:2 m')
    expect(db.insunits).toBe(4)
  })

  it('follows drawing units for the follow-drawing sentinel', () => {
    const db = mockDb()
    setMeasurementUnitOverride({
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })

    expect(formatMeasurementLength(db, 1000)).toBe('L1000.0000:2 mm')
  })

  it('converts area by the square of the selected length unit', () => {
    const db = mockDb() // insunits = 4 (millimeters)
    setMeasurementUnitOverride({ lengthUnit: 6 }) // meters

    expect(formatMeasurementArea(db, 3125000)).toBe('L3.1250:2 m²')
    expect(db.insunits).toBe(4)
  })

  it('keeps area in drawing units for the follow-drawing sentinel', () => {
    const db = mockDb()
    setMeasurementUnitOverride({
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })

    expect(formatMeasurementArea(db, 3125000)).toBe('L3125000.0000:2 mm²')
  })
})
