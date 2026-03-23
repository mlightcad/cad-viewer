import {
  AcCmColor,
  AcDbBatchProcessing,
  AcDbBlockTableRecord,
  AcDbConversionProgressCallback,
  AcDbDatabase,
  AcDbDatabaseConverter,
  AcDbDimStyleTableRecord,
  AcDbDimStyleTableRecordAttrs,
  AcDbDimTextHorizontal,
  AcDbDimTextVertical,
  AcDbDimVerticalJustification,
  AcDbDimZeroSuppression,
  AcDbDimZeroSuppressionAngular,
  AcDbEntity,
  AcDbLayerTableRecord,
  AcDbLinetypeTableRecord,
  AcDbSymbolTableRecord,
  AcDbTextStyleTableRecord,
  AcDbViewportTableRecord,
  AcGiBaseLineStyle,
  AcGiLineTypePatternElement,
  AcGiTextStyle,
  DEFAULT_TEXT_STYLE
} from '@mlightcad/data-model'
import {
  DRW_Database,
  DRW_DoubleList,
  DRW_DwgR,
  DRW_Entity,
  DRW_EntityList,
  DRW_FileHandler,
  DRW_ImageList,
  DRW_TableEntry,
  MainModule
} from '@mlightcad/libdxfrw-web'

import { AcDbEntityConverter } from './AcDbEntitiyConverter'
import { AcDbObjectConverter } from './AcDbObjectConverter'

/**
 * Database converter for DWG files based on [libdxfrw-web](https://github.com/mlight-lee/libdxfrw).
 * @internal
 */
export class AcDbLibdxfrwConverter extends AcDbDatabaseConverter<DRW_Database> {
  librefrw: MainModule
  database?: DRW_Database
  dwg?: DRW_DwgR
  fileHandler?: DRW_FileHandler

  constructor(instance: MainModule) {
    super()
    this.librefrw = instance
  }

  protected onFinished() {
    super.onFinished()
    if (this.dwg) {
      this.dwg.delete()
      this.dwg = undefined
    }
    if (this.database) {
      this.database.delete()
      this.database = undefined
    }
    if (this.fileHandler) {
      this.fileHandler.delete()
      this.fileHandler = undefined
    }
  }

  protected async parse(data: string | ArrayBuffer) {
    if (this.librefrw == null) {
      throw new Error('librefrw is not loaded!')
    }

    const libdxfrw = this.librefrw
    this.database = new libdxfrw.DRW_Database()
    this.fileHandler = new libdxfrw.DRW_FileHandler()
    this.fileHandler.database = this.database

    this.dwg = new libdxfrw.DRW_DwgR(data)

    // Uncomment out the following line if you want to show debug info
    // this.dwg.setDebug(libdxfrw.DRW_dbg_Level.Debug);
    this.dwg.read(this.fileHandler, false)

    return {
      model: this.database,
      data: {
        unknownEntityCount: 0
      }
    }
  }

  protected processLineTypes(model: DRW_Database, db: AcDbDatabase) {
    const lineTypes = model.lineTypes
    for (let index = 0, size = lineTypes.size(); index < size; ++index) {
      const item = lineTypes.get(index)
      if (item != null) {
        const lineType: AcGiBaseLineStyle = {
          name: item.name,
          description: item.desc,
          standardFlag: item.flags,
          totalPatternLength: item.length,
          pattern: this.convertLineTypePattern(item.path)
        }
        const record = new AcDbLinetypeTableRecord(lineType)
        this.processCommonTableEntryAttrs(item, record)
        record.name = item.name
        db.tables.linetypeTable.add(record)
      }
    }
  }

  private convertLineTypePattern(path: DRW_DoubleList) {
    const pattern: AcGiLineTypePatternElement[] = []
    for (let index = 0, size = path.size(); index < size; ++index) {
      // libdxfrw doesn't support complex line type and always convert complex line type to simple line type
      pattern.push({
        elementLength: path.get(index) || 0,
        elementTypeFlag: 0
      })
    }
    return pattern
  }

