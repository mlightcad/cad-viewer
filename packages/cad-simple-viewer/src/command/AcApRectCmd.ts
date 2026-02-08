import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'

function updateRect(
  rect: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike
) {
  rect.reset(false)
  // Add four vertices to form a rectangle
  // First vertex: the first point (one corner)
  rect.addVertexAt(0, new AcGePoint2d(firstPoint))
  // Second vertex: same Y as first point, X from current point
  rect.addVertexAt(1, new AcGePoint2d(secondPoint.x, firstPoint.y))
  // Third vertex: the current point (opposite corner)
  rect.addVertexAt(2, new AcGePoint2d(secondPoint))
  // Fourth vertex: same X as first point, Y from current point
  rect.addVertexAt(3, new AcGePoint2d(firstPoint.x, secondPoint.y))
  rect.closed = true
}

export class AcApRectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _rect: AcDbPolyline
  private _firstPoint: AcGePoint2d

  /**
   * Creates a line jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._rect = new AcDbPolyline()
    this._firstPoint = new AcGePoint2d(start)
  }

  get entity(): AcDbPolyline {
    return this._rect
  }

  update(secondPoint: AcGePoint2dLike) {
    updateRect(this._rect, this._firstPoint, secondPoint)
  }
}

/**
 * Command to create one rectangle.
 */
export class AcApRectCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.rect.firstPoint')
    )
    const firstPoint =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)

    const secondPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.rect.nextPoint')
    )
    secondPointPrompt.jig = new AcApRectJig(context.view, firstPoint)
    secondPointPrompt.useDashedLine = false
    secondPointPrompt.useBasePoint = true
    const secondPoint =
      await AcApDocManager.instance.editor.getPoint(secondPointPrompt)

    const db = context.doc.database
    const rect = new AcDbPolyline()
    updateRect(rect, firstPoint, secondPoint)
    db.tables.blockTable.modelSpace.appendEntity(rect)
  }
}
