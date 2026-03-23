/* eslint-disable simple-import-sort/imports */
import { AcCmColor, AcCmEventManager } from '@mlightcad/common'

import { AcDbDxfFiler } from '../base/AcDbDxfFiler'
import { AcDbObject, AcDbObjectId } from '../base/AcDbObject'
import { AcDbRegenerator } from '../converter'
import {
  AcDbConverterType,
  AcDbDatabaseConverterManager,
  AcDbFileType
} from './AcDbDatabaseConverterManager'
import {
  AcDb2dPolyline,
  AcDb3dPolyline,
  AcDbBlockReference,
  AcDbEntity
} from '../entity'
import {
  AcDbAngleUnits,
  AcDbDataGenerator,
  AcDbUnitsValue,
  DEFAULT_TEXT_STYLE
} from '../misc'
import { AcDbDictionary } from '../object/AcDbDictionary'
import { AcDbRasterImageDef } from '../object/AcDbRasterImageDef'
import { AcDbXrecord } from '../object/AcDbXrecord'
import { AcDbBlockTable } from './AcDbBlockTable'
import { AcDbBlockTableRecord } from './AcDbBlockTableRecord'
import { AcDbConversionStage, AcDbStageStatus } from './AcDbDatabaseConverter'
import { AcDbDimStyleTable } from './AcDbDimStyleTable'
import { AcDbDimStyleTableRecord } from './AcDbDimStyleTableRecord'
import { AcDbLayerTable } from './AcDbLayerTable'
import {
  AcDbLayerTableRecord,
  AcDbLayerTableRecordAttrs
} from './AcDbLayerTableRecord'
import { AcDbLinetypeTable } from './AcDbLinetypeTable'
import { AcDbLinetypeTableRecord } from './AcDbLinetypeTableRecord'
import { AcDbTextStyleTable } from './AcDbTextStyleTable'
import { AcDbTextStyleTableRecord } from './AcDbTextStyleTableRecord'
import { AcDbViewportTable } from './AcDbViewportTable'
import { AcDbViewportTableRecord } from './AcDbViewportTableRecord'
import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'
import { AcDbDwgVersion } from './AcDbDwgVersion'
import { AcGiLineWeight } from '@mlightcad/graphic-interface'
import { AcDbRegAppTable } from './AcDbRegAppTable'
import { AcDbRegAppTableRecord } from './AcDbRegAppTableRecord'
import { AcDbSysVarManager, AcDbSysVarType } from './AcDbSysVarManager'
import { AcDbSystemVariables } from './AcDbSystemVariables'
import { AcDbLayout } from '../object/layout/AcDbLayout'
import { AcDbLayoutDictionary } from '../object/layout/AcDbLayoutDictionary'

/**
 * Event arguments for object events in the dictionary.
 */
export interface AcDbDictObjectEventArgs {
  /** The database that triggered the event */
  database: AcDbDatabase
  /** The object (or objects) involved in the event */
  object: AcDbObject | AcDbObject[]
  /** The key name of the object */
  key: string
}

/**
 * Event arguments for entity-related events.
 */
export interface AcDbEntityEventArgs {
  /** The database that triggered the event */
  database: AcDbDatabase
  /** The entity (or entities) involved in the event */
  entity: AcDbEntity | AcDbEntity[]
}

/**
 * Event arguments for layer-related events.
 */
export interface AcDbLayerEventArgs {
  /** The database that triggered the event */
  database: AcDbDatabase
  /** The layer involved in the event */
  layer: AcDbLayerTableRecord
}

/**
 * Event arguments for layer modification events.
 */
export interface AcDbLayerModifiedEventArgs extends AcDbLayerEventArgs {
  /** The changes made to the layer */
  changes: Partial<AcDbLayerTableRecordAttrs>
}

/**
 * The stage of opening one drawing file
 */
export type AcDbOpenFileStage = 'FETCH_FILE' | 'CONVERSION'

/**
 * Event arguments for progress events during database operations.
 */
export interface AcDbProgressdEventArgs {
  /** The database that triggered the event */
  database: AcDbDatabase
  /** The progress percentage (0-100) */
  percentage: number
  /** The current stage of opening one drawing file */
  stage: AcDbOpenFileStage
  /** The current sub stage */
  subStage?: AcDbConversionStage
  /** The status of the current sub stage */
  subStageStatus: AcDbStageStatus
  /**
   * Store data associated with the current sub stage. Its meaning of different sub stages
   * are as follows.
   * - 'PARSE' stage: statistics of parsing task
   * - 'FONT' stage: fonts needed by this drawing
   *
   * Note: For now, 'PARSE' and 'FONT' sub stages use this field only.
   */
  data?: unknown
}

/**
 * Font information structure.
 *
 * Contains information about a font including its name, file path,
 * type, and URL for loading.
 */
export interface AcDbFontInfo {
  /** Array of font names/aliases */
  name: string[]
  /** Font file name */
  file: string
  /** Font type (mesh or shx) */
  type: 'mesh' | 'shx'
  /** URL for loading the font */
  url: string
}

/**
 * Interface for loading fonts when opening a document.
 *
 * Applications should implement this interface to provide font loading
 * functionality when opening drawing databases that contain text entities.
 */
export interface AcDbFontLoader {
  /**
   * Loads the specified fonts.
   *
   * @param fontNames - Array of font names to load
   * @returns Promise that resolves when fonts are loaded
   *
   * @example
   * ```typescript
   * const fontLoader: AcDbFontLoader = {
   *   async load(fontNames: string[]) {
   *     // Load fonts implementation
   *   },
   *   async getAvaiableFonts() {
   *     return [];
   *   }
   * };
   * ```
   */
  load(fontNames: string[]): Promise<void>

