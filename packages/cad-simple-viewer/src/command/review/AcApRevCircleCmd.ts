import { AcDbCircle } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdOpenMode,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApCircleJig } from '../draw/AcApCircleCmd'
import { AcApBaseRevCmd } from './AcApBaseRevCmd'

/**
 * Command to create one revision circle.
 */
export class AcApRevCircleCmd extends AcApBaseRevCmd {
  /**
   * Creates revision circle command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Command entry point for revision circle creation.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.circle.center')
    )
    const centerResult =
      await AcApDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== AcEdPromptStatus.OK) return
    const center = centerResult.value!

    const radiusPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.circle.radius')
    )
    radiusPrompt.allowZero = false
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radiusResult =
      await AcApDocManager.instance.editor.getDistance(radiusPrompt)
    if (radiusResult.status !== AcEdPromptStatus.OK) return
    const radius = radiusResult.value!

    context.doc.database.tables.blockTable.modelSpace.appendEntity(
      new AcDbCircle(center, radius)
    )
  }
}
