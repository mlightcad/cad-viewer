import { AcApContext } from '../../app'
import { AcEdCommand } from '../../editor'
import { resolveSelectedIds } from '../../service'

/**
 * Command to delete selected objects from the drawing.
 */
export class AcApEraseCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const ids = await resolveSelectedIds(context, 'erase')
    if (!ids) return

    context.doc.entityService.eraseEntities(ids)
    selectionSet.clear()
  }
}