  /**
   * Gets all available fonts.
   *
   * @returns Promise that resolves to an array of available font information
   *
   * @example
   * ```typescript
   * const fonts = await fontLoader.getAvaiableFonts();
   * console.log('Available fonts:', fonts);
   * ```
   */
  getAvaiableFonts(): Promise<AcDbFontInfo[]>
}

/**
 * Options for reading a drawing database.
 *
 * These options control how a drawing database is opened and processed.
 */
export interface AcDbOpenDatabaseOptions {
  /**
   * Opens the drawing database in read-only mode.
   *
   * When true, the database will be opened in read-only mode, preventing
   * any modifications to the database content.
   */
  readOnly?: boolean

  /**
   * Loader used to load fonts used in the drawing database.
   *
   * This loader will be used to load any fonts referenced by text entities
   * in the drawing database.
   */
  fontLoader?: AcDbFontLoader

  /**
   * The minimum number of items in one chunk.
   *
   * If this value is greater than the total number of entities in the
   * drawing database, the total number is used. This controls how the
   * database processing is broken into chunks for better performance.
   */
  minimumChunkSize?: number

  /**
   * Timeout for web worker parsing in milliseconds.
   *
   * This option is used only when the selected converter parses the drawing
   * file in a web worker. If omitted, the converter-level timeout is used.
   */
  timeout?: number
}

/**
 * Interface defining the tables available in a drawing database.
 *
 * This interface provides access to all the symbol tables in the database,
 * including block table, dimension style table, linetype table, text style table,
 * layer table, and viewport table.
 */
export interface AcDbTables {
  /** Registered application name table */
  readonly appIdTable: AcDbRegAppTable
  /** Block table containing block definitions */
  readonly blockTable: AcDbBlockTable
  /** Dimension style table containing dimension style definitions */
  readonly dimStyleTable: AcDbDimStyleTable
  /** Linetype table containing linetype definitions */
  readonly linetypeTable: AcDbLinetypeTable
  /** Text style table containing text style definitions */
  readonly textStyleTable: AcDbTextStyleTable
  /** Layer table containing layer definitions */
  readonly layerTable: AcDbLayerTable
  /** Viewport table containing viewport definitions */
  readonly viewportTable: AcDbViewportTable
}

/**
 * Options used to specify default data to create
 */
export interface AcDbCreateDefaultDataOptions {
  layer?: boolean
  lineType?: boolean
  textStyle?: boolean
  dimStyle?: boolean
  layout?: boolean
}

/**
 * The AcDbDatabase class represents an AutoCAD drawing file.
 *
 * Each AcDbDatabase object contains the various header variables, symbol tables,
 * table records, entities, and objects that make up the drawing. The AcDbDatabase
 * class has member functions to allow access to all the symbol tables, to read
 * and write to DWG files, to get or set database defaults, to execute various
 * database-level operations, and to get or set all header variables.
 *
 * @example
 * ```typescript
 * const database = new AcDbDatabase();
 * await database.read(dxfData, { readOnly: true });
 * const entities = database.tables.blockTable.modelSpace.entities;
 * ```
 */
export class AcDbDatabase extends AcDbObject {
  /** Version of the database */
  private _version: AcDbDwgVersion
  /** Angle base for the database */
  private _angBase: number
  /** Angle direction for the database */
  private _angDir: number
  /** Angle units for the database */
  private _aunits: AcDbAngleUnits
  /** Current entity color */
  private _cecolor: AcCmColor
  /** Current entity linetype scale */
  private _celtscale: number
  /** Current entity line weight value */
  private _celweight: AcGiLineWeight
  /** Current layer for the database */
  private _clayer: string
  /** Current text style name for the database */
  private _textstyle: string
  /** The extents of current Model Space */
  private _extents: AcGeBox3d
  /** Insertion units for the database */
  private _insunits: AcDbUnitsValue
  /** Global linetype scale */
  private _ltscale: number
  /** The flag whether to display line weight */
  private _lwdisplay: boolean
  /** Point display mode */
  private _pdmode: number
  /** Point display size */
  private _pdsize: number
  /** Running object snap mode bitmask */
  private _osmode: number
  /** Tables in the database */
  private _tables: AcDbTables
  /** Nongraphical objects in the database */
  private _objects: {
    readonly dictionary: AcDbDictionary<AcDbDictionary>
    readonly imageDefinition: AcDbDictionary<AcDbRasterImageDef>
    readonly layout: AcDbLayoutDictionary
    readonly xrecord: AcDbDictionary<AcDbXrecord>
  }
  /** Current space (model space or paper space) */
  private _currentSpace?: AcDbBlockTableRecord

  /**
   * Events that can be triggered by the database.
   *
   * These events allow applications to respond to various database operations
   * such as entity modifications, layer changes, and progress updates.
   */
  public readonly events = {
    /** Fired when an object is set to the dictionary */
    dictObjetSet: new AcCmEventManager<AcDbDictObjectEventArgs>(),
    /** Fired when an object in the dictionary is removed */
    dictObjectErased: new AcCmEventManager<AcDbDictObjectEventArgs>(),
    /** Fired when an entity is appended to the database */
    entityAppended: new AcCmEventManager<AcDbEntityEventArgs>(),
    /** Fired when an entity is modified in the database */
    entityModified: new AcCmEventManager<AcDbEntityEventArgs>(),
    /** Fired when an entity is erased from the database */
    entityErased: new AcCmEventManager<AcDbEntityEventArgs>(),
    /** Fired when a layer is appended to the database */
    layerAppended: new AcCmEventManager<AcDbLayerEventArgs>(),
    /** Fired when a layer is modified in the database */
    layerModified: new AcCmEventManager<AcDbLayerModifiedEventArgs>(),
    /** Fired when a layer is erased from the database */
    layerErased: new AcCmEventManager<AcDbLayerEventArgs>(),
    /** Fired during database opening operations to report progress */
    openProgress: new AcCmEventManager<AcDbProgressdEventArgs>()
  }

