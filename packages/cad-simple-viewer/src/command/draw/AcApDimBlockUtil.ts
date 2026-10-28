import {
  AcDbAlignedDimension,
  AcDbArc,
  AcDbCircle,
  AcDbDatabase,
  AcDbDataGenerator,
  AcDbDimension,
  AcDbDimStyleTableRecord,
  AcDbLine,
  AcDbPolyline,
  AcDbRotatedDimension,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

export const DIM_PREVIEW_BLOCK = '*UDIM'

export interface DimDefinitionPoints {
  xLine1Point: AcGePoint3dLike
  xLine2Point: AcGePoint3dLike
}

type DimWithBlock = AcDbDimension & {
  createDimBlock(name: string): import('@mlightcad/data-model').AcDbBlockTableRecord
}

/** Allocate the next anonymous dimension block name `*D{n}`. */
export function allocateDimBlockName(db: AcDbDatabase): string {
  const blocks = db.tables.blockTable.newIterator()
  let maxNum = 0
  for (const block of blocks) {
    const name = block.name
    if (!name.startsWith('*D')) continue
    const num = Number(name.slice(2))
    if (Number.isInteger(num) && num > maxNum) {
      maxNum = num
    }
  }
  return `*D${maxNum + 1}`
}

/** Ensure default arrow resources exist for dimension creation. */
export function ensureDimResources(db: AcDbDatabase) {
  new AcDbDataGenerator(db).createArrowBlock()
}

/** Fields the Dimension Style Manager reads and writes. */
export const DIM_STYLE_FIELDS = [
  'dimpost',
  'dimapost',
  'dimscale',
  'dimasz',
  'dimexo',
  'dimdli',
  'dimexe',
  'dimrnd',
  'dimdle',
  'dimtp',
  'dimtm',
  'dimtxt',
  'dimcen',
  'dimtsz',
  'dimaltf',
  'dimlfac',
  'dimtvp',
  'dimtfac',
  'dimgap',
  'dimaltrnd',
  'dimtfill',
  'dimtfillclr',
  'dimtxtdirection',
  'dimtol',
  'dimlim',
  'dimtih',
  'dimtoh',
  'dimse1',
  'dimse2',
  'dimtad',
  'dimzin',
  'dimazin',
  'dimalt',
  'dimaltd',
  'dimtofl',
  'dimsah',
  'dimtix',
  'dimsoxd',
  'dimclrd',
  'dimclre',
  'dimclrt',
  'dimadec',
  'dimdec',
  'dimtdec',
  'dimaltu',
  'dimalttd',
  'dimaunit',
  'dimfrac',
  'dimlunit',
  'dimdsep',
  'dimtmove',
  'dimjust',
  'dimsd1',
  'dimsd2',
  'dimtolj',
  'dimtzin',
  'dimaltz',
  'dimalttz',
  'dimatfit',
  'dimupt',
  'dimtxsty',
  'dimldrblk',
  'dimblk',
  'dimblk1',
  'dimblk2',
  'dimlwd',
  'dimlwe'
] as const

export type DimStyleField = (typeof DIM_STYLE_FIELDS)[number]

const OVERRIDE_STYLE = '*DimOverride'
const dimStyleOverrides = new WeakMap<AcDbDatabase, Partial<Record<DimStyleField, unknown>>>()

export function readDimStyleFields(
  style: AcDbDimStyleTableRecord
): Record<DimStyleField, unknown> {
  const out = {} as Record<DimStyleField, unknown>
  for (const key of DIM_STYLE_FIELDS) {
    out[key] = (style as unknown as Record<string, unknown>)[key]
  }
  return out
}

export function writeDimStyleFields(
  style: AcDbDimStyleTableRecord,
  values: Partial<Record<DimStyleField, unknown>>
) {
  for (const key of DIM_STYLE_FIELDS) {
    if (values[key] !== undefined) {
      ;(style as unknown as Record<string, unknown>)[key] = values[key]
    }
  }
}

export function getDimStyleOverride(db: AcDbDatabase) {
  return dimStyleOverrides.get(db) ?? null
}

export function setDimStyleOverride(
  db: AcDbDatabase,
  values: Partial<Record<DimStyleField, unknown>> | null
) {
  if (!values || Object.keys(values).length === 0) {
    dimStyleOverrides.delete(db)
    return
  }
  dimStyleOverrides.set(db, values)
}

function ensureOverrideStyle(
  db: AcDbDatabase,
  values: Partial<Record<DimStyleField, unknown>>
) {
  const baseName = db.dimstyle || 'Standard'
  const base = db.tables.dimStyleTable.getAt(baseName)
  let record = db.tables.dimStyleTable.getAt(OVERRIDE_STYLE)
  if (!record) {
    record = new AcDbDimStyleTableRecord()
    record.name = OVERRIDE_STYLE
    db.tables.dimStyleTable.add(record)
  }
  if (base) writeDimStyleFields(record, readDimStyleFields(base))
  writeDimStyleFields(record, values)
  return record
}

/** Bind the database current dimstyle ($DIMSTYLE) onto a new dimension. */
export function applyCurrentDimStyle(dim: AcDbDimension, db: AcDbDatabase) {
  const override = dimStyleOverrides.get(db)
  if (override && Object.keys(override).length > 0) {
    ensureOverrideStyle(db, override)
    dim.dimensionStyleName = OVERRIDE_STYLE
    return
  }
  dim.dimensionStyleName = db.dimstyle || null
}

/**
 * Drop a preview/anonymous dim block and erase its entities.
 * `blockTable.remove` alone leaves child handles in the database; when the
 * dim command's undo transaction commits, those orphans were notified as
 * `entityAppended` and converted into the scene.
 */
function disposeDimBlock(db: AcDbDatabase, blockName: string) {
  const btr = db.tables.blockTable.getAt(blockName)
  if (!btr) return
  const ids: string[] = []
  for (const entity of btr.newIterator()) {
    ids.push(entity.objectId)
  }
  if (ids.length > 0) {
    btr.removeEntity(ids)
  }
  db.tables.blockTable.remove(blockName)
}

/**
 * Rebuild the temporary preview anonymous block for a dimension jig.
 * Callers must remove `*UDIM` in jig.end().
 */
export function rebuildPreviewBlock(
  db: AcDbDatabase,
  dim: DimWithBlock,
  blockName: string = DIM_PREVIEW_BLOCK
) {
  ensureDimResources(db)
  disposeDimBlock(db, blockName)
  db.tables.blockTable.add(dim.createDimBlock(blockName))
  dim.dimBlockId = blockName
}

/** Commit a permanent `*D{n}` block and return the allocated name. */
export function commitDimBlock(db: AcDbDatabase, dim: DimWithBlock): string {
  ensureDimResources(db)
  const blockName = allocateDimBlockName(db)
  db.tables.blockTable.add(dim.createDimBlock(blockName))
  dim.dimBlockId = blockName
  return blockName
}

export function removePreviewBlock(
  db: AcDbDatabase,
  blockName: string = DIM_PREVIEW_BLOCK
) {
  disposeDimBlock(db, blockName)
}

/**
 * Extract two extension-line origins from a selected entity (AutoCAD object mode).
 */
export function definitionPointsFromEntity(
  entity: unknown
): DimDefinitionPoints | null {
  if (entity instanceof AcDbLine) {
    return {
      xLine1Point: entity.startPoint.clone(),
      xLine2Point: entity.endPoint.clone()
    }
  }
  if (entity instanceof AcDbCircle) {
    const c = entity.center
    const r = entity.radius
    return {
      xLine1Point: new AcGePoint3d(c.x - r, c.y, c.z),
      xLine2Point: new AcGePoint3d(c.x + r, c.y, c.z)
    }
  }
  if (entity instanceof AcDbArc) {
    return {
      xLine1Point: entity.startPoint.clone(),
      xLine2Point: entity.endPoint.clone()
    }
  }
  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    if (n < 2) return null
    return {
      xLine1Point: entity.getPoint3dAt(0),
      xLine2Point: entity.getPoint3dAt(n - 1)
    }
  }
  return null
}

/** Infer horizontal (0) or vertical (π/2) from dim-line placement relative to the chord. */
export function inferLinearRotation(
  x1: AcGePoint3dLike,
  x2: AcGePoint3dLike,
  dimLinePoint: AcGePoint3dLike
): number {
  const midX = (x1.x + x2.x) / 2
  const midY = (x1.y + x2.y) / 2
  const dx = Math.abs(dimLinePoint.x - midX)
  const dy = Math.abs(dimLinePoint.y - midY)
  return dy >= dx ? 0 : Math.PI / 2
}

export function isRotatedDimension(
  dim: AcDbDimension
): dim is AcDbRotatedDimension {
  return dim instanceof AcDbRotatedDimension
}

export function isAlignedDimension(
  dim: AcDbDimension
): dim is AcDbAlignedDimension {
  return dim instanceof AcDbAlignedDimension
}
