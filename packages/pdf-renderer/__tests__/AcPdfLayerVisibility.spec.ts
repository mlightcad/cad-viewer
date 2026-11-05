import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  AcDbLayout,
  AcDbRenderingCache,
  acdbHostApplicationServices,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfRenderer } from '../src/renderer/AcPdfRenderer'
import {
  acPdfApplyLayerVisibility,
  acPdfCollectDatabaseLayerVisibility
} from '../src/viewport/AcPdfLayerVisibility'
import { collectModelSpaceRoots } from '../src/viewport/AcPdfPaperSpaceExport'

function createDb() {
  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

function ensureModelLayout(db: AcDbDatabase) {
  if (db.objects.layout.getAt('Model')) {
    return
  }
  const layout = new AcDbLayout()
  layout.layoutName = 'Model'
  layout.tabOrder = 0
  layout.blockTableRecordId = db.tables.blockTable.modelSpace.objectId
  db.objects.layout.setAt(layout.layoutName, layout)
  db.tables.blockTable.modelSpace.layoutId = layout.objectId
}

function ensureLayer(
  db: AcDbDatabase,
  name: string,
  flags: { isOff?: boolean; isFrozen?: boolean } = {}
) {
  let layer = db.tables.layerTable.getAt(name)
  if (!layer) {
    layer = new AcDbLayerTableRecord({ name })
    db.tables.layerTable.add(layer)
  }
  if (flags.isOff) {
    layer.isOff = true
  }
  if (flags.isFrozen) {
    layer.isFrozen = true
  }
  return layer
}

function strokeEntity(layerName: string): AcPdfEntity {
  const entity = new AcPdfEntity()
  entity.layerName = layerName
  entity.addOp({
    kind: 'stroke',
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    ],
    style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
  })
  return entity
}

describe('acPdfApplyLayerVisibility', () => {
  it('hides non-INSERT entities on Off or Frozen layers', () => {
    const on = strokeEntity('On')
    const off = strokeEntity('Off')
    const frozen = strokeEntity('Frozen')

    acPdfApplyLayerVisibility([on, off, frozen], {
      offLayers: new Set(['Off']),
      frozenLayers: new Set(['Frozen'])
    })

    expect(on.visible).toBe(true)
    expect(off.visible).toBe(false)
    expect(frozen.visible).toBe(false)
  })

  it('keeps INSERT on Off so nested On-layer geometry can still plot', () => {
    const insert = new AcPdfEntity()
    insert.layerName = 'Off'
    insert.entityType = 'INSERT'
    insert.insertName = 'BLK'
    const nestedOn = strokeEntity('On')
    nestedOn.box.min.set(0, 0)
    nestedOn.box.max.set(10, 1)
    const nestedOff = strokeEntity('Off')
    nestedOff.box.min.set(1000, 1000)
    nestedOff.box.max.set(1010, 1010)
    insert.addChild(nestedOn)
    insert.addChild(nestedOff)
    insert.box.min.set(0, 0)
    insert.box.max.set(1010, 1010)

    acPdfApplyLayerVisibility([insert], {
      offLayers: new Set(['Off']),
      frozenLayers: new Set()
    })

    expect(insert.visible).toBe(true)
    expect(nestedOn.visible).toBe(true)
    expect(nestedOff.visible).toBe(false)
    // Off nested geometry must not keep inflating the INSERT extents.
    expect(insert.box.max.x).toBeCloseTo(10)
    expect(insert.box.max.y).toBeCloseTo(1)
  })

  it('hides layer-0 children of an Off INSERT via effective layer inheritance', () => {
    const insert = new AcPdfEntity()
    insert.layerName = 'Off'
    insert.entityType = 'INSERT'
    insert.insertName = 'BLK'
    const nestedZero = strokeEntity('0')
    nestedZero.box.min.set(0, 0)
    nestedZero.box.max.set(5, 5)
    insert.addChild(nestedZero)

    acPdfApplyLayerVisibility([insert], {
      offLayers: new Set(['Off']),
      frozenLayers: new Set()
    })

    expect(nestedZero.visible).toBe(false)
    expect(insert.visible).toBe(false)
  })

  it('hides the whole INSERT when its layer is Frozen', () => {
    const insert = new AcPdfEntity()
    insert.layerName = 'Frozen'
    insert.entityType = 'INSERT'
    insert.insertName = 'BLK'
    const nestedOn = strokeEntity('On')
    insert.addChild(nestedOn)

    acPdfApplyLayerVisibility([insert], {
      offLayers: new Set(),
      frozenLayers: new Set(['Frozen'])
    })

    expect(insert.visible).toBe(false)
    // Children are not visited once the INSERT is frozen-hidden.
    expect(nestedOn.visible).toBe(true)
  })

  it('does not paint Off-layer nodes', () => {
    const off = strokeEntity('Off')
    acPdfApplyLayerVisibility([off], {
      offLayers: new Set(['Off']),
      frozenLayers: new Set()
    })
    const writer = {
      beginOcg: jest.fn(),
      endMarked: jest.fn(),
      beginEntity: jest.fn(),
      beginActualText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      clipRect: jest.fn(),
      drawOps: jest.fn()
    }
    off.paint({ writer: writer as never })
    expect(writer.drawOps).not.toHaveBeenCalled()
  })
})