  protected processTextStyles(model: DRW_Database, db: AcDbDatabase) {
    const textStyles = model.textStyles
    for (let index = 0, size = textStyles.size(); index < size; ++index) {
      const item = textStyles.get(index)
      if (item != null) {
        const textStyle: AcGiTextStyle = {
          name: item.name,
          standardFlag: item.flags,
          fixedTextHeight: item.height,
          widthFactor: item.width,
          obliqueAngle: item.oblique,
          textGenerationFlag: item.genFlag,
          lastHeight: item.lastHeight,
          font: item.font,
          bigFont: item.bigFont
        }
        const record = new AcDbTextStyleTableRecord(textStyle)
        this.processCommonTableEntryAttrs(item, record)
        db.tables.textStyleTable.add(record)
      }
    }
  }

  protected processDimStyles(model: DRW_Database, db: AcDbDatabase) {
    const dimStyles = model.dimStyles
    for (let index = 0, size = dimStyles.size(); index < size; ++index) {
      const item = dimStyles.get(index)
      if (item != null) {
        const attrs: AcDbDimStyleTableRecordAttrs = {
          name: item.name,
          ownerId: item.parentHandle.toString(),
          dimpost: item.dimpost || '',
          dimapost: item.dimapost || '',
          dimscale: item.dimscale,
          dimasz: item.dimasz,
          dimexo: item.dimexo,
          dimdli: item.dimdli,
          dimexe: item.dimexe,
          dimrnd: item.dimrnd,
          dimdle: item.dimdle,
          dimtp: item.dimtp,
          dimtm: item.dimtm,
          dimtxt: item.dimtxt,
          dimcen: item.dimcen,
          dimtsz: item.dimtsz,
          dimaltf: item.dimaltf,
          dimlfac: item.dimlfac,
          dimtvp: item.dimtvp,
          dimtfac: item.dimtfac,
          dimgap: item.dimgap,
          dimaltrnd: item.dimaltrnd,
          dimtol: item.dimtol == null || item.dimtol == 0 ? 0 : 1,
          dimlim: item.dimlim == null || item.dimlim == 0 ? 0 : 1,
          dimtih: item.dimtih == null || item.dimtih == 0 ? 0 : 1,
          dimtoh: item.dimtoh == null || item.dimtoh == 0 ? 0 : 1,
          dimse1: item.dimse1 == null || item.dimse1 == 0 ? 0 : 1,
          dimse2: item.dimse2 == null || item.dimse2 == 0 ? 0 : 1,
          dimtad: item.dimtad as unknown as AcDbDimTextVertical.Center,
          dimzin: item.dimzin as unknown as AcDbDimZeroSuppression.Feet,
          dimazin:
            item.dimazin as unknown as AcDbDimZeroSuppressionAngular.None,
          dimalt: item.dimalt as 0 | 1,
          dimaltd: item.dimaltd,
          dimtofl: item.dimtofl as 0 | 1,
          dimsah: item.dimsah as 0 | 1,
          dimtix: item.dimtix as 0 | 1,
          dimsoxd: item.dimsoxd as 0 | 1,
          dimclrd: item.dimclrd,
          dimclre: item.dimclre,
          dimclrt: item.dimclrt,
          dimadec: item.dimadec || 0,
          dimunit: item.dimunit || 2,
          dimdec: item.dimdec,
          dimtdec: item.dimtdec,
          dimaltu: item.dimaltu,
          dimalttd: item.dimalttd,
          dimaunit: item.dimaunit,
          dimfrac: item.dimfrac,
          dimlunit: item.dimlunit,
          dimdsep: item.dimdsep.toString(),
          dimtmove: item.dimtmove || 0,
          dimjust: item.dimjust as unknown as AcDbDimTextHorizontal.Center,
          dimsd1: item.dimsd1 as 0 | 1,
          dimsd2: item.dimsd2 as 0 | 1,
          dimtolj:
            item.dimtolj as unknown as AcDbDimVerticalJustification.Bottom,
          dimtzin: item.dimtzin as unknown as AcDbDimZeroSuppression.Feet,
          dimaltz: item.dimaltz as unknown as AcDbDimZeroSuppression.Feet,
          dimalttz: item.dimaltttz as unknown as AcDbDimZeroSuppression.Feet,
          dimfit: item.dimfit || 0,
          dimupt: item.dimupt,
          dimatfit: item.dimatfit,
          dimtxsty: item.dimtxsty || DEFAULT_TEXT_STYLE,
          dimldrblk: item.dimldrblk || '',
          dimblk: item.dimblk || '',
          dimblk1: item.dimblk1 || '',
          dimblk2: item.dimblk2 || '',
          dimlwd: item.dimlwd,
          dimlwe: item.dimlwe
        }
        const record = new AcDbDimStyleTableRecord(attrs)
        this.processCommonTableEntryAttrs(item, record)
        db.tables.dimStyleTable.add(record)
      }
    }
  }

