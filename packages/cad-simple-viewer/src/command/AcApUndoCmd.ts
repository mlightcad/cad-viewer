import { AcApContext } from '../app'
import { AcEdCommand } from '../editor'
import { AcApI18n } from '../i18n'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit'

/**
 * Undoes the last database editing operation on the active document.
 */
export class AcApUndoCmd extends AcEdCommand {
  constructor() {
    super()
    this.globalName = 'undo'
    this.localName = 'Undo'
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const manager = context.doc.database.transactionManager
    if (!manager.undo()) {
      const msgKey = AcApI18n.sysCmdKey(this.globalName, 'nothingToUndo')
      this.showMessage(
        AcApI18n.sysCmd(this.globalName, 'nothingToUndo'),
        'info',
        msgKey
      )
      return
    }
    acapNotifyUndoStackChanged()
  }
}
