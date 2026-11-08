import {
  AcDbCircle,
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbEllipse,
  AcDbHatch,
  AcDbLine,
  AcDbPolyline,
  AcDbText,
  AcDbTextHorizontalMode
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

  it('imports filled rect as solid hatch', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <rect x="10" y="20" width="40" height="30" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbHatch)
  })

  it('imports stroked rect as closed polyline when fill is none', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <rect x="10" y="20" width="40" height="30" fill="none" stroke="#000" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbPolyline)
    expect((entities[0] as AcDbPolyline).closed).toBe(true)
  })

  it('imports filled circle as hatch', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="40" r="10" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities).toHaveLength(1)
    expect(entities[0]).toBeInstanceOf(AcDbHatch)
  })

  it('imports stroked circle as AcDbCircle when fill is none', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="40" r="10" fill="none" stroke="#000" />
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

  it('imports filled path as hatch', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M10 10 L90 10 L90 90 Z" />
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities.length).toBeGreaterThanOrEqual(1)
    expect(entities[0]).toBeInstanceOf(AcDbHatch)
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
          <line x1="0" y1="50" x2="20" y2="50" stroke="#000" />
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
        <line x1="0" y1="0" x2="1" y2="1" stroke="#000" />
      </svg>
    `)
    expect(modelEntities(db)).toHaveLength(1)
  })

  it('parses compact path numbers without separators', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M-10-10 L90-10 Z" fill="none" stroke="#000" />
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
        <line x1="0" y1="0" x2="100" y2="0" stroke="#000" />
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    // Default height 150: SVG y=0 → CAD y = 150
    expect(line.startPoint.y).toBeCloseTo(150)
    expect(line.endPoint.y).toBeCloseTo(150)
  })

  it('imports stroked ellipse as AcDbEllipse when fill is none', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <ellipse cx="50" cy="50" rx="30" ry="10" fill="none" stroke="#000" />
      </svg>
    `)
    const entity = modelEntities(db)[0]
    expect(entity).toBeInstanceOf(AcDbEllipse)
  })

  it('inherits fill and stroke from parent g', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <g fill="#00ff00" stroke="#0000ff" stroke-width="2">
          <rect x="10" y="10" width="20" height="20" />
        </g>
      </svg>
    `)
    const entities = modelEntities(db)
    expect(entities.length).toBe(2)
    const hatch = entities.find(e => e instanceof AcDbHatch) as AcDbHatch
    const poly = entities.find(e => e instanceof AcDbPolyline) as AcDbPolyline
    expect(hatch).toBeDefined()
    expect(poly).toBeDefined()
    expect(hatch.color.red).toBe(0)
    expect(hatch.color.green).toBe(255)
    expect(poly.color.blue).toBe(255)
  })

  it('applies fill-opacity as transparency on hatch', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="0" y="0" width="10" height="10" fill="#ff0000" fill-opacity="0.5" stroke="none" />
      </svg>
    `)
    const hatch = modelEntities(db)[0] as AcDbHatch
    expect(hatch).toBeInstanceOf(AcDbHatch)
    expect(hatch.transparency.percentage).toBe(50)
  })

  it('skips display=none geometry', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="0" y1="0" x2="10" y2="10" stroke="#000" display="none" />
        <line x1="0" y1="0" x2="1" y2="1" stroke="#000" />
      </svg>
    `)
    expect(modelEntities(db)).toHaveLength(1)
  })

  it('imports rounded rect with more than four vertices', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="10" width="40" height="20" rx="5" ry="5" fill="none" stroke="#000" />
      </svg>
    `)
    const poly = modelEntities(db)[0] as AcDbPolyline
    expect(poly).toBeInstanceOf(AcDbPolyline)
    expect(poly.numberOfVertices).toBe(8)
  })

  it('maps text-anchor middle to center alignment', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <text x="50" y="50" font-size="12" text-anchor="middle">Hi</text>
      </svg>
    `)
    const text = modelEntities(db)[0] as AcDbText
    expect(text.horizontalMode).toBe(AcDbTextHorizontalMode.CENTER)
    expect(text.alignmentPoint.x).toBeCloseTo(50)
  })

  it('registers stroke-dasharray as a custom linetype', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="0" y1="0" x2="50" y2="0" stroke="#000" stroke-dasharray="4 2" />
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    expect(line.lineType).toMatch(/^SVG_DASH_/)
    expect(db.tables.linetypeTable.has(line.lineType)).toBe(true)
  })

  it('instantiates geometry from defs via use', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <path id="p" d="M0 0 L10 0 L10 10 Z" fill="none" stroke="#000" />
        </defs>
        <use href="#p" x="20" y="0" />
      </svg>
    `)
    const poly = modelEntities(db)[0] as AcDbPolyline
    expect(poly).toBeInstanceOf(AcDbPolyline)
    expect(poly.getPoint2dAt(0).x).toBeCloseTo(20)
  })

  it('walks children of a and switch', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <a href="https://example.com">
          <line x1="0" y1="0" x2="1" y2="0" stroke="#000" />
        </a>
        <switch>
          <line x1="0" y1="10" x2="1" y2="10" stroke="#000" />
          <line x1="0" y1="20" x2="1" y2="20" stroke="#000" />
        </switch>
      </svg>
    `)
    expect(modelEntities(db)).toHaveLength(2)
  })

  it('applies transform on a wrapper', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <a transform="translate(15 0)" href="https://example.com">
          <line x1="0" y1="50" x2="10" y2="50" stroke="#000" />
        </a>
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    expect(line.startPoint.x).toBeCloseTo(15)
    expect(line.endPoint.x).toBeCloseTo(25)
  })

  it('applies symbol transform when instantiated via use', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <symbol id="s" transform="translate(5 0)" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="#000" />
          </symbol>
        </defs>
        <use href="#s" x="0" y="0" width="10" height="10" />
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    expect(line.startPoint.x).toBeCloseTo(5)
    expect(line.endPoint.x).toBeCloseTo(15)
  })

  it('applies nested svg viewport', async () => {
    const db = await openSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <svg x="10" y="0" width="50" height="50" viewBox="0 0 10 10">
          <line x1="0" y1="5" x2="10" y2="5" stroke="#000" />
        </svg>
      </svg>
    `)
    const line = modelEntities(db)[0] as AcDbLine
    expect(line).toBeInstanceOf(AcDbLine)
    // Nested: scale=5, translate(10,0); SVG (0,5)→(10,25) then Y-flip → y=75
    expect(line.startPoint.x).toBeCloseTo(10)
    expect(line.endPoint.x).toBeCloseTo(60)
    expect(line.startPoint.y).toBeCloseTo(75)
  })
})
