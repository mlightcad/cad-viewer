import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbFileType,
  AcDbLine,
  AcDbOsnapMode,
  AcDbPoint,
  AcGeBox2d,
  acdbHostApplicationServices,
  acdbWithDatabase
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'

import { acEdDrawingOsnapPoints } from '../../cad-simple-viewer/src/editor/view/AcEdDrawingGeometry'
import {
  acTrPickDrawingEntities,
  type AcTrDrawingPickSource
} from '../../cad-simple-viewer/src/view/AcTrDrawingPick'
import type { AcTrLayout } from '../../cad-simple-viewer/src/view/AcTrLayout'
import { acTrPrepareOverlay } from '../../cad-simple-viewer/src/view/AcTrOverlay'

/**
 * The native converter intentionally supports browser workers only. This test
 * host uses the same real decoder via its documented Node API; inherited read()
 * still performs every native database conversion stage. No decoded model is
 * mocked, and browser worker transport is explicitly outside this qualification.
 */
class NodeDwgConverter extends AcDbLibreDwgConverter {
  decoderStarts = 0

  protected override async parse(
    data: ArrayBuffer,
    _timeout?: number,
    signal?: AbortSignal
  ) {
    signal?.throwIfAborted()
    this.decoderStarts++
    // Jest replaces even imported createRequire with its CJS transformer. Use
    // Node 24's actual loader for the decoder's public ESM entry and WASM glue.
    // The native converter, database and scene stay in the normal Jest runtime.
    const nodeRequire = process
      .getBuiltinModule('module')
      .createRequire(__filename)
    const packageDirectory = path.resolve(
      path.dirname(nodeRequire.resolve('@mlightcad/libredwg-web')),
      '..'
    )
    // The package's UMD build passes an ESM namespace as createModule; select
    // the advertised import entry, whose default import preserves that binding.
    const manifest = JSON.parse(
      readFileSync(path.join(packageDirectory, 'package.json'), 'utf8')
    ) as { exports: { import: string } }
    const { Dwg_File_Type, LibreDwg } = nodeRequire(
      path.resolve(packageDirectory, manifest.exports.import)
    ) as typeof import('@mlightcad/libredwg-web')
    const wasmDirectory = path.join(packageDirectory, 'wasm')
    const decoder = await LibreDwg.create(wasmDirectory)
    signal?.throwIfAborted()
    const pointer = decoder.dwg_read_data(data, Dwg_File_Type.DWG)
    if (pointer == null)
      throw new Error('Native fixture DWG could not be decoded')
    try {
      const result = decoder.convertEx(pointer)
      return { model: result.database, data: result.stats }
    } finally {
      decoder.dwg_free(pointer)
    }
  }
}

function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

function fixture(name: string, sha256: string) {
  const bytes = readFileSync(
    path.join(__dirname, 'fixtures/native-file-reference', name)
  )
  expect(digest(bytes)).toBe(sha256)
  return bytes
}

function pick(source: AcTrDrawingPickSource, x: number, y: number) {
  const radius = 0.1
  const aperture = new AcGeBox2d().setFromPoints([
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y + radius }
  ])
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2(), camera)
  ray.params.Line.threshold = radius
  ray.params.Points.threshold = radius
  return acTrPickDrawingEntities(source, aperture, ray).filter(
    hit => !(hit.entity instanceof AcDbBlockReference)
  )
}

function expectPoint(
  actual: { x: number; y: number; z: number },
  x: number,
  y: number
) {
  expect(actual.x).toBeCloseTo(x, 8)
  expect(actual.y).toBeCloseTo(y, 8)
  expect(actual.z).toBeCloseTo(0, 8)
}