  protected processLayers(model: DRW_Database, db: AcDbDatabase) {
    const layers = model.layers
    for (let index = 0, size = layers.size(); index < size; ++index) {
      const item = layers.get(index)
      if (item != null) {
        const color = new AcCmColor()
        color.colorIndex = item.color
        const record = new AcDbLayerTableRecord({
          name: item.name,
          standardFlags: item.flags,
          linetype: item.lineType,
          lineWeight: item.lWeight as unknown as number,
          isOff: item.color < 0,
          color: color,
          isPlottable: item.plotF,
          materialId: item.handleMaterialS
        })
        this.processCommonTableEntryAttrs(item, record)
        db.tables.layerTable.add(record)
      }
    }
  }

  protected processViewports(model: DRW_Database, db: AcDbDatabase) {
    const viewports = model.viewports
    for (let index = 0, size = viewports.size(); index < size; ++index) {
      const item = viewports.get(index)
      if (item != null) {
        const record = new AcDbViewportTableRecord()
        this.processCommonTableEntryAttrs(item, record)
        if (item.circleZoom) {
          record.circleSides = item.circleZoom
        }
        record.standardFlag = item.flags
        record.center.copy(item.center)
        record.lowerLeftCorner.copy(item.lowerLeft)
        record.upperRightCorner.copy(item.upperRight)
        if (item.snapBase) {
          record.snapBase.copy(item.snapBase)
        }
        if (item.snapAngle) {
          record.snapAngle = item.snapAngle
        }
        if (record.snapIncrements) {
          record.snapIncrements.copy(item.snapSpacing)
        }
        if (item.gridSpacing) {
          record.gridIncrements.copy(item.gridSpacing)
        }

        record.gsView.center.copy(item.center)
        record.gsView.viewDirectionFromTarget.copy(item.viewDir)
        record.gsView.viewTarget.copy(item.viewTarget)
        if (item.lensHeight) {
          record.gsView.lensLength = item.lensHeight
        }
        if (item.height) {
          record.gsView.viewHeight = item.height
        }
        if (item.twistAngle) {
          record.gsView.viewTwistAngle = item.twistAngle
        }
        if (item.viewMode) {
          record.gsView.viewMode = item.viewMode
        }
        if (item.ucsIcon) {
          record.gsView.ucsIconSetting = item.ucsIcon
        }
        db.tables.viewportTable.add(record)
      }
    }
  }

  protected processBlockTables(model: DRW_Database, db: AcDbDatabase) {
    const blocks = model.blocks
    for (let index = 0, size = blocks.size(); index < size; ++index) {
      const block = blocks.get(index)
      if (block != null) {
        const dbBlock = new AcDbBlockTableRecord()
        dbBlock.objectId = block.handle.toString()
        dbBlock.name = block.name.toUpperCase()
        // TODO: Add logic to set the associated layout id
        db.tables.blockTable.add(dbBlock)

        if (block.entities) {
          this.processEntitiesInBlock(block.entities, dbBlock)
        }
      }
    }
  }

  private processCommonTableEntryAttrs(
    entry: DRW_TableEntry,
    dbEntry: AcDbSymbolTableRecord
  ) {
    dbEntry.name = entry.name
    dbEntry.objectId = entry.handle.toString()
    dbEntry.ownerId = entry.parentHandle.toString()
  }

  protected processHeader(model: DRW_Database, db: AcDbDatabase) {
    const header = model.header
    // TODO: Check not supported versions

    let variant = header.getVar('$CECOLOR')
    // Initial value:	ByLayer, Color index 256 is 'ByLayer'
    db.cecolor.colorIndex = variant ? variant.getInt() : 256

    variant = header.getVar('$ANGDIR')
    // Initial value:	0
    db.angDir = variant ? variant.getInt() : 0

    variant = header.getVar('$AUNITS')
    // Initial value:	0
    db.aunits = variant ? variant.getInt() : 0

    variant = header.getVar('$INSUNITS')
    // Initial value:	1 (imperial) or 4 (metric)
    db.insunits = variant ? variant.getInt() : 1

    variant = header.getVar('$PDMODE')
    // Initial value:	0
    db.pdmode = variant ? variant.getInt() : 0

    variant = header.getVar('$PDSIZE')
    // Initial value:	0
    db.pdsize = variant ? variant.getDouble() : 0.0
  }

