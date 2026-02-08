import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  /**
   * Creates a circle jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = radius
  }
}

/**
 * Command to create one circle.
 */
export class AcApCircleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.circle.center')
    )
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    const radiusPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.circle.radius')
    )
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius =
      await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    const db = context.doc.database
    const circle = new AcDbCircle(center, radius)
    db.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
