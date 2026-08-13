import { AcApContext } from '../app'
import { AcEdCommand } from '../editor'
import { AcApI18n } from '../i18n'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit'
import { getSessionUndo } from './markup/AcApMarkupHistory'
import { getMarkupPresenter } from './markup/AcApMarkupPresenter'

/**
 * Undoes the last session editing operation (database or Design Review markup).
 */
export class AcApUndoCmd extends AcEdCommand {
  constructor() {
    super()
    this.globalName = 'undo'
    this.localName = 'Undo'
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const result = getSessionUndo().undo(context.doc.database)
    if (!result) {
      const msgKey = AcApI18n.sysCmdKey(this.globalName, 'nothingToUndo')
      this.showMessage(
        AcApI18n.sysCmd(this.globalName, 'nothingToUndo'),
        'info',
        msgKey
      )
      return
    }
    if (result === 'markup') {
      getMarkupPresenter().republishAll(context.view)
    }
    acapNotifyUndoStackChanged()
  }
}