  protected processObjects(model: DRW_Database, db: AcDbDatabase) {
    this.processImageDefs(model.images, db)
  }

  private processImageDefs(imageDefs: DRW_ImageList, db: AcDbDatabase) {
    const objectConverter = new AcDbObjectConverter()
    const imageDefDict = db.objects.imageDefinition
    for (let index = 0, size = imageDefs.size(); index < size; ++index) {
      const item = imageDefs.get(index)
      if (item != null) {
        const dbImageDef = objectConverter.convertImageDef(item)
        imageDefDict.setAt(dbImageDef.objectId, dbImageDef)
      }
    }
  }

  private async processEntitiesInBlock(
    entities: DRW_EntityList,
    blockTableRecord: AcDbBlockTableRecord
  ) {
    const converter = new AcDbEntityConverter()
    const dbEntities: AcDbEntity[] = []
    for (let index = 0, size = entities.size(); index < size; ++index) {
      const entity = entities.get(index)
      if (entity != null) {
        const dbEntity = converter.convert(entity)
        if (dbEntity) {
          dbEntities.push(dbEntity)
        }
      }
    }
    // Use batch append to improve performance
    blockTableRecord.appendEntity(dbEntities)
  }

  protected async processEntities(
    model: DRW_Database,
    db: AcDbDatabase,
    minimumChunkSize: number,
    startPercentage: { value: number },
    progress?: AcDbConversionProgressCallback
  ) {
    if (model.mBlock) {
      const converter = new AcDbEntityConverter()

      let entities: DRW_Entity[] = []
      const entityList = model.mBlock.entities
      const entityCount = entityList.size()
      for (let i = 0; i < entityCount; i++) {
        const entity = entityList.get(i)
        if (entity) entities.push(entity)
      }

      // Create an instance of AcDbBatchProcessing
      const batchProcessor = new AcDbBatchProcessing(
        entities.length,
        100 - startPercentage.value,
        minimumChunkSize
      )
      // Groups entities by their `type` property and flattens the result into a single array.
      if (this.config.convertByEntityType) {
        entities = this.groupAndFlattenByType(entities)
      }

      // Process the entities in chunks
      const blockTableRecord = db.tables.blockTable.modelSpace
      await batchProcessor.processChunk(async (start, end) => {
        // Logic for processing each chunk of entities
        const dbEntities: AcDbEntity[] = []
        for (let i = start; i < end; i++) {
          const entity = entities[i]
          const dbEntity = converter.convert(entity)
          if (dbEntity) {
            dbEntities.push(dbEntity)
          }
        }
        // Use batch append to improve performance
        blockTableRecord.appendEntity(dbEntities)

        // Update progress
        if (progress) {
          let percentage =
            startPercentage.value +
            (end / entityCount) * (100 - startPercentage.value)
          if (percentage > 100) percentage = 100
          await progress(percentage, 'ENTITY', 'IN-PROGRESS')
        }
      })
    }
  }

  /**
   * Groups entities by their `type` property and flattens the result into a single array.
   *
   * The order of `type` groups follows the order in which they first appear in the input array.
   * Items within each group preserve their original order.
   *
   * This runs in O(n) time, which is generally faster than sorting when you
   * don't care about alphabetical order of types.
   *
   * @param entities - The array of entities to group and flatten.
   *
   * @returns A new array of entities grouped by their `type` property.
   */
  private groupAndFlattenByType(entities: DRW_Entity[]) {
    const groups: Record<number, DRW_Entity[]> = {}
    const order: number[] = []

    const length = entities.length
    for (let i = 0; i < length; i++) {
      const entity = entities[i]
      const entityType = entity.eType.value
      if (!groups[entityType]) {
        groups[entityType] = []
        order.push(entityType)
      }
      groups[entityType].push(entity)
    }

    return order.flatMap(type => groups[type])
  }
}