describe('real native file overlay qualification', () => {
  const services = acdbHostApplicationServices() as unknown as {
    _workingDatabase: AcDbDatabase | null
    workingDatabase: AcDbDatabase
  }
  const converters = AcDbDatabaseConverterManager.instance
  const previousDwgConverter = converters.get(AcDbFileType.DWG)
  const dwgConverter = new NodeDwgConverter()
  let previousDatabase: AcDbDatabase | null
  let host: AcDbDatabase
  let hostRevision: number
  let renderer: AcTrRenderer
  let layouts: AcTrLayout[] = []

  beforeAll(() => converters.register(AcDbFileType.DWG, dwgConverter))
  afterAll(() => {
    if (previousDwgConverter)
      converters.register(AcDbFileType.DWG, previousDwgConverter)
    else converters.unregister(AcDbFileType.DWG)
  })
  beforeEach(() => {
    layouts = []
    previousDatabase = services._workingDatabase
    host = new AcDbDatabase()
    acdbWithDatabase(host, () => host.createDefaultData())
    services.workingDatabase = host
    hostRevision = host.renderingRevision
    renderer = new AcTrRenderer({
      getSize: (size: THREE.Vector2) => size.set(800, 600)
    } as THREE.WebGLRenderer)
    renderer.context.database = host
  })
  afterEach(() => {
    layouts.forEach(layout => layout.clear())
    renderer?.dispose()
    services._workingDatabase = previousDatabase
  })

  async function read(bytes: Uint8Array, fileType: AcDbFileType) {
    const database = new AcDbDatabase()
    await database.read(
      Uint8Array.from(bytes).buffer,
      {
        activateWorkingDatabase: false,
        timeout: 15000
      },
      fileType
    )
    expect(services.workingDatabase).toBe(host)
    return database
  }

  function expectHostUnchanged() {
    expect(services.workingDatabase).toBe(host)
    expect(renderer.context.database).toBe(host)
    expect(host.renderingRevision).toBe(hostRevision)
    expect([...host.tables.blockTable.modelSpace.newIterator()]).toEqual([])
  }

  it('reads a public nested-base DXF through the native parser and preserves authored entities after placement', async () => {
    const hash =
      '79ae8c3a7daec34d4f31ff04a266d9e4c3ed782b2ec96ad72d49771e536d3754'
    const bytes = fixture('gdal-block-basepoint-r12.dxf', hash)
    const database = await read(bytes, AcDbFileType.DXF)
    const inner = database.tables.blockTable.getAt('INNERBLOCK')!
    const outer = database.tables.blockTable.getAt('OUTERBLOCK')!
    const line = inner.getIdAt('660') as AcDbLine
    expect(line).toBeInstanceOf(AcDbLine)
    expectPoint(inner.origin, 50, 200)
    expectPoint(outer.origin, 60, 250)
    expectPoint(line.startPoint, 40, 210)
    expectPoint(line.endPoint, 60, 190)
    const revision = database.renderingRevision
    const layout = await acTrPrepareOverlay(renderer, database, {
      transform: {
        position: { x: 1000, y: 2000, z: 0 },
        scale: 2,
        rotationRad: Math.PI / 2
      }
    })
    layouts.push(layout)
    expect(layout.box.min.x).toBeCloseTo(290, 8)
    expect(layout.box.min.y).toBeCloseTo(140, 8)
    expect(layout.box.max.x).toBeCloseTo(310, 8)
    expect(layout.box.max.y).toBeCloseTo(160, 8)
    const displayedBounds = layout.box
      .clone()
      .applyMatrix4(layout.internalObject.matrixWorld)
    expect(displayedBounds.min.x).toBeCloseTo(680, 8)
    expect(displayedBounds.min.y).toBeCloseTo(2580, 8)
    expect(displayedBounds.max.x).toBeCloseTo(720, 8)
    expect(displayedBounds.max.y).toBeCloseTo(2620, 8)
    const source = {
      database,
      layout,
      referenceId: 'real-dxf',
      isCurrent: () => true
    }
    const hits = pick(source, 690, 2590)
    expect(hits).toHaveLength(1)
    expect(hits[0].database).toBe(database)
    expect(hits[0].entity).toBe(line)
    expect(hits[0].referenceId).toBe('real-dxf')
    expect(hits[0].rootId).toBe('E06')
    expect(hits[0].path).toEqual(['A3B', '660'])
    const endpoints = acEdDrawingOsnapPoints(hits[0], AcDbOsnapMode.EndPoint, {
      x: 690,
      y: 2590,
      z: 0
    })
    expect(endpoints).toHaveLength(2)
    expectPoint(endpoints[0], 680, 2580)
    expectPoint(endpoints[1], 720, 2620)
    expect(pick(source, 295, 155)).toEqual([])
    expectPoint(line.startPoint, 40, 210)
    expectPoint(line.endPoint, 60, 190)
    expectPoint(inner.origin, 50, 200)
    expectPoint(outer.origin, 60, 250)
    expect(database.renderingRevision).toBe(revision)
    expect(digest(bytes)).toBe(hash)
    expectHostUnchanged()
  })

  it('decodes one public DWG using real Node WASM and places its native point without changing source WCS', async () => {
    const hash =
      '66c5e2887a948fe9ecc8dab883c39d84801e5e76c21cd3654f5c883ca6e6c403'
    const bytes = fixture('gnu-point-2010.dwg', hash)
    const database = await read(bytes, AcDbFileType.DWG)
    expect(dwgConverter.decoderStarts).toBe(1)
    const entities = [...database.tables.blockTable.modelSpace.newIterator()]
    expect(entities).toHaveLength(1)
    const point = entities[0] as AcDbPoint
    expect(point).toBeInstanceOf(AcDbPoint)
    expectPoint(point.position, 27.92801065531282, 8.65307688043195)
    const revision = database.renderingRevision
    const layout = await acTrPrepareOverlay(renderer, database, {
      transform: {
        position: { x: 1000, y: 2000, z: 0 },
        scale: 2,
        rotationRad: 0
      }
    })
    layouts.push(layout)
    // PDMODE may give a point a display symbol; source bounds must still
    // contain its literal native position rather than target-space coordinates.
    expect(layout.box.min.x).toBeLessThanOrEqual(27.92801065531282 + 1e-8)
    expect(layout.box.max.x).toBeGreaterThanOrEqual(27.92801065531282 - 1e-8)
    expect(layout.box.min.y).toBeLessThanOrEqual(8.65307688043195 + 1e-8)
    expect(layout.box.max.y).toBeGreaterThanOrEqual(8.65307688043195 - 1e-8)
    const source = {
      database,
      layout,
      referenceId: 'real-dwg',
      isCurrent: () => true
    }
    const hits = pick(source, 1055.8560213106256, 2017.306153760864)
    expect(hits).toHaveLength(1)
    expect(hits[0].database).toBe(database)
    expect(hits[0].entity).toBe(point)
    expect(hits[0].referenceId).toBe('real-dwg')
    expect(hits[0].rootId).toBe(point.objectId)
    const nodes = acEdDrawingOsnapPoints(hits[0], AcDbOsnapMode.Node, {
      x: 1055.8560213106256,
      y: 2017.306153760864,
      z: 0
    })
    expect(nodes).toHaveLength(1)
    expectPoint(nodes[0], 1055.8560213106256, 2017.306153760864)
    expect(pick(source, 27.92801065531282, 8.65307688043195)).toEqual([])
    expectPoint(point.position, 27.92801065531282, 8.65307688043195)
    expect(database.renderingRevision).toBe(revision)
    expect(digest(bytes)).toBe(hash)
    expectHostUnchanged()
  }, 20000)
})
