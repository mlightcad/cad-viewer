import { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext } from '../../app/index.js'
import { AcEdPromptPointOptions, AcEdPromptStatus } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import {
  acapGetCurrentMeasurementStyle,
  type AcApMeasurementStyle
} from '../../util/index.js'
import { AcTrView2d } from '../../view/index.js'
import { AcApMeasureDrawCmd } from './AcApMeasureDrawCmd.js'
import { AcApMeasurePointEntity } from './entity/index.js'

/**
 * Commit a coordinate measurement overlay (also used when importing a sidecar).
 */
export function placePointMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  point: AcGePoint3dLike,
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  AcApMeasurePointEntity.create(point, style, options).commit(view, db)
}

/**
 * Command that measures the world X/Y coordinates of a picked point.
 *
 * Prompts the user to pick one world point, then places a persistent dot and
 * coordinate badge via {@link AcTrHtmlTransientManager}. The overlays are
 * cleared by {@link commitMeasurementGroup}.
 */
export class AcApMeasurePointCmd extends AcApMeasureDrawCmd {
  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database

    await this.withMeasureInput(context, async () => {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.measurePoint.point')
      )
      const pointResult = await editor.getPoint(pointPrompt)
      if (pointResult.status !== AcEdPromptStatus.OK) return
      const point = pointResult.value!
      placePointMeasurement(
        context.view as AcTrView2d,
        db,
        point,
        acapGetCurrentMeasurementStyle(db)
      )
    })
  }
}