  public static MLIGHTCAD_APPID = 'mlightcad'

  /**
   * Creates a new AcDbDatabase instance.
   */
  constructor() {
    super()
    this._version = new AcDbDwgVersion('AC1014')
    this._angBase = 0
    this._angDir = 0
    this._aunits = AcDbAngleUnits.DecimalDegrees
    this._celtscale = 1
    this._cecolor = new AcCmColor()
    this._celweight = AcGiLineWeight.ByLayer
    this._clayer = '0'
    this._textstyle = DEFAULT_TEXT_STYLE
    this._extents = new AcGeBox3d()
    // TODO: Default value is 1 (imperial) or 4 (metric)
    this._insunits = AcDbUnitsValue.Millimeters
    this._ltscale = 1
    this._lwdisplay = true
    this._pdmode = 0
    this._pdsize = 0
    this._osmode = 0
    this._tables = {
      appIdTable: new AcDbRegAppTable(this),
      blockTable: new AcDbBlockTable(this),
      dimStyleTable: new AcDbDimStyleTable(this),
      linetypeTable: new AcDbLinetypeTable(this),
      textStyleTable: new AcDbTextStyleTable(this),
      layerTable: new AcDbLayerTable(this),
      viewportTable: new AcDbViewportTable(this)
    }
    this._objects = {
      dictionary: new AcDbDictionary(this),
      imageDefinition: new AcDbDictionary(this),
      layout: new AcDbLayoutDictionary(this),
      xrecord: new AcDbDictionary(this)
    }
    this._tables.appIdTable.add(
      new AcDbRegAppTableRecord(AcDbDatabase.MLIGHTCAD_APPID)
    )
  }

  /**
   * Gets all tables in this drawing database.
   *
   * @returns Object containing all the symbol tables in the database
   *
   * @example
   * ```typescript
   * const tables = database.tables;
   * const layers = tables.layerTable;
   * const blocks = tables.blockTable;
   * ```
   */
  get tables() {
    return this._tables
  }

  /**
   * Gets all nongraphical objects in this drawing database.
   *
   * @returns Object containing all nongraphical objects in the database
   *
   * @example
   * ```typescript
   * const objects = database.objects;
   * const layout = objects.layout;
   * ```
   */
  get objects() {
    return this._objects
  }

  /**
   * Gets the object ID of the AcDbBlockTableRecord of the current space.
   *
   * The current space can be either model space or paper space.
   *
   * @returns The object ID of the current space
   *
   * @example
   * ```typescript
   * const currentSpaceId = database.currentSpaceId;
   * ```
   */
  get currentSpaceId() {
    if (!this._currentSpace) {
      this._currentSpace = this._tables.blockTable.modelSpace
    }
    return this._currentSpace.objectId
  }

  /**
   * Sets the current space by object ID.
   *
   * @param value - The object ID of the block table record to set as current space
   * @throws {Error} When the specified block table record ID doesn't exist
   *
   * @example
   * ```typescript
   * database.currentSpaceId = 'some-block-record-id';
   * ```
   */
  set currentSpaceId(value: AcDbObjectId) {
    const currentSpace = this.tables.blockTable.getIdAt(value)
    if (currentSpace == null) {
      throw new Error(
        `[AcDbDatabase] The specified block table record id '${value}' doesn't exist in the drawing database!`
      )
    } else {
      this._currentSpace = currentSpace
    }
  }

  /**
   * Gets the angle units for the database.
   *
   * This is the current AUNITS value for the database.
   *
   * @returns The angle units value
   *
   * @example
   * ```typescript
   * const angleUnits = database.aunits;
   * ```
   */
  get aunits(): number {
    return this._aunits
  }

