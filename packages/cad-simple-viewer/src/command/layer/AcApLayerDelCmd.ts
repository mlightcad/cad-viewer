import {
  AcDbEntity,
  AcDbLayerTableRecord,
  AcDbObjectId
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdMessageType,
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Top-level keywords supported by the main `LAYDEL` entity selection prompt.
 */
type LaydelMainKeyword = 'Name' | 'Undo'

/**
 * Keywords supported by the layer-name branch of `LAYDEL`.
 */
type LaydelNameKeyword = '?' | 'Undo'

/**
 * Normalized result of the first `LAYDEL` prompt.
 *
 * The command can either receive an entity selection or a keyword that
 * switches the workflow into another branch.
 */
type LaydelMainAction =
  | {
      /** Indicates that the user picked an entity to infer the target layer. */
      type: 'entity'

      /** Object identifier of the picked entity. */
      objectId: AcDbObjectId
    }
  | {
      /** Indicates that the user entered a top-level command keyword. */
      type: 'keyword'

      /** Recognized main-branch keyword value. */
      keyword: LaydelMainKeyword
    }

/**
 * Normalized result of the layer-name prompt inside the `Name` branch.
 */
type LaydelNameAction =
  | {
      /** Indicates that the user entered a concrete layer name. */
      type: 'name'

      /** Layer name typed by the user after trimming surrounding whitespace. */
      layerName: string
    }
  | {
      /** Indicates that the user entered a keyword in the name branch. */
      type: 'keyword'

      /** Recognized name-branch keyword value. */
      keyword: LaydelNameKeyword
    }

/**
 * Snapshot of an entity removed as part of deleting a layer.
 *
 * The snapshot stores both ownership information and a cloned entity so the
 * command can rebuild the original structure during `Undo`.
 */
interface LaydelDeletedEntitySnapshot {
  /** Object id of the owning block table record. */
  ownerId: AcDbObjectId

  /** Original object id of the removed entity. */
  objectId: AcDbObjectId

  /** Cloned entity payload used for undo restoration. */
  entity: AcDbEntity
}

/**
 * Undo snapshot for a single successful `LAYDEL` operation.
 */
interface LaydelHistoryEntry {
  /** Cloned layer table record that was removed from the database. */
  layer: AcDbLayerTableRecord

  /** Cloned entities that were removed together with the layer. */
  entities: LaydelDeletedEntitySnapshot[]
}

/**
 * AutoCAD-like `LAYDEL` command.
 *
 * Supported workflows:
 * - Pick an entity to delete its layer and every object on that layer.
 * - Switch to the `Name` branch to delete a layer by name.
 * - Use `Undo` to restore the most recently deleted layer in the current
 *   command session.
 */
export class AcApLayerDelCmd extends AcEdCommand {
  private _history: LaydelHistoryEntry[] = []

  /**
   * Creates a write-enabled `LAYDEL` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the interactive layer deletion workflow until the user cancels.
   *
   * The command supports both entity-based and name-based deletion paths and
   * keeps an in-memory undo history for the current command session only.
   *
   * @param context - Active application context used to inspect and mutate the drawing.
   * @returns Resolves when the command loop ends.
   */
  async execute(context: AcApContext) {
    this._history = []

    while (true) {
      const action = await this.promptMainAction()
      if (!action) return

      if (action.type === 'keyword') {
        if (action.keyword === 'Name') {
          await this.runNameBranch(context)
        } else {
          this.runUndo(context)
        }
        continue
      }

      this.deleteLayerByEntity(context, action.objectId)
    }
  }

  /**
   * Sends a localized status message through the command-line output.
   *
   * @param message - Text to display to the user.
   * @param type - Visual severity mapped to command-line message styles.
   */
  private notify(message: string, type: AcEdMessageType = 'info') {
    AcApDocManager.instance.editor.showMessage(message, type)
  }

  /**
   * Registers a localized keyword on an entity or string prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword.
   * @param keyword - I18n keyword identifier under `jig.laydel.keywords`.
   */
  private addKeyword(
    prompt: AcEdPromptEntityOptions | AcEdPromptStringOptions,
    keyword: 'name' | 'undo' | 'list'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.laydel.keywords.${keyword}.display`),
      AcApI18n.t(`jig.laydel.keywords.${keyword}.global`),
      AcApI18n.t(`jig.laydel.keywords.${keyword}.local`)
    )
  }

  /**
   * Prompts for the main `LAYDEL` action.
   *
   * Users can either pick an entity to infer the target layer or switch to a
   * keyword branch such as `Name` or `Undo`.
   *
   * @returns Resolved action, or `undefined` when the prompt is canceled.
   */
  private async promptMainAction(): Promise<LaydelMainAction | undefined> {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.laydel.selectPrompt')
    )
    prompt.allowNone = true
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(AcApI18n.t('jig.laydel.invalidSelection'))
    this.addKeyword(prompt, 'name')
    this.addKeyword(prompt, 'undo')

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.OK && result.objectId) {
      return { type: 'entity', objectId: result.objectId }
    }

    if (
      result.status === AcEdPromptStatus.Keyword &&
      (result.stringResult === 'Name' || result.stringResult === 'Undo')
    ) {
      return { type: 'keyword', keyword: result.stringResult }
    }

    return undefined
  }

  /**
   * Runs the layer-name branch until the user exits that submenu.
   *
   * @param context - Active application context used to list, delete, or restore layers.
   * @returns Resolves when the name submenu ends.
   */
  private async runNameBranch(context: AcApContext) {
    while (true) {
      const action = await this.promptLayerNameAction()
      if (!action) return

      if (action.type === 'keyword') {
        if (action.keyword === '?') {
          this.listLayers(context)
        } else {
          this.runUndo(context)
        }
        continue
      }

      this.deleteLayerByName(context, action.layerName)
    }
  }

  /**
   * Prompts for a layer name or one of the name-branch keywords.
   *
   * @returns Resolved name action, or `undefined` when canceled or left blank.
   */
  private async promptLayerNameAction(): Promise<LaydelNameAction | undefined> {
    const prompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.laydel.namePrompt')
    )
    prompt.allowSpaces = true
    prompt.allowEmpty = true
    this.addKeyword(prompt, 'list')
    this.addKeyword(prompt, 'undo')

    const result = await AcApDocManager.instance.editor.getString(prompt)
    if (
      result.status === AcEdPromptStatus.Keyword &&
      (result.stringResult === '?' || result.stringResult === 'Undo')
    ) {
      return { type: 'keyword', keyword: result.stringResult }
    }

    if (result.status !== AcEdPromptStatus.OK) return undefined

    const layerName = (result.stringResult ?? '').trim()
    if (!layerName) return undefined

    return { type: 'name', layerName }
  }

  /**
   * Prints a snapshot of all current layers to the console and notifies the UI.
   *
   * @param context - Active application context providing access to the layer table.
   */
  private listLayers(context: AcApContext) {
    const db = context.doc.database
    const rows = [...db.tables.layerTable.newIterator()].map(layer => ({
      name: layer.name,
      current: db.clayer === layer.name ? '*' : '',
      on: layer.isOff ? 'No' : 'Yes',
      frozen: layer.isFrozen ? 'Yes' : 'No',
      locked: layer.isLocked ? 'Yes' : 'No'
    }))
    console.table(rows)
    this.notify(AcApI18n.t('jig.laydel.layerListSummary'), 'info')
  }

  /**
   * Resolves the selected entity's layer name and delegates to layer deletion by name.
   *
   * @param context - Active application context containing the current database.
   * @param objectId - Identifier of the entity selected by the user.
   */
  private deleteLayerByEntity(context: AcApContext, objectId: AcDbObjectId) {
    const entity =
      context.doc.database.tables.blockTable.getEntityById(objectId)
    const layerName = entity?.layer?.trim()

    if (!layerName) {
      this.notify(AcApI18n.t('jig.laydel.invalidSelection'), 'warning')
      return
    }

    this.deleteLayerByName(context, layerName)
  }

  /**
   * Deletes a layer and every entity currently assigned to it.
   *
   * The removed layer record and cloned entities are stored in `_history` so
   * that `Undo` can reconstruct the previous state during the same run.
   *
   * @param context - Active application context containing the drawing to mutate.
   * @param layerName - Name of the layer to remove.
   */
  private deleteLayerByName(context: AcApContext, layerName: string) {
    const db = context.doc.database
    const layer = db.tables.layerTable.getAt(layerName)

    if (!layer) {
      this.notify(`${AcApI18n.t('jig.laydel.layerNotFound')}: ${layerName}`)
      return
    }

    if (layer.name === '0') {
      this.notify(AcApI18n.t('jig.laydel.cannotDeleteZeroLayer'), 'warning')
      return
    }

    if (layer.name === db.clayer) {
      this.notify(AcApI18n.t('jig.laydel.cannotDeleteCurrent'), 'warning')
      return
    }

    const deletedEntities = this.collectLayerEntities(context, layer.name)
    this.removeLayerEntities(context, deletedEntities)

    const deletedLayer = layer.clone()
    db.tables.layerTable.remove(layer.name)
    db.events.layerErased.dispatch({ database: db, layer })

    this._history.push({
      layer: deletedLayer,
      entities: deletedEntities
    })

    context.view.selectionSet.clear()
    AcApDocManager.instance.regen()
    this.notify(`${AcApI18n.t('jig.laydel.deleted')}: ${layer.name}`, 'success')
  }

  /**
   * Captures clones of every entity that belongs to the specified layer.
   *
   * Each snapshot also records the owning block record so undo can restore the
   * entities to the correct container.
   *
   * @param context - Active application context containing the current database.
   * @param layerName - Layer whose entities should be collected.
   * @returns Cloned entity snapshots grouped later by owner during deletion or undo.
   */
  private collectLayerEntities(
    context: AcApContext,
    layerName: string
  ): LaydelDeletedEntitySnapshot[] {
    const snapshots: LaydelDeletedEntitySnapshot[] = []

    for (const blockRecord of context.doc.database.tables.blockTable.newIterator()) {
      for (const entity of blockRecord.newIterator()) {
        if (entity.layer !== layerName) continue
        snapshots.push({
          ownerId: blockRecord.objectId,
          objectId: entity.objectId,
          entity: entity.clone()
        })
      }
    }

    return snapshots
  }

  /**
   * Removes the captured entities from their owning block records.
   *
   * @param context - Active application context containing the current database.
   * @param deletedEntities - Entity snapshots to remove from the drawing.
   */
  private removeLayerEntities(
    context: AcApContext,
    deletedEntities: LaydelDeletedEntitySnapshot[]
  ) {
    const idsByOwner = new Map<AcDbObjectId, AcDbObjectId[]>()

    deletedEntities.forEach(({ ownerId, objectId }) => {
      const ids = idsByOwner.get(ownerId) ?? []
      ids.push(objectId)
      idsByOwner.set(ownerId, ids)
    })

    idsByOwner.forEach((ids, ownerId) => {
      context.doc.database.tables.blockTable.getIdAt(ownerId)?.removeEntity(ids)
    })
  }

  /**
   * Restores the most recently deleted layer and its entities.
   *
   * @param context - Active application context containing the current database and view.
   */
  private runUndo(context: AcApContext) {
    const entry = this._history.pop()
    if (!entry) {
      this.notify(AcApI18n.t('jig.laydel.nothingToUndo'), 'warning')
      return
    }

    const db = context.doc.database
    if (!db.tables.layerTable.has(entry.layer.name)) {
      db.tables.layerTable.add(entry.layer.clone())
    }

    const entitiesByOwner = new Map<AcDbObjectId, AcDbEntity[]>()
    entry.entities.forEach(({ ownerId, entity }) => {
      const entities = entitiesByOwner.get(ownerId) ?? []
      entities.push(entity.clone())
      entitiesByOwner.set(ownerId, entities)
    })

    entitiesByOwner.forEach((entities, ownerId) => {
      const owner =
        db.tables.blockTable.getIdAt(ownerId) ?? db.tables.blockTable.modelSpace
      owner.appendEntity(entities)
    })

    context.view.selectionSet.clear()
    AcApDocManager.instance.regen()
    this.notify(
      `${AcApI18n.t('jig.laydel.restored')}: ${entry.layer.name}`,
      'success'
    )
  }
}
