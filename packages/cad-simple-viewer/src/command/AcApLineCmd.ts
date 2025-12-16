import { AcDbLine, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'

export class AcApLineJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine

  /**
   * Creates a line jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, start: AcGePoint3dLike) {
    super(view)
    this._line = new AcDbLine(start, start)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(point: AcGePoint3dLike) {
    this._line.endPoint = point
  }
}

/**
 * Command to create one line.
 */
export class AcApLineCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const startPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.line.firstPoint')
    )
    const startPoint =
      await AcApDocManager.instance.editor.getPoint(startPointPrompt)

    const endPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.line.nextPoint')
    )
    endPointPrompt.useDashedLine = true
    endPointPrompt.jig = new AcApLineJig(context.view, startPoint)
    endPointPrompt.useDashedLine = true
    endPointPrompt.useBasePoint = true
    const endPoint =
      await AcApDocManager.instance.editor.getPoint(endPointPrompt)

    const db = context.doc.database
    const line = new AcDbLine(startPoint, endPoint)
    db.tables.blockTable.modelSpace.appendEntity(line)
  }
}
