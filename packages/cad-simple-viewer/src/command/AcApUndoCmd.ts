import { AcApContext } from '../app/index.js'
import { AcEdCommand } from '../editor/index.js'
import { AcApI18n } from '../i18n/index.js'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit.js'
import { getSessionUndo } from './markup/AcApMarkupHistory.js'
import { getMarkupPresenter } from './markup/AcApMarkupPresenter.js'

/**
 * Undoes the last session editing operation (database, markup, or measurement).
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
