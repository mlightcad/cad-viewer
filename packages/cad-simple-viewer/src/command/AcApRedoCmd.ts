import { AcApContext } from '../app'
import { AcEdCommand } from '../editor'
import { AcApI18n } from '../i18n'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit'

/**
 * Redoes the last undone database editing operation on the active document.
 */
export class AcApRedoCmd extends AcEdCommand {
  constructor() {
    super()
    this.globalName = 'redo'
    this.localName = 'Redo'
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const manager = context.doc.database.transactionManager
    if (!manager.redo()) {
      const msgKey = AcApI18n.sysCmdKey(this.globalName, 'nothingToRedo')
      this.showMessage(
        AcApI18n.sysCmd(this.globalName, 'nothingToRedo'),
        'info',
        msgKey
      )
      return
    }
    acapNotifyUndoStackChanged()
  }
}
