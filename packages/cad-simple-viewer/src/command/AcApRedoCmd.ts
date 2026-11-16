import { AcApContext } from '../app/index.js'
import { AcEdCommand } from '../editor/index.js'
import { AcApI18n } from '../i18n/index.js'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit.js'
import { getSessionUndo } from './markup/AcApMarkupHistory.js'
import { getMarkupPresenter } from './markup/AcApMarkupPresenter.js'

/**
 * Redoes the last undone session editing operation (database, markup, or measurement).
 */
export class AcApRedoCmd extends AcEdCommand {
  constructor() {
    super()
    this.globalName = 'redo'
    this.localName = 'Redo'
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const result = getSessionUndo().redo(context.doc.database)
    if (!result) {
      const msgKey = AcApI18n.sysCmdKey(this.globalName, 'nothingToRedo')
      this.showMessage(
        AcApI18n.sysCmd(this.globalName, 'nothingToRedo'),
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
