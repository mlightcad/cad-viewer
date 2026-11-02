import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbSymbolTable,
  AcDbSymbolTableRecord
} from '@mlightcad/data-model'

import { type EntitySnapshot, toEntitySnapshot } from './entitySnapshot'
import { readJsonFields } from './snapshotValue'

/** One symbol-table record copied for a script. */
export interface SymbolRecordSnapshot {
  /** Record object id. */
  id: string
  /** Record name. */
  name: string
  /** Table-specific fields. */
  [key: string]: unknown
}

/** One symbol table copied for a script. */
export interface SymbolTableSnapshot {
  /** Table object id. */
  id: string
  /** Records in table order, including unnamed entries. */
  records: SymbolRecordSnapshot[]
}

/**
 * Symbol tables on `cad.tables`.
 *
 * Names match {@link AcDbDatabase.tables}. Block records here are definitions
 * only. Entity lists live on {@link BlockSnapshot}.
 */
export interface DatabaseTablesSnapshot {
  appIdTable: SymbolTableSnapshot
  blockTable: SymbolTableSnapshot
  dimStyleTable: SymbolTableSnapshot
  linetypeTable: SymbolTableSnapshot
  textStyleTable: SymbolTableSnapshot
  ucsTable: SymbolTableSnapshot
  viewTable: SymbolTableSnapshot
  layerTable: SymbolTableSnapshot
  viewportTable: SymbolTableSnapshot
}

/**
 * One block definition, in the same role as a DXF BLOCKS section entry.
 */
export interface BlockSnapshot {
  /** Block table record id. Entities in the block use this as `ownerId`. */
  id: string
  /** Block name, including `*Model_Space` and `*Paper_Space`. */
  name: string
  /** Block base point. */
  origin: { x: number; y: number; z: number }
  /** True for model space. */
  isModelSpace: boolean
  /** True for a paper-space layout block. */
  isPaperSpace: boolean
  /** DXF group 70 block flags. */
  flags: number
  /** Xref path. Empty for a local block. */
  pathName: string
  /** True when the block is an external reference. */
  isXref: boolean
  /** Layout object id when this block is a paper space. */
  layoutId?: string
  /** Entities stored in the block, not including attributes on inserts. */
  entities: EntitySnapshot[]
}

const LAYER_FIELDS = [
  'description',
  'isFrozen',
  'isHidden',
  'isLocked',
  'isOff',
  'isPlottable',
  'color',
  'linetype',
  'lineWeight',
  'transparency'
] as const

const BLOCK_FIELDS = [
  'origin',
  'layoutId',
  'flags',
  'pathName',
  'isXref',
  'isOverlayReference',
  'blockInsertUnits',
  'explodability',
  'blockScaling'
] as const

const LINETYPE_FIELDS = ['numDashes', 'patternLength', 'comments'] as const

const TEXT_STYLE_FIELDS = [
  'obliquingAngle',
  'priorSize',
  'textSize',
  'xScale',
  'isVertical',
  'isShapeFile',
  'fileName',
  'bigFontFileName'
] as const

const UCS_FIELDS = [
  'origin',
  'xAxis',
  'yAxis',
  'elevation',
  'isOrthographic',
  'orthographicType',
  'baseUcsId',
  'orthographicOrigin'
] as const

const VIEW_FIELDS = [
  'centerPoint',
  'viewDirectionFromTarget',
  'viewTarget',
  'viewHeight',
  'viewTwistAngle',
  'lensLength',
  'frontClippingPlane',
  'backClippingPlane',
  'viewWidth',
  'standardFlags'
] as const

const VIEWPORT_FIELDS = [
  'center',
  'lowerLeftCorner',
  'upperRightCorner',
  'viewHeight',
  'viewTwistAngle',
  'snapBase',
  'snapAngle',
  'snapIncrements',
  'gridIncrements',
  'circleSides',
  'gridMajor',
  'standardFlag'
] as const

const DIM_STYLE_FIELDS = [
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
  'dimadec',
  'dimunit',
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
  'dimfit',
  'dimupt',
  'dimatfit',
  'dimtxsty',
  'dimldrblk',
  'dimblk',
  'dimblk1',
  'dimblk2',
  'dimlwd',
  'dimlwe',
  'dimclrd',
  'dimclre',
  'dimclrt'
] as const

/**
 * Copies every symbol table.
 *
 * @param database - Open drawing database.
 * @returns Plain tables safe to return from a script.
 */
export function toDatabaseTables(
  database: AcDbDatabase
): DatabaseTablesSnapshot {
  const tables = database.tables
  return {
    appIdTable: toTable(tables.appIdTable),
    blockTable: toTable(tables.blockTable, record =>
      record instanceof AcDbBlockTableRecord ? blockRecord(record) : {}
    ),
    dimStyleTable: toTable(tables.dimStyleTable, record =>
      readJsonFields(record, DIM_STYLE_FIELDS)
    ),
    linetypeTable: toTable(tables.linetypeTable, record =>
      readJsonFields(record, LINETYPE_FIELDS)
    ),
    textStyleTable: toTable(tables.textStyleTable, record =>
      readJsonFields(record, TEXT_STYLE_FIELDS)
    ),
    ucsTable: toTable(tables.ucsTable, record =>
      readJsonFields(record, UCS_FIELDS)
    ),
    viewTable: toTable(tables.viewTable, record =>
      readJsonFields(record, VIEW_FIELDS)
    ),
    layerTable: toTable(tables.layerTable, record =>
      readJsonFields(record, LAYER_FIELDS)
    ),
    viewportTable: toTable(tables.viewportTable, record =>
      readJsonFields(record, VIEWPORT_FIELDS)
    )
  }
}

/**
 * Copies every block definition and the entities stored in it.
 *
 * @param database - Open drawing database.
 * @returns Block snapshots in table order, including model space and paper space.
 */
export function toBlockSnapshots(database: AcDbDatabase): BlockSnapshot[] {
  const blocks: BlockSnapshot[] = []
  for (const record of database.tables.blockTable.newIterator(true)) {
    blocks.push(toBlock(record))
  }
  return blocks
}

function toBlock(record: AcDbBlockTableRecord): BlockSnapshot {
  const entities: EntitySnapshot[] = []
  for (const entity of record.newIterator()) {
    entities.push(toEntitySnapshot(entity))
  }
  const layoutId = record.layoutId
  return {
    id: record.objectId,
    name: record.name,
    origin: {
      x: record.origin.x,
      y: record.origin.y,
      z: record.origin.z
    },
    isModelSpace: record.isModelSapce,
    isPaperSpace: record.isPaperSapce,
    flags: record.flags,
    pathName: record.pathName,
    isXref: record.isXref,
    ...(layoutId ? { layoutId } : {}),
    entities
  }
}

function toTable(
  table: AcDbSymbolTable,
  extra?: (record: AcDbSymbolTableRecord) => Record<string, unknown>
): SymbolTableSnapshot {
  const records: SymbolRecordSnapshot[] = []
  for (const record of table.newIterator(true)) {
    records.push({
      id: record.objectId,
      name: record.name,
      ...extraFields(record, extra)
    })
  }
  return { id: table.objectId, records }
}

function extraFields(
  record: AcDbSymbolTableRecord,
  extra?: (record: AcDbSymbolTableRecord) => Record<string, unknown>
): Record<string, unknown> {
  return extra ? extra(record) : {}
}

function blockRecord(record: AcDbBlockTableRecord): Record<string, unknown> {
  return {
    ...readJsonFields(record, BLOCK_FIELDS),
    isModelSpace: record.isModelSapce,
    isPaperSpace: record.isPaperSapce
  }
}
