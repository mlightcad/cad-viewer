import { AcDbDatabase, AcDbObjectId } from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Command to delete selected objects from the drawing.
 */
export class AcApEraseCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Executes the command to delete selected objects from the drawing
   *
   * @param context - The current application context
   */
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const annotation = new AcApAnnotation(context.doc.database)
    if (selectionSet.count > 0) {
      // If it is in review mode, annotation entities can be deleted only
      const ids =
        context.doc.openMode == AcEdOpenMode.Review
          ? annotation.filterAnnotationEntities(selectionSet.ids)
          : selectionSet.ids
      this.eraseEntities(context.doc.database, ids)
      selectionSet.clear()
    } else {
      const message = AcApI18n.sysCmdPrompt('erase')
      const options = new AcEdPromptSelectionOptions(message)
      const selectionResult =
        await AcApDocManager.instance.editor.getSelection(options)
      if (
        selectionResult.status === AcEdPromptStatus.OK &&
        selectionResult.value &&
        selectionResult.value.count > 0
      ) {
        let ids = selectionResult.value.ids
        // If it is in review mode, annotation entities can be deleted only
        if (context.doc.openMode == AcEdOpenMode.Review) {
          ids = annotation.filterAnnotationEntities(ids)
        }
        this.eraseEntities(context.doc.database, ids)
        selectionSet.clear()
      }
    }
  }

  /**
   * Erases entities through the active transaction when present.
   */
  private eraseEntities(db: AcDbDatabase, objectIds: AcDbObjectId[]): void {
    objectIds.forEach(objectId => {
      const entity = db.openEntityForWrite(objectId)
      entity?.erase()
    })
  }
}
