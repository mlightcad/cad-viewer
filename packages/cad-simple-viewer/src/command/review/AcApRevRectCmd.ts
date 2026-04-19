import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApBaseRevCmd } from './AcApBaseRevCmd'

function updateRect(
  rect: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike
) {
  rect.reset(false)
  rect.addVertexAt(0, new AcGePoint2d(firstPoint))
  rect.addVertexAt(1, new AcGePoint2d(secondPoint.x, firstPoint.y))
  rect.addVertexAt(2, new AcGePoint2d(secondPoint))
  rect.addVertexAt(3, new AcGePoint2d(firstPoint.x, secondPoint.y))
  rect.closed = true
}

/**
 * Dynamic preview jig for revision rectangle drawing.
 */
class AcApRevRectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  /**
   * Transient rectangle polyline rendered during cursor movement.
   */
  private _rect: AcDbPolyline
  /**
   * Fixed first corner used to construct the review rectangle.
   */
  private _firstPoint: AcGePoint2d

  /**
   * Creates dynamic preview jig for revision rectangle drawing.
   *
   * @param view - Active editor view.
   * @param start - First corner point selected by user.
   */
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._rect = new AcDbPolyline()
    this._firstPoint = new AcGePoint2d(start)
  }

  /**
   * Gets transient rectangle entity used by the jig.
   */
  get entity(): AcDbPolyline {
    return this._rect
  }

  /**
   * Updates preview rectangle with current opposite corner point.
   *
   * @param secondPoint - Current cursor point.
   */
  update(secondPoint: AcGePoint2dLike) {
    updateRect(this._rect, this._firstPoint, secondPoint)
  }
}

/**
 * Command to create one revision rectangle.
 */
export class AcApRevRectCmd extends AcApBaseRevCmd {
  /**
   * Creates revision rectangle command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Command entry point for revision rectangle creation.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const firstPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.rect.firstPoint')
    )
    const firstPointResult =
      await AcApDocManager.instance.editor.getPoint(firstPointPrompt)
    if (firstPointResult.status !== AcEdPromptStatus.OK) return
    const firstPoint = firstPointResult.value!

    const secondPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.rect.nextPoint')
    )
    secondPointPrompt.jig = new AcApRevRectJig(context.view, firstPoint)
    secondPointPrompt.useDashedLine = false
    secondPointPrompt.useBasePoint = true
    const secondPointResult =
      await AcApDocManager.instance.editor.getPoint(secondPointPrompt)
    if (secondPointResult.status !== AcEdPromptStatus.OK) return
    const secondPoint = secondPointResult.value!

    const db = context.doc.database
    const rect = new AcDbPolyline()
    updateRect(rect, firstPoint, secondPoint)
    db.tables.blockTable.modelSpace.appendEntity(rect)
  }
}
