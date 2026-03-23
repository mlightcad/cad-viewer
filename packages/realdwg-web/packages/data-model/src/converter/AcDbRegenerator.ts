import { AcDbBlockTableRecord, AcDbDatabase } from '../database'
import {
  AcDbConversionProgressCallback,
  AcDbDatabaseConverter
} from '../database/AcDbDatabaseConverter'
import { AcDbEntity } from '../entity'
import { AcDbBatchProcessing } from './AcDbBatchProcessing'

/**
 * Database regenerator.
 *
 * This class extends AcDbDatabaseConverter so that it can leverage the existing
 * logic to open one database such as progress notification. However, it doesn't
 * really do any conversion tasks and just pass one database instance and
 * it.
 */
export class AcDbRegenerator extends AcDbDatabaseConverter<AcDbDatabase> {
  private _database: AcDbDatabase
  constructor(db: AcDbDatabase) {
    super({})
    this._database = db
  }

  /**
   * Does nothing and always passes the database instance back.
   * @returns The database instance associated with this generator
   *
   */
  protected async parse() {
    return {
      model: this._database,
      data: {
        unknownEntityCount: 0
      }
    }
  }

  /**
   * Does nothing and always returns one empty array.
   *
   * @returns An empty array
   */
  protected getFonts() {
    return []
  }

  /**
   * Processes entities in batches to maintain UI responsiveness.
   *
   * This method breaks up the entity processing work into smaller chunks that are
   * executed asynchronously. This is often referred to as "batch processing" or
   * "cooperative multitasking," where the time-consuming task is broken into
   * smaller pieces and executed in small intervals to allow the UI to remain responsive.
   *
   * @param source - Source database
   * @param target - Target database
   * @param minimumChunkSize - Minimum number of entities to process in each chunk
   * @param startPercentage - Object containing the starting percentage for progress tracking
   * @param progress - Optional callback for progress updates
   */
  protected async processEntities(
    source: AcDbDatabase,
    target: AcDbDatabase,
    minimumChunkSize: number,
    startPercentage: { value: number },
    progress?: AcDbConversionProgressCallback
  ) {
    // Create an instance of AcDbBatchProcessing
    let entities = source.tables.blockTable.modelSpace.newIterator().toArray()
    const entityCount = entities.length
    const batchProcessor = new AcDbBatchProcessing(
      entityCount,
      100 - startPercentage.value,
      minimumChunkSize
    )

    // Groups entities by their `type` property and flattens the result into a single array.
    if (this.config.convertByEntityType) {
      entities = this.groupAndFlattenByType(entities)
    }

    // Process the ordered entities in chunks
    const modelSpaceBlockTableRecord = target.tables.blockTable.modelSpace
    await batchProcessor.processChunk(async (start, end) => {
      // Logic for processing each chunk of entities
      let dbEntities: AcDbEntity[] = []
      let entityType = start < end ? entities[start].type : ''
      for (let i = start; i < end; i++) {
        const entity = entities[i]
        if (this.config.convertByEntityType && entity.type !== entityType) {
          this.triggerEvents(modelSpaceBlockTableRecord, dbEntities)
          dbEntities = []
          entityType = entity.type
        }
        dbEntities.push(entity)
      }
      // Use batch append to improve performance
      this.triggerEvents(modelSpaceBlockTableRecord, dbEntities)

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

  /**
   * Processes blocks.
   */
  protected processBlocks() {
    const blocks = this._database.tables.blockTable.newIterator()
    for (const block of blocks) {
      const entities = block.newIterator().toArray()
      this.triggerEvents(block, entities)
    }
  }

  /**
   * Processes header variables.
   */
  protected processHeader() {
    // Do nothing
  }

  /**
   * Processes block table records.
   */
  protected processBlockTables() {
    // Do nothing for now. Maybe it needs to trigger some events in the future.
  }

  /**
   * Processes objects defined in database.
   * ```
   */
  protected processObjects() {
    const layouts = this._database.objects.layout.newIterator()
    for (const layout of layouts) {
      this._database.events.dictObjetSet.dispatch({
        database: this._database,
        object: layout,
        key: layout.layoutName
      })
    }

    const imageDefs = this._database.objects.imageDefinition.newIterator()
    for (const imageDef of imageDefs) {
      this._database.events.dictObjetSet.dispatch({
        database: this._database,
        object: imageDef,
        key: imageDef.objectId
      })
    }
  }

  /**
   * Processes viewport table records.
   */
  protected processViewports() {
    // Do nothing for now. Maybe it needs to trigger some events in the future.
  }

  /**
   * Processes layer table records.
   */
  protected processLayers() {
    const layers = this._database.tables.layerTable.newIterator().toArray()
    layers.forEach(layer => {
      this._database.events.layerAppended.dispatch({
        database: this._database,
        layer
      })
    })
  }

  /**
   * Processes linetype table records.
   */
  protected processLineTypes() {
    // Do nothing for now. Maybe it needs to trigger some events in the future.
  }

  /**
   * Processes text style table records.
   */
  protected processTextStyles() {
    // Do nothing for now. Maybe it needs to trigger some events in the future.
  }

  /**
   * Processes text style table records.
   */
  protected processDimStyles() {
    // Do nothing for now. Maybe it needs to trigger some events in the future.
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
  private groupAndFlattenByType(entities: AcDbEntity[]) {
    const groups: Record<string, AcDbEntity[]> = {}
    const order: string[] = []

    for (const entity of entities) {
      if (!groups[entity.type]) {
        groups[entity.type] = []
        order.push(entity.type)
      }
      groups[entity.type].push(entity)
    }

    return order.flatMap(type => groups[type])
  }

  private triggerEvents(btr: AcDbBlockTableRecord, entities: AcDbEntity[]) {
    // When creating one block, it will also go to this function. But we don't want `entityAppended` event
    // tiggered in this case. So check whether the block name is name of the model space.
    if (btr.isModelSapce || btr.isPaperSapce) {
      btr.database.events.entityAppended.dispatch({
        database: btr.database,
        entity: entities
      })
    }
  }
}
