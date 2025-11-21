import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions
} from '../editor'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  /**
   * Creates a new zoom-to-box jig.
   *
   * @param view - The view that will be zoomed
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
 * Example Command to create one circle to demostrate how to use Jig.
 */
export class AcApCircleCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const centerPrompt = new AcEdPromptPointOptions(
      'Specify the center of circle:'
    )
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    const radiusPrompt = new AcEdPromptDistanceOptions(
      'Specify the radius of circle:'
    )
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius =
      await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    const db = context.doc.database
    const circle = new AcDbCircle(center, radius)
    db.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