  /**
   * Sets the angle units for the database.
   *
   * @param value - The new angle units value
   *
   * @example
   * ```typescript
   * database.aunits = AcDbAngleUnits.DecimalDegrees;
   * ```
   */
  set aunits(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.AUNITS,
      this._aunits,
      value ?? 0,
      nextValue => {
        this._aunits = nextValue
      }
    )
  }

  /**
   * Gets the version of the database.
   *
   * @returns The version of the database
   *
   */
  get version(): AcDbDwgVersion {
    return this._version
  }

  /**
   * Sets the version of the database.
   *
   * @param value - The version value of the database
   */
  set version(value: string | number) {
    this.updateSysVar(
      AcDbSystemVariables.ACADVER,
      this._version,
      new AcDbDwgVersion(value),
      nextValue => {
        this._version = nextValue
      }
    )
  }

  /**
   * Gets the drawing-units value for automatic scaling of blocks, images, or xrefs.
   *
   * This is the current INSUNITS value for the database.
   *
   * @returns The insertion units value
   *
   * @example
   * ```typescript
   * const insertionUnits = database.insunits;
   * ```
   */
  get insunits(): number {
    return this._insunits
  }

  /**
   * Sets the drawing-units value for automatic scaling.
   *
   * @param value - The new insertion units value
   *
   * @example
   * ```typescript
   * database.insunits = AcDbUnitsValue.Millimeters;
   * ```
   */
  set insunits(value: number) {
    // TODO: Default value is 1 (imperial) or 4 (metric)
    this.updateSysVar(
      AcDbSystemVariables.INSUNITS,
      this._insunits,
      value ?? 4,
      nextValue => {
        this._insunits = nextValue
      }
    )
  }

  /**
   * Gets the line type scale factor.
   *
   * @returns The line type scale factor
   *
   * @example
   * ```typescript
   * const lineTypeScale = database.ltscale;
   * ```
   */
  get ltscale(): number {
    return this._ltscale
  }

  /**
   * Sets the line type scale factor.
   *
   * @param value - The new line type scale factor
   *
   * @example
   * ```typescript
   * database.ltscale = 2.0;
   * ```
   */
  set ltscale(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.LTSCALE,
      this._ltscale,
      value ?? 1,
      nextValue => {
        this._ltscale = nextValue
      }
    )
  }

  /**
   * Gets the flag whether to display line weight.
   *
   * @returns The flag whether to display line weight.
   *
   * @example
   * ```typescript
   * const lineTypeScale = database.ltscale;
   * ```
   */
  get lwdisplay(): boolean {
    return this._lwdisplay
  }

  /**
   * Sets the flag whether to display line weight.
   *
   * @param value - The flag whether to display line weight.
   *
   * @example
   * ```typescript
   * database.lwdisplay = true;
   * ```
   */
  set lwdisplay(value: boolean) {
    this.updateSysVar(
      AcDbSystemVariables.LWDISPLAY,
      this._lwdisplay,
      value ?? false,
      nextValue => {
        this._lwdisplay = nextValue
      }
    )
  }

  /**
   * Gets the color of new objects as they are created.
   *
   * @returns The current entity color
   *
   * @example
   * ```typescript
   * const currentColor = database.cecolor;
   * ```
   */
  get cecolor(): AcCmColor {
    return this._cecolor
  }

  /**
   * Sets the color of new objects as they are created.
   *
   * @param value - The new current entity color
   *
   * @example
   * ```typescript
   * database.cecolor = new AcCmColor(0xFF0000);
   * ```
   */
  set cecolor(value: AcCmColor) {
    this.updateSysVar(
      AcDbSystemVariables.CECOLOR,
      this._cecolor,
      value || 0,
      nextValue => {
        this._cecolor = nextValue.clone()
      }
    )
  }

  /**
   * The line type scaling for new objects relative to the ltscale setting. A line created with
   * celtscale = 2 in a drawing with ltscale set to 0.5 would appear the same as a line created
   * with celtscale = 1 in a drawing with ltscale = 1.
   */
  get celtscale(): number {
    return this._celtscale
  }
  set celtscale(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.CELTSCALE,
      this._celtscale,
      value ?? 1,
      nextValue => {
        this._celtscale = nextValue
      }
    )
  }

  /**
   * The layer of new objects as they are created.
   */
  get celweight(): AcGiLineWeight {
    return this._celweight
  }
  set celweight(value: AcGiLineWeight) {
    this.updateSysVar(
      AcDbSystemVariables.CELWEIGHT,
      this._celweight,
      value ?? AcGiLineWeight.ByLayer,
      nextValue => {
        this._celweight = nextValue
      }
    )
  }

  /**
   * The layer of new objects as they are created.
   */
  get clayer(): string {
    return this._clayer
  }
  set clayer(value: string) {
    this.updateSysVar(
      AcDbSystemVariables.CLAYER,
      this._clayer,
      value ?? '0',
      nextValue => {
        this._clayer = nextValue
      }
    )
  }

  /**
   * The text style name for new text objects.
   */
  get textstyle(): string {
    return this._textstyle
  }
  set textstyle(value: string) {
    this.updateSysVar(
      AcDbSystemVariables.TEXTSTYLE,
      this._textstyle,
      value ?? DEFAULT_TEXT_STYLE,
      nextValue => {
        this._textstyle = nextValue
      }
    )
  }

  /**
   * The zero (0) base angle with respect to the current UCS in radians.
   */
  get angBase(): number {
    return this._angBase
  }
  set angBase(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.ANGBASE,
      this._angBase,
      value ?? 0,
      nextValue => {
        this._angBase = nextValue
      }
    )
  }

  /**
   * The direction of positive angles.
   * - 0: Counterclockwise
   * - 1: Clockwise
   */
  get angDir(): number {
    return this._angDir
  }
  set angDir(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.ANGDIR,
      this._angDir,
      value ?? 0,
      nextValue => {
        this._angDir = nextValue
      }
    )
  }

  /**
   * The current Model Space EXTMAX value
   */
  get extmax(): AcGePoint3d {
    return this._extents.max
  }
  set extmax(value: AcGePoint3dLike) {
    if (value) {
      const oldExtMax = this._extents.max.clone()
      this._extents.expandByPoint(value)
      if (!this._extents.max.equals(oldExtMax)) {
        this.triggerSysVarChangedEvent(
          AcDbSystemVariables.EXTMAX,
          oldExtMax,
          this._extents.max
        )
      }
    }
  }

  /**
   * The current Model Space EXTMIN value
   */
  get extmin(): AcGePoint3d {
    return this._extents.min
  }
  set extmin(value: AcGePoint3dLike) {
    if (value) {
      const oldExtMin = this._extents.min.clone()
      this._extents.expandByPoint(value)
      if (!this._extents.min.equals(oldExtMin)) {
        this.triggerSysVarChangedEvent(
          AcDbSystemVariables.EXTMIN,
          oldExtMin,
          this._extents.min
        )
      }
    }
  }

  /**
   * The extents of current Model Space
   */
  get extents() {
    return this._extents
  }

  /**
   * Point display mode. Please get more details on value of this property from [this page](https://help.autodesk.com/view/ACDLT/2022/ENU/?guid=GUID-82F9BB52-D026-4D6A-ABA6-BF29641F459B).
   */
  get pdmode(): number {
    return this._pdmode
  }
  set pdmode(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.PDMODE,
      this._pdmode,
      value ?? 0,
      nextValue => {
        this._pdmode = nextValue
      }
    )
  }

  /**
   * Point display size.
   * - 0: Creates a point at 5 percent of the drawing area height
   * - > 0: Specifies an absolute size
   * - < 0: Specifies a percentage of the viewport size
   */
  get pdsize(): number {
    return this._pdsize
  }
  set pdsize(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.PDSIZE,
      this._pdsize,
      value ?? 0,
      nextValue => {
        this._pdsize = nextValue
      }
    )
  }

  /**
   * Running Object Snap (OSNAP) mode bitmask.
   */
  get osmode(): number {
    return this._osmode
  }
  set osmode(value: number) {
    this.updateSysVar(
      AcDbSystemVariables.OSMODE,
      this._osmode,
      value ?? 0,
      nextValue => {
        this._osmode = nextValue
      }
    )
  }

  /**
   * Reads drawing data from a string or ArrayBuffer.
   *
   * This method parses the provided data and populates the database with
   * the resulting entities, tables, and objects. The method supports
   * both DXF and DWG file formats.
   *
   * @param data - The drawing data as a string or ArrayBuffer
   *   - For DXF files: Pass a string containing the DXF content
   *   - For DWG files: Pass an ArrayBuffer instance containing the binary DWG data
   * @param options - Options for reading the database
   * @param fileType - The type of file being read (defaults to DXF)
   *
   * @example
   * ```typescript
   * // Reading a DXF file (string)
   * const database = new AcDbDatabase();
   * await database.read(dxfString, { readOnly: true }, AcDbFileType.DXF);
   *
   * // Reading a DWG file (ArrayBuffer)
   * const database = new AcDbDatabase();
   * await database.read(dwgArrayBuffer, { readOnly: true }, AcDbFileType.DWG);
   * ```
   */
  async read(
    data: ArrayBuffer,
    options: AcDbOpenDatabaseOptions,
    fileType: AcDbConverterType = AcDbFileType.DXF
  ) {
    const converter = AcDbDatabaseConverterManager.instance.get(fileType)
    if (converter == null)
      throw new Error(
        `Database converter for file type '${fileType}' isn't registered and can can't read this file!`
      )

    this.clear()

    await converter.read(
      data,
      this,
      (options && options.minimumChunkSize) || 10,
      async (
        percentage: number,
        stage: AcDbConversionStage,
        stageStatus: AcDbStageStatus,
        data?: unknown
      ) => {
        this.events.openProgress.dispatch({
          database: this,
          percentage: percentage,
          stage: 'CONVERSION',
          subStage: stage,
          subStageStatus: stageStatus,
          data: data
        })
        if (
          options &&
          options.fontLoader &&
          stage == 'FONT' &&
          stageStatus == 'END'
        ) {
          const fonts = data
            ? (data as string[])
            : this.tables.textStyleTable.fonts
          await options.fontLoader.load(fonts)
        }
      },
      options?.timeout
    )
  }

  /**
   * Read AutoCAD DXF or DWG drawing specified by the URL into the database object.
   * The method automatically detects the file type based on the URL extension:
   * - .dxf files are read as text using readAsText()
   * - .dwg files are read as binary data using readAsArrayBuffer()
   * @param url Input the URL linked to one AutoCAD DXF or DWG file
   * @param options Input options to read drawing data
   */
  async openUri(url: string, options: AcDbOpenDatabaseOptions): Promise<void> {
    this.events.openProgress.dispatch({
      database: this,
      percentage: 0,
      stage: 'FETCH_FILE',
      subStageStatus: 'START'
    })

    const response = await fetch(url)
    if (!response.ok) {
      this.events.openProgress.dispatch({
        database: this,
        percentage: 100,
        stage: 'FETCH_FILE',
        subStageStatus: 'ERROR'
      })
      throw new Error(
        `Failed to fetch file '${url}' with HTTP status code '${response.status}'!`
      )
    }

    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : null
    let loadedBytes = 0

    // Create a reader to track progress
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    const chunks = []

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      chunks.push(value)
      loadedBytes += value.length

      // Calculate and report progress if we know the total size
      if (totalBytes !== null) {
        const percentage = Math.round((loadedBytes / totalBytes) * 100)
        this.events.openProgress.dispatch({
          database: this,
          percentage: percentage,
          stage: 'FETCH_FILE',
          subStageStatus: 'IN-PROGRESS'
        })
      }
    }

    // Combine all chunks into a single buffer
    const content = new Uint8Array(loadedBytes)
    let position = 0
    for (const chunk of chunks) {
      content.set(chunk, position)
      position += chunk.length
    }

    const fileName = this.getFileNameFromUri(url)
    const fileExtension = fileName.toLowerCase().split('.').pop()
    if (fileExtension === 'dwg') {
      // DWG files are binary, convert to ArrayBuffer
      await this.read(content.buffer, options, AcDbFileType.DWG)
    } else if (fileExtension === 'dxf') {
      await this.read(content.buffer, options, AcDbFileType.DXF)
    } else {
      await this.read(content.buffer, options, fileExtension)
    }

    this.events.openProgress.dispatch({
      database: this,
      percentage: 100,
      stage: 'FETCH_FILE',
      subStageStatus: 'END'
    })
  }

  /**
   * Exports the current database into an ASCII DXF string.
   *
   * The `fileName` parameter is kept for ObjectARX API parity. In this web
   * implementation the method returns the DXF payload instead of writing the
   * filesystem directly.
   */
  dxfOut(
    _fileName?: string,
    precision: number = 16,
    version: AcDbDwgVersion | string | number = this.version.name,
    _saveThumbnailImage: boolean = false
  ) {
    this.ensureDxfExportDefaults()

    const outVersion =
      version instanceof AcDbDwgVersion ? version : new AcDbDwgVersion(version)
    const filer = new AcDbDxfFiler({
      database: this,
      precision,
      version: outVersion
    })

    this.writeDxfHeaderSection(filer)
    this.writeDxfTablesSection(filer, outVersion)
    this.writeDxfBlocksSection(filer)
    this.writeDxfEntitiesSection(filer)
    this.writeDxfObjectsSection(filer)
    filer.writeStart('EOF')
    return filer.toString()
  }

  /**
   * Triggers xxxAppended events with data in the database to redraw the associated viewer.
   */
  async regen() {
    const converter = new AcDbRegenerator(this)
    await converter.read(
      null as unknown as ArrayBuffer,
      this,
      500,
      async (
        percentage: number,
        stage: AcDbConversionStage,
        stageStatus: AcDbStageStatus,
        data?: unknown
      ) => {
        this.events.openProgress.dispatch({
          database: this,
          percentage: percentage,
          stage: 'CONVERSION',
          subStage: stage,
          subStageStatus: stageStatus,
          data: data
        })
      }
    )
  }

  /**
   * Create default layer, line type, dimension type, text style and layout.
   * @param - Options to specify data to create
   */
  createDefaultData(
    options: AcDbCreateDefaultDataOptions = {
      layer: true,
      lineType: true,
      textStyle: true,
      dimStyle: true,
      layout: true
    }
  ) {
    const generator = new AcDbDataGenerator(this)

    // Create default layer
    if (options.layer) {
      generator.createDefaultLayer()
    }

    // Create default line type
    if (options.lineType) {
      generator.createDefaultLineType()
    }

    // Create default text style
    if (options.textStyle) {
      generator.createDefaultTextStyle()
    }

    // Create default dimension style
    if (options.dimStyle) {
      generator.createDefaultDimStyle()
    }

    // Create default layout for model space
    if (options.layout) {
      generator.createDefaultLayout()
    }
  }

  private ensureDxfExportDefaults() {
    if (!this.tables.layerTable.has('0')) {
      const defaultColor = new AcCmColor()
      defaultColor.colorIndex = 7
      this.tables.layerTable.add(
        new AcDbLayerTableRecord({
          name: '0',
          standardFlags: 0,
          linetype: 'Continuous',
          lineWeight: 0,
          isOff: false,
          color: defaultColor,
          isPlottable: true
        })
      )
    }

    if (!this.tables.linetypeTable.has('ByBlock')) {
      this.tables.linetypeTable.add(
        new AcDbLinetypeTableRecord({
          name: 'ByBlock',
          standardFlag: 0,
          description: '',
          totalPatternLength: 0
        })
      )
    }
    if (!this.tables.linetypeTable.has('ByLayer')) {
      this.tables.linetypeTable.add(
        new AcDbLinetypeTableRecord({
          name: 'ByLayer',
          standardFlag: 0,
          description: '',
          totalPatternLength: 0
        })
      )
    }
    if (!this.tables.linetypeTable.has('Continuous')) {
      this.tables.linetypeTable.add(
        new AcDbLinetypeTableRecord({
          name: 'Continuous',
          standardFlag: 0,
          description: 'Solid line',
          totalPatternLength: 0
        })
      )
    }

    if (!this.tables.textStyleTable.has(DEFAULT_TEXT_STYLE)) {
      this.tables.textStyleTable.add(
        new AcDbTextStyleTableRecord({
          name: DEFAULT_TEXT_STYLE,
          standardFlag: 0,
          fixedTextHeight: 0,
          widthFactor: 1,
          obliqueAngle: 0,
          textGenerationFlag: 0,
          lastHeight: 0.2,
          font: 'SimKai',
          bigFont: '',
          extendedFont: 'SimKai'
        })
      )
    }

    if (!this.tables.dimStyleTable.has(DEFAULT_TEXT_STYLE)) {
      this.tables.dimStyleTable.add(
        new AcDbDimStyleTableRecord({
          name: DEFAULT_TEXT_STYLE,
          dimtxsty: DEFAULT_TEXT_STYLE
        })
      )
    }

    if (!this.tables.viewportTable.has('*ACTIVE')) {
      const viewport = new AcDbViewportTableRecord()
      viewport.name = '*ACTIVE'
      this.tables.viewportTable.add(viewport)
    }

    const modelSpace = this.tables.blockTable.modelSpace
    if (!this.objects.layout.getAt('Model')) {
      const layout = new AcDbLayout()
      layout.layoutName = 'Model'
      layout.tabOrder = 0
      layout.blockTableRecordId = modelSpace.objectId
      layout.limits.min.copy({ x: 0, y: 0 })
      layout.limits.max.copy({ x: 1000000, y: 1000000 })
      layout.extents.min.copy({ x: 0, y: 0, z: 0 })
      layout.extents.max.copy({ x: 1000000, y: 1000000, z: 0 })
      this.objects.layout.setAt(layout.layoutName, layout)
      modelSpace.layoutId = layout.objectId
    }
  }

  private writeDxfHeaderSection(filer: AcDbDxfFiler) {
    filer.startSection('HEADER')
    filer.writeString(9, '$ACADVER')
    filer.writeString(1, filer.version?.name ?? this.version.name)
    filer.writeString(9, '$INSUNITS')
    filer.writeInt16(70, this.insunits)
    filer.writeString(9, '$LTSCALE')
    filer.writeDouble(40, this.ltscale)
    filer.writeString(9, '$LWDISPLAY')
    filer.writeInt16(70, this.lwdisplay ? 1 : 0)
    filer.writeString(9, '$CLAYER')
    filer.writeString(8, this.clayer)
    filer.writeString(9, '$TEXTSTYLE')
    filer.writeString(7, this.textstyle)
    filer.writeString(9, '$ANGBASE')
    filer.writeAngle(50, this.angBase)
    filer.writeString(9, '$ANGDIR')
    filer.writeInt16(70, this.angDir)
    filer.writeString(9, '$EXTMIN')
    filer.writePoint3d(10, this.extmin)
    filer.writeString(9, '$EXTMAX')
    filer.writePoint3d(10, this.extmax)
    filer.writeString(9, '$PDMODE')
    filer.writeInt32(70, this.pdmode)
    filer.writeString(9, '$PDSIZE')
    filer.writeDouble(40, this.pdsize)
    filer.writeString(9, '$OSMODE')
    filer.writeInt32(70, this.osmode)
    filer.endSection()
  }

  private writeDxfTablesSection(filer: AcDbDxfFiler, version: AcDbDwgVersion) {
    filer.startSection('TABLES')
    this.writeDxfTable(
      filer,
      'VPORT',
      this.tables.viewportTable.newIterator(),
      'VPORT'
    )
    this.writeDxfTable(
      filer,
      'LTYPE',
      this.tables.linetypeTable.newIterator(),
      'LTYPE'
    )
    this.writeDxfTable(
      filer,
      'LAYER',
      this.tables.layerTable.newIterator(),
      'LAYER'
    )
    this.writeDxfTable(
      filer,
      'STYLE',
      this.tables.textStyleTable.newIterator(),
      'STYLE'
    )
    this.writeDxfTable(
      filer,
      'APPID',
      this.tables.appIdTable.newIterator(),
      'APPID'
    )
    this.writeDxfTable(
      filer,
      'DIMSTYLE',
      this.tables.dimStyleTable.newIterator(),
      'DIMSTYLE'
    )
    if (version.value >= 19) {
      this.writeDxfTable(
        filer,
        'BLOCK_RECORD',
        this.tables.blockTable.newIterator(),
        'BLOCK_RECORD'
      )
    }
    filer.endSection()
  }

  private writeDxfBlocksSection(filer: AcDbDxfFiler) {
    filer.startSection('BLOCKS')
    for (const btr of this.tables.blockTable.newIterator()) {
      btr.dxfOutBlockBegin(filer)

      if (!btr.isModelSapce && !btr.isPaperSapce) {
        for (const entity of btr.newIterator()) {
          this.writeDxfEntity(filer, entity)
        }
      }

      btr.dxfOutBlockEnd(filer)
    }
    filer.endSection()
  }

  private writeDxfEntitiesSection(filer: AcDbDxfFiler) {
    filer.startSection('ENTITIES')
    for (const btr of this.tables.blockTable.newIterator()) {
      if (!btr.isModelSapce && !btr.isPaperSapce) continue
      for (const entity of btr.newIterator()) {
        this.writeDxfEntity(filer, entity)
      }
    }
    filer.endSection()
  }

  private writeDxfObjectsSection(filer: AcDbDxfFiler) {
    filer.startSection('OBJECTS')
    this.objects.layout.ownerId = this.objects.dictionary.objectId
    this.objects.imageDefinition.ownerId = this.objects.dictionary.objectId
    this.objects.xrecord.ownerId = this.objects.dictionary.objectId

    filer.writeStart('DICTIONARY')
    filer.writeHandle(5, this.objects.dictionary.objectId)
    filer.writeSubclassMarker('AcDbDictionary')
    filer.writeInt16(281, 1)
    filer.writeString(3, 'ACAD_LAYOUT')
    filer.writeObjectId(350, this.objects.layout.objectId)
    if (this.objects.imageDefinition.numEntries > 0) {
      filer.writeString(3, 'ISM_RASTER_IMAGE_DICT')
      filer.writeObjectId(350, this.objects.imageDefinition.objectId)
    }
    if (this.objects.xrecord.numEntries > 0) {
      filer.writeString(3, 'MLIGHT_XRECORD')
      filer.writeObjectId(350, this.objects.xrecord.objectId)
    }

    filer.writeStart('DICTIONARY')
    this.objects.layout.dxfOut(filer)

    if (this.objects.imageDefinition.numEntries > 0) {
      filer.writeStart('DICTIONARY')
      this.objects.imageDefinition.dxfOut(filer)
    }

    if (this.objects.xrecord.numEntries > 0) {
      filer.writeStart('DICTIONARY')
      this.objects.xrecord.dxfOut(filer)
    }

    for (const layout of this.objects.layout.newIterator()) {
      filer.writeStart('LAYOUT')
      layout.dxfOut(filer)
    }

    for (const imageDef of this.objects.imageDefinition.newIterator()) {
      filer.writeStart('IMAGEDEF')
      imageDef.dxfOut(filer)
    }

    for (const xrecord of this.objects.xrecord.newIterator()) {
      filer.writeStart('XRECORD')
      xrecord.dxfOut(filer)
    }
    filer.endSection()
  }

  private writeDxfTable<TRecord extends AcDbObject>(
    filer: AcDbDxfFiler,
    tableName: string,
    records: Iterable<TRecord>,
    recordType: string
  ) {
    const items = [...records]
    filer.startTable(tableName, items.length)
    for (const record of items) {
      if (
        recordType === 'BLOCK_RECORD' &&
        record instanceof AcDbBlockTableRecord
      ) {
        record.dxfOutBlockRecord(filer)
        continue
      }

      filer.writeStart(recordType)
      record.dxfOut(filer)
    }
    filer.endTable()
  }

  private writeDxfEntity(filer: AcDbDxfFiler, entity: AcDbEntity) {
    filer.writeStart(entity.dxfEntityTypeName)
    entity.dxfOut(filer)

    if (entity instanceof AcDb2dPolyline) {
      for (let i = 0; i < entity.numberOfVertices; ++i) {
        filer.writeStart('VERTEX')
        filer.writeHandle(5, `VERTEX:${entity.objectId}:${i}`)
        filer.writeObjectId(330, entity.objectId)
        filer.writeSubclassMarker('AcDbEntity')
        filer.writeSubclassMarker('AcDbVertex')
        filer.writeSubclassMarker('AcDb2dVertex')
        filer.writePoint3d(10, {
          x: entity.getPointAt(i).x,
          y: entity.getPointAt(i).y,
          z: entity.elevation
        })
        filer.writeInt16(70, 0)
      }
      filer.writeStart('SEQEND')
      filer.writeHandle(5, `SEQEND:${entity.objectId}`)
      filer.writeObjectId(330, entity.objectId)
      filer.writeSubclassMarker('AcDbEntity')
      return
    }

    if (entity instanceof AcDb3dPolyline) {
      for (let i = 0; i < entity.numberOfVertices; ++i) {
        const point = entity.getPointAt(i)
        filer.writeStart('VERTEX')
        filer.writeHandle(5, `VERTEX:${entity.objectId}:${i}`)
        filer.writeObjectId(330, entity.objectId)
        filer.writeSubclassMarker('AcDbEntity')
        filer.writeSubclassMarker('AcDbVertex')
        filer.writeSubclassMarker('AcDb3dPolylineVertex')
        filer.writePoint3d(10, {
          x: point.x,
          y: point.y,
          z: 0
        })
        filer.writeInt16(70, 32)
      }
      filer.writeStart('SEQEND')
      filer.writeHandle(5, `SEQEND:${entity.objectId}`)
      filer.writeObjectId(330, entity.objectId)
      filer.writeSubclassMarker('AcDbEntity')
      return
    }

    if (entity instanceof AcDbBlockReference) {
      let hasAttributes = false
      for (const attrib of entity.attributeIterator()) {
        hasAttributes = true
        filer.writeStart('ATTRIB')
        attrib.dxfOut(filer)
      }
      if (hasAttributes) {
        filer.writeStart('SEQEND')
        filer.writeHandle(5, `SEQEND:${entity.objectId}`)
        filer.writeObjectId(330, entity.objectId)
        filer.writeSubclassMarker('AcDbEntity')
      }
    }
  }

  /**
   * Clears all data from the database.
   *
   * This method removes all entities, tables, and objects from the database,
   * effectively resetting it to an empty state.
   *
   * @example
   * ```typescript
   * database.clear();
   * ```
   */
  private clear() {
    // Clear all tables and dictionaries
    this._tables.blockTable.removeAll()
    this._tables.dimStyleTable.removeAll()
    this._tables.linetypeTable.removeAll()
    this._tables.textStyleTable.removeAll()
    this._tables.layerTable.removeAll()
    this._tables.viewportTable.removeAll()
    this._objects.layout.removeAll()
    this._currentSpace = undefined
    this._extents.makeEmpty()
  }

  /**
   * Updates a sysvar value and dispatches the change event only when the value changed.
   */
  private updateSysVar<T>(
    sysVarName: string,
    currentValue: T,
    nextValue: T,
    setter: (nextValue: T) => void
  ) {
    if (!this.hasSysVarValueChanged(currentValue, nextValue)) {
      return
    }

    setter(nextValue)
    this.triggerSysVarChangedEvent(sysVarName, currentValue, nextValue)
  }

  /**
   * Determines whether two sysvar values are different.
   */
  private hasSysVarValueChanged(currentValue: unknown, nextValue: unknown) {
    if (currentValue instanceof AcCmColor && nextValue instanceof AcCmColor) {
      return !currentValue.equals(nextValue)
    }

    if (
      currentValue instanceof AcDbDwgVersion &&
      nextValue instanceof AcDbDwgVersion
    ) {
      return currentValue.value !== nextValue.value
    }

    return !Object.is(currentValue, nextValue)
  }

  /**
   * Triggers a system variable changed event with old/new values.
   */
  private triggerSysVarChangedEvent(
    sysVarName: string,
    oldValue: unknown,
    newValue: unknown
  ) {
    const manager = AcDbSysVarManager.instance()
    const name = sysVarName.toLowerCase()
    const descriptor = manager.getDescriptor(name)
    if (descriptor == null) {
      return
    }

    manager.events.sysVarChanged.dispatch({
      database: this,
      name,
      oldVal: oldValue as AcDbSysVarType,
      newVal: newValue as AcDbSysVarType
    })
  }

  /**
   * Extracts the file name from a URI.
   *
   * @param uri - The URI to extract the file name from
   * @returns The extracted file name, or empty string if extraction fails
   * @private
   */
  private getFileNameFromUri(uri: string): string {
    try {
      // Create a new URL object
      const url = new URL(uri)
      // Get the pathname from the URL
      const pathParts = url.pathname.split('/')
      // Return the last part of the pathname as the file name
      return pathParts[pathParts.length - 1] || ''
    } catch (error) {
      console.error('Invalid URI:', error)
      return ''
    }
  }
}
/* eslint-enable simple-import-sort/imports */
