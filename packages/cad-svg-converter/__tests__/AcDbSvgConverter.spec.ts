import {
  AcDbCircle,
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbEllipse,
  AcDbLine,
  AcDbPolyline,
  AcDbText
} from '@mlightcad/data-model'

import {
  ACDB_SVG_FILE_TYPE,
  AcDbSvgConverter,
  registerSvgConverter
} from '../src'

function encode(svg: string): ArrayBuffer {
  return new TextEncoder().encode(svg).buffer
}

async function openSvg(svg: string): Promise<AcDbDatabase> {
  const db = new AcDbDatabase()
  const converter = new AcDbSvgConverter()
  await converter.read(encode(svg), db, {})
  return db
}

function modelEntities(db: AcDbDatabase) {
  return [...db.tables.blockTable.modelSpace.newIterator()]
}

describe('AcDbSvgConverter', () => {
  it('registers under the svg file type', () => {
    registerSvgConverter()
    expect(
      AcDbDatabaseConverterManager.instance.get(ACDB_SVG_FILE_TYPE)
    ).toBeInstanceOf(AcDbSvgConverter)
  })

  it('imports a line with Y-up flip from viewBox', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="10" y1="10" x2="90" y2="10" stroke="#ff0000" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbLine)
    const line = entities[0] as AcDbLine
    // SVG y=10 → CAD y = 100 - 10 = 90
    expect(line.startPoint.x).toBeCloseTo(10)
    expect(line.startPoint.y).toBeCloseTo(90)
    expect(line.endPoint.x).toBeCloseTo(90)
    expect(line.endPoint.y).toBeCloseTo(90)
  })

  it('imports rect as closed polyline', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <rect x="10" y="20" width="40" height="30" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbPolyline)
    expect((entities[0] as AcDbPolyline).closed).toBe(true)
  })

  it('imports circle', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="40" r="10" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbCircle)
    const circle = entities[0] as AcDbCircle
    expect(circle.center.x).toBeCloseTo(50)
    expect(circle.center.y).toBeCloseTo(60)
    expect(circle.radius).toBeCloseTo(10)
  })

  it('imports path as polyline', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M10 10 L90 10 L90 90 Z" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities.length).toBeGreaterThanOrEqual(1)
    expect(entities[0]).toBeInstanceOf(AcDbPolyline)
  })

  it('imports text', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <text x="5" y="20" font-size="12">Hello</text>
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbText)
    expect((entities[0] as AcDbText).textString).toBe('Hello')
    expect((entities[0] as AcDbText).height).toBeCloseTo(12)
  })

  it('applies group transform', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <g transform="translate(10 0)">
          <line x1="0" y1="50" x2="20" y2="50" />
        </g>
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    expect(line.startPoint.x).toBeCloseTo(10)
    expect(line.endPoint.x).toBeCloseTo(30)
  })

  it('skips unsupported elements without failing', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <image href="x.png" width="10" height="10" />
        <line x1="0" y1="0" x2="1" y2="1" />
      </svg>
    `)
    expect(modelEntities(db)).toHaveLength(1)
  })

  it('parses compact path numbers without separators', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M-10-10 L90-10 Z" />
      </svg>
    `)
    const poly = modelEntities(db)[0] as AcDbPolyline
    expect(poly).toBeInstanceOf(AcDbPolyline)
    expect(poly.getPoint2dAt(0).x).toBeCloseTo(-10)
    // SVG y=-10 → CAD y = 100 - (-10) = 110
    expect(poly.getPoint2dAt(0).y).toBeCloseTo(110)
    expect(poly.getPoint2dAt(1).x).toBeCloseTo(90)
    expect(poly.getPoint2dAt(1).y).toBeCloseTo(110)
  })

  it('uses SVG default 300x150 viewport when viewBox is omitted', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="100" y2="0" />
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    // Default height 150: SVG y=0 → CAD y = 150
    expect(line.startPoint.y).toBeCloseTo(150)
    expect(line.endPoint.y).toBeCloseTo(150)
  })

  it('imports ellipse as AcDbEllipse', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <ellipse cx="50" cy="50" rx="30" ry="10" />
      </svg>
    `)
    const entity = modelEntities(db)[0]
    expect(entity).toBeInstanceOf(AcDbEllipse)
  })
})