describe('collectModelSpaceRoots layer Off/Frozen', () => {
  it('marks Off and Frozen model entities invisible after collect', async () => {
    const db = createDb()
    ensureModelLayout(db)
    ensureLayer(db, 'Keep')
    ensureLayer(db, 'Hidden', { isOff: true })
    ensureLayer(db, 'Frozen', { isFrozen: true })

    const kept = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(100, 0, 0)
    )
    kept.layer = 'Keep'
    db.tables.blockTable.modelSpace.appendEntity(kept)

    const hidden = new AcDbLine(
      new AcGePoint3d(0, 50, 0),
      new AcGePoint3d(100, 50, 0)
    )
    hidden.layer = 'Hidden'
    db.tables.blockTable.modelSpace.appendEntity(hidden)

    const frozen = new AcDbLine(
      new AcGePoint3d(0, 75, 0),
      new AcGePoint3d(100, 75, 0)
    )
    frozen.layer = 'Frozen'
    db.tables.blockTable.modelSpace.appendEntity(frozen)

    const visibility = acPdfCollectDatabaseLayerVisibility(db)
    expect(visibility.offLayers.has('Hidden')).toBe(true)
    expect(visibility.frozenLayers.has('Frozen')).toBe(true)

    AcPdfRenderer.prepareExport()
    const renderer = new AcPdfRenderer()
    renderer.context.database = db
    try {
      const roots = await collectModelSpaceRoots(db, renderer)
      const byLayer = new Map(roots.map(root => [root.layerName, root]))
      expect(byLayer.get('Keep')?.visible).toBe(true)
      expect(byLayer.get('Hidden')?.visible).toBe(false)
      expect(byLayer.get('Frozen')?.visible).toBe(false)
    } finally {
      AcDbRenderingCache.instance.clear()
    }
  })

  it('keeps nested On-layer geometry when the INSERT layer is Off', async () => {
    const db = createDb()
    ensureModelLayout(db)
    ensureLayer(db, 'InsertOff', { isOff: true })
    ensureLayer(db, 'NestedOn')

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'PART'
    db.tables.blockTable.add(blockRecord)
    const nested = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(40, 0, 0)
    )
    nested.layer = 'NestedOn'
    blockRecord.appendEntity(nested)

    const insert = new AcDbBlockReference('PART')
    insert.layer = 'InsertOff'
    insert.position = new AcGePoint3d(10, 10, 0)
    db.tables.blockTable.modelSpace.appendEntity(insert)

    AcPdfRenderer.prepareExport()
    const renderer = new AcPdfRenderer()
    renderer.context.database = db
    try {
      const roots = await collectModelSpaceRoots(db, renderer)
      expect(roots).toHaveLength(1)
      expect(roots[0].visible).toBe(true)
      expect(roots[0].entityType).toBe('INSERT')
      const nestedRoot = roots[0].childAt(0)
      expect(nestedRoot?.layerName).toBe('NestedOn')
      expect(nestedRoot?.visible).toBe(true)
    } finally {
      AcDbRenderingCache.instance.clear()
    }
  })
})
