import { AcDbEntity, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdMessageType,
  AcEdOpenMode,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * AutoCAD-like `LAYCUR` command.
 *
 * The command changes the layer property of selected objects to the current
 * database layer (`CLAYER`). It supports both preselection and an interactive
 * selection prompt, matching AutoCAD's object-first workflow.
 */
export class AcApLayerCurCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYCUR` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the change-selected-objects-to-current-layer workflow.
   *
   * @param context - Active application context used to read and update the current drawing.
   * @returns Resolves when command execution completes or is canceled.
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const objectIds =
      selectionSet.count > 0 ? selectionSet.ids : await this.promptSelection()

    if (!objectIds || objectIds.length === 0) return

    this.moveObjectsToCurrentLayer(context, objectIds)
  }

  /**
   * Prompts for objects whose layer should be changed.
   *
   * @returns Selected object identifiers, or `undefined` when the prompt is canceled.
   */
  private async promptSelection(): Promise<AcDbObjectId[] | undefined> {
    const prompt = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.laycur.prompt')
    )
    const result = await AcApDocManager.instance.editor.getSelection(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined
    return result.value?.ids ?? []
  }

  /**
   * Applies the current layer to selected entities.
   *
   * @param context - Active application context containing database and view.
   * @param objectIds - Selected entity identifiers.
   */
  private moveObjectsToCurrentLayer(
    context: AcApContext,
    objectIds: AcDbObjectId[]
  ) {
    const db = context.doc.database
    const currentLayerName = db.clayer?.trim()
    const currentLayer = currentLayerName
      ? db.tables.layerTable.getAt(currentLayerName)
      : undefined

    if (!currentLayer) {
      this.notify(AcApI18n.t('jig.laycur.currentLayerNotFound'), 'warning')
      return
    }

    const changedEntities: AcDbEntity[] = []
    let alreadyCurrent = 0
    let missing = 0

    new Set(objectIds).forEach(objectId => {
      const entity = db.tables.blockTable.getEntityById(objectId)
      if (!entity) {
        missing++
        return
      }

      if (entity.layer === currentLayer.name) {
        alreadyCurrent++
        return
      }

      entity.layer = currentLayer.name
      changedEntities.push(entity)
    })

    if (changedEntities.length === 0) {
      this.notify(
        alreadyCurrent > 0
          ? AcApI18n.t('jig.laycur.alreadyCurrent')
          : AcApI18n.t('jig.laycur.noObjects'),
        alreadyCurrent > 0 && missing === 0 ? 'info' : 'warning'
      )
      return
    }

    changedEntities.forEach(entity => entity.triggerModifiedEvent())
    context.view.selectionSet.clear()
    // Layer changes move entities between render buckets, so rebuild the view.
    AcApDocManager.instance.regen()
    this.notify(
      `${AcApI18n.t('jig.laycur.changed')}: ${changedEntities.length} (${currentLayer.name})`,
      'success'
    )
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
}
