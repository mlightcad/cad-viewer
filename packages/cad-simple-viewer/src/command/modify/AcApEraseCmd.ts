import { AcApContext } from '../../app'
import { AcEdCommand } from '../../editor'
import { AcApEntityService } from '../../service'

/**
 * Command to delete selected objects from the drawing.
 */
export class AcApEraseCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const ids = await AcApEntityService.resolveSelectedIds(context, 'erase')
    if (!ids) return

    AcApEntityService.eraseEntities(context.doc.database, ids)
    selectionSet.clear()
  }
}
